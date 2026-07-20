"use client";
import React, { useEffect, useState } from "react";
import {
  listenTo,
  setPumpState,
  addSchedule,
  deleteSchedule,
  setValveState,
  PATHS,
} from "@/config/realtimeService";
import type { PumpState, DosingPumps, WaterSchedule, SoilData, RainData, SolenoidValve, SolenoidValves } from "@/types";

type Mode = "manual" | "automation";
type PumpKey = "main" | "A" | "B" | "C" | "D";
type ZoneKey = "zone1" | "zone2" | "zone3" | "zone4";

const MOISTURE_THRESHOLD = 40;

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
function ZoneCard({ zoneKey, label, valve, onSet, loading }: { zoneKey: ZoneKey; label: string; valve: SolenoidValve | null; onSet: (v: SolenoidValve) => void; loading: boolean; }) {
  const isOpen = valve?.state === "OPEN";

  const handleOpen  = () => onSet({ state: "OPEN",   mode: "MANUAL" });
  const handleClose = () => onSet({ state: "CLOSED", mode: "MANUAL" });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 dark:text-white">{label}</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${!valve ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500" : isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
          {valve ? (isOpen ? "OPEN" : "CLOSED") : "—"}
        </span>
      </div>
      
      <div className="border-t border-gray-100 dark:border-gray-700" />
      <div className="space-y-2">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Manual Control</p>
        <div className="flex items-center gap-2">
          <button onClick={handleOpen} disabled={loading || isOpen} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-green-500 hover:bg-green-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Open</button>
          <button onClick={handleClose} disabled={loading || !isOpen} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tank Level Card ──────────────────────────────────────────────────────────
function TankLevelCard({ waterLevel }: { waterLevel: { status: string; updatedAt: number } | null }) {
  const status = waterLevel?.status || "UNKNOWN";
  
  let colorClass = "bg-gray-100 text-gray-500";
  let displayStatus = "WAITING FOR SENSOR...";
  let tankFillPercent = 0;
  
  if (status === "HIGH") {
    colorClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
    displayStatus = "FULL CAPACITY";
    tankFillPercent = 100;
  } else if (status === "LOW") {
    colorClass = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
    displayStatus = "CRITICALLY LOW";
    tankFillPercent = 10;
  } else if (status === "EMPTY") {
    colorClass = "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400";
    displayStatus = "PARTIAL LEVEL";
    tankFillPercent = 50;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4 outline outline-2 outline-transparent focus-within:outline-brand-500 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="font-semibold text-gray-800 dark:text-white text-sm flex items-center gap-2">
          💧 Main Water Tank Status
        </h4>
        <span className={`px-3 py-1 rounded-md text-xs font-bold ${colorClass} text-center`}>
          {displayStatus}
        </span>
      </div>
      
      <div className="relative h-12 w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
        <div 
          className="absolute bottom-0 left-0 h-full bg-blue-500/80 transition-all duration-1000 ease-in-out"
          style={{ width: `${tankFillPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold z-10"
             style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.8)", color: "white" }}>
          {status === "LOW" ? "⚠️ AUTO-REFILLING ACTIVE..." : status === "HIGH" ? "MAXIMUM LEVEL REACHED" : "NOMINAL LEVEL"}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PumpsPage() {
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("pumpsMode") as Mode) ?? "manual"
      : "manual"
  );

  const [mainPump, setMainPump]       = useState<PumpState | null>(null);
  const [dosingPumps, setDosingPumps] = useState<DosingPumps | null>(null);
  const [loadingPump, setLoadingPump] = useState<Record<string, boolean>>({});

  const [schedules, setSchedules]     = useState<Record<string, WaterSchedule>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [schHour, setSchHour]         = useState(6);
  const [schMin, setSchMin]           = useState(0);
  const [schAmpm, setSchAmpm]         = useState<"AM" | "PM">("AM");
  const [schDuration, setSchDuration] = useState(5);
  const [schDurationSec, setSchDurationSec] = useState(0);
  const [schTargetPh, setSchTargetPh] = useState<number | ''>(7.0);
  const [schTargetEc, setSchTargetEc] = useState<number | ''>(1.5);
  const [schZones, setSchZones] = useState<number[]>([]);
  const [schLoading, setSchLoading]   = useState(false);

  const [valves,        setValves]        = useState<SolenoidValves | null>(null);
  const [waterLevel,    setWaterLevel]    = useState<{ status: string; updatedAt: number } | null>(null);
  const [soil,    setSoil]    = useState<SoilData | null>(null);
  const [rain,    setRain]    = useState<RainData | null>(null);
  const [loadingValve, setLoadingValve] = useState<Record<ZoneKey, boolean>>({
    zone1: false, zone2: false, zone3: false, zone4: false,
  });
  const [pendingModeSwitch, setPendingModeSwitch] = useState<Mode | null>(null);

  useEffect(() => {
    const unsubs = [
      listenTo<PumpState>(PATHS.PUMP_CONTROL, setMainPump),
      listenTo<DosingPumps>(PATHS.DOSING_PUMPS, setDosingPumps),
      listenTo<Record<string, WaterSchedule>>(PATHS.SCHEDULES, (d) => setSchedules(d ?? {})),
      listenTo<SolenoidValves>(PATHS.SOLENOID_VALVES, setValves),
      listenTo<{ status: string; updatedAt: number }>(PATHS.WATER_LEVEL, setWaterLevel),
      listenTo<SoilData>(PATHS.SOIL_DATA, setSoil),
      listenTo<RainData>(PATHS.RAIN_DATA, setRain),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const handleSetValve = async (zone: ZoneKey, valve: SolenoidValve) => {
    setLoadingValve((p) => ({ ...p, [zone]: true }));
    try { await setValveState(zone, valve); }
    finally { setLoadingValve((p) => ({ ...p, [zone]: false })); }
  };

  const requestModeSwitch = (m: Mode) => {
    if (m === "automation" && mode === "manual") {
      setPendingModeSwitch(m);
    } else {
      executeModeSwitch(m);
    }
  };

  const executeModeSwitch = async (newMode: Mode) => {
    setPendingModeSwitch(null);
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
    localStorage.setItem("pumpsMode", newMode);
  };

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

  const handleZoneToggle = (zone: number) => {
    setSchZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (schZones.length === 0) return alert("Please select at least one zone.");
    const isDuplicate = Object.values(schedules).some(
      (s) => s.hour === schHour && s.minute === schMin && s.ampm === schAmpm
    );
    if (isDuplicate) return alert("A schedule at this time already exists.");
    setSchLoading(true);
    try {
      await addSchedule({
        hour: schHour,
        minute: schMin,
        ampm: schAmpm,
        duration: schDuration,
        durationSec: schDurationSec,
        targetPH: schTargetPh ? Number(schTargetPh) : 0,
        targetEC: schTargetEc ? Number(schTargetEc) : 0,
        zones: schZones,
      });
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
      let h = (s.hour ?? 0) % 12;
      if (s.ampm === "PM") h += 12;
      return h * 60 + (s.minute ?? 0);
    };
    return toMins(a) - toMins(b);
  });

  return (
    <div className="space-y-6">
      {/* Header + mode toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pump Control</h2>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          {(["manual", "automation"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => requestModeSwitch(m)}
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

      <TankLevelCard waterLevel={waterLevel} />

      {mode === "manual" ? (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            💧 Pump Controls
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PumpCard label="Main Water Pump"  pump={mainPump}               onToggle={(m, s) => handlePumpToggle("main", m, s)} loading={!!loadingPump["main"]} />
            <PumpCard label="Dosing Pump A"    pump={dosingPumps?.A ?? null} onToggle={(m, s) => handlePumpToggle("A", m, s)}    loading={!!loadingPump["A"]} />
            <PumpCard label="Dosing Pump B"    pump={dosingPumps?.B ?? null} onToggle={(m, s) => handlePumpToggle("B", m, s)}    loading={!!loadingPump["B"]} />
            <PumpCard label="Dosing Pump C"    pump={dosingPumps?.C ?? null} onToggle={(m, s) => handlePumpToggle("C", m, s)}    loading={!!loadingPump["C"]} />
            <PumpCard label="Dosing Pump D"    pump={dosingPumps?.D ?? null} onToggle={(m, s) => handlePumpToggle("D", m, s)}    loading={!!loadingPump["D"]} />
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-8 mb-4">
            🌿 Zone Controls
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(["zone1", "zone2", "zone3"] as ZoneKey[]).map((z) => (
              <ZoneCard
                key={z}
                zoneKey={z}
                label={z === "zone1" ? "Zone 1" : z === "zone2" ? "Zone 2" : "Zone 3"}
                valve={valves?.[z] ?? null}
                onSet={(v) => handleSetValve(z, v)}
                loading={loadingValve[z]}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            🗓 Schedule Management
          </h3>

          {/* Add Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Add Schedule</h4>
            <form onSubmit={handleAddSchedule} className="flex flex-col gap-4">
              {/* Row 1 */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Hour</label>
                  <select value={schHour} onChange={(e) => setSchHour(Number(e.target.value))} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (<option key={h} value={h}>{String(h).padStart(2, "0")}</option>))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Minute</label>
                  <select value={schMin} onChange={(e) => setSchMin(Number(e.target.value))} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (<option key={m} value={m}>{String(m).padStart(2, "0")}</option>))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">AM/PM</label>
                  <select value={schAmpm} onChange={(e) => setSchAmpm(e.target.value as "AM" | "PM")} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                    <option value="AM">AM</option><option value="PM">PM</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Duration (min)</label>
                  <input type="number" min={0} value={schDuration} onChange={(e) => setSchDuration(Number(e.target.value))} className="w-24 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Duration (sec)</label>
                  <input type="number" min={0} max={59} value={schDurationSec} onChange={(e) => setSchDurationSec(Number(e.target.value))} className="w-24 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Target pH</label>
                  <input type="number" step="0.1" min={0} max={14} value={schTargetPh} onChange={(e) => setSchTargetPh(e.target.value ? Number(e.target.value) : '')} className="w-32 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Target EC</label>
                  <input type="number" step="0.1" min={0} max={10} value={schTargetEc} onChange={(e) => setSchTargetEc(e.target.value ? Number(e.target.value) : '')} className="w-32 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-400">Valve Selection</label>
                <div className="flex flex-wrap items-center gap-4">
                  {[1, 2, 3].map((z) => (
                    <label key={z} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={schZones.includes(z)} onChange={() => handleZoneToggle(z)} className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500" />
                      Zone {z}
                    </label>
                  ))}
                </div>
              </div>

              {/* Row 4 */}
              <div className="mt-2">
                <button type="submit" disabled={schLoading} className="px-5 py-2 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                  {schLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Add Schedule
                </button>
              </div>
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
                  <th className="px-5 py-3 text-left whitespace-nowrap">Targets (pH/EC)</th>
                  <th className="px-5 py-3 text-left whitespace-nowrap">Zones</th>
                  <th className="px-5 py-3 text-left whitespace-nowrap">Last Run</th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedSchedules.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No schedules yet.</td></tr>
                ) : (
                  sortedSchedules.map(([id, s]) => (
                    <tr key={id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-white whitespace-nowrap">
                        {s.hour != null && s.minute != null
                          ? `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")} ${s.ampm ?? ''}`
                          : <span className="text-red-400">Invalid</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {s.duration ?? 0}m {s.durationSec ? `${s.durationSec}s` : ''}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {s.targetPH ? `pH ${s.targetPH}` : '--'} / {s.targetEC ? `EC ${s.targetEC}` : '--'}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {s.zones && s.zones.length > 0 ? s.zones.map(z => `Z${z}`).join(', ') : '--'}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {s.lastExecuted
                          ? new Date(Number(s.lastExecuted) < 1e12 ? Number(s.lastExecuted) * 1000 : Number(s.lastExecuted)).toLocaleString()
                          : <span className="text-gray-300 dark:text-gray-600">Never</span>}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setDeleteTarget(id)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
      )}

      {/* Modal - Delete Schedule Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Schedule?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleDeleteSchedule}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Mode Switch Confirm */}
      {pendingModeSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Switch to Automation?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Switching to Automation will turn off all active pumps. Continue?</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingModeSwitch(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                No
              </button>
              <button onClick={() => executeModeSwitch(pendingModeSwitch)}
                className="flex-1 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold">
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
