// ============================================================
//  FarmTechX — WATER LEVEL & DOSING CONTROL DEVICE
//  Using Firebase Realtime Database (REST API)
// ============================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WiFiManager.h>          
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <EEPROM.h>
#include <time.h>

// ================= PIN CONFIG =================
#define ONE_WIRE_BUS 17
#define TDS_PIN      34
#define PH_PIN       36
#define TDS_POWER    26
#define PUMP_SSR     18
#define RELAY_A      13
#define RELAY_B      12
#define RELAY_C      14
#define RELAY_D      19
#define SOLENOID_REFILL 25
#define ZONE_1          27
#define ZONE_2          23
#define ZONE_3          22
#define LEVEL_HIGH   32
#define LEVEL_LOW    33

// ================= FIREBASE CONFIG =================
#define RTDB_HOST   "farmtechx-3accc-default-rtdb.asia-southeast1.firebasedatabase.app"
#define RTDB_SECRET "9RFNs6PmAThgHXohje0RrR5i6EMEvwjhaR6BHhOs"

// RTDB paths (must match realtimeService.ts PATHS)
#define PATH_SENSORS_WATER  "/farmtechx/sensors/water"
#define PATH_SOIL_LATEST    "/farmtechx/soilData/latest"
#define PATH_RAIN_LATEST    "/farmtechx/rainData/latest"
#define PATH_WATER_LEVEL    "/farmtechx/waterLevel"
#define PATH_PUMP_CONTROL   "/farmtechx/pumpControl"
#define PATH_DOSING_PUMPS   "/farmtechx/dosingPumps"
#define PATH_SCHEDULES      "/farmtechx/waterSchedules"
#define PATH_SOLENOID_VALVES "/farmtechx/solenoidValves"
#define PATH_LOG_WATER      "/farmtechx/logs/waterDevice"

// ================= NTP CONFIG =================
#define NTP_SERVER1   "pool.ntp.org"
#define NTP_SERVER2   "time.nist.gov"
#define TZ_OFFSET_SEC (8 * 3600)   // UTC+8 (Philippines)

// ================= SENSOR CONSTANTS =================
#define TDS_SAMPLES       5
#define PH_SAMPLES        20
#define SENSOR_INTERVAL   10000UL   // ms between sensor reads
#define SCHEDULE_INTERVAL 30000UL   // ms between schedule polls
#define PUMP_POLL_INTERVAL 500UL    // ms between manual command polls

const float PH_SLOPE  = -14.12f;
const float PH_OFFSET =  30.96f;
float tdsCalibration  =   1.138f;

// ================= DOSING TIMINGS =================
const unsigned long DOSING_TIME = 6000UL;  // Dosing run time in ms (6 seconds)
const float SENSOR_STABILIZATION_DELAY_MIN = 4.5f; // Wait time in minutes bago mag test ulit

// ================= DS18B20 =================
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature DS18B20(&oneWire);

// ================= GLOBAL SENSOR VALUES =================
float temperature = 0, tdsValue = 0, ecValue = 0, phValue = 0;
bool  waterHigh = false, waterLow = false;

// ================= PUMP STATE MACHINE =================
enum PumpState {
  IDLE,
  CHECK_PH, DOSING_PH_UP, DOSING_PH_DOWN, WAIT_PH,
  CHECK_EC, DOSING_EC_UP, DOSING_EC_DOWN, WAIT_EC,
  OPEN_ZONES, WATER_PUMP, WATER_DELAY, WAIT_END
};
PumpState currentState  = IDLE;
unsigned long stateStartTime = 0;
bool schedulePending    = false;
bool executedFlag       = false;

// Stores the RTDB push key of the running schedule (e.g. "-NxABC123")
char activeScheduleKey[40] = "";
int  activeScheduleDuration = 0;     // minutes
int  activeScheduleDurationSec = 0;  // seconds
float activeTargetPH = 0.0f;
float activeTargetEC = 0.0f;
bool activeZone1 = false;
bool activeZone2 = false;
bool activeZone3 = false;
unsigned long savedRemainingWateringMs = 0; // Remembers time if interrupted mid-watering

// Prevent re-firing the same schedule key within the same minute
char lastExecutedKey[40] = "";

// Manual override mirrors
bool manualOverrideA     = false;
bool manualOverrideB     = false;
bool manualOverrideC     = false;
bool manualOverrideD     = false;
bool manualOverrideWater = false;
bool manualOverrideZone1 = false;
bool manualOverrideZone2 = false;
bool manualOverrideZone3 = false;

// Refilling Automation Tracker
bool isRefilling = false;
unsigned long lastLoopTime = 0;

// ================= INTERVAL TRACKERS =================
unsigned long lastSensorRead   = 0;
unsigned long lastScheduleCheck = 0;
unsigned long lastPumpPoll     = 0;

// ================= FIREBASE HTTPS REQUEST =================
String rtdbRequest(const char* method, const char* path,
                   const String& body = "",
                   int* httpCode_out = nullptr) {
  WiFiClientSecure client;
  client.setInsecure();   // skip cert verify (OK for embedded; use CA for prod)

  HTTPClient http;
  String url = String("https://") + RTDB_HOST + path
             + ".json?auth=" + RTDB_SECRET;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  int code = -1;
  String response = "";

  if (strcmp(method, "GET") == 0) {
    code = http.GET();
  } else if (strcmp(method, "PUT") == 0) {
    code = http.PUT(body);
  } else if (strcmp(method, "POST") == 0) {
    code = http.POST(body);
  } else if (strcmp(method, "PATCH") == 0) {
    code = http.PATCH(body);
  }

  if (code > 0) response = http.getString();
  else Serial.printf("❌ RTDB %s %s → error %d\n", method, path, code);

  if (httpCode_out) *httpCode_out = code;
  http.end();
  return response;
}

// ================= LOGGING TO FIREBASE =================
void sendLog(const String& message) {
  static unsigned long lastLogTime = 0;
  if (millis() - lastLogTime < 3000) return; // rate limit: max 1 log per 3 seconds
  lastLogTime = millis();

  struct tm t;
  if (!getLocalTime(&t)) return;               // skip if NTP not ready
  char timestamp[10];
  sprintf(timestamp, "%02d:%02d:%02d", t.tm_hour, t.tm_min, t.tm_sec);

  JsonDocument doc;
  doc["timestamp"] = timestamp;
  doc["message"]   = message;
  String body;
  serializeJson(doc, body);
  // POST → each call gets a unique auto-key, building a log list
  rtdbRequest("POST", PATH_LOG_WATER, body);
}

// ================= WIFI SETUP =================
void setupWiFi() {
  WiFiManager wm;
  wm.setConfigPortalTimeout(180);   // give up portal after 3 min if no one connects
  // Uncomment the next line to FORCE the portal (for re-provisioning):
  // wm.resetSettings();

  bool connected = wm.autoConnect("FarmTechX-WaterDevice");
  if (connected) {
    Serial.println("✅ WiFi connected via WiFiManager");
    Serial.print("   IP: "); Serial.println(WiFi.localIP());
    sendLog("WiFi connected - IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("⚠️ WiFiManager timed out — restarting");
    ESP.restart();
  }
}

// ================= TIME SYNC =================
void setupTime() {
  configTime(TZ_OFFSET_SEC, 0, NTP_SERVER1, NTP_SERVER2);
  struct tm timeinfo;
  int retry = 0;
  Serial.print("⏰ Waiting for NTP");
  while (!getLocalTime(&timeinfo) && retry < 30) {
    Serial.print(".");
    delay(500);
    retry++;
  }
  if (retry < 30) {
    Serial.printf("\n✅ Time synced: %02d:%02d:%02d\n",
                  timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
  } else {
    Serial.println("\n⚠️ NTP failed — schedule execution will not work");
  }
}

// ================= WATER LEVEL =================
void setupWaterLevelPins() {
  pinMode(LEVEL_HIGH, INPUT_PULLUP);
  pinMode(LEVEL_LOW,  INPUT_PULLUP);
}

void readAndSendWaterLevel() {
  // HIGH Sensor (maliit) triggers when water pushes it UP (circuit opens -> HIGH)
  // LOW Sensor (mahaba) triggers when water drains and it drops DOWN (circuit closes -> LOW)
  bool highTriggered = (digitalRead(LEVEL_HIGH) == HIGH);
  bool lowTriggered  = (digitalRead(LEVEL_LOW)  == LOW);

  static bool lastWaterHigh = false;
  static bool lastWaterLow  = false;
  static unsigned long lastWaterLevelSend = 0;

  bool stateChanged = (highTriggered != lastWaterHigh) || (lowTriggered != lastWaterLow);

  waterHigh = highTriggered;
  waterLow  = lowTriggered;

  // Send to Firebase INSTANTLY on change, OR every 5 seconds as heartbeat
  if (!stateChanged && (millis() - lastWaterLevelSend < 5000)) return;

  lastWaterLevelSend = millis();
  lastWaterHigh = waterHigh;
  lastWaterLow  = waterLow;

  String status;
  if      (waterHigh)  status = "HIGH";
  else if (waterLow)   status = "LOW";
  else                 status = "EMPTY";

  Serial.println("------ WATER LEVEL ------");
  Serial.printf("HIGH SENSOR=%s  LOW SENSOR=%s  OVERALL=%s\n",
                waterHigh ? "TRIGGERED" : "OPEN",
                waterLow  ? "TRIGGERED" : "OPEN",
                status.c_str());

  // ─── PUT /farmtechx/waterLevel ───
  if (WiFi.status() == WL_CONNECTED) {
    unsigned long epochMs = (unsigned long)time(nullptr) * 1000UL;
    JsonDocument doc;
    doc["status"]    = status;
    doc["updatedAt"] = epochMs;
    String body;
    serializeJson(doc, body);
    int code;
    rtdbRequest("PUT", PATH_WATER_LEVEL, body, &code);
    Serial.printf("   waterLevel PUT → %d\n", code);
    if (stateChanged) sendLog("Water level: " + status);
  }
}

// ================= RELAY HELPERS =================
void startDosing(char p) { digitalWrite(p=='A'?RELAY_A:p=='B'?RELAY_B:p=='C'?RELAY_C:RELAY_D, LOW); }
void stopDosing(char p)  { digitalWrite(p=='A'?RELAY_A:p=='B'?RELAY_B:p=='C'?RELAY_C:RELAY_D, HIGH); }
void startWaterPump()    { digitalWrite(PUMP_SSR, LOW); }
void stopWaterPump()     { digitalWrite(PUMP_SSR, HIGH); }

// ================= POST SENSOR DATA =================
void readAndSendSensors() {
  // — DS18B20 temperature —
  DS18B20.requestTemperatures();
  temperature = DS18B20.getTempCByIndex(0);

  // — TDS + EC —
  digitalWrite(TDS_POWER, HIGH);
  delay(500);
  float tdsSum = 0;
  for (int i = 0; i < TDS_SAMPLES; i++) {
    float v = analogRead(TDS_PIN) * 3.3f / 4095.0f;
    float comp = 1.0f + 0.02f * (temperature - 25.0f);
    float vc = v / comp;
    tdsSum += (133.42f*pow(vc,3) - 255.86f*pow(vc,2) + 857.39f*vc) * 0.5f;
    delay(50);
  }
  tdsValue = (tdsSum / TDS_SAMPLES) * tdsCalibration;
  ecValue  = tdsValue / 500.0f;
  digitalWrite(TDS_POWER, LOW);

  // — pH —
  float phSum = 0;
  for (int i = 0; i < PH_SAMPLES; i++) {
    phSum += analogRead(PH_PIN) * 3.3f / 4095.0f;
    delay(50);
  }
  phValue = PH_SLOPE * (phSum / PH_SAMPLES) + PH_OFFSET;

  Serial.printf("Temp:%.2f°C  TDS:%.2fppm  EC:%.2f  pH:%.2f\n",
                temperature, tdsValue, ecValue, phValue);
  sendLog("Temp:" + String(temperature,2) + " TDS:" + String(tdsValue,1)
        + " EC:" + String(ecValue,2) + " pH:" + String(phValue,2));

  // ─── POST /farmtechx/sensors/water  (push = auto-keyed list) ───
  if (WiFi.status() == WL_CONNECTED) {
    unsigned long epochSec = (unsigned long)time(nullptr);
    JsonDocument doc;
    doc["temperature"] = round(temperature * 100) / 100.0;
    doc["tds"]         = round(tdsValue);
    doc["ec"]          = round(ecValue * 100) / 100.0;
    doc["ph"]          = round(phValue * 100) / 100.0;
    doc["createdAt"]   = epochSec;
    String body;
    serializeJson(doc, body);
    int code;
    rtdbRequest("POST", PATH_SENSORS_WATER, body, &code);
    Serial.printf("   sensors/water POST → %d\n", code);
  }
}

// ================= CHECK SOIL/RAIN =================
bool checkSoilRain() {
  if (WiFi.status() != WL_CONNECTED) return false;

  float moisture  = 0;
  bool  isRaining = false;

  // — soilData/latest —
  String soilRaw = rtdbRequest("GET", PATH_SOIL_LATEST);
  if (soilRaw.length() > 2) {
    JsonDocument doc;
    if (!deserializeJson(doc, soilRaw)) {
      moisture = doc["moisture"] | 0.0f;
      Serial.printf("🌱 Soil moisture: %.2f%%\n", moisture);
    }
  }

  // — rainData/latest —
  String rainRaw = rtdbRequest("GET", PATH_RAIN_LATEST);
  if (rainRaw.length() > 2) {
    JsonDocument doc;
    if (!deserializeJson(doc, rainRaw)) {
      isRaining = doc["isRaining"] | false;
      Serial.printf("☔ Is raining: %s\n", isRaining ? "YES" : "NO");
    }
  }

  if (moisture >= 50 || isRaining) {
    Serial.println("⚠️ Moisture or rain detected — skipping automation");
    return false;
  }
  return true;
}

// ================= SAVE SCHEDULE TIMESTAMPS =================
void markScheduleExecuted(const char* key) {
  if (!key || strlen(key) == 0) return;
  Serial.printf("📌 Marking schedule executed: %s\n", key);

  unsigned long epochMs = (unsigned long)time(nullptr) * 1000UL;
  String path = String(PATH_SCHEDULES) + "/" + key + "/lastExecuted";
  String body = String(epochMs);

  unsigned long start = millis();
  bool success = false;
  while (!success && millis() - start < 30000UL) {
    if (WiFi.status() != WL_CONNECTED) { delay(1000); continue; }
    int code;
    rtdbRequest("PUT", path.c_str(), body, &code);
    if (code == 200) {
      success = true;
      executedFlag = true;
      Serial.println("✅ lastExecuted stamped");
    } else {
      Serial.printf("   retry... (HTTP %d)\n", code);
      delay(2000);
    }
  }
  if (!success) Serial.println("⚠️ Could not stamp lastExecuted after 30 s");
}

// ================= DASHBOARD MANUAL SYNC =================
void checkManualFromRTDB() {
  if (WiFi.status() != WL_CONNECTED) return;
  uint64_t nowMs = (uint64_t)time(nullptr) * 1000ULL;

  // — solenoid valves —
  String svRaw = rtdbRequest("GET", PATH_SOLENOID_VALVES);
  if (svRaw.length() > 2) {
    JsonDocument doc;
    if (!deserializeJson(doc, svRaw)) {
      auto handleValve = [&](const char* key, int pin, bool* overrideFlag) {
        if (doc.containsKey(key)) {
          bool isOpen = (strcmp(doc[key]["state"] | "CLOSED", "OPEN") == 0);
          if (isOpen != *overrideFlag) {
            *overrideFlag = isOpen;
            digitalWrite(pin, isOpen ? LOW : HIGH);
            Serial.printf("🌐 Solenoid %s %s\n", key, isOpen ? "OPEN" : "CLOSED");
          }
        }
      };
      handleValve("zone1", ZONE_1, &manualOverrideZone1);
      handleValve("zone2", ZONE_2, &manualOverrideZone2);
      handleValve("zone3", ZONE_3, &manualOverrideZone3);
    }
  }

  // — dosing pumps A / B / C / D —
  String dpRaw = rtdbRequest("GET", PATH_DOSING_PUMPS);
  if (dpRaw.length() > 2) {
    JsonDocument doc;
    if (!deserializeJson(doc, dpRaw)) {
      auto handleDosing = [&](const char* key, char pumpletter, bool* overrideFlag) {
        if (doc.containsKey(key)) {
          bool on = (strcmp(doc[key]["state"] | "OFF", "ON") == 0);
          uint64_t endTime = doc[key]["endTime"].as<uint64_t>();

          // ESP32 owns the timer: automatically turn OFF when endTime reached
          if (on && endTime > 0 && nowMs >= endTime) {
            on = false;
            JsonDocument offDoc;
            offDoc["state"] = "OFF";
            offDoc["endTime"] = 0;
            String body;
            serializeJson(offDoc, body);
            String pumpPath = String(PATH_DOSING_PUMPS) + "/" + key;
            rtdbRequest("PATCH", pumpPath.c_str(), body);
            sendLog(String("Dosing pump ") + pumpletter + " auto-OFF (timeout)");
          }

          if (overrideFlag != nullptr) {
            if (on != *overrideFlag) {
              *overrideFlag = on;
              on ? startDosing(pumpletter) : stopDosing(pumpletter);
              Serial.printf("🌐 Dosing %c %s\n", pumpletter, on ? "ON" : "OFF");
            }
          } else {
            // For Pump D which has no physical relay mapped on this ESP32 board
            if (on) Serial.printf("🌐 Dosing D (Virtual) %s\n", on ? "ON" : "OFF");
          }
        }
      };
      handleDosing("A", 'A', &manualOverrideA);
      handleDosing("B", 'B', &manualOverrideB);
      handleDosing("C", 'C', &manualOverrideC);
      handleDosing("D", 'D', &manualOverrideD);
    }
  }

  // — main pump —
  String pmRaw = rtdbRequest("GET", PATH_PUMP_CONTROL);
  if (pmRaw.length() > 2) {
    JsonDocument doc;
    if (!deserializeJson(doc, pmRaw)) {
      bool on = (strcmp(doc["state"] | "OFF", "ON") == 0);
      uint64_t endTime = doc["endTime"].as<uint64_t>();

      // ESP32 owns the timer: automatically turn OFF when endTime reached
      if (on && endTime > 0 && nowMs >= endTime) {
        on = false;
        JsonDocument offDoc;
        offDoc["state"] = "OFF";
        offDoc["endTime"] = 0;
        String body;
        serializeJson(offDoc, body);
        rtdbRequest("PATCH", PATH_PUMP_CONTROL, body);
        sendLog("Main pump auto-OFF (timeout)");
      }

      if (on != manualOverrideWater) {
        manualOverrideWater = on;
        on ? startWaterPump() : stopWaterPump();
        sendLog(on ? "Main pump ON" : "Main pump OFF");
        Serial.printf("🌐 Water Pump %s\n", on ? "ON" : "OFF");
      }
    }
  }
}

// ================= CHECK FIREBASE SCHEDULE =================
void checkWaterSchedules() {
  if (WiFi.status() != WL_CONNECTED) return;
  struct tm t;
  if (!getLocalTime(&t)) return;

  // Convert current time to minutes since midnight (24-h)
  int nowMin = t.tm_hour * 60 + t.tm_min;

  String raw = rtdbRequest("GET", PATH_SCHEDULES);
  if (raw.length() < 3 || raw == "null") return;

  // RTDB returns: { "-NxKey1": {hour,minute,ampm,duration}, ... }
  JsonDocument doc;
  if (deserializeJson(doc, raw)) return;

  for (JsonPair kv : doc.as<JsonObject>()) {
    const char* key = kv.key().c_str();
    JsonObject  s   = kv.value().as<JsonObject>();

    int hour     = s["hour"]   | 0;
    int minute   = s["minute"] | 0;
    const char* ampm = s["ampm"] | "AM";

    // Convert to 24-h
    if (strcmp(ampm, "PM") == 0 && hour < 12) hour += 12;
    if (strcmp(ampm, "AM") == 0 && hour == 12) hour  = 0;

    int schedMin  = hour * 60 + minute;
    int duration  = s["duration"] | 5;
    int durationSec = s["durationSec"] | 0;
    float targetPH  = s["targetPH"] | 0.0f;
    float targetEC  = s["targetEC"] | 0.0f;

    bool hasZone1 = false, hasZone2 = false, hasZone3 = false;
    JsonArray zArray = s["zones"];
    for (JsonVariant v : zArray) {
      if (v == "zone1" || v == 1) hasZone1 = true;
      if (v == "zone2" || v == 2) hasZone2 = true;
      if (v == "zone3" || v == 3) hasZone3 = true;
    }

    bool alreadyDone = (strcmp(key, lastExecutedKey) == 0);

    // Fire if within ±1 minute of schedule and not yet executed this cycle
    if (abs(nowMin - schedMin) <= 1 && !alreadyDone) {
      strlcpy(lastExecutedKey, key, sizeof(lastExecutedKey));

      if (!checkSoilRain()) {
        // Soil wet or raining — skip but still stamp
        sendLog("Automation skipped - soil wet or raining");
        markScheduleExecuted(key);
        return;
      }

      strlcpy(activeScheduleKey, key, sizeof(activeScheduleKey));
      activeScheduleDuration = duration;
      activeScheduleDurationSec = durationSec;
      activeTargetPH = targetPH;
      activeTargetEC = targetEC;
      activeZone1 = hasZone1;
      activeZone2 = hasZone2;
      activeZone3 = hasZone3;

      schedulePending = true;
      executedFlag    = false;
      currentState    = CHECK_PH;
      stateStartTime  = millis();
      sendLog("Automation schedule fired: " + String(key));
      Serial.printf("🚀 Automation started for schedule key: %s (%d min %d sec)\n",
                    key, duration, durationSec);
      break;
    }
  }
}

// ================= REFILLING LOGIC =================
void manageRefill() {
  unsigned long now = millis();
  unsigned long dt = (lastLoopTime == 0) ? 0 : (now - lastLoopTime);
  lastLoopTime = now;

  bool wasRefilling = isRefilling;
  
  if (waterLow && !isRefilling && !waterHigh) {
    isRefilling = true;
    digitalWrite(SOLENOID_REFILL, LOW);
    sendLog("Tank LOW: Refilling started. Automation paused.");
    
    // Safety stop: force off relays so they don't run dry
    if (!manualOverrideWater) stopWaterPump();
    if (!manualOverrideA) stopDosing('A');
    if (!manualOverrideB) stopDosing('B');
    if (!manualOverrideC) stopDosing('C');
    if (!manualOverrideD) stopDosing('D');
    if (!manualOverrideZone1) digitalWrite(ZONE_1, HIGH);
    if (!manualOverrideZone2) digitalWrite(ZONE_2, HIGH);
    if (!manualOverrideZone3) digitalWrite(ZONE_3, HIGH);
  } else if (waterHigh && isRefilling) {
    isRefilling = false;
    digitalWrite(SOLENOID_REFILL, HIGH);
    sendLog("Tank HIGH: Refilling finished.");

    // INTERLOCK: If interrupted mid-watering, force a re-dose of the fresh water!
    if (schedulePending && (currentState == WATER_PUMP || currentState == WATER_DELAY || currentState == OPEN_ZONES)) {
       unsigned long totalDurMs = ((unsigned long)activeScheduleDuration * 60000UL) + ((unsigned long)activeScheduleDurationSec * 1000UL);
       unsigned long elapsed = (now > stateStartTime) ? (now - stateStartTime) : 0;
       
       if (elapsed < totalDurMs) savedRemainingWateringMs = totalDurMs - elapsed;
       else savedRemainingWateringMs = 0;
       
       currentState = CHECK_PH;
       sendLog("Interrupted watering: Resuming pH/EC dosing for fresh water!");
       Serial.println("🔄 Interrupted watering: Resuming pH/EC dosing for fresh water!");
    }

    // Resume operations if we were in the middle of a schedule
    if (schedulePending) {
      if      (currentState == DOSING_PH_UP && !manualOverrideA) startDosing('A');
      else if (currentState == DOSING_PH_DOWN && !manualOverrideB) startDosing('B');
      else if (currentState == DOSING_EC_UP && !manualOverrideC) startDosing('C');
      else if (currentState == DOSING_EC_DOWN && !manualOverrideD) startDosing('D');
      else if (currentState == WATER_PUMP || currentState == WATER_DELAY) {
        if (!manualOverrideWater) startWaterPump();
        if (activeZone1 && !manualOverrideZone1) digitalWrite(ZONE_1, LOW);
        if (activeZone2 && !manualOverrideZone2) digitalWrite(ZONE_2, LOW);
        if (activeZone3 && !manualOverrideZone3) digitalWrite(ZONE_3, LOW);
      }
    }
  }

  // Timer Freeze: if refilling and a schedule is active, push the start time forward by dt
  if (isRefilling && schedulePending) {
    stateStartTime += dt;
  }
}

// ================= MAIN AUTOMATION LOOP =================
void processPumpState() {
  if (!schedulePending) return;

  // Mid-run soil/rain check
  if (!checkSoilRain()) {
    Serial.println("⚠️ Automation suspended mid-run (moisture/rain)");
    stopDosing('A'); stopDosing('B'); stopDosing('C'); stopDosing('D'); stopWaterPump();
    digitalWrite(ZONE_1, HIGH); digitalWrite(ZONE_2, HIGH); digitalWrite(ZONE_3, HIGH);
    schedulePending = false;
    currentState    = IDLE;
    markScheduleExecuted(activeScheduleKey);
    return;
  }

  unsigned long now = millis();

  switch (currentState) {
    case CHECK_PH:
      readAndSendSensors(); // Force explicit read for fresh data
      if (activeTargetPH <= 0.01f) {
        currentState = CHECK_EC;
      } else if (phValue < (activeTargetPH - 0.5f)) {
        currentState = DOSING_PH_UP;
        stateStartTime = now;
      } else if (phValue > (activeTargetPH + 0.5f)) {
        currentState = DOSING_PH_DOWN;
        stateStartTime = now;
      } else {
        Serial.println("✅ pH is perfectly balanced");
        currentState = CHECK_EC;
      }
      break;

    case DOSING_PH_UP:
      if (!manualOverrideA) startDosing('A');
      if (now - stateStartTime >= DOSING_TIME) {
        if (!manualOverrideA) stopDosing('A');
        sendLog("Dosed pH UP");
        currentState = WAIT_PH;
        stateStartTime = now;
      }
      break;

    case DOSING_PH_DOWN:
      if (!manualOverrideB) startDosing('B');
      if (now - stateStartTime >= DOSING_TIME) {
        if (!manualOverrideB) stopDosing('B');
        sendLog("Dosed pH DOWN");
        currentState = WAIT_PH;
        stateStartTime = now;
      }
      break;

    case WAIT_PH:
      if (now - stateStartTime >= SENSOR_STABILIZATION_DELAY_MIN * 60000UL) {
        currentState = CHECK_PH;
      }
      break;

    case CHECK_EC:
      readAndSendSensors(); // Force explicit read for fresh data
      if (activeTargetEC <= 0.01f) {
        currentState = OPEN_ZONES;
      } else if (ecValue < (activeTargetEC - 0.5f)) {
        currentState = DOSING_EC_UP;
        stateStartTime = now;
      } else if (ecValue > (activeTargetEC + 0.5f)) {
        currentState = DOSING_EC_DOWN;
        stateStartTime = now;
      } else {
        Serial.println("✅ EC is perfectly balanced");
        currentState = OPEN_ZONES;
      }
      break;

    case DOSING_EC_UP:
      if (!manualOverrideC) startDosing('C');
      if (now - stateStartTime >= DOSING_TIME) {
        if (!manualOverrideC) stopDosing('C');
        sendLog("Dosed EC UP");
        currentState = WAIT_EC;
        stateStartTime = now;
      }
      break;

    case DOSING_EC_DOWN:
      if (!manualOverrideD) startDosing('D');
      if (now - stateStartTime >= DOSING_TIME) {
        if (!manualOverrideD) stopDosing('D');
        sendLog("Dosed EC DOWN");
        currentState = WAIT_EC;
        stateStartTime = now;
      }
      break;

    case WAIT_EC:
      if (now - stateStartTime >= SENSOR_STABILIZATION_DELAY_MIN * 60000UL) {
        currentState = CHECK_EC;
      }
      break;

    case OPEN_ZONES:
      if (activeZone1 && !manualOverrideZone1) digitalWrite(ZONE_1, LOW);
      if (activeZone2 && !manualOverrideZone2) digitalWrite(ZONE_2, LOW);
      if (activeZone3 && !manualOverrideZone3) digitalWrite(ZONE_3, LOW);
      currentState = WATER_PUMP;
      stateStartTime = now;
      break;

    case WATER_PUMP:
      if (!manualOverrideWater) startWaterPump();
      currentState = WATER_DELAY;
      stateStartTime = now;
      break;

    case WATER_DELAY:
      {
        unsigned long durMs = savedRemainingWateringMs > 0 
                                ? savedRemainingWateringMs 
                                : (((unsigned long)activeScheduleDuration * 60000UL) + ((unsigned long)activeScheduleDurationSec * 1000UL));
                                
        if (now - stateStartTime >= durMs) {
          if (!manualOverrideWater) stopWaterPump();
          if (!manualOverrideZone1) digitalWrite(ZONE_1, HIGH);
          if (!manualOverrideZone2) digitalWrite(ZONE_2, HIGH);
          if (!manualOverrideZone3) digitalWrite(ZONE_3, HIGH);
          
          savedRemainingWateringMs = 0; // Clear it for next schedule
          
          sendLog("Watering finished, resting sensors for 4.5m");
          currentState = WAIT_END;
          stateStartTime = now;
        }
      }
      break;

    case WAIT_END:
      if (now - stateStartTime >= SENSOR_STABILIZATION_DELAY_MIN * 60000UL) {
        schedulePending = false;
        currentState    = IDLE;
        markScheduleExecuted(activeScheduleKey);
        Serial.printf("✅ Automation completely finished: %s\n", activeScheduleKey);
      }
      break;
  }
}

// ================= BACKGROUND TASK (CORE 0) =================
void backgroundSensorTask(void *pvParameters) {
  for (;;) {
    if (WiFi.status() == WL_CONNECTED) {
      if (millis() - lastSensorRead > SENSOR_INTERVAL) {
        lastSensorRead = millis();
        // ONLY read quality sensors if an automation schedule is NOT running
        if (!schedulePending) {
          readAndSendSensors();
        }
      }
      
      // ALWAYS check water level extremely fast (independently of 30-sec sensor interval)
      readAndSendWaterLevel();
      
      if (millis() - lastScheduleCheck > SCHEDULE_INTERVAL) {
        lastScheduleCheck = millis();
        checkWaterSchedules();
      }
    }
    yield(); // yield to other processes
    delay(50);
  }
}

// ─────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Output pins (must be set as OUTPUT first on ESP32 before digitalWrite works)
  pinMode(TDS_POWER, OUTPUT);
  pinMode(PUMP_SSR,  OUTPUT);
  pinMode(RELAY_A,   OUTPUT);
  pinMode(RELAY_B,   OUTPUT);
  pinMode(RELAY_C,   OUTPUT);
  pinMode(RELAY_D,   OUTPUT);
  pinMode(SOLENOID_REFILL, OUTPUT);
  pinMode(ZONE_1,    OUTPUT);
  pinMode(ZONE_2,    OUTPUT);
  pinMode(ZONE_3,    OUTPUT);

  // Immediately force all relays OFF (HIGH = OFF for active-low relays)
  digitalWrite(TDS_POWER, LOW);
  digitalWrite(PUMP_SSR,  HIGH);
  digitalWrite(RELAY_A,   HIGH);
  digitalWrite(RELAY_B,   HIGH);
  digitalWrite(RELAY_C,   HIGH);
  digitalWrite(RELAY_D,   HIGH);
  digitalWrite(SOLENOID_REFILL, HIGH);
  digitalWrite(ZONE_1,    HIGH);
  digitalWrite(ZONE_2,    HIGH);
  digitalWrite(ZONE_3,    HIGH);

  DS18B20.begin();
  setupWaterLevelPins();

  setupWiFi();    // WiFiManager — captive portal if no credentials saved
  setupTime();    // NTP sync

  // Spawn the background task for blocking sensor/HTTP reads
  xTaskCreatePinnedToCore(
    backgroundSensorTask, 
    "SensorTask", 
    8192, 
    NULL, 
    1, 
    NULL, 
    0 // Run on Core 0 (main loop runs on Core 1)
  );
}

// ================= MAIN LOOP =================
void loop() {
  // Reconnect if dropped (WiFiManager handles reconnect internally,
  // but this keeps existing timing logic)
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi lost — reconnecting...");
    sendLog("WiFi lost - reconnecting");
    WiFi.reconnect();
    delay(3000);
  }

  // Sensor and schedule tasks have been moved to backgroundSensorTask

  // — Refill check —
  manageRefill();

  // — State machine —
  if (!isRefilling) {
    processPumpState();
  }

  // — Manual pump command poll —
  if (millis() - lastPumpPoll > PUMP_POLL_INTERVAL) {
    lastPumpPoll = millis();
    checkManualFromRTDB();
  }
}
