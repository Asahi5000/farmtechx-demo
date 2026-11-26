insert into public.farm_state (path, value) values
  ('farmtechx/soilData/latest', jsonb_build_object('moisture', 42.6, 'temperature', 23.8, 'ph', 6.4, 'ec', 1.3, 'updatedAt', floor(extract(epoch from now()) * 1000))),
  ('farmtechx/rainData/latest', jsonb_build_object('isRaining', false, 'intensity', 0, 'updatedAt', floor(extract(epoch from now()) * 1000))),
  ('farmtechx/waterLevel', jsonb_build_object('status', 'HIGH', 'updatedAt', floor(extract(epoch from now()) * 1000))),
  ('farmtechx/pumpControl', '{"state": "OFF"}'::jsonb),
  ('farmtechx/dosingPumps/A', '{"state": "OFF"}'::jsonb),
  ('farmtechx/dosingPumps/B', '{"state": "OFF"}'::jsonb),
  ('farmtechx/dosingPumps/C', '{"state": "OFF"}'::jsonb),
  ('farmtechx/dosingPumps/D', '{"state": "OFF"}'::jsonb),
  ('farmtechx/solenoidValves/zone1', '{"state": "CLOSED", "mode": "MANUAL"}'::jsonb),
  ('farmtechx/solenoidValves/zone2', '{"state": "CLOSED", "mode": "MANUAL"}'::jsonb),
  ('farmtechx/solenoidValves/zone3', '{"state": "CLOSED", "mode": "MANUAL"}'::jsonb),
  ('farmtechx/solenoidValves/zone4', '{"state": "CLOSED", "mode": "MANUAL"}'::jsonb),
  ('farmtechx/zoneSchedules/zone1', '{"hour": 6, "minute": 0, "ampm": "AM", "duration": 5, "enabled": false}'::jsonb),
  ('farmtechx/zoneSchedules/zone2', '{"hour": 6, "minute": 0, "ampm": "AM", "duration": 5, "enabled": false}'::jsonb),
  ('farmtechx/zoneSchedules/zone3', '{"hour": 6, "minute": 0, "ampm": "AM", "duration": 5, "enabled": false}'::jsonb),
  ('farmtechx/zoneSchedules/zone4', '{"hour": 6, "minute": 0, "ampm": "AM", "duration": 5, "enabled": false}'::jsonb)
on conflict (path) do update set value = excluded.value, updated_at = now();

insert into public.water_sensor_readings (occurred_at, payload)
select
  now() - (interval '5 minutes' * n),
  jsonb_build_object(
    'temperature', round((24 + sin(n::numeric / 4) * 1.6)::numeric, 2),
    'tds', round((620 + sin(n::numeric / 3) * 35)::numeric, 0),
    'ec', round((1.24 + sin(n::numeric / 5) * 0.08)::numeric, 2),
    'ph', round((6.3 + sin(n::numeric / 6) * 0.2)::numeric, 2),
    'createdAt', floor(extract(epoch from (now() - (interval '5 minutes' * n))))
  )
from generate_series(0, 47) as n;

insert into public.water_schedules (schedule) values
  ('{"hour": 6, "minute": 30, "ampm": "AM", "duration": 5, "targetPH": 6.2, "targetEC": 1.4, "zones": [1, 2]}'::jsonb),
  ('{"hour": 5, "minute": 0, "ampm": "PM", "duration": 3, "targetPH": 6.4, "targetEC": 1.2, "zones": [3]}'::jsonb);

insert into public.device_logs (source, timestamp, message, created_at) values
  ('farmtechx/logs/waterDevice', to_char(now(), 'HH24:MI:SS'), 'Demo water sensor connected', now()),
  ('farmtechx/logs/soilDevice', to_char(now(), 'HH24:MI:SS'), 'Demo soil sensor connected', now());
