"use client";

import React, { useEffect, useState, useMemo } from "react";
import { municipalitiesService, provincesService } from "@/config/firestoreService";
import { Municipality, Province, MunicipalityStatus } from "@/types";
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
import Link from "next/link";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";

export default function MunicipalitiesPage() {
  const [data, setData] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [provinces, setProvinces] = useState<{value: string, label: string}[]>([]);
  const [provinceFilter, setProvinceFilter] = useState("");
  const { showToast } = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMuni, setEditingMuni] = useState<Municipality | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formImage, setFormImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formStatus, setFormStatus] = useState<MunicipalityStatus>("disabled");
  const [formDescription, setFormDescription] = useState("");
  const [formHistory, setFormHistory] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [munis, provsList] = await Promise.all([
        municipalitiesService.getAll(),
        provincesService.getAll()
      ]);
      
      const provMap = provsList.reduce((acc, prov) => {
        acc[prov.id] = prov.islandGroupName;
        return acc;
      }, {} as Record<string, string | undefined>);

      // ensure island group is populated in table if missing directly on muni
      const mappedMunis = munis.map(m => ({
        ...m,
        islandGroupName: m.islandGroupName || provMap[m.provinceId] || "Unknown"
      }));
      setData(mappedMunis);
      
      const provOptions = provsList
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(p => ({
          value: p.id,
          label: p.name
        }));
      setProvinces([{ value: "", label: "All Provinces" }, ...provOptions]);
    } catch (error) {
      console.error("Failed to load municipalities or provinces", error);
      showToast("Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = (muni: Municipality) => {
    setEditingMuni(muni);
    setFormImage(muni.image || "");
    setFormStatus(muni.status || "disabled");
    setFormDescription(muni.description || "");
    setFormHistory(muni.history || "");
    setImageFile(null);
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingMuni(null);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMuni) return;

    setSaving(true);
    let finalImageUrl = formImage;
    try {
      if (imageFile) {
        const fileRef = ref(storage, `municipalities/${imageFile.name}_${Date.now()}`);
        await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      await municipalitiesService.update(editingMuni.id, {
        image: finalImageUrl,
        status: formStatus,
        description: formDescription,
        history: formHistory,
      });
      showToast("Municipality updated successfully.", "success");
      closeModal();
      loadData(); // refresh list
    } catch (error) {
      console.error("Failed to update municipality", error);
      showToast("Failed to update municipality.", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((muni) => {
      const matchesSearch = muni.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProv = provinceFilter ? muni.provinceId === provinceFilter : true;
      return matchesSearch && matchesProv;
    });
  }, [data, searchQuery, provinceFilter]);

  const StatusBadge = ({ status }: { status: MunicipalityStatus }) => {
    if (status === 'enabled') {
      return <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-theme-xs font-medium dark:bg-green-500/20 dark:text-green-400">Enabled</span>;
    }
    if (status === 'coming_soon') {
      return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-theme-xs font-medium dark:bg-amber-500/20 dark:text-amber-400">Coming Soon</span>;
    }
    return <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-theme-xs font-medium dark:bg-red-500/20 dark:text-red-400">Disabled</span>;
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">
          Municipalities
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-1/2 justify-end">
          <div className="w-full sm:w-1/2">
            <Input
              type="text"
              placeholder="Search municipalities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-1/2">
            <Select
              options={provinces}
              placeholder="Filter by Province"
              onChange={(val) => setProvinceFilter(val)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[900px]">
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
                    Province
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
                    Status
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
                      No municipalities found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((muni) => (
                    <TableRow key={muni.id}>
                      <TableCell className="px-5 py-4 text-gray-800 text-start text-theme-sm dark:text-white/90 font-medium">
                        {muni.name}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-brand-500 text-start text-theme-sm">
                        {muni.provinceName}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {muni.islandGroupName || "N/A"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <StatusBadge status={muni.status || 'disabled'} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(muni)}
                          >
                            Edit
                          </Button>
                          <Link href={`/municipalities/${muni.id}`}>
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
        {isModalOpen && editingMuni && (
          <Modal isOpen={true} onClose={closeModal} className="max-w-[800px] p-5 lg:p-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSave} className="flex flex-col gap-6">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Edit Municipality
                </h4>

                {formImage ? (
                  <div 
                    className="relative w-full h-[250px] overflow-hidden rounded-xl bg-gray-100 border border-gray-200 dark:border-gray-700 group cursor-pointer"
                    onClick={() => document.getElementById('muni-image-upload')?.click()}
                  >
                    <img
                      src={formImage}
                      alt="Preview"
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Change Cover Photo</span>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="relative w-full h-[250px] overflow-hidden rounded-xl bg-gray-100 border border-gray-200 dark:border-gray-700 cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                    onClick={() => document.getElementById('muni-image-upload')?.click()}
                  >
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Upload Cover Photo</span>
                  </div>
                )}
                <input
                  id="muni-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="md:col-span-1">
                    <Label>Name</Label>
                    <Input
                      type="text"
                      value={editingMuni.name}
                      readOnly
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Label>Status</Label>
                    <Select
                      options={[
                        { value: 'enabled', label: 'Enabled' },
                        { value: 'coming_soon', label: 'Coming Soon' },
                        { value: 'disabled', label: 'Disabled' },
                      ]}
                      value={formStatus}
                      onChange={(val) => { setFormStatus(val as MunicipalityStatus); setIsDirty(true); }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white min-h-[100px]"
                      value={formDescription}
                      onChange={(e) => { setFormDescription(e.target.value); setIsDirty(true); }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Historical Background</Label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white min-h-[120px]"
                      value={formHistory}
                      onChange={(e) => { setFormHistory(e.target.value); setIsDirty(true); }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end w-full gap-3 mt-4">
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
