"use client";

import React, { useEffect, useState, useMemo } from "react";
import { provincesService, regionsService, municipalitiesService } from "@/config/firestoreService";
import { Province, Region } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import { useToast } from "@/context/ToastContext";
import { AnimatePresence, motion } from "framer-motion";
import { storage } from "@/config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";

const getRegionRank = (name: string) => {
  const order = [
    "NCR", "CAR", "REGION I", "REGION II", "REGION III", "REGION IV-A", "REGION IV-B",
    "REGION V", "REGION VI", "REGION VII", "REGION VIII", "REGION IX", "REGION X",
    "REGION XI", "REGION XII", "REGION XIII", "BARMM"
  ];
  const upperName = name.toUpperCase();
  const index = order.findIndex(o => 
    upperName === o || 
    upperName.startsWith(o + " ") || 
    upperName.startsWith(o + ":") || 
    upperName.startsWith(o + "-")
  );
  return index === -1 ? 999 : index;
};

function VotingStatusTimer({ province }: { province: Province }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [status, setStatus] = useState<"Not Set" | "Active" | "Ended">("Not Set");
  const { showToast } = useToast();

  useEffect(() => {
    if (!province.votingStartDate || !province.votingEndDate) {
      setStatus("Not Set");
      return;
    }

    let isProcessing = false;

    const checkStatus = async () => {
      // Auto-clear lastVotingResult if older than 3 days
      if (province.lastVotingResultDate) {
        const resultDate = province.lastVotingResultDate.toDate();
        const nowMs = new Date().getTime();
        const diffDays = (nowMs - resultDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 3) {
          try {
             await provincesService.update(province.id, {
               lastVotingResult: null,
               lastVotingResultDate: null
             });
          } catch(e) {}
        }
      }

      if (!province.votingStartDate || !province.votingEndDate) {
        setStatus("Not Set");
        setTimeLeft("");
        return;
      }

      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const start = new Date(province.votingStartDate);
      const end = new Date(province.votingEndDate);

      if (now < start) {
        setStatus("Not Set");
        setTimeLeft("");
      } else if (now >= start && now <= end) {
        setStatus("Active");
        const diff = end.getTime() - now.getTime();
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      } else {
        setStatus("Ended");
        setTimeLeft("");
        
        // Auto-enable winner if not yet processed and NOT already resolved
        if (!isProcessing && !province.votingResolved) {
          isProcessing = true;
          try {
            const allMunis = await municipalitiesService.getAll();
            const comingSoonMunis = allMunis.filter(m => m.provinceId === province.id && m.status === 'coming_soon');
            
            if (comingSoonMunis.length > 0) {
              // Sort by voteCount desc
              comingSoonMunis.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
              
              const winner = comingSoonMunis[0];
              const losers = comingSoonMunis.slice(1);
              
              // Update winner
              await municipalitiesService.update(winner.id, { status: 'enabled' });
              
              // Update losers
              if (losers.length > 0) {
                const updatePromises = losers.map(loser => 
                  municipalitiesService.update(loser.id, { status: 'disabled' })
                );
                await Promise.all(updatePromises);
              }

              const resultMsg = `Voting ended for ${province.name}! Winner: ${winner.name} is now Enabled!`;
              showToast(resultMsg, 'success');

              // Mark province as explicitly resolved
              await provincesService.update(province.id, { 
                votingResolved: true,
                votingStartDate: null as any,
                votingEndDate: null as any,
                lastVotingResult: resultMsg,
                lastVotingResultDate: Timestamp.now()
              });
            } else {
              // Even if empty, mark as resolved so we don't query every single tick
              await provincesService.update(province.id, { 
                votingResolved: true,
                votingStartDate: null as any,
                votingEndDate: null as any
              });
            }
          } catch (error) {
            console.error("Failed to process voting results for province", province.id, error);
          }
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, [province.votingStartDate, province.votingEndDate, province.id]);

  if (status === "Not Set") return <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-theme-xs font-medium dark:bg-gray-800 dark:text-gray-400">Not Set</span>;
  if (status === "Ended") return <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-theme-xs font-medium dark:bg-gray-800 dark:text-gray-400 shrink-0">Ended</span>;

  return (
    <div className="flex flex-col gap-0.5 shrink-0 min-w-[100px]">
      <span className="text-green-600 font-medium text-xs dark:text-green-500">Active</span>
      <span className="text-green-700 font-bold text-sm tracking-widest dark:text-green-400 tabular-nums">{timeLeft}</span>
    </div>
  );
}

export default function ProvincesPage() {
  const [data, setData] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [regions, setRegions] = useState<{value: string, label: string}[]>([]);
  const [regionFilter, setRegionFilter] = useState("");
  const { showToast } = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvince, setEditingProvince] = useState<Province | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formTagline, setFormTagline] = useState("");
  const [formImage, setFormImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [provinces, regionsList] = await Promise.all([
        provincesService.getAll(),
        regionsService.getAll()
      ]);
      
      const regionMap = regionsList.reduce((acc, region) => {
        acc[region.id] = { name: region.name, islandGroupName: region.islandGroupName };
        // Also map island group
        return acc;
      }, {} as Record<string, { name: string, islandGroupName?: string }>);

      const mappedProvinces = provinces.map(p => ({
        ...p,
        regionName: regionMap[p.regionId]?.name || p.regionName || "Unknown",
        islandGroupName: regionMap[p.regionId]?.islandGroupName || p.islandGroupName || "Unknown"
      }));
      setData(mappedProvinces);
      
      const regionOptions = regionsList
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(r => ({
          value: r.id,
          label: r.name
        }));
      setRegions([{ value: "", label: "All Regions" }, ...regionOptions]);
    } catch (error) {
      console.error("Failed to load provinces or regions", error);
      showToast("Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = async (province: Province) => {
    setEditingProvince(province);
    setFormName(province.name);
    setFormTagline(province.tagline || "");
    setFormImage(province.image || "");
    setFormPhotos(province.photos || []);
    
    setImageFile(null);
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingProvince(null);
      setImageFile(null);
    }, 300); // delay cleanup to allow animation to complete
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setFormImage(URL.createObjectURL(file));
      setIsDirty(true);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploadingPhotos(true);
    try {
      const files = Array.from(e.target.files);
      const newUrls = await Promise.all(
        files.map(async (file) => {
          const fileRef = ref(storage, `provinces/gallery/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`);
          await uploadBytes(fileRef, file);
          return await getDownloadURL(fileRef);
        })
      );
      
      setFormPhotos(prev => [...prev, ...newUrls]);
      setIsDirty(true);
    } catch (error) {
      console.error("Failed to upload gallery photos", error);
      showToast("Failed to upload photos.", "error");
    } finally {
      setUploadingPhotos(false);
      // Reset input
      if (document.getElementById('province-gallery-upload')) {
        (document.getElementById('province-gallery-upload') as HTMLInputElement).value = '';
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvince) return;

    setSaving(true);
    let finalImageUrl = formImage;
    try {
      if (imageFile) {
        const fileRef = ref(storage, `provinces/${imageFile.name}_${Date.now()}`);
        await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      await provincesService.update(editingProvince.id, {
        tagline: formTagline,
        image: finalImageUrl,
        photos: formPhotos,
      });
      showToast("Province updated successfully.", "success");
      closeModal();
      loadData(); // refresh list
    } catch (error) {
      console.error("Failed to update province", error);
      showToast("Failed to update province.", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((province) => {
      const matchesSearch = province.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = regionFilter ? province.regionId === regionFilter : true;
      return matchesSearch && matchesRegion;
    });
  }, [data, searchQuery, regionFilter]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-title-sm2 font-bold text-black dark:text-white">
          Provinces
        </h2>
      </div>

      <div className="flex flex-col gap-5 md:gap-7 2xl:gap-10">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-4 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
              Provinces List
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-[300px]">
                <Input
                  type="text"
                  placeholder="Search provinces..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <Select
                  options={regions}
                  value={regionFilter}
                  placeholder="Filter by Region"
                  onChange={(val) => setRegionFilter(val)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-w-full">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Region
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Island Group
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Voting Status
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {loading ? (
                  <TableRow>
                    <TableCell className="px-5 py-4 text-gray-500" colSpan={5}>
                      Loading data...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-5 py-4 text-gray-500" colSpan={5}>
                      No provinces found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((province) => (
                    <TableRow key={province.id}>
                      <TableCell className="px-5 py-4 text-gray-800 text-start text-theme-sm dark:text-white/90 font-medium">
                        {province.name}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-brand-500 text-start text-theme-sm">
                        {province.regionName}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {province.islandGroupName || "N/A"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <VotingStatusTimer province={province} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(province)}
                          >
                            Edit
                          </Button>
                          <Link href={`/provinces/${province.id}`}>
                            <Button size="sm">
                              Manage
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <Modal isOpen={true} onClose={closeModal} className="max-w-[800px] p-5 lg:p-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSave} className="flex flex-col gap-6">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Edit Province
                </h4>

                {formImage ? (
                  <div 
                    className="relative w-full h-[250px] overflow-hidden rounded-xl bg-gray-100 border border-gray-200 dark:border-gray-700 group cursor-pointer"
                    onClick={() => document.getElementById('province-image-upload')?.click()}
                  >
                    <img
                      src={formImage}
                      alt="Preview"
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium">Change Photo</span>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="relative w-full h-[250px] overflow-hidden rounded-xl bg-gray-100 border border-gray-200 dark:border-gray-700 cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                    onClick={() => document.getElementById('province-image-upload')?.click()}
                  >
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium">Upload Photo</span>
                  </div>
                )}
                <input
                  id="province-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="md:col-span-2">
                    <Label>Name</Label>
                    <Input
                      type="text"
                      value={formName}
                      readOnly
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Tagline</Label>
                    <Input
                      type="text"
                      value={formTagline}
                      onChange={(e) => { setFormTagline(e.target.value); setIsDirty(true); }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Province Gallery (Photos)</Label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {formPhotos.map((url, idx) => (
                        <div key={idx} className="relative group w-24 h-24">
                          <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover rounded-xl border border-gray-200" />
                          <button
                            type="button"
                            onClick={() => { setFormPhotos(formPhotos.filter((_, i) => i !== idx)); setIsDirty(true); }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      <label id="province-gallery-upload" className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                        {uploadingPhotos ? (
                          <span className="text-xs text-gray-400">Uploading...</span>
                        ) : (
                          <>
                            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span className="text-xs text-gray-500 font-medium">Add Photo</span>
                          </>
                        )}
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleGalleryUpload}
                          disabled={uploadingPhotos}
                        />
                      </label>
                    </div>
                  </div>



                </div>

                <div className="flex items-center justify-end w-full gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button size="sm" variant="outline" onClick={closeModal} type="button">
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" disabled={saving || !isDirty}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
