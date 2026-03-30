"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/config/firebase";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      showToast("Please upload an image file.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `profile-images/${user.uid}_${timestamp}`);
      const snapshot = await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(snapshot.ref);
      // Add cache-busting parameter
      const photoURLWithCache = `${photoURL}?t=${timestamp}`;
      await updateProfile(user, { photoURL: photoURLWithCache });
      await refreshUser();
      setImageKey(timestamp); // Force image re-render
      showToast("Profile image updated successfully.", "success");
      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error("Error uploading image:", error);
      showToast(error.message || "Failed to upload image.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!displayName.trim()) {
      showToast("Display name cannot be empty.", "warning");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      refreshUser();
      showToast("Profile updated successfully.", "success");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showToast(error.message || "Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Update your profile information</p>
      </div>

      {/* Profile Image Upload */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white">
          Profile Image
        </h3>
        <div className="flex items-center gap-6">
          <label className={`relative ${uploading ? 'cursor-wait' : 'cursor-pointer'} group`}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="hidden"
            />
            {user?.photoURL ? (
              <img
                key={imageKey}
                src={user.photoURL}
                alt="Profile"
                className={`w-24 h-24 rounded-full object-cover border-4 border-brand-500 transition-opacity ${uploading ? 'opacity-50' : 'group-hover:opacity-75'}`}
              />
            ) : (
              <div className={`w-24 h-24 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-brand-500 transition-opacity ${uploading ? 'opacity-50' : 'group-hover:opacity-75'}`}>
                {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            {/* Hover/Loading Overlay */}
            <div className={`absolute inset-0 bg-black/50 rounded-full flex items-center justify-center transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {uploading ? (
                <span className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
          </label>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white mb-1">
              {uploading ? "Uploading image..." : "Click on the image to change"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or GIF. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white">
          Profile Information
        </h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-800 lg:max-w-md"
              placeholder="Enter your name"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Account Details (Read-only) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-800 lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white">
          Account Details
        </h3>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Account UID</p>
            <p className="text-sm font-mono text-gray-800 dark:text-white break-all">
              {user?.uid || "—"}
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
        </div>
      </div>
    </div>
  );
}
