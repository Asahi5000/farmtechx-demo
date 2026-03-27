"use client";
import React, { useEffect, useState } from "react";
import { listenToLatestWaterReadings } from "@/config/realtimeService";
import type { WaterSensorReading } from "@/types";

export default function HistoryPage() {
  const [readings, setReadings] = useState<{ key: string; value: WaterSensorReading }[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const unsub = listenToLatestWaterReadings(200, (data) => setReadings(data as any));
    return unsub;
  }, []);

  const filtered = readings.filter((r) => {
    if (!startDate && !endDate) return true;
    const ts = new Date(r.value.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;
    if (start && ts < start) return false;
    if (end && ts > end) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sensor History</h2>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Timestamp</th>
                <th className="px-5 py-3 text-right">Temp (°C)</th>
                <th className="px-5 py-3 text-right">TDS (ppm)</th>
                <th className="px-5 py-3 text-right">EC (mS/cm)</th>
                <th className="px-5 py-3 text-right">pH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    No readings found.
                  </td>
                </tr>
              ) : (
                filtered.reverse().map((r) => (
                  <tr key={r.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">
                      {new Date(r.value.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">
                      {r.value.temperature?.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">
                      {r.value.tds?.toFixed(0) ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">
                      {r.value.ec?.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">
                      {r.value.ph?.toFixed(2) ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Showing {filtered.length} of {readings.length} total readings
      </p>
    </div>
  );
}
