import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();
const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// 1. getRouteDirections
//    Accepts an array of waypoints ({lat, lng}) and returns an optimized route
//    from the Google Directions API.
// ─────────────────────────────────────────────────────────────────────────────
export const getRouteDirections = functions.https.onCall(
  async (data: { waypoints: { lat: number; lng: number }[] }, context) => {
    const {waypoints} = data;

    // Validate
    if (!waypoints || waypoints.length < 2) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "At least 2 waypoints are required."
      );
    }

    // Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated."
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Google Maps API key is not configured. Add GOOGLE_MAPS_API_KEY to functions/.env"
      );
    }

    try {
      const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
      const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;

      // Middle waypoints (indices 1 .. n-2) with optimize:true
      let waypointsParam = "";
      if (waypoints.length > 2) {
        const middlePoints = waypoints
          .slice(1, -1)
          .map((wp: { lat: number; lng: number }) => `${wp.lat},${wp.lng}`)
          .join("|");
        waypointsParam = `optimize:true|${middlePoints}`;
      }

      const url = "https://maps.googleapis.com/maps/api/directions/json";
      const params: Record<string, string> = {
        origin,
        destination,
        key: apiKey,
        mode: "driving",
      };
      if (waypointsParam) {
        params.waypoints = waypointsParam;
      }

      const response = await axios.get(url, {params});
      const dirData = response.data;

      if (dirData.status !== "OK") {
        throw new functions.https.HttpsError(
          "internal",
          `Google Directions API error: ${dirData.status} — ${dirData.error_message || "Unknown error"}`
        );
      }

      const route = dirData.routes[0];

      // Extract legs (distance + duration per segment)
      const legs = route.legs.map((leg: any) => ({
        distance: leg.distance.text,
        distanceMeters: leg.distance.value,
        duration: leg.duration.text,
        durationSeconds: leg.duration.value,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
      }));

      // Overview polyline for rendering on map
      const polyline: string = route.overview_polyline.points;

      // Optimized waypoint order (if applicable)
      const optimizedOrder: number[] = route.waypoint_order || [];

      // Total distance and duration
      const totalDistanceMeters = legs.reduce(
        (sum: number, leg: any) => sum + leg.distanceMeters,
        0
      );
      const totalDurationSeconds = legs.reduce(
        (sum: number, leg: any) => sum + leg.durationSeconds,
        0
      );

      return {
        polyline,
        legs,
        optimizedOrder,
        totalDistance: `${(totalDistanceMeters / 1000).toFixed(1)} km`,
        totalDistanceMeters,
        totalDuration: formatDuration(totalDurationSeconds),
        totalDurationSeconds,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error("getRouteDirections error:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to get directions: ${error.message}`
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. getTravelModes
//    Given an origin (GPS) and destination (spot coords), returns travel time
//    estimates for driving, walking, bicycling, and transit using the
//    Google Distance Matrix API.
// ─────────────────────────────────────────────────────────────────────────────
export const getTravelModes = functions.https.onCall(
  async (data: {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
  }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "GOOGLE_MAPS_API_KEY not set.");
    }

    const { originLat, originLng, destLat, destLng } = data;
    console.log(`[getTravelModes] Called. Origin: ${originLat},${originLng} | Dest: ${destLat},${destLng}`);

    const modesMap: Record<string, string> = {
      "driving": "DRIVE",
      "walking": "WALK",
      "bicycling": "BICYCLE",
      "transit": "TRANSIT"
    };

    const results: Record<string, string | null> = {};

    const formatDuration = (secondsStr: string) => {
      const totalSeconds = parseInt(secondsStr.replace('s', ''), 10);
      if (isNaN(totalSeconds)) return null;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      if (hours === 0) return `${minutes} min`;
      if (minutes === 0) return `${hours} hr`;
      return `${hours} hr ${minutes} min`;
    };

    await Promise.all(
      Object.keys(modesMap).map(async (modeKey) => {
        try {
          const resp = await axios.post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            {
              origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
              destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
              travelMode: modesMap[modeKey]
            },
            {
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": "routes.duration"
              }
            }
          );
          
          const duration = resp.data?.routes?.[0]?.duration;
          if (duration) {
            results[modeKey] = formatDuration(duration);
          } else {
            results[modeKey] = null;
          }
        } catch (err: any) {
          console.error(`[getTravelModes] Routes API failed for ${modeKey}:`, err?.response?.data || err.message);
          results[modeKey] = null;
        }
      })
    );
    
    console.log('[getTravelModes] Final Results:', results);
    return results;

    return {
      driving:  results["driving"],
      walking:  results["walking"],
      bicycling: results["bicycling"],
      transit:  results["transit"],
    };
  }
);

//    Pulls content items from a municipality, ranks by rating, and distributes
//    them across days following the algorithm:
//      - Per day: 1 placesToVisit + 1 whereToEat + 1 whereToStay (min)
//      - Fill remaining slots with thingsToDo
//      - Highest rated → Day 1 morning
// ─────────────────────────────────────────────────────────────────────────────
export const generateTripSuggestions = functions.https.onCall(
  async (data: {
    municipalityId: string;
    preferences: string[];
    days: number;
  }, context) => {
    const {municipalityId, preferences, days} = data;

    // Validate
    if (!municipalityId || !preferences || preferences.length === 0 || !days) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "municipalityId, preferences (non-empty array), and days are required."
      );
    }

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated."
      );
    }

    if (days < 1 || days > 14) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Trip duration must be between 1 and 14 days."
      );
    }

    try {
      // Fetch municipality document
      const muniDoc = await db.collection("municipalities").doc(municipalityId).get();
      if (!muniDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Municipality not found."
        );
      }
      const muniData = muniDoc.data()!;
      const muniName: string = muniData.name || "";
      const provinceName: string = muniData.provinceName || "";

      // Collect and sort items by category
      const categoryPools: Record<string, any[]> = {};
      const allCategories = ["placesToVisit", "thingsToDo", "whereToEat", "whereToStay"];

      for (const cat of allCategories) {
        if (preferences.includes(cat) && Array.isArray(muniData[cat])) {
          // Sort by rating descending (highest first)
          categoryPools[cat] = [...muniData[cat]]
            .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
        }
      }

      // Time slot defaults
      const timeSlots: Record<string, string> = {
        placesToVisit: "09:00 AM",
        whereToEat: "12:00 PM",
        thingsToDo_1: "02:00 PM",
        thingsToDo_2: "05:00 PM",
        whereToStay: "06:00 PM",
      };

      // Build days array
      const suggestedDays: any[] = [];

      for (let d = 0; d < days; d++) {
        const dayItems: any[] = [];

        // 1. Assign 1 placesToVisit (highest available → Day 1 gets the best)
        if (categoryPools.placesToVisit && categoryPools.placesToVisit.length > 0) {
          const item = categoryPools.placesToVisit.shift();
          dayItems.push(formatItem(item, "placesToVisit", municipalityId, muniName, timeSlots.placesToVisit));
        }

        // 2. Assign 1 whereToEat (highest available)
        if (categoryPools.whereToEat && categoryPools.whereToEat.length > 0) {
          const item = categoryPools.whereToEat.shift();
          dayItems.push(formatItem(item, "whereToEat", municipalityId, muniName, timeSlots.whereToEat));
        }

        // 3. Fill with thingsToDo (up to 2 per day)
        if (categoryPools.thingsToDo) {
          for (let t = 0; t < 2 && categoryPools.thingsToDo.length > 0; t++) {
            const item = categoryPools.thingsToDo.shift();
            const timeKey = t === 0 ? "thingsToDo_1" : "thingsToDo_2";
            dayItems.push(formatItem(item, "thingsToDo", municipalityId, muniName, timeSlots[timeKey]));
          }
        }

        // 4. Assign 1 whereToStay (if available and selected)
        if (categoryPools.whereToStay && categoryPools.whereToStay.length > 0) {
          const item = categoryPools.whereToStay.shift();
          dayItems.push(formatItem(item, "whereToStay", municipalityId, muniName, timeSlots.whereToStay));
        }

        suggestedDays.push({
          dayNumber: d + 1,
          items: dayItems,
        });
      }

      return {
        municipalityId,
        municipalityName: muniName,
        provinceName,
        days: suggestedDays,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error("generateTripSuggestions error:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate suggestions: ${error.message}`
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. generateItinerary (stub — future LLM integration)
// ─────────────────────────────────────────────────────────────────────────────
export const generateItinerary = functions.https.onCall(
  async (data: {
    items: any[];
    destination: string;
    days: number;
  }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated."
      );
    }

    // Stub response — will be replaced with LLM API call (OpenAI/Claude)
    return {
      status: "stub",
      message: "AI-powered itinerary generation coming soon. Your trip has been saved with the selected items.",
      generatedText: null,
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatItem(
  item: any,
  category: string,
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
    // Extra data for display in suggestion step
    rating: item.rating || 0,
    priceRange: item.priceRange || "",
    description: item.description || "",
    location: item.location || null,
  };
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
