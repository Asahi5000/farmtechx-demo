"use client";
import React from "react";

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">About Baluzo Farm</h2>

      {/* Company Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-green-100 dark:border-gray-600 shadow-sm p-8 text-center">
        <h3 className="text-3xl font-bold text-green-800 dark:text-green-400 mb-2">Baluzo Farm</h3>
        <p className="text-lg italic text-green-700 dark:text-green-300">&quot;Naturally Grown for Healthy Living&quot;</p>
      </div>

      {/* Company History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Company History</h3>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <p>
            Baluzo Farm (BF) was established in 2007 by Eduardo and Anicia Baluzo in Brgy. Pamorangon, Daet, Camarines Norte. What began as a small family farm for household food needs eventually grew into a community-centered organic farm.
          </p>
          <p>
            In 2009, the couple attended seminars by the Department of Agriculture (DA) and adopted organic farming practices. They later formed the SEARCA - Brgy. Pamorangon Farmers Association, encouraging fellow farmers to practice sustainable farming and participate in agricultural programs.
          </p>
          <p>
            Driven by a passion for healthy living, the Baluzo family has been actively teaching organic farming techniques and producing safe, natural food products for the community.
          </p>
        </div>
      </div>

      {/* Vision & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Vision</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            A farm that promotes a healthy community and environment through organic farming.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Mission</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">•</span>
              <span>Educate individuals to appreciate and engage in farming.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">•</span>
              <span>Innovate and integrate modern organic farming technologies.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">•</span>
              <span>Build strong partnerships with private and government sectors for sustainable services.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">•</span>
              <span>Promote healthy living by ensuring access to organic food products.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Key Milestones */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Key Milestones</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
            <p className="text-sm text-gray-600 dark:text-gray-400"><strong>2017</strong> – Recognized as a Learning Site for Agriculture (LSA) by ATI-DA RO V.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
            <p className="text-sm text-gray-600 dark:text-gray-400"><strong>2019</strong> – Elevated to School for Practical Agriculture (SPA) by ATI Bicol.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
            <p className="text-sm text-gray-600 dark:text-gray-400"><strong>2020</strong> – Officially registered as BALUZO INTEGRATED FARM INSTITUTE INC. under the SEC.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
            <p className="text-sm text-gray-600 dark:text-gray-400"><strong>2021</strong> – Nominated for PHILGAP Certification by the DA Regional Office.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
            <p className="text-sm text-gray-600 dark:text-gray-400"><strong>2023</strong> – Achieved Certified Organic Farm status by OCCP for livestock, legumes, herbs, vegetables, and perennial crops.</p>
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Today</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Baluzo Farm continues to be a model of organic farming in the Bicol Region, providing hands-on training, farm tours, and producing high-quality organic products. It serves as a learning hub for students, farmers, and organizations advocating for sustainable agriculture and healthy living.
        </p>
      </div>

      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">System Information</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
          FarmTechX is our proprietary hydroponic farm management system that enables real-time monitoring and control of all farming operations.
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
          <li>Real-time sensor monitoring (Temperature, TDS, EC, pH)</li>
          <li>Soil and rain sensor integration</li>
          <li>Manual and automated irrigation control</li>
          <li>Historical data visualization with charts</li>
        </ul>
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
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Developer Credits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <img
              src="/images/developers/obias.jpg"
              alt="Obias, John Owen A."
              className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-brand-500"
            />
            <p className="font-bold text-base text-gray-900 dark:text-white">Obias, John Owen A.</p>
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mt-1">Lead Developer</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Web Development and Backend Integration</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <img
              src="/images/developers/avendano.jpg"
              alt="Avendaño, John Patrick B."
              className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-brand-500"
            />
            <p className="font-bold text-base text-gray-900 dark:text-white">Avendaño, John Patrick B.</p>
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mt-1">Database & UI Specialist</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Interface Design and User Experience</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <img
              src="/images/developers/maigue.jpg"
              alt="Maigue, Merck San V."
              className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-brand-500"
            />
            <p className="font-bold text-base text-gray-900 dark:text-white">Maigue, Merck San V.</p>
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mt-1">System Analyst</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Thesis Documentation and Data Analysis</p>
          </div>
        </div>
      </div>

      {/* Institution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">Institution</h3>
        <div className="flex flex-col items-center text-center">
          <div className="w-full max-w-md bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg flex items-center justify-center p-8 mb-4 border-2 border-gray-200 dark:border-gray-600">
            <img
              src="/images/institution/aclc.png"
              alt="ACLC College of Daet"
              className="w-full h-auto object-contain"
            />
          </div>
          <p className="font-bold text-xl text-gray-900 dark:text-white mb-1">ACLC College of Daet</p>
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mb-1">Bachelor of Science in Information Technology</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Class of 2025-2026</p>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>2F Guinahawa Bldg. J. Lukban St. Daet, Camarines Norte, Daet, Philippines</p>
            <p>0917 566 9532</p>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="text-center text-xs text-gray-400 pt-4">
        <p>FarmTechXBaluzo v2.0 • Built with ❤️ for sustainable farming</p>
        <p className="mt-1">© {new Date().getFullYear()} All Rights Reserved</p>
      </div>
    </div>
  );
}
