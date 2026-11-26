# FarmTechX Irrigation & Dosing Automation Status Report & Test Guide

This document captures the current status of the FarmTechX ESP32 firmware, the CMS integration accomplishments, and a step-by-step guide for performing the remaining **Test 3 (Refill & Resume)** in your new Antigravity IDE environment.

---

## 🛠️ Accomplishments & Fixed Issues

### 1. Relay Hardening (Inrush Current Fix)
* **Issue:** The ESP32 board would chatter, flap relays, or crash/reset immediately upon boot-up due to a massive inrush current when multiple relays briefly initialized at the same time.
* **Fix:** Hardened the relay boot sequence in the `setup()` function of the Water Device firmware. All relays (`PUMP_SSR`, `RELAY_A`, `RELAY_B`, `RELAY_C`, `RELAY_D`, `SOLENOID_REFILL`, `ZONE_1`, `ZONE_2`, `ZONE_3`) are configured as outputs and sequentially driven `HIGH` (turned off) with safety gaps to prevent concurrent triggers.

### 2. The "Last Run" 64-Bit Timestamp Bug
* **Issue:** When a schedule finished executing, the "Last Run" field in the Next.js CMS dashboard showed **"Never"** or flipped to the year **1970**.
* **Fix:** The firmware was using 32-bit unsigned longs to store epoch milliseconds, which caused an integer overflow. We upgraded the timestamp tracking to 64-bit (`uint64_t` / `uint64_t` epoch milliseconds) and rewrote `markScheduleExecuted` to use `ArduinoJson` serialization for consistent Supabase gateway payloads.
* **Dashboard Cache/NTP Sync Explain:** The dashboard listens in real time, but Next.js router caching occasionally made the browser show older cached data unless hard reloaded. The ESP32 also waits for safety rest durations before writing the final timestamp to Supabase.

### 3. CMS Database Integration Crash (Undefined Values)
* **Issue:** Adding a new schedule with a blank target EC or pH caused the React CMS app to crash because undefined values are not valid JSON database fields.
* **Fix:** Updated the `addSchedule` function in `/src/app/(admin)/pumps/page.tsx` to sanitize state values, defaulting empty EC/pH fields to `0` instead of leaving them `undefined`.

### 4. Soil Moisture & Rain Interlock Logic (Test 2 ✅ Passed)
* **Issue:** Schedules were firing even if it was raining or the soil was muddy, wasting water/fertilizer.
* **Fix:** Integrated `checkSoilRain()` which halts scheduling if either:
  * Soil moisture $\ge 50\%$
  * Rain intensity $\ge 50\%$
* **Test 2 Result:** During 2:20 AM schedule testing under wet conditions (68% moisture, raining), the ESP32 successfully caught the schedule, **blocked the valves/pumps from turning on**, marked the schedule's `lastExecuted` field, and logged `"Automation skipped - soil wet or raining"` to safety-abort the run.
* **HTTP Rate Limiter Fix Added:** Refined the active state machine loop so it limits `checkSoilRain` Supabase API calls to **once every 60 seconds** during irrigation instead of spamming 40+ requests per second, which previously throttled WiFi and caused connection timeouts.

---

## 🧪 How to Perform Test 3: Tank Low / Mid-run Refill & Resume

The goal of this test is to verify that if the water level drops to critical low **during** an active schedule, the system safely pauses irrigation (turning off pumps and zones) and kicks on the Refill Solenoid. Once the tank is refilled (float sensor goes up), the system must re-stabilize, check target pH/EC adjustments, and then resume the remaining watering duration.

### Step 1: Prepare the Hardware & Environment (Dry Soil & Full Tank)
1. **Soil & Rain Sensors:** Make sure the soil and rain sensor values are dry ($<50\%$) so the interlock doesn't block the test from firing.
2. **Float Sensor:** Keep the float sensor **UP** (signaling a full tank: `HIGH` status in the dashboard).

### Step 2: Create a Schedule in the CMS
Go to your Dashboard -> Schedule Management and add a test configuration:
* **Time:** Set it to 3 minutes ahead of your local time.
* **Duration (min):** `5` (We choose 5 minutes so you have plenty of time to play with the float sensor).
* **Target pH/EC:** `6 / 0`.
* **Valves:** Check `Zone 1` and `Zone 2`.
* Click **Add Schedule**.

### Step 3: Wait for Schedule to Trigger
1. At the scheduled minute, the ESP32 will trigger.
2. You should hear/see the relays click **ON** (Main Water Pump, Zone 1, and Zone 2 relays turn active).
3. Live Logs on the dashboard will write: `🚀 Automation started for schedule key ...`

### Step 4: Simulate "Low Water" (Trigger the Pause)
1. Let the system irrigate for 1 to 2 minutes.
2. **Push the Float Sensor DOWN** (simulating that the water reservoir has hit the "Critically Low" level).
3. **What to observe immediately:**
   * The **Main Water Pump** relay turns **OFF** (to protect it from running dry).
   * **Zone 1** and **Zone 2** solenoid relays turn **OFF** (valves close).
   * The **Refill Solenoid Relay** turns **ON** (its light lights up to fill the tank).
   * Dashboard Live Logs write: `Tank LOW: Refilling started. Automation paused.`

### Step 5: Simulate "Tank Refilled" (Trigger the Resume)
1. Keep the float sensor down for a few seconds. The Refill Solenoid relay remains on.
2. **Pull the Float Sensor back UP** (simulating that the refill valve did its job and the tank status is now `HIGH`).
3. **What to observe immediately:**
   * The **Refill Solenoid Relay** turns **OFF** (water valve closed).
   * The system will enter the state machine from the beginning to check pH/EC stability (since fresh water was filled).
   * After checking targets, the **Main Water Pump**, **Zone 1**, and **Zone 2** relays will turn **BACK ON**.
   * It will irrigate for the remaining duration left (e.g., if it paused at 2 minutes of a 5-minute run, it will run for another 3 minutes).
   * Live Logs will register: `Interrupted watering: Resuming pH/EC dosing for fresh water!`

### Step 6: Verify Completion
1. Let the remaining 3 minutes finish.
2. At the end of the countdown, the Main Water Pump and Zones will turn off.
3. The dashboard dynamic table should immediately update the schedule's **"Last Run"** column to the current date and execution time stamp!

---

## 📂 Active Core Files

Use the Supabase-backed firmware and application files in this repository:
* **Water Controller & State Machine:** [WATER_LEVEL_DEVICE_ESP32_CODE.ino](./WATER_LEVEL_DEVICE_ESP32_CODE.ino)
* **Water Sensor Node:** [WATER_SENSOR_DEVICE.ino](./WATER_SENSOR_DEVICE.ino)
* **Soil & Rain Sensor Node:** [SOIL_MOISTURE_DEVICE_ESP32_CODE.ino](./SOIL_MOISTURE_DEVICE_ESP32_CODE.ino)
* **Irrigation Dashboard:** [pumps/page.tsx](./src/app/(admin)/pumps/page.tsx)
* **Supabase device gateway:** [farm-device/index.ts](./supabase/functions/farm-device/index.ts)
