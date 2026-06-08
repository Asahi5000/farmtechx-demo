export interface WaterSensorReading {
  temperature: number;
  tds: number;
  ec: number;
  ph: number;
  createdAt: number;
}

export interface SoilData {
  moisture: number;
  temperature: number;
  ph: number;
  ec: number;
  updatedAt: number;
}

export interface RainData {
  isRaining: boolean;
  intensity?: number;
  updatedAt: number;
}

export interface WaterLevel {
  status: 'LOW' | 'MID' | 'HIGH' | 'EMPTY';
  updatedAt: number;
}

export interface PumpState {
  state: 'ON' | 'OFF';
  startTime?: number;
  durationSeconds?: number;
  endTime?: number;
}

export interface DosingPumps {
  A: PumpState;
  B: PumpState;
  C: PumpState;
  D: PumpState;
}

export interface SolenoidValve {
  state: 'OPEN' | 'CLOSED';
  mode: 'AUTO' | 'MANUAL';
}

export interface SolenoidValves {
  zone1: SolenoidValve;
  zone2: SolenoidValve;
  zone3: SolenoidValve;
  zone4: SolenoidValve;
}

export interface ZoneSchedule {
  hour: number;
  minute: number;
  ampm: 'AM' | 'PM';
  duration: number; // minutes
  enabled: boolean;
}

export interface WaterSchedule {
  hour: number;
  minute: number;
  ampm: 'AM' | 'PM';
  duration: number;
  durationSec?: number;
  targetPH?: number;
  targetEC?: number;
  zones?: number[];
  lastExecuted?: number;
}

export interface UserRecord {
  uid: string;
  name: string;
  email: string;
  role: 'Admin' | 'Staff';
  createdAt: number;
}
