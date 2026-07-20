"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { listenToLatestWaterReadings } from "@/config/realtimeService";
import type { WaterSensorReading } from "@/types";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const getReadingDate = (createdAt: number | string | undefined) => {
  if (!createdAt) return new Date(0);
  const ts = Number(createdAt);
  const tsMs = ts < 1e12 ? ts * 1000 : ts;
  return new Date(tsMs);
};

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function HistoryPage() {
  const [readings, setReadings] = useState<{ key: string; value: WaterSensorReading }[]>([]);
  const [startDate, setStartDate] = useState(() => toLocalDateStr(new Date()));
  const [endDate, setEndDate] = useState(() => toLocalDateStr(new Date()));
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [activeFilter, setActiveFilter] = useState<string | null>('today');

  useEffect(() => {
    const unsub = listenToLatestWaterReadings(200, (data) => setReadings(data as any));
    return unsub;
  }, []);

  const filtered = readings.filter((r) => {
    if (!startDate && !endDate) return true;
    const ts = getReadingDate(r.value.createdAt);
    // Parse as LOCAL dates by splitting the string ourselves
    const start = startDate ? new Date(Number(startDate.split('-')[0]), Number(startDate.split('-')[1]) - 1, Number(startDate.split('-')[2])) : null;
    const end = endDate ? new Date(Number(endDate.split('-')[0]), Number(endDate.split('-')[1]) - 1, Number(endDate.split('-')[2]), 23, 59, 59) : null;
    if (start && ts < start) return false;
    if (end && ts > end) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filtered.slice(startIndex, endIndex);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const applyQuickFilter = (filter: string) => {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    setActiveFilter(filter);
    setCurrentPage(1);

    switch (filter) {
      case 'today':
        setStartDate(todayStr);
        setEndDate(todayStr);
        break;
      case 'week': {
        const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        setStartDate(toLocalDateStr(weekAgo));
        setEndDate(todayStr);
        break;
      }
      case 'month': {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        setStartDate(toLocalDateStr(monthAgo));
        setEndDate(todayStr);
        break;
      }
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sensor History</h2>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Filters:</span>
        {[{ label: 'Today', value: 'today' }, { label: 'This Week', value: 'week' }, { label: 'This Month', value: 'month' }, { label: 'All Time', value: 'all' }].map((filter) => (
          <button
            key={filter.value}
            onClick={() => applyQuickFilter(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeFilter === filter.value
                ? 'bg-brand-500 text-white shadow'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Date Range & Page Size */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
          >
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
            <option value={500}>500 per page</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setActiveFilter(null);
            }}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setActiveFilter(null);
            }}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setActiveFilter(null);
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Historical Chart */}
      {filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">📈 Chart Visualization</h3>
          <ReactApexChart
            options={{
              chart: { type: "line", animations: { enabled: true }, toolbar: { show: false }, background: "transparent" },
              stroke: { curve: "smooth", width: 2 },
              xaxis: {
                categories: filtered.map((r) => getReadingDate(r.value.createdAt).toLocaleTimeString()),
                labels: { rotate: -45, style: { fontSize: "10px" } },
                tickAmount: 10,
              },
              yaxis: [
                { title: { text: "Temp (°C)" }, min: 0, max: 50 },
                { opposite: true, title: { text: "EC / pH" }, min: 0, max: 14 },
              ],
              legend: { position: "top" },
              tooltip: { shared: true, intersect: false },
              theme: { mode: "light" },
              colors: ["#f97316", "#3b82f6", "#10b981"],
            }}
            series={[
              { name: "Temperature (°C)", data: filtered.map((r) => r.value.temperature ?? 0) },
              { name: "EC (mS/cm)", data: filtered.map((r) => r.value.ec ?? 0) },
              { name: "pH", data: filtered.map((r) => r.value.ph ?? 0) },
            ]}
            type="line"
            height={300}
          />
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left whitespace-nowrap">Timestamp</th>
                <th className="px-5 py-3 text-right whitespace-nowrap">Temp (°C)</th>
                <th className="px-5 py-3 text-right whitespace-nowrap">TDS (ppm)</th>
                <th className="px-5 py-3 text-right whitespace-nowrap">EC (mS/cm)</th>
                <th className="px-5 py-3 text-right whitespace-nowrap">pH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No readings found.
                  </td>
                </tr>
              ) : (
                [...paginatedData].reverse().map((r) => (
                  <tr key={r.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-white whitespace-nowrap">
                      {getReadingDate(r.value.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {r.value.temperature?.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {r.value.tds?.toFixed(0) ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {r.value.ec?.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {r.value.ph?.toFixed(2) ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-400">
          Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} entries
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
