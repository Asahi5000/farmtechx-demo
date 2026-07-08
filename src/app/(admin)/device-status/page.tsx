"use client";
import React, { useEffect, useRef, useState } from "react";
import { listenTo, listenToLatestWaterReadings, PATHS } from "@/config/realtimeService";
import type { WaterSensorReading, SoilData } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
type DeviceStatus = "ONLINE" | "WARNING" | "OFFLINE";
interface LogEntry { key: string; timestamp: string; message: string; }

// ─── Status helpers ───────────────────────────────────────────────────────────
function getStatus(updatedAt: number | undefined): { status: DeviceStatus; ageSec: number } {
  if (!updatedAt) return { status: "OFFLINE", ageSec: Infinity };
  // ESP32 stores createdAt as Unix seconds (time(nullptr)).
  // Date.now() is milliseconds. Normalize: if value < 1e12 it's in seconds.
  const tsMs = updatedAt < 1e12 ? updatedAt * 1000 : updatedAt;
  const ageSec = Math.floor((Date.now() - tsMs) / 1000);
  if (ageSec < 30)  return { status: "ONLINE",  ageSec };
  if (ageSec < 120) return { status: "WARNING", ageSec };
  return { status: "OFFLINE", ageSec };
}

function fmtAge(ageSec: number): string {
  if (!isFinite(ageSec)) return "No data";
  if (ageSec < 60)  return `${ageSec}s ago`;
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`;
  return `>${Math.floor(ageSec / 3600)}h ago`;
}

const STATUS_STYLES: Record<DeviceStatus, { badge: string; dot: string; ring: string; label: string }> = {
  ONLINE:  { badge: "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",  dot: "bg-green-500",  ring: "ring-green-200  dark:ring-green-800",  label: "ONLINE" },
  WARNING: { badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-400", ring: "ring-yellow-200 dark:ring-yellow-800", label: "WARNING" },
  OFFLINE: { badge: "bg-red-100    text-red-600    dark:bg-red-900/30    dark:text-red-400",    dot: "bg-red-500",   ring: "ring-red-200    dark:ring-red-800",    label: "OFFLINE" },
};

// ─── Metric pill ─────────────────────────────────────────────────────────────
function Metric({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 min-w-[80px]">
      <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{label}</span>
      <span className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
        {value !== null ? value : <span className="text-gray-400 text-sm">—</span>}
      </span>
      {unit && <span className="text-[10px] text-gray-400">{unit}</span>}
    </div>
  );
}

// ─── Live Logs panel (controlled — open state lives in the page) ──────────────
function LiveLogs({
  logPath,
  open,
  onToggle,
}: {
  logPath: string;
  open: boolean;
  onToggle: () => void;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const unsub = listenTo<Record<string, { timestamp: string; message: string }>>(
      logPath,
      (data) => {
        if (!data) return setLogs([]);
        const entries = Object.entries(data)
          .map(([key, v]) => ({ key, timestamp: v.timestamp, message: v.message }))
          .sort((a, b) => a.key.localeCompare(b.key))
          .slice(-50);
        setLogs(entries);
      }
    );
    return unsub;
  }, [open, logPath]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, open]);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Live Logs
        {logs.length > 0 && (
          <span className="ml-auto px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {logs.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-lg bg-gray-950 border border-gray-800 font-mono text-xs text-green-400 p-3 h-52 overflow-y-auto space-y-0.5">
          {logs.length === 0 ? (
            <p className="text-gray-500 italic">No logs yet — logs will appear once ESP32 is connected</p>
          ) : (
            logs.map((l) => (
              <div key={l.key} className="leading-5">
                <span className="text-gray-500">[{l.timestamp}]</span>{" "}
                <span>{l.message}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

// ─── Device Card ─────────────────────────────────────────────────────────────
function DeviceCard({
  label,
  icon,
  updatedAt,
  metrics,
  logPath,
  logsOpen,
  onLogsToggle,
}: {
  label: string;
  icon: string;
  updatedAt: number | undefined;
  metrics: React.ReactNode;
  logPath: string;
  logsOpen: boolean;
  onLogsToggle: () => void;
}) {
  const { status, ageSec } = getStatus(updatedAt);
  const s = STATUS_STYLES[status];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6 space-y-4 ring-1 ${s.ring}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-3xl">{icon}</span>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${s.dot} ${status === "ONLINE" ? "animate-pulse" : ""}`}
            />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Last seen: {fmtAge(ageSec)}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.badge}`}>
          {s.label}
        </span>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              status === "ONLINE"  ? "bg-green-500 w-full" :
              status === "WARNING" ? "bg-yellow-400 w-1/2"  :
                                     "bg-red-500   w-0"
            }`}
          />
        </div>
        <span className="text-[10px] text-gray-400 shrink-0">Signal</span>
      </div>

      {/* Last sensor values */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-2">Last Sensor Values</p>
        <div className="flex flex-wrap gap-2">
          {metrics}
        </div>
      </div>

      {/* Live Logs — controlled by page-level state */}
      <LiveLogs logPath={logPath} open={logsOpen} onToggle={onLogsToggle} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DeviceStatusPage() {
  const [latestWater, setLatestWater] = useState<WaterSensorReading | null>(null);
  const [waterLevel, setWaterLevel]   = useState<{ status: string; updatedAt: number } | null>(null);
  const [soil, setSoil]               = useState<SoilData | null>(null);
  const [tick, setTick]               = useState(0);

  // Each device has its OWN independent open state — no sharing possible
  const [waterLogsOpen, setWaterLogsOpen] = useState(false);
  const [soilLogsOpen,  setSoilLogsOpen]  = useState(false);

  useEffect(() => {
    const unsubs = [
      listenTo<SoilData>(PATHS.SOIL_DATA, setSoil),
      listenTo<{ status: string; updatedAt: number }>(PATHS.WATER_LEVEL, setWaterLevel),
      listenToLatestWaterReadings(1, (readings) => {
        if (readings.length > 0) setLatestWater(readings[0].value);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Re-evaluate status every 5 seconds
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Determine Water Device's last active timestamp (seconds since epoch)
  const waterSensorTs = latestWater?.createdAt || 0;
  const waterLevelTs = waterLevel?.updatedAt ? Math.floor(waterLevel.updatedAt / 1000) : 0;
  const activeWaterTime = Math.max(waterSensorTs, waterLevelTs);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Device Status</h2>
        <p className="text-xs text-gray-400">Status refreshes every 5s</p>
      </div>

      {/* Status thresholds legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Online: &lt;30s</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Warning: 30–120s</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Offline: &gt;120s or no data</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Water Device */}
        <DeviceCard
          label="Water Device"
          icon="💧"
          updatedAt={activeWaterTime > 0 ? activeWaterTime : undefined}
          logPath={PATHS.LOG_WATER}
          logsOpen={waterLogsOpen}
          onLogsToggle={() => setWaterLogsOpen((o) => !o)}
          metrics={
            <>
              <Metric label="Temp"  value={latestWater ? Math.round(latestWater.temperature * 10) / 10 : null} unit="°C" />
              <Metric label="TDS"   value={latestWater ? Math.round(latestWater.tds) : null}                   unit="ppm" />
              <Metric label="EC"    value={latestWater ? Math.round(latestWater.ec * 100) / 100 : null}        unit="mS/cm" />
              <Metric label="pH"    value={latestWater ? Math.round(latestWater.ph * 10) / 10 : null}          unit="" />
            </>
          }
        />

        {/* Soil Device */}
        <DeviceCard
          label="Soil Device"
          icon="🌱"
          updatedAt={soil?.updatedAt}
          logPath={PATHS.LOG_SOIL}
          logsOpen={soilLogsOpen}
          onLogsToggle={() => setSoilLogsOpen((o) => !o)}
          metrics={
            <>
              <Metric label="Moisture" value={soil ? Math.round(soil.moisture * 10) / 10 : null} unit="%" />
              <Metric label="Temp"     value={soil ? Math.round(soil.temperature * 10) / 10 : null} unit="°C" />
              <Metric label="pH"       value={soil ? Math.round(soil.ph * 10) / 10 : null}         unit="" />
              <Metric label="EC"       value={soil ? Math.round(soil.ec * 100) / 100 : null}       unit="mS/cm" />
            </>
          }
        />
      </div>
    </div>
  );
}


