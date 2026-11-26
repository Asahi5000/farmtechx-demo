import type { RealtimeChannel } from "@supabase/supabase-js";
import { requireSupabaseConfig, supabase } from "./supabase";
import type { PumpState, WaterSchedule, SolenoidValve, ZoneSchedule } from "@/types";

export const PATHS = {
  WATER_SENSORS: "farmtechx/sensors/water",
  SOIL_DATA: "farmtechx/soilData/latest",
  RAIN_DATA: "farmtechx/rainData/latest",
  WATER_LEVEL: "farmtechx/waterLevel",
  PUMP_CONTROL: "farmtechx/pumpControl",
  DOSING_PUMPS: "farmtechx/dosingPumps",
  SCHEDULES: "farmtechx/waterSchedules",
  SOLENOID_VALVES: "farmtechx/solenoidValves",
  ZONE_SCHEDULES: "farmtechx/zoneSchedules",
  LOG_WATER: "farmtechx/logs/waterDevice",
  LOG_SOIL: "farmtechx/logs/soilDevice",
} as const;

type WaterReadingRow = {
  id: string;
  payload: Record<string, unknown>;
  occurred_at: string;
};

function logDatabaseError(action: string, error: unknown): void {
  console.error(`Supabase ${action} failed:`, error);
}

export function listenTo<T>(path: string, callback: (data: T | null) => void): () => void {
  requireSupabaseConfig();
  let active = true;

  const load = async () => {
    if (path === PATHS.SCHEDULES) {
      const { data, error } = await supabase
        .from("water_schedules")
        .select("id,schedule,last_executed")
        .order("created_at", { ascending: true });

      if (error) {
        logDatabaseError("read irrigation schedules", error);
        return;
      }

      if (active) {
        callback(
          Object.fromEntries(
            (data ?? []).map((row) => [
              row.id,
              {
                ...row.schedule,
                ...(row.last_executed
                  ? { lastExecuted: new Date(row.last_executed).getTime() }
                  : {}),
              },
            ])
          ) as T
        );
      }
      return;
    }

    const { data, error } = await supabase
      .from("farm_state")
      .select("path,value")
      .or(`path.eq.${path},path.like.${path}/%`);

    if (error) {
      logDatabaseError(`read ${path}`, error);
      return;
    }
    if (!active) return;
    const directValue = data?.find((row) => row.path === path)?.value;
    let result: unknown = directValue ?? null;
    for (const row of data ?? []) {
      if (row.path === path) continue;
      const segments = row.path.slice(path.length + 1).split("/");
      if (!result || typeof result !== "object" || Array.isArray(result)) result = {};
      let node = result as Record<string, unknown>;
      for (const segment of segments.slice(0, -1)) {
        const child = node[segment];
        if (!child || typeof child !== "object" || Array.isArray(child)) node[segment] = {};
        node = node[segment] as Record<string, unknown>;
      }
      node[segments[segments.length - 1]] = row.value;
    }
    callback(result as T | null);
  };

  void load();
  const channel = supabase
    .channel(`farm-state:${path}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: path === PATHS.SCHEDULES ? "water_schedules" : "farm_state" },
      (payload) => {
        if (path === PATHS.SCHEDULES) {
          void load();
          return;
        }
        const changedPath = payload.eventType === "DELETE" ? payload.old.path : payload.new.path;
        if (changedPath === path || changedPath?.startsWith(`${path}/`)) void load();
      }
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

function mapWaterReading(row: WaterReadingRow) {
  const occurredAtSeconds = Math.floor(new Date(row.occurred_at).getTime() / 1000);
  return {
    key: row.id,
    value: {
      ...row.payload,
      createdAt: row.payload.createdAt ?? occurredAtSeconds,
    },
  };
}

export function listenToLatestWaterReadings(
  count: number,
  callback: (readings: { key: string; value: any }[]) => void
): () => void {
  requireSupabaseConfig();
  let active = true;
  let channel: RealtimeChannel;

  const load = async () => {
    const { data, error } = await supabase
      .from("water_sensor_readings")
      .select("id,payload,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(count);
    if (error) {
      logDatabaseError("read water sensor history", error);
      return;
    }
    if (active) callback(((data ?? []) as WaterReadingRow[]).reverse().map(mapWaterReading));
  };

  void load();
  channel = supabase
    .channel(`water-readings:${count}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "water_sensor_readings" },
      () => void load()
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export function listenToLatestLogs(
  path: string,
  count: number,
  callback: (data: Record<string, any> | null) => void
): () => void {
  requireSupabaseConfig();
  let active = true;

  const load = async () => {
    const { data, error } = await supabase
      .from("device_logs")
      .select("id,timestamp,message")
      .eq("source", path)
      .order("created_at", { ascending: false })
      .limit(count);

    if (error) {
      logDatabaseError(`read ${path} logs`, error);
      return;
    }

    if (!active) return;
    callback(
      data?.length
        ? Object.fromEntries(data.reverse().map((entry) => [entry.id, entry]))
        : null
    );
  };

  void load();
  const channel = supabase
    .channel(`device-logs:${path}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "device_logs", filter: `source=eq.${path}` },
      () => void load()
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

async function setFarmState(path: string, value: unknown): Promise<void> {
  requireSupabaseConfig();
  const { error } = await supabase.from("farm_state").upsert(
    { path, value, updated_at: new Date().toISOString() },
    { onConflict: "path" }
  );
  if (error) throw error;
}

export async function setPumpState(
  pump: "main" | "A" | "B" | "C" | "D",
  state: PumpState
): Promise<void> {
  const path = pump === "main" ? PATHS.PUMP_CONTROL : `${PATHS.DOSING_PUMPS}/${pump}`;
  await setFarmState(path, state);
}

export async function setValveState(
  zone: "zone1" | "zone2" | "zone3" | "zone4",
  valve: SolenoidValve
): Promise<void> {
  await setFarmState(`${PATHS.SOLENOID_VALVES}/${zone}`, valve);
}

export async function setZoneSchedule(
  zone: "zone1" | "zone2" | "zone3" | "zone4",
  schedule: ZoneSchedule
): Promise<void> {
  await setFarmState(`${PATHS.ZONE_SCHEDULES}/${zone}`, schedule);
}

export async function addSchedule(
  schedule: Omit<WaterSchedule, "lastExecuted">
): Promise<void> {
  requireSupabaseConfig();
  const { error } = await supabase.from("water_schedules").insert({ schedule });
  if (error) throw error;
}

export async function deleteSchedule(id: string): Promise<void> {
  requireSupabaseConfig();
  const { error } = await supabase.from("water_schedules").delete().eq("id", id);
  if (error) throw error;
}
