"use client";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

interface AdminProfile {
  phone: string;
  bio: string;
  address: string;
  country: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "adminProfiles", user.uid));
        if (snap.exists()) {
          setProfile(snap.data() as AdminProfile);
        }
      } catch (e) {
        console.error("Failed to load admin profile:", e);
      }
    }
    loadProfile();
  }, [user]);

  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <UserMetaCard />

          {/* Account Details */}
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <h4 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90">
              Account Details
            </h4>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Email Address</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.email || "—"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Account UID</p>
                <p className="text-sm font-mono text-gray-800 dark:text-white/90">
                  {user?.uid || "—"}
                </p>
              </div>
              {profile?.phone && (
                <div>
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile.phone}
                  </p>
                </div>
              )}
              {profile?.country && (
                <div>
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Country</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile.country}
                  </p>
                </div>
              )}
              {profile?.address && (
                <div>
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Address</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile.address}
                  </p>
                </div>
              )}
              {profile?.bio && (
                <div>
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Bio / About</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile.bio}
                  </p>
                </div>
              )}
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Last Sign In</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.metadata?.lastSignInTime
                    ? new Date(user.metadata.lastSignInTime).toLocaleString("en-PH", { timeZone: "Asia/Manila" })
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
