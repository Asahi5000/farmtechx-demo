import { ref, onValue, set, push, remove, off, query, limitToLast } from 'firebase/database';
import { db } from './firebase';
import type { PumpState, WaterSchedule, SolenoidValve, ZoneSchedule } from '@/types';

export const PATHS = {
  WATER_SENSORS: 'farmtechx/sensors/water',
  SOIL_DATA: 'farmtechx/soilData/latest',
  RAIN_DATA: 'farmtechx/rainData/latest',
  WATER_LEVEL: 'farmtechx/waterLevel',
  PUMP_CONTROL: 'farmtechx/pumpControl',
  DOSING_PUMPS: 'farmtechx/dosingPumps',
  SCHEDULES: 'farmtechx/waterSchedules',
  SOLENOID_VALVES: 'farmtechx/solenoidValves',
  ZONE_SCHEDULES: 'farmtechx/zoneSchedules',
  LOG_WATER: 'farmtechx/logs/waterDevice',
  LOG_SOIL: 'farmtechx/logs/soilDevice',
};

export function listenTo<T>(path: string, callback: (data: T | null) => void): () => void {
  const r = ref(db, path);
  onValue(r, (snap) => callback(snap.exists() ? snap.val() : null));
  return () => off(r);
}

export function listenToLatestWaterReadings(
  count: number,
  callback: (readings: { key: string; value: any }[]) => void
): () => void {
  const r = query(ref(db, PATHS.WATER_SENSORS), limitToLast(count));
  onValue(r, (snap) => {
    if (!snap.exists()) return callback([]);
    const all: { key: string; value: any }[] = [];
    snap.forEach((child) => {
      all.push({ key: child.key!, value: child.val() });
    });
    callback(all);
  });
  return () => off(r.ref);
}

export function listenToLatestLogs(
  path: string,
  count: number,
  callback: (data: Record<string, any> | null) => void
): () => void {
  const r = query(ref(db, path), limitToLast(count));
  onValue(r, (snap) => callback(snap.exists() ? snap.val() : null));
  return () => off(r.ref);
}

export async function setPumpState(pump: 'main' | 'A' | 'B' | 'C' | 'D', state: PumpState): Promise<void> {
  const path = pump === 'main' ? PATHS.PUMP_CONTROL : `${PATHS.DOSING_PUMPS}/${pump}`;
  await set(ref(db, path), state);
}

export async function setValveState(zone: 'zone1' | 'zone2' | 'zone3' | 'zone4', valve: SolenoidValve): Promise<void> {
  await set(ref(db, `${PATHS.SOLENOID_VALVES}/${zone}`), valve);
}

export async function setZoneSchedule(zone: 'zone1' | 'zone2' | 'zone3' | 'zone4', schedule: ZoneSchedule): Promise<void> {
  await set(ref(db, `${PATHS.ZONE_SCHEDULES}/${zone}`), schedule);
}

export async function addSchedule(schedule: Omit<WaterSchedule, 'lastExecuted'>): Promise<void> {
  await push(ref(db, PATHS.SCHEDULES), schedule);
}

export async function deleteSchedule(id: string): Promise<void> {
  await remove(ref(db, `${PATHS.SCHEDULES}/${id}`));
}
