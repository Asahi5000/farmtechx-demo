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
  BedDouble,
} from "lucide-react";

interface Room {
  id: string;
  propertyId: string;
  name: string;
  photos: string[];
  pricePerNight: string;
  capacity: string;
  bedType: string;
  description: string;
  availability: boolean;
  createdAt?: Timestamp;
}

const BED_TYPES = ["Single", "Double", "Queen", "King", "Bunk Bed", "Mixed"];

export default function ManageRoomsPage() {
  const params = useParams();
  const router = useRouter();
  const municipalityId = params.id as string;
  const propertyId = params.propertyId as string;
  const { showToast } = useToast();

  const [propertyName, setPropertyName] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formPrice, setFormPrice] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formBedType, setFormBedType] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAvailability, setFormAvailability] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);

  // Fetch property name + rooms from subcollection
  useEffect(() => {
    const fetchData = async () => {
      try {
        const muniRef = doc(db, "municipalities", municipalityId);
        const muniSnap = await getDoc(muniRef);
        if (muniSnap.exists()) {
          const data = muniSnap.data();
          const allArrays = [
            ...(data.whereToStay || []),
          ];
          const found = allArrays.find((item: any) => item.id === propertyId);
          if (found) setPropertyName(found.name || "Unknown Property");
        }

        const roomsRef = collection(db, "municipalities", municipalityId, "rooms");
        const q = query(roomsRef, where("propertyId", "==", propertyId));
        const snap = await getDocs(q);
        const items: Room[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Room, "id">),
        }));
        items.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setRooms(items);
      } catch (err) {
        console.error("Error loading rooms:", err);
        showToast("Failed to load rooms", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [municipalityId, propertyId]);

  const resetForm = () => {
    setFormName("");
    setFormPhotos([]);
    setFormPrice("");
    setFormCapacity("");
    setFormBedType("");
    setFormDescription("");
    setFormAvailability(true);
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (room: Room) => {
    setFormName(room.name);
    setFormPhotos(room.photos || []);
    setFormPrice(room.pricePerNight || "");
    setFormCapacity(room.capacity || "");
    setFormBedType(room.bedType || "");
    setFormDescription(room.description || "");
    setFormAvailability(room.availability !== false);
    setEditingId(room.id);
    setShowForm(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const fileRef = ref(storage, `rooms/${propertyId}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        urls.push(url);
      }
      setFormPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      showToast("Failed to upload photos", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("Room name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const roomsRef = collection(db, "municipalities", municipalityId, "rooms");
      const payload = {
        propertyId,
        name: formName.trim(),
        photos: formPhotos,
        pricePerNight: formPrice.trim(),
        capacity: formCapacity.trim(),
        bedType: formBedType,
        description: formDescription.trim(),
        availability: formAvailability,
      };

      if (editingId) {
        const docRef = doc(roomsRef, editingId);
        await updateDoc(docRef, payload);
        setRooms((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...payload } : r)));
        showToast("Room updated", "success");
      } else {
        const docRef = await addDoc(roomsRef, { ...payload, createdAt: serverTimestamp() });
        setRooms((prev) => [{ id: docRef.id, ...payload, createdAt: undefined } as Room, ...prev]);
        showToast("Room added", "success");
      }
      resetForm();
    } catch (err) {
      console.error("Error saving room:", err);
      showToast("Failed to save room", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const docRef = doc(db, "municipalities", municipalityId, "rooms", deleteTarget.id);
      await deleteDoc(docRef);
      setRooms((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      showToast("Room deleted", "success");
    } catch (err) {
      showToast("Failed to delete room", "error");
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
              Rooms — {propertyName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {rooms.length} room{rooms.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] sm:p-6 shadow-sm space-y-5">
        {/* Add Room Button */}
        <button
          onClick={openAddForm}
          className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-5 py-3 text-sm font-medium text-gray-500 hover:border-brand-500 hover:text-brand-500 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-400 dark:hover:text-brand-400"
        >
          <Plus className="w-4 h-4" /> Add Room
        </button>

        {/* Rooms List */}
        {rooms.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-lg font-medium">No rooms yet</p>
            <p className="text-sm mt-1">Click &ldquo;Add Room&rdquo; to create one</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-white/[0.05] dark:bg-white/[0.02] flex gap-4"
              >
                {/* Thumbnail */}
                {room.photos && room.photos.length > 0 ? (
                  <img src={room.photos[0]} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" alt={room.name} />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <BedDouble className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800 dark:text-white truncate">{room.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      room.availability !== false
                        ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {room.availability !== false ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  {room.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{room.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                    {room.bedType && <span>🛏 {room.bedType}</span>}
                    {room.capacity && <span>👥 Up to {room.capacity} person{Number(room.capacity) !== 1 ? "s" : ""}</span>}
                    {room.pricePerNight && <span>💳 {room.pricePerNight}</span>}
                    {room.photos && room.photos.length > 0 && (
                      <span>📷 {room.photos.length} photo{room.photos.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => handleEdit(room)} className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg dark:hover:bg-brand-500/10">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(room)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== ADD / EDIT ROOM MODAL ===== */}
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
                  {editingId ? "Edit Room" : "New Room"}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {/* Room Name */}
                  <div className="md:col-span-2">
                    <Label>Room Name *</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Deluxe Ocean View, Standard Room A"
                    />
                  </div>

                  {/* Room Photos */}
                  <div className="md:col-span-2">
                    <Label>Room Photos</Label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {formPhotos.map((url, idx) => (
                        <div key={idx} className="relative group w-24 h-24">
                          <img src={url} className="w-full h-full object-cover rounded-xl border border-gray-200" alt={`Photo ${idx + 1}`} />
                          <button
                            type="button"
                            onClick={() => setFormPhotos((prev) => prev.filter((_, i) => i !== idx))}
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
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                      </label>
                    </div>
                  </div>

                  {/* Price per Night */}
                  <div>
                    <Label>Price per Night</Label>
                    <Input
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="e.g. ₱1,500/night"
                    />
                  </div>

                  {/* Capacity */}
                  <div>
                    <Label>Capacity (max persons)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(e.target.value)}
                      placeholder="e.g. 2, 4, 6"
                    />
                  </div>

                  {/* Bed Type */}
                  <div>
                    <Label>Bed Type</Label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white"
                      value={formBedType}
                      onChange={(e) => setFormBedType(e.target.value)}
                    >
                      <option value="">Select bed type</option>
                      {BED_TYPES.map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Availability Toggle */}
                  <div className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">Availability</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formAvailability ? "Room is available for booking" : "Room is currently unavailable"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormAvailability((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formAvailability ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          formAvailability ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Room Description */}
                  <div className="md:col-span-2">
                    <Label>Room Description</Label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white"
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Describe this room..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end w-full gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button size="sm" variant="outline" onClick={resetForm} type="button">
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" disabled={saving}>
                    {saving ? "Saving..." : editingId ? "Save Changes" : "Add Room"}
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
                  Delete Room
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
