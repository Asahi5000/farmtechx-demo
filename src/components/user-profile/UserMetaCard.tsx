"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { useToast } from "@/context/ToastContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, X, Loader2 } from "lucide-react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface AdminProfile {
  phone: string;
  bio: string;
  address: string;
  country: string;
}

export default function UserMetaCard() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [profileData, setProfileData] = useState<AdminProfile>({ phone: "", bio: "", address: "", country: "" });

  const initials = (user?.displayName || "A").charAt(0).toUpperCase();

  // Load extra profile fields from Firestore
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "adminProfiles", user.uid));
        if (snap.exists()) {
          const data = snap.data() as AdminProfile;
          setProfileData(data);
        }
      } catch (e) {
        console.error("Failed to load admin profile:", e);
      }
    }
    loadProfile();
  }, [user]);

  const openModal = () => {
    setDisplayName(user?.displayName || "");
    setPhone(profileData.phone || "");
    setBio(profileData.bio || "");
    setAddress(profileData.address || "");
    setCountry(profileData.country || "");
    setIsOpen(true);
  };

  const closeModal = () => setIsOpen(false);

  // Upload profile photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file.", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB.", "warning");
      return;
    }

    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `adminProfiles/${user.uid}/avatar_${Date.now()}.${file.name.split('.').pop()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateProfile(user, { photoURL: downloadURL });
      refreshUser();
      showToast("Profile photo updated!", "success");
      // Force re-render by triggering state
      setUploadingPhoto(false);
    } catch (error) {
      console.error("Failed to upload photo:", error);
      showToast("Failed to upload photo.", "error");
      setUploadingPhoto(false);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, {
        displayName: displayName.trim() || user.displayName,
      });
      refreshUser();

      const extraFields: AdminProfile = {
        phone: phone.trim(),
        bio: bio.trim(),
        address: address.trim(),
        country: country.trim(),
      };
      await setDoc(doc(db, "adminProfiles", user.uid), extraFields, { merge: true });

      setProfileData(extraFields);
      showToast("Profile updated successfully.", "success");
      closeModal();
    } catch (error) {
      console.error("Failed to update profile:", error);
      showToast("Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            {/* Avatar with hover-to-change */}
            <div className="relative group shrink-0">
              <div className={`w-20 h-20 flex items-center justify-center ${user?.photoURL ? '' : 'bg-blue-600 rounded-2xl overflow-hidden'}`}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="user" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-white font-bold text-3xl">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer ${user?.photoURL ? 'rounded-lg' : 'rounded-2xl'}`}
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {user?.displayName || "Admin"}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.email || "—"}
                </p>
                {profileData.bio && (
                  <>
                    <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{profileData.bio}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 transition-colors"
          >
            <svg className="fill-current" width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill="" />
            </svg>
            Edit
          </button>
        </div>
      </div>

      {/* Edit Profile Modal — framer-motion animated */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-[700px] mx-4 rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-2 lg:px-8 lg:pt-8">
                <div>
                  <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                    Edit Profile
                  </h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Update your personal details.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form */}
              <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-6 py-4 lg:px-8">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Display Name</Label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email (read-only)</Label>
                    <Input type="text" value={user?.email || ""} disabled />
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone Number</Label>
                    <Input
                      type="text"
                      value={phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Country</Label>
                    <Input
                      type="text"
                      value={country}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCountry(e.target.value)}
                      placeholder="Philippines"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input
                      type="text"
                      value={address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
                      placeholder="City, Province"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Bio / About</Label>
                    <Input
                      type="text"
                      value={bio}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBio(e.target.value)}
                      placeholder="A short description about yourself"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 lg:px-8 lg:justify-end">
                <Button size="sm" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
