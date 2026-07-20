"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { listenTo, listenToLatestWaterReadings, PATHS } from "@/config/realtimeService";
import type { SoilData, RainData, WaterLevel, WaterSensorReading } from "@/types";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

function SensorCard({ icon, label, value, unit, sub }: { icon: string; label: string; value: string | number | null; unit: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-2 sm:gap-4 overflow-hidden">
      <span className="text-2xl sm:text-3xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium truncate">{label}</p>
        <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">
          {value !== null ? `${value} ${unit}` : <span className="text-gray-400 text-base">—</span>}
        </p>
        {sub && <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ label, active, trueLabel = "YES", falseLabel = "NO" }: { label: string; active: boolean | null; trueLabel?: string; falseLabel?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {active === null ? (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">—</span>
      ) : (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
          {active ? trueLabel : falseLabel}
        </span>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [latest, setLatest] = useState<WaterSensorReading | null>(null);
  const [soil, setSoil] = useState<SoilData | null>(null);
  const [rain, setRain] = useState<RainData | null>(null);
  const [waterLevel, setWaterLevel] = useState<WaterLevel | null>(null);
  const [history, setHistory] = useState<{ key: string; value: WaterSensorReading }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubs = [
      listenTo<SoilData>(PATHS.SOIL_DATA, setSoil),
      listenTo<RainData>(PATHS.RAIN_DATA, setRain),
      listenTo<WaterLevel>(PATHS.WATER_LEVEL, setWaterLevel),
      listenToLatestWaterReadings(50, (readings) => {
        setHistory(readings as any);
        if (readings.length > 0) setLatest(readings[readings.length - 1].value);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const getReadingDate = (createdAt: number | string | undefined) => {
    if (!createdAt) return new Date(0);
    const ts = Number(createdAt);
    const tsMs = ts < 1e12 ? ts * 1000 : ts;
    return new Date(tsMs);
  };

  const timestamps = history.map((r) =>
    getReadingDate(r.value.createdAt).toLocaleTimeString()
  );

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "line", animations: { enabled: true }, toolbar: { show: false }, background: "transparent" },
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: timestamps, labels: { rotate: -45, style: { fontSize: "10px" } }, tickAmount: 10 },
    yaxis: [
      { title: { text: "Temp (°C)" }, min: 0, max: 50 },
      { opposite: true, title: { text: "EC / pH" }, min: 0, max: 14 },
    ],
    legend: { position: "top" },
    tooltip: { shared: true, intersect: false },
    theme: { mode: "light" },
    colors: ["#f97316", "#3b82f6", "#10b981"],
  };

  const chartSeries = [
    { name: "Temperature (°C)", data: history.map((r) => r.value.temperature ?? 0) },
    { name: "EC (mS/cm)", data: history.map((r) => r.value.ec ?? 0) },
    { name: "pH", data: history.map((r) => r.value.ph ?? 0) },
  ];

  const waterLevelColor: Record<string, string> = {
    HIGH: "bg-green-100 text-green-700",
    MID: "bg-blue-100 text-blue-700",
    LOW: "bg-yellow-100 text-yellow-700",
    EMPTY: "bg-red-100 text-red-700",
  };

  const fmt = (ts?: number) => {
    if (!ts) return "—";
    const tsMs = ts < 1e12 ? ts * 1000 : ts;
    return new Date(tsMs).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl p-5 sm:p-6 shadow-lg text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}!</h1>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-brand-100 text-xs sm:text-sm">Current Date & Time</p>
            <p className="text-lg sm:text-xl font-semibold">{currentTime.toLocaleDateString()}</p>
            <p className="text-base sm:text-lg">{currentTime.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>

      {/* Water Quality */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex flex-wrap items-center gap-2">
          💧 Water Quality Sensors
          <span className="text-[10px] sm:text-xs font-normal normal-case text-gray-400">Last update: {fmt(latest?.createdAt)}</span>
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SensorCard icon="🌡" label="Temperature" value={latest?.temperature ?? null} unit="°C" />
          <SensorCard icon="🧂" label="TDS" value={latest?.tds ?? null} unit="ppm" />
          <SensorCard icon="⚡" label="EC" value={latest?.ec ?? null} unit="mS/cm" />
          <SensorCard icon="🧪" label="pH" value={latest?.ph ?? null} unit="" />
        </div>
      </div>

      {/* Soil Sensors */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex flex-wrap items-center gap-2">
          🌱 Soil Sensors
          <span className="text-[10px] sm:text-xs font-normal normal-case text-gray-400">Last update: {fmt(soil?.updatedAt)}</span>
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SensorCard icon="💦" label="Moisture" value={soil?.moisture ?? null} unit="%" />
          <SensorCard icon="🌡" label="Temperature" value={soil?.temperature ?? null} unit="°C" />
          <SensorCard icon="🧪" label="pH" value={soil?.ph ?? null} unit="" />
          <SensorCard icon="⚡" label="EC" value={soil?.ec ?? null} unit="mS/cm" />
        </div>
      </div>

      {/* Rain + Water Level */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">🌧 Environment</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatusBadge label="Rain Status" active={rain?.isRaining ?? null} trueLabel="Raining" falseLabel="Not Raining" />
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💧</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Water Level</span>
            </div>
            {waterLevel?.status ? (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${waterLevelColor[waterLevel.status] ?? "bg-gray-100 text-gray-500"}`}>
                {waterLevel.status}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Historical Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">📈 Historical Data</h3>
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Waiting for sensor data...</div>
        ) : (
          <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={300} />
        )}
      </div>
    </div>
  );
}
