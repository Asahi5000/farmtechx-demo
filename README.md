# FarmTechXBaluzo Demo

A hydroponic farm management dashboard built with Next.js, Supabase, and ESP32 devices. The public demo uses Supabase anonymous sign-in and isolated demo records; administrator sign-in remains available separately.

## Run locally

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and add the project URL, publishable/anon key, server-only service role key, and Google Maps key if using route/travel actions.
3. In the Supabase SQL Editor, run `supabase/schema.sql`, then run `supabase/seed.sql`. The seed data uses the `farmtechx-demo/` path prefix and demo flags; it does not overwrite live farm state.
4. In Supabase Authentication settings, enable anonymous sign-ins for the public demo. Review rate limits and abuse protections before sharing the URL.
5. In Supabase **Database → Publications**, enable Realtime for `farm_state`, `water_sensor_readings`, `device_logs`, and `water_schedules`.
6. To retain administrator access, create a named account in **Authentication → Users** and promote it in the SQL Editor:

   ```sql
   update public.profiles
   set role = 'Admin', name = 'Farm Demo Admin'
   where email = 'admin@example.com';
   ```

   Sign in at `/signin/admin`. The public `/signin` page enters a restricted anonymous demo session.
7. Deploy the device gateway and configure its private shared token:

   ```sh
   supabase link --project-ref your-project-ref
   supabase functions deploy farm-device
   supabase secrets set FARM_DEVICE_TOKEN=your-long-random-device-token
   ```

   Set the Supabase function URL, anon key, and the same device token in each ESP32 sketch, then flash the devices. The service-role key stays on Supabase and is never placed in firmware.
8. Install dependencies and start the dashboard:

   ```sh
   npm install
   npm run dev
   ```

Never commit `.env.local` or expose the service-role key.

## Supabase data model

- `profiles`: Auth-linked user profiles and roles.
- `farm_state`: latest sensor values, pump/valve state, and zone schedules.
- `water_sensor_readings`: historical water sensor data.
- `device_logs`: device event logs.
- `water_schedules`: irrigation schedules.
- `municipalities`: imported travel destination documents used by the travel helpers.
- `avatars` Storage bucket: user profile images.

Row Level Security is enabled by `supabase/schema.sql`. Anonymous demo sessions can access only rows under the `farmtechx-demo/` farm-state prefix and rows marked `is_demo = true`. Normal signed-in accounts see only non-demo rows. This prevents demo pump and valve changes from reaching the paths used by ESP32 devices. Account settings, profile editing, administrator APIs, and travel actions are unavailable in demo sessions.

If FarmTechX shares a Supabase project with another app, verify that app's RLS policies are safe for anonymous/authenticated sessions before enabling anonymous sign-ins. The Supabase project is shared across all applications that use it.

## Migrating municipality data

The former travel helper reads municipality documents. Import each document into `public.municipalities`, keeping its full document as JSON:

```sql
insert into public.municipalities (id, data)
values ('municipality-id', '{"name":"Daet","provinceName":"Camarines Norte","placesToVisit":[]}'::jsonb);
```

The authenticated `POST /api/travel` endpoint replaces the old callable functions. Send the Supabase access token as a Bearer token and an `action` of `getRouteDirections`, `getTravelModes`, `generateTripSuggestions`, or `generateItinerary`.

The dashboard, travel helpers, and all three ESP32 sketches use Supabase. Legacy cloud-function deployment assets and old code archives have been removed. Set `GOOGLE_MAPS_API_KEY` only as a server environment variable when using travel actions. Do not put the Supabase service-role key in browser code or device firmware.
