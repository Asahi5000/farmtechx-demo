# FarmTechXBaluzo Demo

A hydroponic farm management dashboard built with Next.js, Supabase, and ESP32 devices. The dashboard uses Supabase Auth, Postgres, Realtime, and Storage. `supabase/seed.sql` loads example sensor readings and farm controls for a demo project.

## Run locally

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and add the project URL, publishable/anon key, server-only service role key, and Google Maps key if using route/travel actions.
3. In the Supabase SQL Editor, run `supabase/schema.sql`, then run `supabase/seed.sql`.
4. In Supabase **Database → Publications**, enable Realtime for `farm_state`, `water_sensor_readings`, `device_logs`, and `water_schedules`.
5. Deploy the device gateway and configure its private shared token:

   ```sh
   supabase link --project-ref your-project-ref
   supabase functions deploy farm-device
   supabase secrets set FARM_DEVICE_TOKEN=your-long-random-device-token
   ```

   Set the Supabase function URL, anon key, and the same device token in each ESP32 sketch, then flash the devices. The service-role key stays on Supabase and is never placed in firmware.
6. In **Authentication → Users**, create a demo account. Promote it to an administrator in the SQL Editor:

   ```sql
   update public.profiles
   set role = 'Admin', name = 'Farm Demo Admin'
   where email = 'demo@example.com';
   ```

7. Install dependencies and start the dashboard:

   ```sh
   npm install
   npm run dev
   ```

Sign in at `/signin` with the account created in Supabase. Use a throwaway demo account and never commit `.env.local`.

## Supabase data model

- `profiles`: Auth-linked user profiles and roles.
- `farm_state`: latest sensor values, pump/valve state, and zone schedules.
- `water_sensor_readings`: historical water sensor data.
- `device_logs`: device event logs.
- `water_schedules`: irrigation schedules.
- `municipalities`: imported travel destination documents used by the travel helpers.
- `avatars` Storage bucket: user profile images.

Row Level Security is enabled by `supabase/schema.sql`. The service-role key is used only by the server-side user-management API; it must not be exposed in client code. User creation, role changes, password resets, and deletion are authorized on the server for Admin users.

## Migrating municipality data

The former travel helper reads municipality documents. Import each document into `public.municipalities`, keeping its full document as JSON:

```sql
insert into public.municipalities (id, data)
values ('municipality-id', '{"name":"Daet","provinceName":"Camarines Norte","placesToVisit":[]}'::jsonb);
```

The authenticated `POST /api/travel` endpoint replaces the old callable functions. Send the Supabase access token as a Bearer token and an `action` of `getRouteDirections`, `getTravelModes`, `generateTripSuggestions`, or `generateItinerary`.

The dashboard, travel helpers, and all three ESP32 sketches use Supabase. Legacy cloud-function deployment assets and old code archives have been removed. Set `GOOGLE_MAPS_API_KEY` only as a server environment variable when using travel actions. Do not put the Supabase service-role key in browser code or device firmware.
