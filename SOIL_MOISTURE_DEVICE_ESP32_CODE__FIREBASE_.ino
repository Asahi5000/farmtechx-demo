// ============================================================
//  FarmTechX — SOIL MOISTURE / RAIN SENSOR DEVICE
//  Updated for Firebase Realtime Database (REST API)
//  Changes from original:
//    • HTTP POST to PHP → HTTPS PUT to Firebase RTDB
//    • Hardcoded WiFi → WiFiManager (captive-portal provisioning)
//    • NTP time sync added (needed for updatedAt timestamps)
//    • All RS485 Modbus soil sensor logic UNCHANGED
//    • All rain sensor (DO + AO) logic UNCHANGED
// ============================================================

// ─── LIBRARY REQUIREMENTS (install via Arduino Library Manager) ───
// • WiFiManager  by tzapu  (search "WiFiManager")
// • ArduinoJson  v6        (search "ArduinoJson")
// • WiFiClientSecure  (bundled with ESP32 Arduino core)

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WiFiManager.h>      // ← replaces hardcoded credentials
#include <ArduinoJson.h>
#include <time.h>

// ================= FIREBASE CONFIG =================
// Replace with your own values:
// RTDB_HOST  → Firebase Console → Realtime Database → Data tab URL (no https://, no trailing slash)
// RTDB_SECRET → Firebase Console → Project Settings → Service Accounts → Database secrets
#define RTDB_HOST   "farmtechx-3accc-default-rtdb.asia-southeast1.firebasedatabase.app"
#define RTDB_SECRET "9RFNs6PmAThgHXohje0RrR5i6EMEvwjhaR6BHhOs"

// RTDB paths — must match realtimeService.ts PATHS
#define PATH_SOIL_LATEST "/farmtechx/soilData/latest"
#define PATH_RAIN_LATEST "/farmtechx/rainData/latest"
#define PATH_LOG_SOIL    "/farmtechx/logs/soilDevice"

// ================= NTP CONFIG =================
#define NTP_SERVER1   "pool.ntp.org"
#define NTP_SERVER2   "time.nist.gov"
#define TZ_OFFSET_SEC (8 * 3600)   // UTC+8 (Philippines)

// ================= RS485 PINS =================
#define RXD2  26
#define TXD2  27
#define RE_DE  4

HardwareSerial mod(2);
byte resp[9];

// ================= SOIL DATA =================
float moisture = 0, temperature = 0, ph = 0, ec = 0;

// ================= RAIN SENSOR =================
#define RAIN_DO_PIN 33
#define RAIN_AO_PIN 32
bool isRaining    = false;
int  rainIntensity = 0;

// ================= SENSOR ID =================
#define SENSOR_ID 2

// ─────────────────────────────────────────────────────────────
//  HTTPS helper — PUT a JSON body to a RTDB path
//  Returns HTTP response code
// ─────────────────────────────────────────────────────────────
int rtdbPut(const char* path, const String& body) {
  WiFiClientSecure client;
  client.setInsecure();   // skip cert verify (OK for dev; load CA for production)

  HTTPClient http;
  String url = String("https://") + RTDB_HOST + path
             + ".json?auth=" + RTDB_SECRET;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);
  int code = http.PUT(body);
  http.end();
  return code;
}

// ─────────────────────────────────────────────────────────────
//  HTTPS POST helper (for log entries — each POST = new auto-key)
// ─────────────────────────────────────────────────────────────
int rtdbPost(const char* path, const String& body) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = String("https://") + RTDB_HOST + path
             + ".json?auth=" + RTDB_SECRET;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);
  int code = http.POST(body);
  http.end();
  return code;
}

// ─────────────────────────────────────────────────────────────
//  Logging helper — POST timestamped message to Firebase
// ─────────────────────────────────────────────────────────────
void sendLog(const String& message) {
  struct tm t;
  if (!getLocalTime(&t)) return;    // skip if NTP not ready
  char timestamp[10];
  sprintf(timestamp, "%02d:%02d:%02d", t.tm_hour, t.tm_min, t.tm_sec);
  JsonDocument doc;
  doc["timestamp"] = timestamp;
  doc["message"]   = message;
  String body;
  serializeJson(doc, body);
  rtdbPost(PATH_LOG_SOIL, body);
}

// ─────────────────────────────────────────────────────────────
//  WiFi + WiFiManager setup
//  On first boot opens AP "FarmTechX-SoilDevice".
//  Connect phone to that AP → browser captive portal opens →
//  enter SSID + password → saved to flash.
// ─────────────────────────────────────────────────────────────
void setupWiFi() {
  WiFiManager wm;
  wm.setConfigPortalTimeout(180);   // portal stays open 3 min
  // Uncomment to force re-provisioning:
  // wm.resetSettings();

  bool ok = wm.autoConnect("FarmTechX-SoilDevice");
  if (ok) {
    Serial.println("✅ WiFi connected via WiFiManager");
    Serial.print("   IP: "); Serial.println(WiFi.localIP());
    sendLog("WiFi connected - IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("⚠️ WiFiManager timed out — restarting");
    ESP.restart();
  }
}

// ─────────────────────────────────────────────────────────────
//  NTP time sync
// ─────────────────────────────────────────────────────────────
void setupTime() {
  configTime(TZ_OFFSET_SEC, 0, NTP_SERVER1, NTP_SERVER2);
  struct tm timeinfo;
  int retry = 0;
  Serial.print("⏰ Waiting for NTP");
  while (!getLocalTime(&timeinfo) && retry < 20) {
    Serial.print(".");
    delay(500);
    retry++;
  }
  if (retry < 20) {
    Serial.printf("\n✅ Time synced: %02d:%02d:%02d\n",
                  timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
  } else {
    Serial.println("\n⚠️ NTP sync failed");
  }
}

// ─────────────────────────────────────────────────────────────
//  Modbus RTU read helper — UNCHANGED from original
// ─────────────────────────────────────────────────────────────
bool readRegisters(byte slaveID, uint16_t startReg,
                   uint16_t numRegs, byte* response) {
  byte req[8];
  req[0] = slaveID;
  req[1] = 0x03;
  req[2] = startReg >> 8;
  req[3] = startReg & 0xFF;
  req[4] = numRegs  >> 8;
  req[5] = numRegs  & 0xFF;

  uint16_t crc = 0xFFFF;
  for (int pos = 0; pos < 6; pos++) {
    crc ^= req[pos];
    for (int i = 0; i < 8; i++)
      crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
  }
  req[6] = crc & 0xFF;
  req[7] = crc >> 8;

  digitalWrite(RE_DE, HIGH);
  delay(5);
  mod.write(req, 8);
  mod.flush();
  digitalWrite(RE_DE, LOW);
  delay(5);

  unsigned long t = millis();
  while (mod.available() < 9 && millis() - t < 1000) delay(1);

  if (mod.available() >= 9) {
    for (int i = 0; i < 9; i++) response[i] = mod.read();
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // RS485
  mod.begin(4800, SERIAL_8N1, RXD2, TXD2);
  pinMode(RE_DE, OUTPUT);
  digitalWrite(RE_DE, LOW);

  // Rain sensor
  pinMode(RAIN_DO_PIN, INPUT);
  pinMode(RAIN_AO_PIN, INPUT);

  setupWiFi();    // WiFiManager captive portal
  setupTime();    // NTP sync

  Serial.println("🌱 ESP32 Soil + Rain Sensor Started (Firebase mode)");
}

// ─────────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────────
void loop() {
  moisture = temperature = ph = ec = 0;

  // ─── Read soil via Modbus (UNCHANGED) ───
  if (readRegisters(0x01, 0x0000, 2, resp)) {
    moisture    = ((resp[3] << 8) | resp[4]) / 10.0f;
    int tempRaw = (resp[5] << 8) | resp[6];
    temperature = (tempRaw > 0x7FFF)
                  ? -(0x10000 - tempRaw) / 10.0f
                  :  tempRaw / 10.0f;
  }
  if (readRegisters(0x01, 0x0002, 2, resp)) {
    ph = ((resp[3] << 8) | resp[4]) / 100.0f;
    ec = ((resp[5] << 8) | resp[6]) / 100.0f;
  }

  // ─── Read rain sensor (UNCHANGED) ───
  bool wasRaining = isRaining;
  isRaining     = digitalRead(RAIN_DO_PIN) == LOW;
  rainIntensity = analogRead(RAIN_AO_PIN);
  int rainAnalog = map(rainIntensity, 0, 4095, 0, 1023);
  if (isRaining && !wasRaining)  sendLog("Rain detected - intensity: " + String(rainAnalog));
  if (!isRaining && wasRaining)  sendLog("Rain stopped");

  // ─── Debug output ───
  Serial.printf(
    "🌱 Moisture:%.2f%%  🌡Temp:%.2f°C  🧪pH:%.2f  💧EC:%.2f  "
    "🌧Rain:%s  Intensity:%d\n",
    moisture, temperature, ph, ec,
    isRaining ? "YES" : "NO", rainAnalog
  );

  // ─── Get current epoch timestamp (seconds) ───
  unsigned long epochSec = (unsigned long)time(nullptr);

  if (WiFi.status() == WL_CONNECTED) {

    // ─── PUT /farmtechx/soilData/latest ───
    // Overwrites the single "latest" node — the Water Device ESP32 reads this.
    {
      JsonDocument doc;
      doc["moisture"]    = round(moisture    * 100) / 100.0;
      doc["temperature"] = round(temperature * 100) / 100.0;
      doc["ph"]          = round(ph          * 100) / 100.0;
      doc["ec"]          = round(ec          * 100) / 100.0;
      doc["updatedAt"]   = epochSec;
      String body;
      serializeJson(doc, body);

      int soilCode = rtdbPut(PATH_SOIL_LATEST, body);
      Serial.printf("✅ soilData/latest PUT → %d\n", soilCode);
      if (soilCode == 200) {
        sendLog("Moisture:" + String(moisture,2) + " Temp:" + String(temperature,2)
              + " pH:" + String(ph,2) + " EC:" + String(ec,2));
        sendLog("Data pushed to Firebase OK");
      }
    }

    // ─── PUT /farmtechx/rainData/latest ───
    // isRaining matches the RainData interface { isRaining: bool, intensity?: number, updatedAt: number }
    {
      JsonDocument doc;
      doc["isRaining"]     = isRaining;
      doc["rainIntensity"] = rainAnalog;
      doc["updatedAt"]     = epochSec;
      String body;
      serializeJson(doc, body);

      int rainCode = rtdbPut(PATH_RAIN_LATEST, body);
      Serial.printf("🌧 rainData/latest PUT → %d\n", rainCode);
    }

  } else {
    Serial.println("⚠️ WiFi not connected — data not sent");
    sendLog("WiFi lost - reconnecting");
    // WiFiManager will handle reconnect on next cycle if possible
    WiFi.reconnect();
  }

  delay(2000);   // same 2-second cycle as original
}
