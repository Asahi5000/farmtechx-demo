"use client";
import React, { useEffect, useState } from "react";
import { listenTo, setValveState, setZoneSchedule, PATHS } from "@/config/realtimeService";
import type {
  SoilData,
  RainData,
  SolenoidValve,
  SolenoidValves,
  ZoneSchedule,
  PumpState,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────
type PageMode = "manual" | "automation";
type ZoneKey  = "zone1" | "zone2" | "zone3" | "zone4";

const ZONE_LABELS: Record<ZoneKey, string> = {
  zone1: "Zone 1",
  zone2: "Zone 2",
  zone3: "Zone 3",
  zone4: "Zone 4",
};

const MOISTURE_THRESHOLD = 40;

const DEFAULT_SCHEDULE: ZoneSchedule = {
  hour: 6, minute: 0, ampm: "AM", duration: 5, enabled: false,
};

// ─── Toggle Switch component ──────────────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 group disabled:opacity-50"
    >
      {/* Track */}
      <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
      }`}>
        {/* Thumb */}
        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`} />
      </span>
      <span className={`text-xs font-semibold ${checked ? "text-brand-500" : "text-gray-500 dark:text-gray-400"}`}>
        {label}
      </span>
    </button>
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
  const isOpen = valve?.state === "OPEN";
  const isAuto = valve?.mode  === "AUTO";
  const moisVal = moisture ?? 0;
  const autoWouldOpen = !isRaining && moisVal < MOISTURE_THRESHOLD;

  const handleAutoToggle    = (on: boolean) => onSet({ state: valve?.state ?? "CLOSED", mode: on ? "AUTO" : "MANUAL" });
  const handleForceOpen     = () => onSet({ state: "OPEN",   mode: "MANUAL" });
  const handleForceClose    = () => onSet({ state: "CLOSED", mode: "MANUAL" });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">

      {/* ── Header: title + valve badge ── */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 dark:text-white">{label}</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          !valve
            ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
            : isOpen
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        }`}>
          {valve ? (isOpen ? "OPEN" : "CLOSED") : "—"}
        </span>
      </div>

      {/* ── Soil Moisture ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>💦 Soil Moisture</span>
          <span className="font-semibold text-gray-800 dark:text-white">
            {moisture !== null ? `${moisVal.toFixed(1)}%` : "—"}
          </span>
        </div>
        {moisture !== null && (
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                moisVal >= MOISTURE_THRESHOLD ? "bg-blue-500" : "bg-yellow-400"
              }`}
              style={{ width: `${Math.min(moisVal, 100)}%` }}
            />
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span>Threshold: {MOISTURE_THRESHOLD}%</span>
          <span>{isRaining ? "🌧 Raining" : "☀️ Dry"}</span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-gray-100 dark:border-gray-700" />

      {/* ── AUTO MODE toggle switch ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">AUTO MODE</span>
        <ToggleSwitch
          checked={isAuto}
          onChange={handleAutoToggle}
          label={isAuto ? "ON" : "OFF"}
          disabled={loading}
        />
      </div>

      {/* ── AUTO state: info message ── */}
      {isAuto ? (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-4 py-3">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
            🤖 System is managing this zone automatically
          </p>
          <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-1">
            Will {autoWouldOpen ? (
              <span className="font-semibold text-green-600 dark:text-green-400">OPEN</span>
            ) : (
              <span className="font-semibold text-red-500">CLOSE</span>
            )} based on current conditions
          </p>
        </div>
      ) : (
        /* ── MANUAL state: Force open/close ── */
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Manual Control</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceOpen}
              disabled={loading || isOpen}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-green-500 hover:bg-green-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🔓</span> Force Open
            </button>
            <button
              onClick={handleForceClose}
              disabled={loading || !isOpen}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🔒</span> Force Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Zone Schedule Row ────────────────────────────────────────────────────────
function ZoneScheduleRow({
  zoneKey,
  label,
  schedule,
}: {
  zoneKey: ZoneKey;
  label: string;
  schedule: ZoneSchedule | null;
}) {
  const [hour,     setHour]     = useState(schedule?.hour     ?? 6);
  const [minute,   setMinute]   = useState(schedule?.minute   ?? 0);
  const [ampm,     setAmpm]     = useState<"AM" | "PM">(schedule?.ampm ?? "AM");
  const [duration, setDuration] = useState(schedule?.duration ?? 5);
  const [enabled,  setEnabled]  = useState(schedule?.enabled  ?? false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  // Sync from Supabase Realtime when parent data changes
  useEffect(() => {
    if (!schedule) return;
    setHour(schedule.hour);
    setMinute(schedule.minute);
    setAmpm(schedule.ampm);
    setDuration(schedule.duration);
    setEnabled(schedule.enabled);
  }, [schedule]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setZoneSchedule(zoneKey, { hour, minute, ampm, duration, enabled });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
      {/* Header + enable toggle */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 dark:text-white">{label}</h4>
        <ToggleSwitch
          checked={enabled}
          onChange={setEnabled}
          label={enabled ? "Enabled" : "Disabled"}
        />
      </div>

      {/* Schedule inputs */}
      <div className={`flex flex-wrap items-end gap-3 transition-opacity ${!enabled ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Hour</label>
          <select value={hour} onChange={(e) => setHour(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Minute</label>
          <select value={minute} onChange={(e) => setMinute(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
            {Array.from({ length: 60 }, (_, i) => i).map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">AM/PM</label>
          <select value={ampm} onChange={(e) => setAmpm(e.target.value as "AM" | "PM")}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Duration (min)</label>
          <input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
            className="w-24 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2 transition-colors">
        {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {saved ? "✅ Saved!" : "Save Schedule"}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ZoneIrrigationPage() {
  const [pageMode, setPageMode] = useState<PageMode>(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("zoneMode") as PageMode) ?? "manual"
      : "manual"
  );

  const [valves,        setValves]        = useState<SolenoidValves | null>(null);
  const [zoneSchedules, setZoneSchedules] = useState<Record<ZoneKey, ZoneSchedule | null>>({
    zone1: null, zone2: null, zone3: null, zone4: null,
  });
  const [soil,    setSoil]    = useState<SoilData | null>(null);
  const [rain,    setRain]    = useState<RainData | null>(null);
  const [loadingValve, setLoadingValve] = useState<Record<ZoneKey, boolean>>({
    zone1: false, zone2: false, zone3: false, zone4: false,
  });
  const [mainPump, setMainPump] = useState<PumpState | null>(null);

  // ── Listeners ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubs = [
      listenTo<SolenoidValves>(PATHS.SOLENOID_VALVES, setValves),
      listenTo<SoilData>(PATHS.SOIL_DATA, setSoil),
      listenTo<RainData>(PATHS.RAIN_DATA, setRain),
      listenTo<PumpState>(PATHS.PUMP_CONTROL, setMainPump),
      listenTo<Record<ZoneKey, ZoneSchedule>>(PATHS.ZONE_SCHEDULES, (data) => {
        setZoneSchedules({
          zone1: data?.zone1 ?? null,
          zone2: data?.zone2 ?? null,
          zone3: data?.zone3 ?? null,
          zone4: data?.zone4 ?? null,
        });
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // ── Auto valve logic ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!valves) return;
    const moisture  = soil?.moisture  ?? 0;
    const isRaining = rain?.isRaining ?? false;
    const isPumpRunning = mainPump?.state === "ON";
    const shouldOpen = !isRaining && (isPumpRunning || moisture < MOISTURE_THRESHOLD);

    (["zone1", "zone2", "zone3", "zone4"] as ZoneKey[]).forEach((z) => {
      const v = valves[z];
      if (!v || v.mode !== "AUTO") return;
      const target = shouldOpen ? "OPEN" : "CLOSED";
      if (v.state !== target) setValveState(z, { state: target, mode: "AUTO" });
    });
  }, [soil, rain, valves, mainPump]);

  const handleSetValve = async (zone: ZoneKey, valve: SolenoidValve) => {
    setLoadingValve((p) => ({ ...p, [zone]: true }));
    try { await setValveState(zone, valve); }
    finally { setLoadingValve((p) => ({ ...p, [zone]: false })); }
  };

  const handlePageMode = (m: PageMode) => {
    setPageMode(m);
    localStorage.setItem("zoneMode", m);
  };

  const moisture  = soil?.moisture  ?? null;
  const isRaining = rain?.isRaining ?? false;
  const zones: ZoneKey[] = ["zone1", "zone2", "zone3", "zone4"];

  return (
    <div className="space-y-6">

      {/* ── Page header + Manual / Automation toggle ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Zone Irrigation</h2>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          {(["manual", "automation"] as PageMode[]).map((m) => (
            <button key={m} onClick={() => handlePageMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                pageMode === m
                  ? "bg-brand-500 text-white shadow"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sensor status bar (always visible) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-3 flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span>💦</span>
          <span>Soil Moisture:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {moisture !== null ? `${moisture.toFixed(1)}%` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span>{isRaining ? "🌧" : "☀️"}</span>
          <span>Rain:</span>
          <span className={`font-semibold ${isRaining ? "text-blue-500" : "text-gray-900 dark:text-white"}`}>
            {isRaining ? "Raining" : "Not Raining"}
          </span>
        </div>
        <div className="flex items-center gap-3 ml-auto text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Dry &lt;{MOISTURE_THRESHOLD}%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Moist ≥{MOISTURE_THRESHOLD}%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Valve Open</span>
        </div>
      </div>

      {pageMode === "manual" ? (
        /* ── MANUAL MODE: 4 zone cards ── */
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            🌿 Zone Controls
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {zones.map((z) => (
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
      ) : (
        /* ── AUTOMATION MODE: per-zone schedule cards ── */
        <section className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                🗓 Zone Schedules
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Set an irrigation time and duration for each zone. The ESP32 will open the valve at the scheduled time.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {zones.map((z) => (
              <ZoneScheduleRow
                key={z}
                zoneKey={z}
                label={ZONE_LABELS[z]}
                schedule={zoneSchedules[z]}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
