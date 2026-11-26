import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

type Waypoint = { lat: number; lng: number };
type TravelItem = {
  id?: string;
  name?: string;
  image?: string;
  rating?: number;
  priceRange?: string;
  description?: string;
  location?: unknown;
};

const categories = ["placesToVisit", "thingsToDo", "whereToEat", "whereToStay"] as const;
type TravelCategory = (typeof categories)[number];

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isValidCoordinate(value: unknown): value is Waypoint {
  if (!value || typeof value !== "object") return false;
  const { lat, lng } = value as Waypoint;
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function formatItem(
  item: TravelItem,
  category: TravelCategory,
  municipalityId: string,
  municipalityName: string,
  time: string
) {
  return {
    id: item.id || "",
    time,
    title: item.name || "Untitled",
    category,
    municipalityId,
    contentItemName: item.name || "",
    heroImage: item.image || "",
    notes: "",
    rating: item.rating || 0,
    priceRange: item.priceRange || "",
    description: item.description || "",
    location: item.location || null,
  };
}

async function authenticate(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!url || !anonKey) {
    return { ok: false as const, error: "Supabase server configuration is incomplete.", status: 500 };
  }
  if (!token) return { ok: false as const, error: "Authentication required.", status: 401 };

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false as const, error: "Your session is invalid or expired.", status: 401 };
  }

  return { ok: true as const, client };
}

async function getRouteDirections(waypoints: Waypoint[]) {
  if (!Array.isArray(waypoints) || waypoints.length < 2 || waypoints.length > 25) {
    return errorResponse("Between 2 and 25 waypoints are required.", 400);
  }
  if (!waypoints.every(isValidCoordinate)) {
    return errorResponse("Every waypoint must contain valid latitude and longitude values.", 400);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return errorResponse("GOOGLE_MAPS_API_KEY is not configured.", 500);

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${waypoints[0].lat},${waypoints[0].lng}`);
  url.searchParams.set(
    "destination",
    `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`
  );
  url.searchParams.set("mode", "driving");
  if (waypoints.length > 2) {
    url.searchParams.set(
      "waypoints",
      `optimize:true|${waypoints.slice(1, -1).map(({ lat, lng }) => `${lat},${lng}`).join("|")}`
    );
  }
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) return errorResponse("Google Directions API request failed.", 502);
  const result = await response.json();
  if (result.status !== "OK" || !result.routes?.[0]) {
    return errorResponse(
      `Google Directions API error: ${result.status || "UNKNOWN"} — ${result.error_message || "Unknown error"}`,
      502
    );
  }

  const route = result.routes[0];
  const legs = route.legs.map((leg: {
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    start_address: string;
    end_address: string;
  }) => ({
    distance: leg.distance.text,
    distanceMeters: leg.distance.value,
    duration: leg.duration.text,
    durationSeconds: leg.duration.value,
    startAddress: leg.start_address,
    endAddress: leg.end_address,
  }));
  const totalDistanceMeters = legs.reduce(
    (sum: number, leg: { distanceMeters: number }) => sum + leg.distanceMeters,
    0
  );
  const totalDurationSeconds = legs.reduce(
    (sum: number, leg: { durationSeconds: number }) => sum + leg.durationSeconds,
    0
  );

  return NextResponse.json({
    polyline: route.overview_polyline.points,
    legs,
    optimizedOrder: route.waypoint_order || [],
    totalDistance: `${(totalDistanceMeters / 1000).toFixed(1)} km`,
    totalDistanceMeters,
    totalDuration: formatDuration(totalDurationSeconds),
    totalDurationSeconds,
  });
}

async function getTravelModes(input: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}) {
  const origin = { lat: input.originLat, lng: input.originLng };
  const destination = { lat: input.destLat, lng: input.destLng };
  if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
    return errorResponse("Origin and destination coordinates must be valid.", 400);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return errorResponse("GOOGLE_MAPS_API_KEY is not configured.", 500);

  const modes = {
    driving: "DRIVE",
    walking: "WALK",
    bicycling: "BICYCLE",
    transit: "TRANSIT",
  } as const;
  const results: Record<string, string | null> = {};

  await Promise.all(Object.entries(modes).map(async ([name, travelMode]) => {
    try {
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: input.originLat, longitude: input.originLng } } },
          destination: { location: { latLng: { latitude: input.destLat, longitude: input.destLng } } },
          travelMode,
        }),
      });
      if (!response.ok) throw new Error(`Google Routes API returned ${response.status}`);
      const result = await response.json();
      const duration = result.routes?.[0]?.duration as string | undefined;
      if (!duration) {
        results[name] = null;
        return;
      }

      const seconds = Number.parseInt(duration.replace(/s$/, ""), 10);
      if (!Number.isFinite(seconds)) {
        results[name] = null;
        return;
      }
      results[name] = formatDuration(seconds);
    } catch (error) {
      console.error(`Travel mode lookup failed for ${name}:`, error);
      results[name] = null;
    }
  }));

  return NextResponse.json(results);
}

async function generateTripSuggestions(
  client: SupabaseClient,
  input: { municipalityId: string; preferences: string[]; days: number }
) {
  if (
    !input.municipalityId ||
    !Array.isArray(input.preferences) ||
    input.preferences.length === 0 ||
    !Number.isInteger(input.days) ||
    input.days < 1 ||
    input.days > 14
  ) {
    return errorResponse("Municipality, preferences, and a trip duration from 1 to 14 days are required.", 400);
  }
  if (!input.preferences.every((category) => categories.includes(category as TravelCategory))) {
    return errorResponse("One or more travel preferences are invalid.", 400);
  }

  const { data: municipality, error } = await client
    .from("municipalities")
    .select("data")
    .eq("id", input.municipalityId)
    .maybeSingle();
  if (error) {
    console.error("Failed to load municipality data:", error);
    return errorResponse("Failed to load municipality data.", 500);
  }
  if (!municipality) return errorResponse("Municipality not found.", 404);

  const municipalityData = municipality.data as Record<string, unknown>;
  const municipalityName = typeof municipalityData.name === "string" ? municipalityData.name : "";
  const provinceName = typeof municipalityData.provinceName === "string" ? municipalityData.provinceName : "";
  const categoryPools: Partial<Record<TravelCategory, TravelItem[]>> = {};

  for (const category of categories) {
    const items = municipalityData[category];
    if (input.preferences.includes(category) && Array.isArray(items)) {
      categoryPools[category] = [...items as TravelItem[]].sort(
        (a, b) => (b.rating || 0) - (a.rating || 0)
      );
    }
  }

  const timeSlots = {
    placesToVisit: "09:00 AM",
    whereToEat: "12:00 PM",
    thingsToDo_1: "02:00 PM",
    thingsToDo_2: "05:00 PM",
    whereToStay: "06:00 PM",
  };
  const days = [];

  for (let dayNumber = 1; dayNumber <= input.days; dayNumber++) {
    const items = [];
    const places = categoryPools.placesToVisit;
    const place = places?.shift();
    if (place) items.push(formatItem(place, "placesToVisit", input.municipalityId, municipalityName, timeSlots.placesToVisit));

    const meals = categoryPools.whereToEat;
    const meal = meals?.shift();
    if (meal) items.push(formatItem(meal, "whereToEat", input.municipalityId, municipalityName, timeSlots.whereToEat));

    const activities = categoryPools.thingsToDo;
    for (let index = 0; index < 2 && activities && activities.length > 0; index++) {
      const activity = activities.shift();
      if (activity) {
        const time = index === 0 ? timeSlots.thingsToDo_1 : timeSlots.thingsToDo_2;
        items.push(formatItem(activity, "thingsToDo", input.municipalityId, municipalityName, time));
      }
    }

    const stays = categoryPools.whereToStay;
    const stay = stays?.shift();
    if (stay) items.push(formatItem(stay, "whereToStay", input.municipalityId, municipalityName, timeSlots.whereToStay));
    days.push({ dayNumber, items });
  }

  return NextResponse.json({
    municipalityId: input.municipalityId,
    municipalityName,
    provinceName,
    days,
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return errorResponse("A valid JSON request body is required.", 400);
  }

  try {
    switch (input.action) {
      case "getRouteDirections":
        return await getRouteDirections(input.waypoints as Waypoint[]);
      case "getTravelModes":
        return await getTravelModes(input as {
          originLat: number;
          originLng: number;
          destLat: number;
          destLng: number;
        });
      case "generateTripSuggestions":
        return await generateTripSuggestions(auth.client, input as {
          municipalityId: string;
          preferences: string[];
          days: number;
        });
      case "generateItinerary":
        return NextResponse.json({
          status: "stub",
          message: "AI-powered itinerary generation coming soon. Your trip has been saved with the selected items.",
          generatedText: null,
        });
      default:
        return errorResponse("Unknown travel action.", 400);
    }
  } catch (error) {
    console.error("Travel API request failed:", error);
    return errorResponse("Travel request failed.", 500);
  }
}
