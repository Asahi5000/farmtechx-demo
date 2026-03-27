"use client";
import React, { useEffect, useState, useRef } from "react";
import { listenTo, setPumpState, addSchedule, deleteSchedule, PATHS } from "@/config/realtimeService";
import type { PumpState, DosingPumps, WaterSchedule } from "@/types";

type Mode = "manual" | "automation";

function useCountdown(endTime?: number): string {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!endTime) return setRemaining("");
    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) return setRemaining("Done");
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
        <h4 className="font-semibold text-gray-800 dark:text-white">{label}</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isOn ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {isOn ? "ON" : "OFF"}
        </span>
      </div>

      {isOn && countdown && (
        <p className="text-sm text-gray-500 dark:text-gray-400">⏱ Remaining: <span className="font-mono font-semibold text-gray-800 dark:text-white">{countdown}</span></p>
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
          isOn
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-green-500 hover:bg-green-600 text-white"
        } disabled:opacity-50 flex items-center justify-center gap-2`}
      >
        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {isOn ? `Turn ${label} OFF` : `Turn ${label} ON`}
      </button>
    </div>
  );
}

export default function IrrigationPage() {
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("irrigationMode") as Mode) ?? "manual" : "manual"
  );
  const [mainPump, setMainPump] = useState<PumpState | null>(null);
  const [dosingPumps, setDosingPumps] = useState<DosingPumps | null>(null);
  const [schedules, setSchedules] = useState<Record<string, WaterSchedule>>({});
  const [loadingPump, setLoadingPump] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Schedule form state
  const [schHour, setSchHour] = useState(6);
  const [schMin, setSchMin] = useState(0);
  const [schAmpm, setSchAmpm] = useState<"AM" | "PM">("AM");
  const [schDuration, setSchDuration] = useState(5);
  const [schLoading, setSchLoading] = useState(false);

  useEffect(() => {
    const unsubs = [
      listenTo<PumpState>(PATHS.PUMP_CONTROL, setMainPump),
      listenTo<DosingPumps>(PATHS.DOSING_PUMPS, setDosingPumps),
      listenTo<Record<string, WaterSchedule>>(PATHS.SCHEDULES, (data) => setSchedules(data ?? {})),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const handleModeSwitch = async (newMode: Mode) => {
    if (newMode === "automation") {
      // Turn off all pumps
      const off: PumpState = { state: "OFF" };
      await Promise.all([
        setPumpState("main", off),
        setPumpState("A", off),
        setPumpState("B", off),
        setPumpState("C", off),
      ]);
    }
    setMode(newMode);
    localStorage.setItem("irrigationMode", newMode);
  };

  const handlePumpToggle = async (pump: "main" | "A" | "B" | "C", mins: number, secs: number) => {
    const current = pump === "main" ? mainPump : dosingPumps?.[pump];
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

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    // Check for duplicate
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Irrigation Control</h2>
        {/* Mode Toggle */}
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
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">💧 Pump Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PumpCard label="Main Water Pump" pump={mainPump} onToggle={(m, s) => handlePumpToggle("main", m, s)} loading={!!loadingPump["main"]} />
            <PumpCard label="Dosing Pump A" pump={dosingPumps?.A ?? null} onToggle={(m, s) => handlePumpToggle("A", m, s)} loading={!!loadingPump["A"]} />
            <PumpCard label="Dosing Pump B" pump={dosingPumps?.B ?? null} onToggle={(m, s) => handlePumpToggle("B", m, s)} loading={!!loadingPump["B"]} />
            <PumpCard label="Dosing Pump C" pump={dosingPumps?.C ?? null} onToggle={(m, s) => handlePumpToggle("C", m, s)} loading={!!loadingPump["C"]} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">🗓 Schedule Management</h3>

          {/* Add Schedule Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Add Schedule</h4>
            <form onSubmit={handleAddSchedule} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Hour</label>
                <select value={schHour} onChange={(e) => setSchHour(Number(e.target.value))}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Minute</label>
                <select value={schMin} onChange={(e) => setSchMin(Number(e.target.value))}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">AM/PM</label>
                <select value={schAmpm} onChange={(e) => setSchAmpm(e.target.value as "AM" | "PM")}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Duration (min)</label>
                <input type="number" min={1} value={schDuration} onChange={(e) => setSchDuration(Number(e.target.value))}
                  className="w-24 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
              </div>
              <button type="submit" disabled={schLoading}
                className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                {schLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Add Schedule
              </button>
            </form>
          </div>

          {/* Schedule Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">Time</th>
                  <th className="px-5 py-3 text-left">Duration</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedSchedules.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No schedules yet.</td></tr>
                ) : (
                  sortedSchedules.map(([id, s]) => (
                    <tr key={id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">
                        {String(s.hour).padStart(2, "0")}:{String(s.minute).padStart(2, "0")} {s.ampm}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{s.duration} min</td>
                      <td className="px-5 py-3 text-right">
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
      )}

      {/* Delete Confirmation Modal */}
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
    </div>
  );
}
