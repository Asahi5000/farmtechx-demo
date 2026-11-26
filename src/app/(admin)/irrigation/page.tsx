"use client";
import React, { useEffect, useState } from "react";
import {
  listenTo,
  setPumpState,
  setValveState,
  addSchedule,
  deleteSchedule,
  PATHS,
} from "@/config/realtimeService";
import type {
  PumpState,
  DosingPumps,
  WaterSchedule,
  SoilData,
  RainData,
  SolenoidValve,
  SolenoidValves,
} from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────
type Mode = "manual" | "automation";
type PumpKey = "main" | "A" | "B" | "C" | "D";
type ZoneKey = "zone1" | "zone2" | "zone3" | "zone4";

const ZONE_LABELS: Record<ZoneKey, string> = {
  zone1: "Zone 1",
  zone2: "Zone 2",
  zone3: "Zone 3",
  zone4: "Zone 4",
};
const MOISTURE_THRESHOLD = 40; // %

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(endTime?: number): string {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!endTime) {
      const id = requestAnimationFrame(() => setRemaining(""));
      return () => cancelAnimationFrame(id);
    }
    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) {
        setRemaining("Done");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}m ${s.toString().padStart(2, "0")}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return remaining;
}

// ─── Pump Card ────────────────────────────────────────────────────────────────
function PumpCard({
  label,
  pump,
  onToggle,
  loading,
}: {
  label: string;
  pump: PumpState | null;
  onToggle: (mins: number, secs: number) => void;
  loading: boolean;
}) {
  const [mins, setMins] = useState(0);
  const [secs, setSecs] = useState(30);
  const countdown = useCountdown(pump?.state === "ON" ? pump.endTime : undefined);
  const isOn = pump?.state === "ON";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 dark:text-white text-sm">{label}</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isOn ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {isOn ? "ON" : "OFF"}
        </span>
      </div>

      {isOn && countdown && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ⏱ Remaining: <span className="font-mono font-semibold text-gray-800 dark:text-white">{countdown}</span>
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center">
          <label className="text-xs text-gray-400 mb-1">Min</label>
          <input
            type="number" min={0} max={60} value={mins}
            onChange={(e) => setMins(Number(e.target.value))}
            className="w-16 text-center border border-gray-200 dark:border-gray-600 rounded-lg p-1.5 text-sm dark:bg-gray-700 dark:text-white"
          />
        </div>
        <span className="mt-4 text-gray-400">:</span>
        <div className="flex flex-col items-center">
          <label className="text-xs text-gray-400 mb-1">Sec</label>
          <input
            type="number" min={0} max={59} value={secs}
            onChange={(e) => setSecs(Number(e.target.value))}
            className="w-16 text-center border border-gray-200 dark:border-gray-600 rounded-lg p-1.5 text-sm dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <button
        onClick={() => onToggle(mins, secs)}
        disabled={loading}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
          isOn ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"
        } disabled:opacity-50 flex items-center justify-center gap-2`}
      >
        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {isOn ? `Turn ${label} OFF` : `Turn ${label} ON`}
      </button>
    </div>
  );
}

// ─── Zone Card ────────────────────────────────────────────────────────────────
function ZoneCard({
  zoneKey,
  label,
  valve,
  moisture,
  isRaining,
  onSet,
  loading,
}: {
  zoneKey: ZoneKey;
  label: string;
  valve: SolenoidValve | null;
  moisture: number | null;
  isRaining: boolean;
  onSet: (v: SolenoidValve) => void;
  loading: boolean;
}) {
  const isOpen   = valve?.state === "OPEN";
  const isAuto   = valve?.mode  === "AUTO";
  const moisVal  = moisture ?? 0;

  // Derived AUTO decision
  const autoWouldOpen = !isRaining && moisVal < MOISTURE_THRESHOLD;

  const handleModeToggle = () => {
    onSet({ state: valve?.state ?? "CLOSED", mode: isAuto ? "MANUAL" : "AUTO" });
  };
  const handleForceOpen  = () => onSet({ state: "OPEN",   mode: "MANUAL" });
  const handleForceClose = () => onSet({ state: "CLOSED", mode: "MANUAL" });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 dark:text-white">{label}</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
          {valve ? (isOpen ? "OPEN" : "CLOSED") : "—"}
        </span>
      </div>

      {/* Moisture */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>💦 Soil Moisture</span>
          <span className="font-semibold text-gray-800 dark:text-white">
            {moisture !== null ? `${moisVal.toFixed(1)}%` : "—"}
          </span>
        </div>
        {moisture !== null && (
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${moisVal >= MOISTURE_THRESHOLD ? "bg-blue-500" : "bg-yellow-400"}`}
              style={{ width: `${Math.min(moisVal, 100)}%` }}
            />
          </div>
        )}
        <p className="text-[10px] text-gray-400">
          Threshold: {MOISTURE_THRESHOLD}% &nbsp;·&nbsp;
          {isRaining ? "🌧 Raining" : "☀️ Dry"}
        </p>
      </div>

      {/* AUTO info */}
      {isAuto && (
        <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">
          AUTO: valve will {autoWouldOpen ? "OPEN" : "CLOSE"} based on current conditions
        </p>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleModeToggle}
          disabled={loading}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            isAuto
              ? "bg-brand-500 text-white border-brand-500"
              : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          } disabled:opacity-50`}
        >
          AUTO
        </button>
        <button
          onClick={handleModeToggle}
          disabled={loading}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            !isAuto
              ? "bg-brand-500 text-white border-brand-500"
              : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          } disabled:opacity-50`}
        >
          MANUAL
        </button>
      </div>

      {/* Force buttons — only shown in MANUAL mode */}
      {!isAuto && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleForceOpen}
            disabled={loading || isOpen}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-500 hover:bg-green-600 text-white disabled:opacity-40 transition-colors"
          >
            Force Open
          </button>
          <button
            onClick={handleForceClose}
            disabled={loading || !isOpen}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 transition-colors"
          >
            Force Close
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IrrigationPage() {
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("irrigationMode") as Mode) ?? "manual"
      : "manual"
  );

  // Pump state
  const [mainPump, setMainPump]     = useState<PumpState | null>(null);
  const [dosingPumps, setDosingPumps] = useState<DosingPumps | null>(null);
  const [loadingPump, setLoadingPump] = useState<Record<string, boolean>>({});

  // Valve state
  const [valves, setValves]   = useState<SolenoidValves | null>(null);
  const [loadingValve, setLoadingValve] = useState<Record<ZoneKey, boolean>>({
    zone1: false, zone2: false, zone3: false, zone4: false,
  });

  // Sensor state
  const [soil, setSoil]   = useState<SoilData | null>(null);
  const [rain, setRain]   = useState<RainData | null>(null);

  // Schedule state
  const [schedules, setSchedules] = useState<Record<string, WaterSchedule>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [schHour, setSchHour]     = useState(6);
  const [schMin, setSchMin]       = useState(0);
  const [schAmpm, setSchAmpm]     = useState<"AM" | "PM">("AM");
  const [schDuration, setSchDuration] = useState(5);
  const [schLoading, setSchLoading] = useState(false);

  // ── Supabase Realtime listeners ─────────────────────────────────────────────
  useEffect(() => {
    const unsubs = [
      listenTo<PumpState>(PATHS.PUMP_CONTROL, setMainPump),
      listenTo<DosingPumps>(PATHS.DOSING_PUMPS, setDosingPumps),
      listenTo<SolenoidValves>(PATHS.SOLENOID_VALVES, setValves),
      listenTo<SoilData>(PATHS.SOIL_DATA, setSoil),
      listenTo<RainData>(PATHS.RAIN_DATA, setRain),
      listenTo<Record<string, WaterSchedule>>(PATHS.SCHEDULES, (d) => setSchedules(d ?? {})),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // ── Auto valve logic (runs whenever moisture / rain / mode changes) ─────────
  useEffect(() => {
    if (!valves) return;
    const moisture = soil?.moisture ?? 0;
    const isRaining = rain?.isRaining ?? false;
    const isPumpRunning = mainPump?.state === "ON";
    const shouldOpen = !isRaining && (isPumpRunning || moisture < MOISTURE_THRESHOLD);

    const zones: ZoneKey[] = ["zone1", "zone2", "zone3", "zone4"];
    zones.forEach((z) => {
      const v = valves[z];
      if (!v || v.mode !== "AUTO") return;
      const targetState = shouldOpen ? "OPEN" : "CLOSED";
      if (v.state !== targetState) {
        setValveState(z, { state: targetState, mode: "AUTO" });
      }
    });
  }, [soil, rain, valves, mainPump?.state]);

  // ── Mode switch ─────────────────────────────────────────────────────────────
  const handleModeSwitch = async (newMode: Mode) => {
    if (newMode === "automation") {
      const off: PumpState = { state: "OFF" };
      await Promise.all([
        setPumpState("main", off),
        setPumpState("A", off),
        setPumpState("B", off),
        setPumpState("C", off),
        setPumpState("D", off),
      ]);
    }
    setMode(newMode);
    localStorage.setItem("irrigationMode", newMode);
  };

  // ── Pump toggle ─────────────────────────────────────────────────────────────
  const handlePumpToggle = async (pump: PumpKey, mins: number, secs: number) => {
    const current =
      pump === "main" ? mainPump : dosingPumps?.[pump as "A" | "B" | "C" | "D"] ?? null;
    setLoadingPump((p) => ({ ...p, [pump]: true }));
    try {
      if (current?.state === "ON") {
        await setPumpState(pump, { state: "OFF" });
      } else {
        const durationSeconds = mins * 60 + secs;
        const startTime = Date.now();
        await setPumpState(pump, {
          state: "ON",
          startTime,
          durationSeconds,
          endTime: startTime + durationSeconds * 1000,
        });
      }
    } finally {
      setLoadingPump((p) => ({ ...p, [pump]: false }));
    }
  };

  // ── Valve set ───────────────────────────────────────────────────────────────
  const handleSetValve = async (zone: ZoneKey, valve: SolenoidValve) => {
    setLoadingValve((p) => ({ ...p, [zone]: true }));
    try {
      await setValveState(zone, valve);
    } finally {
      setLoadingValve((p) => ({ ...p, [zone]: false }));
    }
  };

  // ── Schedule handlers ───────────────────────────────────────────────────────
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDuplicate = Object.values(schedules).some(
      (s) => s.hour === schHour && s.minute === schMin && s.ampm === schAmpm
    );
    if (isDuplicate) return alert("A schedule at this time already exists.");
    setSchLoading(true);
    try {
      await addSchedule({ hour: schHour, minute: schMin, ampm: schAmpm, duration: schDuration });
    } finally {
      setSchLoading(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteTarget) return;
    await deleteSchedule(deleteTarget);
    setDeleteTarget(null);
  };

  const sortedSchedules = Object.entries(schedules).sort(([, a], [, b]) => {
    const toMins = (s: WaterSchedule) => {
      let h = s.hour % 12;
      if (s.ampm === "PM") h += 12;
      return h * 60 + s.minute;
    };
    return toMins(a) - toMins(b);
  });

  const moisture = soil?.moisture ?? null;
  const isRaining = rain?.isRaining ?? false;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header + mode toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Irrigation Control</h2>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          {(["manual", "automation"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeSwitch(m)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                mode === m
                  ? "bg-brand-500 text-white shadow"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "manual" ? (
        <>
          {/* ─── PUMP CONTROLS ─── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              💧 Pump Controls
            </h3>
            {/* 3-col on lg, 1-col on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <PumpCard
                label="Main Water Pump"
                pump={mainPump}
                onToggle={(m, s) => handlePumpToggle("main", m, s)}
                loading={!!loadingPump["main"]}
              />
              <PumpCard
                label="Dosing Pump A"
                pump={dosingPumps?.A ?? null}
                onToggle={(m, s) => handlePumpToggle("A", m, s)}
                loading={!!loadingPump["A"]}
              />
              <PumpCard
                label="Dosing Pump B"
                pump={dosingPumps?.B ?? null}
                onToggle={(m, s) => handlePumpToggle("B", m, s)}
                loading={!!loadingPump["B"]}
              />
              <PumpCard
                label="Dosing Pump C"
                pump={dosingPumps?.C ?? null}
                onToggle={(m, s) => handlePumpToggle("C", m, s)}
                loading={!!loadingPump["C"]}
              />
              <PumpCard
                label="Dosing Pump D"
                pump={dosingPumps?.D ?? null}
                onToggle={(m, s) => handlePumpToggle("D", m, s)}
                loading={!!loadingPump["D"]}
              />
            </div>
          </section>

          {/* ─── ZONE IRRIGATION ─── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                🌿 Zone Irrigation
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" /> Dry (&lt;{MOISTURE_THRESHOLD}%)
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-2" /> Moist (≥{MOISTURE_THRESHOLD}%)
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["zone1", "zone2", "zone3", "zone4"] as ZoneKey[]).map((z) => (
                <ZoneCard
                  key={z}
                  zoneKey={z}
                  label={ZONE_LABELS[z]}
                  valve={valves?.[z] ?? null}
                  moisture={moisture}
                  isRaining={isRaining}
                  onSet={(v) => handleSetValve(z, v)}
                  loading={loadingValve[z]}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}

      {/* ─── AUTOMATION SCHEDULE (shown in both modes, prominent in automation) ─── */}
      <section className="space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          🗓 Schedule Management
        </h3>

        {/* Add Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Add Schedule</h4>
          <form onSubmit={handleAddSchedule} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Hour</label>
              <select
                value={schHour}
                onChange={(e) => setSchHour(Number(e.target.value))}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Minute</label>
              <select
                value={schMin}
                onChange={(e) => setSchMin(Number(e.target.value))}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              >
                {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">AM/PM</label>
              <select
                value={schAmpm}
                onChange={(e) => setSchAmpm(e.target.value as "AM" | "PM")}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Duration (min)</label>
              <input
                type="number" min={1} value={schDuration}
                onChange={(e) => setSchDuration(Number(e.target.value))}
                className="w-24 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={schLoading}
              className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {schLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Add Schedule
            </button>
          </form>
        </div>

        {/* Schedule Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left whitespace-nowrap">Time</th>
                <th className="px-5 py-3 text-left whitespace-nowrap">Duration</th>
                <th className="px-5 py-3 text-left whitespace-nowrap">Last Run</th>
                <th className="px-5 py-3 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedSchedules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    No schedules yet.
                  </td>
                </tr>
              ) : (
                sortedSchedules.map(([id, s]) => (
                  <tr key={id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-white whitespace-nowrap">
                      {String(s.hour).padStart(2, "0")}:{String(s.minute).padStart(2, "0")} {s.ampm}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{s.duration} min</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {s.lastExecuted
                        ? new Date(s.lastExecuted).toLocaleString()
                        : <span className="text-gray-300 dark:text-gray-600">Never</span>}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setDeleteTarget(id)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* ─── Delete Confirm Modal ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Schedule?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSchedule}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
