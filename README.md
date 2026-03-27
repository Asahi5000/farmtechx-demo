# FarmTechXBaluzo

A real-time hydroponic farm management dashboard built with Next.js and Firebase Realtime Database. Migrated from a PHP/MySQL system.

## Features

- **Real-time Sensor Monitoring** — Water quality (temperature, TDS, EC, pH), soil sensors (moisture, temperature, pH, EC), rain status, and water level
- **Historical Data Visualization** — Line charts with auto-updating sensor history
- **Irrigation Control** — Manual and automation modes for main water pump and dosing pumps (A, B, C) with countdown timers
- **Schedule Management** — Add, view, and delete irrigation schedules with confirmation modals
- **User Management** — Admin/Staff roles with Firebase Authentication
- **History Page** — Past sensor readings with date range filtering

## Tech Stack

- Next.js, TypeScript, Tailwind CSS
- Firebase Realtime Database, Firebase Auth, Firebase Storage

## Getting Started

1. Clone the repo
2. Fill in your Firebase credentials in `.env.local`
3. Run `npm install` then `npm run dev`
