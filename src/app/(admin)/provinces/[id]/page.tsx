"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Trash2, Sparkles, Upload, Loader2 } from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { provincesService } from "@/config/firestoreService";
import { Province, Festival } from "@/types";
import { useToast } from "@/context/ToastContext";
import { storage } from "@/config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProvinceManagePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  
  const provinceId = params.id as string;
  const [province, setProvince] = useState<Province | null>(null);
  const [loading, setLoading] = useState(true);

  // Accordion states
  const [openSection, setOpenSection] = useState<number>(2);

  // Section 2: Festivals
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [savingFestivals, setSavingFestivals] = useState(false);
  const [uploadingFestivalIndex, setUploadingFestivalIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!provinceId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const provinces = await provincesService.getAll();
        const found = provinces.find(p => p.id === provinceId);
        if (found) {
          setProvince(found);
          // Init Festivals
          setFestivals(found.festivals || []);
        } else {
          showToast("Province not found.", "error");
          router.push("/provinces");
        }
      } catch (error) {
        console.error("Failed to load province data:", error);
        showToast("Error loading province data.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [provinceId, router, showToast]);

  const setFullState = setProvince; // utility

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!province) return null;

  return (
    <div className="flex flex-col gap-6 w-full pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/provinces")}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Festivals & Events — {province.name}
            </h2>
            <p className="text-sm text-gray-500">Manage festivals, historical backgrounds, and travel guides.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Accordion 2: Media & Events */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button 
            onClick={() => setOpenSection(openSection === 2 ? 0 : 2)}
            className="w-full flex items-center justify-between p-5 bg-gray-50/50 hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg dark:bg-amber-500/20 dark:text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-800 dark:text-white/90">Media & Events</h3>
                <p className="text-xs text-gray-500">Manage festivals, historical backgrounds, and travel guides.</p>
              </div>
            </div>
            {openSection === 2 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {openSection === 2 && (
            <div className="p-6 space-y-8 bg-gray-50/30 dark:bg-gray-800/30">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-800 dark:text-gray-200">Festivals & Provincial Events</h4>
                <Button 
                  size="sm" 
                  onClick={() => setFestivals([...festivals, { id: Date.now().toString(), name: '', date: '', coverImage: '', description: '', history: '', photos: [], travelTips: [], travelInfo: { office: '', phone: '', address: '', email: '', website: '' } }])}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Festival
                </Button>
              </div>

              {festivals.map((festival, idx) => (
                <div key={festival.id} className="relative p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm space-y-6">
                  <button
                    type="button"
                    onClick={() => setFestivals(festivals.filter((_, i) => i !== idx))}
                    className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors z-10"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <Label>Festival Name</Label>
                      <Input
                        type="text"
                        value={festival.name || ""}
                        onChange={(e) => {
                          const updated = [...festivals];
                          updated[idx].name = e.target.value;
                          setFestivals(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Festival Date</Label>
                      <Input
                        type="text"
                        placeholder="e.g. May 15-17"
                        value={festival.date || ""}
                        onChange={(e) => {
                          const updated = [...festivals];
                          updated[idx].date = e.target.value;
                          setFestivals(updated);
                        }}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Cover Image</Label>
                      <div className="flex items-center gap-4 mt-2">
                        {festival.coverImage && (
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src={festival.coverImage} className="w-full h-full object-cover" alt="Festival cover" />
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <div className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                            {uploadingFestivalIndex === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {festival.coverImage ? 'Change Image' : 'Upload Image'}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingFestivalIndex === idx}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingFestivalIndex(idx);
                              try {
                                const fileRef = ref(storage, `provinces/festivals/${file.name}_${Date.now()}`);
                                await uploadBytes(fileRef, file);
                                const url = await getDownloadURL(fileRef);
                                const updated = [...festivals];
                                updated[idx].coverImage = url;
                                setFestivals(updated);
                              } catch (err) {
                                showToast("Failed to upload festival cover", "error");
                              } finally {
                                setUploadingFestivalIndex(null);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <textarea
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white"
                        rows={3}
                        value={festival.description || ""}
                        onChange={(e) => {
                          const updated = [...festivals];
                          updated[idx].description = e.target.value;
                          setFestivals(updated);
                        }}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Historical Background</Label>
                      <textarea
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white"
                        rows={4}
                        value={festival.history || ""}
                        onChange={(e) => {
                          const updated = [...festivals];
                          updated[idx].history = e.target.value;
                          setFestivals(updated);
                        }}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Festival Gallery</Label>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {(festival.photos || []).map((url, pIdx) => (
                          <div key={pIdx} className="relative group w-20 h-20">
                            <img src={url} alt={`Gallery ${pIdx}`} className="w-full h-full object-cover rounded-xl border border-gray-200 dark:border-gray-700" />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...festivals];
                                updated[idx].photos = updated[idx].photos.filter((_, i) => i !== pIdx);
                                setFestivals(updated);
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-700">
                          {uploadingFestivalIndex === idx ? (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-5 h-5 text-gray-400 mb-1" />
                              <span className="text-[10px] text-gray-500 font-medium">Add Photo</span>
                            </>
                          )}
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length === 0) return;
                              setUploadingFestivalIndex(idx);
                              try {
                                const uploadPromises = files.map(async (file) => {
                                  const fileRef = ref(storage, `provinces/festivals/gallery/${file.name}_${Date.now()}`);
                                  await uploadBytes(fileRef, file);
                                  return await getDownloadURL(fileRef);
                                });
                                const urls = await Promise.all(uploadPromises);
                                const updated = [...festivals];
                                updated[idx].photos = [...(updated[idx].photos || []), ...urls];
                                setFestivals(updated);
                              } catch (err) {
                                showToast("Failed to upload photos", "error");
                              } finally {
                                setUploadingFestivalIndex(null);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Travel Tips</Label>
                        <button
                          type="button"
                          className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                          onClick={() => {
                            const updated = [...festivals];
                            updated[idx].travelTips = [...(updated[idx].travelTips || []), ""];
                            setFestivals(updated);
                          }}
                        >
                          + Add Bullet Point
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(festival.travelTips || []).map((tip, tIdx) => (
                          <div key={tIdx} className="flex gap-2">
                            <Input
                              type="text"
                              value={tip}
                              onChange={(e) => {
                                const updated = [...festivals];
                                updated[idx].travelTips[tIdx] = e.target.value;
                                setFestivals(updated);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...festivals];
                                updated[idx].travelTips = updated[idx].travelTips.filter((_, i) => i !== tIdx);
                                setFestivals(updated);
                              }}
                              className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg dark:hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-4">Travel & Contact Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Office Name</Label>
                          <Input
                            type="text"
                            value={festival.travelInfo?.office || ""}
                            onChange={(e) => {
                              const updated = [...festivals];
                              updated[idx].travelInfo = { ...updated[idx].travelInfo, office: e.target.value } as any;
                              setFestivals(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            type="text"
                            value={festival.travelInfo?.phone || ""}
                            onChange={(e) => {
                              const updated = [...festivals];
                              updated[idx].travelInfo = { ...updated[idx].travelInfo, phone: e.target.value } as any;
                              setFestivals(updated);
                            }}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Address</Label>
                          <Input
                            type="text"
                            value={festival.travelInfo?.address || ""}
                            onChange={(e) => {
                              const updated = [...festivals];
                              updated[idx].travelInfo = { ...updated[idx].travelInfo, address: e.target.value } as any;
                              setFestivals(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={festival.travelInfo?.email || ""}
                            onChange={(e) => {
                              const updated = [...festivals];
                              updated[idx].travelInfo = { ...updated[idx].travelInfo, email: e.target.value } as any;
                              setFestivals(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Website</Label>
                          <Input
                            type="text"
                            value={festival.travelInfo?.website || ""}
                            onChange={(e) => {
                              const updated = [...festivals];
                              updated[idx].travelInfo = { ...updated[idx].travelInfo, website: e.target.value } as any;
                              setFestivals(updated);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                <Button size="sm" onClick={async () => {
                  setSavingFestivals(true);
                  try {
                    await provincesService.update(provinceId, { festivals });
                    showToast("Festivals updated successfully.", "success");
                    setFullState(prev => prev ? { ...prev, festivals } : prev);
                  } catch (err) {
                    showToast("Failed to update festivals", "error");
                  } finally {
                    setSavingFestivals(false);
                  }
                }} disabled={savingFestivals}>
                  {savingFestivals ? "Saving..." : "Save Festivals"}
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
