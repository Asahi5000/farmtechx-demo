"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Trash2, Sparkles, Upload, Loader2, Clock } from "lucide-react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { provincesService, municipalitiesService } from "@/config/firestoreService";
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
  const [openSection, setOpenSection] = useState<number>(3);

  // Section 2: Festivals
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [savingFestivals, setSavingFestivals] = useState(false);
  const [uploadingFestivalIndex, setUploadingFestivalIndex] = useState<number | null>(null);
  const [isDirtyFestivals, setIsDirtyFestivals] = useState(false);

  // Section 3: Voting Period Settings
  const [votingStartDate, setVotingStartDate] = useState("");
  const [votingEndDate, setVotingEndDate] = useState("");
  const [comingSoonMunis, setComingSoonMunis] = useState<any[]>([]);
  const [savingVoting, setSavingVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{status: string, text: string}>({status: 'Not Set', text: ''});
  const [isDirtyVoting, setIsDirtyVoting] = useState(false);

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

          const toDatetimeLocal = (val: any) => {
            if (!val) return '';
            // If already exactly YYYY-MM-DDTHH:mm, keep to avoid UTC timezone shifts
            if (typeof val === 'string' && val.length === 16 && val.includes('T')) return val;
            
            let now;
            if (val && typeof val.toDate === 'function') {
              now = val.toDate();
            } else {
              now = new Date(val);
            }
            if (isNaN(now.getTime())) return '';

            const phOffset = 8 * 60; // UTC+8 in minutes
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const phTime = new Date(utc + (phOffset * 60000));
            
            const yyyy = phTime.getFullYear();
            const mm = String(phTime.getMonth() + 1).padStart(2, '0');
            const dd = String(phTime.getDate()).padStart(2, '0');
            const hh = String(phTime.getHours()).padStart(2, '0');
            const min = String(phTime.getMinutes()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
          };

          const getPHTimeNow = () => {
            const now = new Date();
            const phOffset = 8 * 60; // UTC+8 in minutes
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const phTime = new Date(utc + (phOffset * 60000));
            
            const yyyy = phTime.getFullYear();
            const mm = String(phTime.getMonth() + 1).padStart(2, '0');
            const dd = String(phTime.getDate()).padStart(2, '0');
            const hh = String(phTime.getHours()).padStart(2, '0');
            const min = String(phTime.getMinutes()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
          };

          const currentPhTime = getPHTimeNow();
          console.log("getPHTimeNow() value:", currentPhTime); // e.g., 2026-02-25T00:21

          let hasValidFutureVoting = false;
          let shouldClearFirestore = false;

          if (found.votingResolved) {
            shouldClearFirestore = true;
          } else if (found.votingEndDate) {
            const endDateLocal = toDatetimeLocal(found.votingEndDate);
            if (endDateLocal && endDateLocal <= currentPhTime) {
              shouldClearFirestore = true;
            } else if (endDateLocal > currentPhTime) {
              hasValidFutureVoting = true;
            }
          }

          if (shouldClearFirestore) {
            try {
              await provincesService.update(provinceId, {
                votingResolved: false,
                votingStartDate: null as any,
                votingEndDate: null as any
              });
            } catch (clearErr) {
              console.error("Failed to clear expired voting dates", clearErr);
            }
          }

          if (hasValidFutureVoting) {
            setVotingStartDate(toDatetimeLocal(found.votingStartDate));
            setVotingEndDate(toDatetimeLocal(found.votingEndDate));
          } else {
            setVotingStartDate(currentPhTime);
            setVotingEndDate("");
          }
          
          try {
             const allMunis = await municipalitiesService.getAll();
             const comingSoon = allMunis.filter(m => m.provinceId === provinceId && m.status === 'coming_soon').sort((a,b) => (b.voteCount || 0) - (a.voteCount || 0));
             setComingSoonMunis(comingSoon);
          } catch (e) {
             console.error("Failed to fetch munis", e);
          }
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

  const festivalsLoadedRef = React.useRef(false);
  useEffect(() => {
    if (!festivalsLoadedRef.current) {
      festivalsLoadedRef.current = true;
      return;
    }
    setIsDirtyFestivals(true);
  }, [festivals]);

  const setFullState = setProvince; // utility

  useEffect(() => {
    if (!votingStartDate || !votingEndDate) {
      setTimeLeft({status: 'Not Set', text: 'Not Set'});
      return;
    }

    const checkStatus = () => {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      // votingStartDate and EndDate are already 'YYYY-MM-DDTHH:mm' format
      const start = new Date(votingStartDate);
      const end = new Date(votingEndDate); 

      if (now < start) {
        setTimeLeft({status: 'Not Started', text: 'Voting not yet started'});
      } else if (now >= start && now <= end) {
        const diff = end.getTime() - now.getTime();
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft({status: 'Active', text: `${d}d ${h}h ${m}m ${s}s remaining`});
      } else {
        setTimeLeft({status: 'Ended', text: 'Voting has ended'});
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [votingStartDate, votingEndDate]);

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
                    setIsDirtyFestivals(false);
                  } catch (err) {
                    showToast("Failed to update festivals", "error");
                  } finally {
                    setSavingFestivals(false);
                  }
                }} disabled={savingFestivals || !isDirtyFestivals}>
                  {savingFestivals ? "Saving..." : "Save Festivals"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 3: Voting Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button 
            onClick={() => setOpenSection(openSection === 3 ? 0 : 3)}
            className="w-full flex items-center justify-between p-5 bg-gray-50/50 hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-500/20 dark:text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-800 dark:text-white/90">Voting Period Settings</h3>
                <p className="text-xs text-gray-500">Enable province-wide voting for coming soon municipalities.</p>
              </div>
            </div>
            {openSection === 3 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {openSection === 3 && (
            <div className="p-6 space-y-8 bg-gray-50/30 dark:bg-gray-800/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <Label>Voting Start Date & Time (PH Time)</Label>
                  <Input
                    type="datetime-local"
                    value={votingStartDate}
                    onChange={(e) => { setVotingStartDate(e.target.value); setIsDirtyVoting(true); }}
                  />
                </div>
                <div>
                  <Label>Voting End Date & Time (PH Time)</Label>
                  <Input
                    type="datetime-local"
                    value={votingEndDate}
                    onChange={(e) => { setVotingEndDate(e.target.value); setIsDirtyVoting(true); }}
                  />
                </div>
              </div>
              
              <div className="mt-3 text-sm flex items-center gap-2">
                 <span className="text-gray-500 font-medium tracking-wide border-gray-300 dark:text-gray-400">
                   Voting Countdown: 
                 </span>
                 <span className={`font-semibold ${timeLeft.status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                   {timeLeft.text}
                 </span>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h5 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-3">
                  Coming Soon Municipalities
                </h5>
                    {comingSoonMunis.length > 0 ? (
                      <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-100/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                            <TableRow>
                              <TableCell isHeader className="px-4 py-2 font-medium text-xs text-gray-500">Municipality</TableCell>
                              <TableCell isHeader className="px-4 py-2 font-medium text-xs text-gray-500 text-center">Current Votes</TableCell>
                              <TableCell isHeader className="px-4 py-2 font-medium text-xs text-gray-500 text-right">Status</TableCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {comingSoonMunis.map((muni) => (
                              <TableRow key={muni.id}>
                                <TableCell className="px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-white/90">{muni.name}</TableCell>
                                <TableCell className="px-4 py-2.5 text-sm text-gray-600 text-center font-bold tabular-nums">
                                  {muni.voteCount?.toLocaleString() || '0'}
                                </TableCell>
                                <TableCell className="px-4 py-2.5 text-right">
                                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-semibold uppercase tracking-wider dark:bg-amber-500/20 dark:text-amber-400">
                                    Coming Soon
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-gray-800 px-5 py-6 flex flex-col items-center justify-center text-center">
                        <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          No municipalities with Coming Soon status in this province
                        </span>
                      </div>
                    )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                <Button size="sm" onClick={async () => {
                  setSavingVoting(true);
                  try {
                    await provincesService.update(provinceId, { 
                       votingStartDate: votingStartDate || undefined, 
                       votingEndDate: votingEndDate || undefined,
                       votingResolved: false 
                    });
                    showToast("Voting settings updated successfully.", "success");
                    setFullState(prev => prev ? { ...prev, votingStartDate, votingEndDate, votingResolved: false } : prev);
                    setIsDirtyVoting(false);
                  } catch (err) {
                    showToast("Failed to update voting settings", "error");
                  } finally {
                    setSavingVoting(false);
                  }
                }} disabled={savingVoting || !isDirtyVoting}>
                  {savingVoting ? "Saving..." : "Save Voting Settings"}
                </Button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
