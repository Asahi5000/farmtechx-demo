import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePath(path: unknown): string {
  if (typeof path !== "string") throw new Error("A database path is required.");
  const normalized = path.replace(/^\/+|\/+$/g, "").replace(/\.json$/, "");
  if (!/^farmtechx(?:\/[A-Za-z0-9_-]+)+$/.test(normalized)) {
    throw new Error("Path is not allowed.");
  }
  return normalized;
}

async function readFarmState(path: string): Promise<unknown> {
  const { data, error } = await supabase
    .from("farm_state")
    .select("path,value")
    .or(`path.eq.${path},path.like.${path}/%`);
  if (error) throw error;

  const rows = data ?? [];
  const exact = rows.find((row) => row.path === path);
  let result: unknown = exact?.value ?? null;
  for (const row of rows) {
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
  return result;
}

async function readSchedules(path: string): Promise<unknown> {
  const base = "farmtechx/waterSchedules";
  if (path === base) {
    const { data, error } = await supabase
      .from("water_schedules")
      .select("id,schedule,last_executed")
      .eq("is_demo", false)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((row) => [
      row.id,
      {
        ...row.schedule,
        ...(row.last_executed ? { lastExecuted: new Date(row.last_executed).getTime() } : {}),
      },
    ]));
  }

  const [id, field] = path.slice(base.length + 1).split("/");
  const { data, error } = await supabase
    .from("water_schedules")
    .select("schedule,last_executed")
    .eq("id", id)
    .eq("is_demo", false)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const schedule = {
    ...data.schedule,
    ...(data.last_executed ? { lastExecuted: new Date(data.last_executed).getTime() } : {}),
  };
  return field ? (schedule as Record<string, unknown>)[field] ?? null : schedule;
}

async function readWaterReadings(path: string): Promise<unknown> {
  const base = "farmtechx/sensors/water";
  if (path !== base) {
    const id = path.slice(base.length + 1);
    const { data, error } = await supabase
      .from("water_sensor_readings")
      .select("payload")
      .eq("id", id)
      .eq("is_demo", false)
      .maybeSingle();
    if (error) throw error;
    return data?.payload ?? null;
  }

  const { data, error } = await supabase
    .from("water_sensor_readings")
    .select("id,payload")
    .eq("is_demo", false)
    .order("occurred_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.id, row.payload]));
}

async function readDeviceLogs(path: string): Promise<unknown> {
  const { data, error } = await supabase
    .from("device_logs")
    .select("id,timestamp,message")
    .eq("source", path)
    .eq("is_demo", false)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [
    row.id,
    { timestamp: row.timestamp, message: row.message },
  ]));
}

async function handleRequest(method: string, path: string, value: unknown): Promise<unknown> {
  const schedulesPath = "farmtechx/waterSchedules";
  const waterPath = "farmtechx/sensors/water";
  if (method === "GET") {
    if (path === schedulesPath || path.startsWith(`${schedulesPath}/`)) return readSchedules(path);
    if (path === waterPath || path.startsWith(`${waterPath}/`)) return readWaterReadings(path);
    if (path.startsWith("farmtechx/logs/")) return readDeviceLogs(path);
    return readFarmState(path);
  }

  if (path === schedulesPath && method === "POST") {
    const { data, error } = await supabase
      .from("water_schedules")
      .insert({ schedule: value, is_demo: false })
      .select("id")
      .single();
    if (error) throw error;
    return { name: data.id };
  }

  if (path.startsWith(`${schedulesPath}/`)) {
    const [id, field] = path.slice(schedulesPath.length + 1).split("/");
    if (method === "DELETE") {
      const { error } = await supabase
        .from("water_schedules")
        .delete()
        .eq("id", id)
        .eq("is_demo", false);
      if (error) throw error;
      return null;
    }
    if (method === "PUT" && field === "lastExecuted") {
      const timestamp = Number(value);
      const lastExecuted = Number.isFinite(timestamp)
        ? new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp).toISOString()
        : null;
      const { error } = await supabase
        .from("water_schedules")
        .update({ last_executed: lastExecuted })
        .eq("id", id)
        .eq("is_demo", false);
      if (error) throw error;
      return value;
    }
    if (method === "PUT" && !field && value && typeof value === "object") {
      const { error } = await supabase
        .from("water_schedules")
        .update({ schedule: value })
        .eq("id", id)
        .eq("is_demo", false);
      if (error) throw error;
      return value;
    }
    if (method === "PATCH" && value && typeof value === "object" && !Array.isArray(value)) {
      const updates = value as Record<string, unknown>;
      const { data: current, error: readError } = await supabase
        .from("water_schedules")
        .select("schedule")
        .eq("id", id)
        .eq("is_demo", false)
        .maybeSingle();
      if (readError) throw readError;
      if (!current) return null;

      const schedulePatch = { ...updates };
      const lastExecuted = schedulePatch.lastExecuted;
      delete schedulePatch.lastExecuted;
      const databaseUpdates: Record<string, unknown> = {
        schedule: { ...current.schedule, ...schedulePatch },
      };
      if (typeof lastExecuted === "number") {
        databaseUpdates.last_executed = new Date(
          lastExecuted < 1e12 ? lastExecuted * 1000 : lastExecuted
        ).toISOString();
      }
      const { error } = await supabase
        .from("water_schedules")
        .update(databaseUpdates)
        .eq("id", id)
        .eq("is_demo", false);
      if (error) throw error;
      return readSchedules(`${schedulesPath}/${id}`);
    }
  }

  if (path === waterPath && method === "POST") {
    const payload = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    const createdAt = Number(payload.createdAt);
    const occurredAt = Number.isFinite(createdAt)
      ? new Date(createdAt < 1e12 ? createdAt * 1000 : createdAt).toISOString()
      : new Date().toISOString();
    const { data, error } = await supabase
      .from("water_sensor_readings")
      .insert({ payload, occurred_at: occurredAt, is_demo: false })
      .select("id")
      .single();
    if (error) throw error;
    return { name: data.id };
  }

  if (path.startsWith("farmtechx/logs/") && method === "POST") {
    const log = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    const { data, error } = await supabase
      .from("device_logs")
      .insert({
        source: path,
        timestamp: String(log.timestamp ?? new Date().toISOString()),
        message: String(log.message ?? ""),
        is_demo: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { name: data.id };
  }

  if (method === "DELETE") {
    const { error } = await supabase
      .from("farm_state")
      .delete()
      .or(`path.eq.${path},path.like.${path}/%`);
    if (error) throw error;
    return null;
  }

  if (method === "PUT") {
    const { error: deleteError } = await supabase
      .from("farm_state")
      .delete()
      .like("path", `${path}/%`);
    if (deleteError) throw deleteError;
    const { error } = await supabase
      .from("farm_state")
      .upsert({ path, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return value;
  }

  if ((method === "PATCH" || method === "POST") && value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (method === "POST") {
      const id = crypto.randomUUID();
      const { error } = await supabase
        .from("farm_state")
        .insert({ path: `${path}/${id}`, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      return { name: id };
    }
    const { data: current, error: readError } = await supabase
      .from("farm_state")
      .select("value")
      .eq("path", path)
      .maybeSingle();
    if (readError) throw readError;
    const merged = {
      ...(current?.value && typeof current.value === "object" && !Array.isArray(current.value)
        ? current.value
        : {}),
      ...Object.fromEntries(entries),
    };
    const { error } = await supabase
      .from("farm_state")
      .upsert({ path, value: merged, updated_at: new Date().toISOString() });
    if (error) throw error;
    return readFarmState(path);
  }

  throw new Error(`Unsupported database operation: ${method}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "POST is required." }, 405);

  const expectedToken = Deno.env.get("FARM_DEVICE_TOKEN");
  if (!expectedToken || request.headers.get("x-device-token") !== expectedToken) {
    return respond({ error: "Device authentication failed." }, 401);
  }

  try {
    const input = await request.json();
    const path = normalizePath(input.path);
    const method = typeof input.method === "string" ? input.method.toUpperCase() : "";
    if (!["GET", "PUT", "POST", "PATCH", "DELETE"].includes(method)) {
      return respond({ error: "Unsupported database operation." }, 405);
    }
    const result = await handleRequest(method, path, input.value);
    return respond(result);
  } catch (error) {
    console.error("Farm device request failed:", error);
    return respond({ error: error instanceof Error ? error.message : "Request failed." }, 500);
  }
});
