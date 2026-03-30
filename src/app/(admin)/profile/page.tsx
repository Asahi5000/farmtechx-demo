"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">View your account information</p>
      </div>

      {/* User Info Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 lg:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {user?.displayName || "User"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {user?.email?.includes('admin') ? 'Admin' : 'Staff'}
            </span>
          </div>
        </div>

        {/* Account Details */}
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-700 lg:p-6">
          <h4 className="mb-5 text-lg font-medium text-gray-800 dark:text-white">
            Account Details
          </h4>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Email Address</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {user?.email || "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Account UID</p>
              <p className="text-sm font-mono text-gray-800 dark:text-white break-all">
                {user?.uid || "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Display Name</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {user?.displayName || "Not set"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Account Created</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {user?.metadata?.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Last Sign In</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {user?.metadata?.lastSignInTime
                  ? new Date(user.metadata.lastSignInTime).toLocaleString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Email Verified</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {user?.emailVerified ? "✅ Yes" : "❌ No"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
