"use client";
import React from "react";

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">About FarmTechXBaluzo</h2>

      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">System Information</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🌱</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">FarmTechX - Hydroponic Farm Management System</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A real-time monitoring and control system for hydroponic farming operations. Monitor water quality sensors, soil conditions, and automate irrigation schedules.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Features</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                <li>Real-time sensor monitoring (Temperature, TDS, EC, pH)</li>
                <li>Soil and rain sensor integration</li>
                <li>Manual and automated irrigation control</li>
                <li>Historical data visualization with charts</li>
                <li>User management with role-based access</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Technology Stack</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">⚛️</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Next.js 16</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">React Framework</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Firebase</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Realtime Database & Auth</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">📘</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">TypeScript</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Type-safe Development</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">🎨</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Tailwind CSS</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Utility-first CSS</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">📈</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">ApexCharts</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Data Visualization</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-2xl">🔌</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">ESP32</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">IoT Hardware</p>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Credits */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Developer Credits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center">
            <img
              src="/images/developers/obias.jpg"
              alt="John Owen Baluzo"
              className="w-24 h-24 rounded-full object-cover mb-3 border-4 border-brand-500"
            />
            <p className="font-semibold text-gray-900 dark:text-white">John Owen Baluzo</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Lead Developer</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Full-stack & IoT Integration</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <img
              src="/images/developers/avendano.jpg"
              alt="Developer 2"
              className="w-24 h-24 rounded-full object-cover mb-3 border-4 border-brand-500"
            />
            <p className="font-semibold text-gray-900 dark:text-white">Avendano</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Developer</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Hardware & Sensors</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <img
              src="/images/developers/maigue.jpg"
              alt="Developer 3"
              className="w-24 h-24 rounded-full object-cover mb-3 border-4 border-brand-500"
            />
            <p className="font-semibold text-gray-900 dark:text-white">Maigue</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Developer</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">System Testing & QA</p>
          </div>
        </div>
      </div>

      {/* Institution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Institution</h3>
        <div className="flex items-start gap-4">
          <img
            src="/images/institution/aclc-logo.jpg"
            alt="ACLC College"
            className="w-20 h-20 object-contain"
          />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">ACLC College</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Developed as part of an academic research project focused on sustainable agriculture and IoT-enabled farming solutions.
            </p>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="text-center text-xs text-gray-400 pt-4">
        <p>FarmTechXBaluzo v2.0 • Built with ❤️ for sustainable farming</p>
        <p className="mt-1">© 2025 All Rights Reserved</p>
      </div>
    </div>
  );
}
