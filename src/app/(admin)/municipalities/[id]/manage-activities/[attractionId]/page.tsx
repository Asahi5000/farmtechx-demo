"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "@/config/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Camera,
  Loader2,
  Pencil,
  X,
} from "lucide-react";

interface Activity {
  id: string;
  attractionId: string;
  name: string;
  images: string[];
  description: string;
  bestTimeToVisit: string;
  whatToWear: string[];
  createdAt?: Timestamp;
}

const normalizeToArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
};

export default function ManageActivitiesPage() {
  const params = useParams();
  const router = useRouter();
  const municipalityId = params.id as string;
  const attractionId = params.attractionId as string;
  const { showToast } = useToast();

  const [attractionName, setAttractionName] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formDescription, setFormDescription] = useState("");
  const [formBestTime, setFormBestTime] = useState("");
  const [formWhatToWear, setFormWhatToWear] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);

  // Fetch attraction name + activities from subcollection
  useEffect(() => {
    const fetchData = async () => {
      try {
        const muniRef = doc(db, "municipalities", municipalityId);
        const muniSnap = await getDoc(muniRef);
        if (muniSnap.exists()) {
          const data = muniSnap.data();
          const allArrays = [
            ...(data.placesToVisit || []),
            ...(data.thingsToDo || []),
            ...(data.whereToEat || []),
            ...(data.whereToStay || []),
          ];
          const found = allArrays.find((item: any) => item.id === attractionId);
          if (found) setAttractionName(found.name || "Unknown");
        }

        const activitiesRef = collection(db, "municipalities", municipalityId, "activities");
        const q = query(activitiesRef, where("attractionId", "==", attractionId));
        const snap = await getDocs(q);
        const items: Activity[] = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            ...raw,
            whatToWear: normalizeToArray(raw.whatToWear),
          };
        }) as Activity[];
        items.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setActivities(items);
      } catch (err) {
        console.error("Error loading activities:", err);
        showToast("Failed to load activities", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [municipalityId, attractionId]);

  const resetForm = () => {
    setFormName("");
    setFormImages([]);
    setFormDescription("");
    setFormBestTime("");
    setFormWhatToWear([]);
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (activity: Activity) => {
    setFormName(activity.name);
    setFormImages(activity.images || []);
    setFormDescription(activity.description || "");
    setFormBestTime(activity.bestTimeToVisit || "");
    setFormWhatToWear(normalizeToArray(activity.whatToWear));
    setEditingId(activity.id);
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const fileRef = ref(storage, `activities/${attractionId}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        urls.push(url);
      }
      setFormImages((prev) => [...prev, ...urls]);
    } catch (err) {
      showToast("Failed to upload images", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("Activity name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const activitiesRef = collection(db, "municipalities", municipalityId, "activities");
      const payload = {
        attractionId,
        name: formName.trim(),
        images: formImages,
        description: formDescription.trim(),
        bestTimeToVisit: formBestTime.trim(),
        whatToWear: formWhatToWear,
      };

      if (editingId) {
        const docRef = doc(activitiesRef, editingId);
        await updateDoc(docRef, payload);
        setActivities((prev) => prev.map((a) => (a.id === editingId ? { ...a, ...payload } : a)));
        showToast("Activity updated", "success");
      } else {
        const docRef = await addDoc(activitiesRef, { ...payload, createdAt: serverTimestamp() });
        setActivities((prev) => [{ id: docRef.id, ...payload, createdAt: undefined } as Activity, ...prev]);
        showToast("Activity added", "success");
      }
      resetForm();
    } catch (err) {
      console.error("Error saving activity:", err);
      showToast("Failed to save activity", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const docRef = doc(db, "municipalities", municipalityId, "activities", deleteTarget.id);
      await deleteDoc(docRef);
      setActivities((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      showToast("Activity deleted", "success");
    } catch (err) {
      showToast("Failed to delete activity", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/municipalities/${municipalityId}`)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-title-md2 font-semibold text-black dark:text-white">
              Activities — {attractionName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activities.length} activit{activities.length === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] sm:p-6 shadow-sm space-y-5">
        {/* Add Activity Button */}
        <button
          onClick={openAddForm}
          className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-5 py-3 text-sm font-medium text-gray-500 hover:border-brand-500 hover:text-brand-500 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-400 dark:hover:text-brand-400"
        >
          <Plus className="w-4 h-4" /> Add Activity
        </button>

        {/* Activities List */}
        {activities.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-lg font-medium">No activities yet</p>
            <p className="text-sm mt-1">Click &ldquo;Add Activity&rdquo; to create one</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-white/[0.05] dark:bg-white/[0.02] flex gap-4"
              >
                {activity.images && activity.images.length > 0 ? (
                  <img src={activity.images[0]} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" alt={activity.name} />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 dark:text-white truncate">{activity.name}</h3>
                  {activity.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{activity.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                    {activity.bestTimeToVisit && <span>🕐 {activity.bestTimeToVisit}</span>}
                    {activity.whatToWear && activity.whatToWear.length > 0 && (
                      <span>👕 {activity.whatToWear.join(", ")}</span>
                    )}
                    {activity.images && activity.images.length > 0 && (
                      <span>📷 {activity.images.length} image{activity.images.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => handleEdit(activity)} className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg dark:hover:bg-brand-500/10">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(activity)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== ADD / EDIT ACTIVITY MODAL ===== */}
      <AnimatePresence>
        {showForm && (
          <Modal isOpen={true} onClose={resetForm} className="max-w-[800px] p-5 lg:p-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSave} className="flex flex-col gap-6">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  {editingId ? "Edit Activity" : "New Activity"}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="md:col-span-2">
                    <Label>Name *</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Island Hopping, Snorkeling, Hiking"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Cover Images</Label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {formImages.map((url, idx) => (
                        <div key={idx} className="relative group w-24 h-24">
                          <img src={url} className="w-full h-full object-cover rounded-xl border border-gray-200" alt={`Cover ${idx + 1}`} />
                          <button
                            type="button"
                            onClick={() => setFormImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-800">
                        {uploading ? (
                          <span className="text-xs text-gray-400">Uploading...</span>
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500 font-medium">Add Photo</span>
                          </>
                        )}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white"
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Describe this activity..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Best Time to Visit</Label>
                    <Input
                      value={formBestTime}
                      onChange={(e) => setFormBestTime(e.target.value)}
                      placeholder="e.g. Morning and Afternoon, Dry Season (Nov–May), Weekday mornings"
                    />
                  </div>

                  {/* What to Wear — Chip/Tag input */}
                  <div className="md:col-span-2">
                    <Label>What to Wear</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="whatToWear-input"
                        placeholder="e.g. Comfortable shoes, Sunscreen"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const val = input.value.trim();
                            if (val && !formWhatToWear.includes(val)) {
                              setFormWhatToWear((prev) => [...prev, val]);
                              input.value = "";
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById("whatToWear-input") as HTMLInputElement;
                          const val = input?.value.trim();
                          if (val && !formWhatToWear.includes(val)) {
                            setFormWhatToWear((prev) => [...prev, val]);
                            input.value = "";
                          }
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </div>
                    {formWhatToWear.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formWhatToWear.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-brand-50 text-brand-600 px-3 py-1 rounded-full text-sm font-medium dark:bg-brand-500/10 dark:text-brand-400"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => setFormWhatToWear((prev) => prev.filter((_, i) => i !== idx))}
                              className="ml-1 text-brand-400 hover:text-red-500 transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end w-full gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button size="sm" variant="outline" onClick={resetForm} type="button">
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" disabled={saving}>
                    {saving ? "Saving..." : editingId ? "Save Changes" : "Add Activity"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <AnimatePresence>
        {deleteTarget && (
          <Modal isOpen={true} onClose={() => setDeleteTarget(null)} className="max-w-[500px] p-5 lg:p-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-5">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Delete Activity
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete &ldquo;{deleteTarget.name}&rdquo;? This cannot be undone.
                </p>
                <div className="flex items-center justify-end w-full gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button size="sm" variant="outline" onClick={() => setDeleteTarget(null)}>
                    Cancel
                  </Button>
                  <button
                    onClick={confirmDelete}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
