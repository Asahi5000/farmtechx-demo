"use client";

import React, { useEffect, useState, useMemo } from "react";
import { regionsService, islandGroupsService } from "@/config/firestoreService";
import { Region, IslandGroup } from "@/types";
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

export default function RegionsPage() {
  const [data, setData] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [islandGroups, setIslandGroups] = useState<{value: string, label: string}[]>([]);
  const [islandGroupFilter, setIslandGroupFilter] = useState("");
  const { showToast } = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formImage, setFormImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [regions, groups] = await Promise.all([
        regionsService.getAll(),
        islandGroupsService.getAll()
      ]);
      setData(regions);
      
      const groupOptions = groups.map(g => ({
        value: g.name,
        label: g.name
      }));
      // Add 'All' option to the beginning
      setIslandGroups([{ value: "", label: "All Island Groups" }, ...groupOptions]);
    } catch (error) {
      console.error("Failed to load regions or island groups", error);
      showToast("Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = (region: Region) => {
    setEditingRegion(region);
    setFormName(region.name);
    setFormImage(region.backgroundImage || "");
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingRegion(null);
      setImageFile(null);
    }, 300); // delay cleanup to allow animation to complete
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setFormImage(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegion) return;

    setSaving(true);
    let finalImageUrl = formImage;
    try {
      if (imageFile) {
        const fileRef = ref(storage, `regions/${imageFile.name}_${Date.now()}`);
        await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      await regionsService.update(editingRegion.id, {
        name: formName,
        backgroundImage: finalImageUrl,
      });
      showToast("Region updated successfully.", "success");
      closeModal();
      loadData(); // refresh list
    } catch (error) {
      console.error("Failed to update region", error);
      showToast("Failed to update region.", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((region) => {
      const matchesSearch = region.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = islandGroupFilter ? region.islandGroupName === islandGroupFilter : true;
      return matchesSearch && matchesGroup;
    });
  }, [data, searchQuery, islandGroupFilter]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">
          Regions
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-1/2 justify-end">
          <div className="w-full sm:w-1/2">
            <Select
              options={islandGroups}
              defaultValue=""
              placeholder="Filter by Island Group"
              onChange={(val) => setIslandGroupFilter(val)}
            />
          </div>
          <div className="w-full sm:w-1/2">
            <Input
              type="text"
              placeholder="Search regions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                    Image
                  </TableCell>
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
                    PSGC Code
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
                    Provinces
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
                    <TableCell className="px-5 py-4 text-gray-500" colSpan={6}>
                      Loading data...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-5 py-4 text-gray-500" colSpan={6}>
                      No regions found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="w-16 h-12 overflow-hidden rounded bg-gray-100">
                          {region.backgroundImage ? (
                            <img
                              src={region.backgroundImage}
                              alt={region.name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-gray-400">
                              No Img
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-800 text-start text-theme-sm dark:text-white/90 font-medium">
                        {region.name}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 font-mono">
                        {region.psgcCode}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-brand-500 text-start text-theme-sm">
                        {region.islandGroupName}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {region.provinceCount}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(region)}
                        >
                          Edit
                        </Button>
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
                  Edit Region
                </h4>

                {formImage ? (
                  <div 
                    className="relative w-full h-[250px] overflow-hidden rounded-xl bg-gray-100 border border-gray-200 dark:border-gray-700 group cursor-pointer"
                    onClick={() => document.getElementById('region-image-upload')?.click()}
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
                    onClick={() => document.getElementById('region-image-upload')?.click()}
                  >
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium">Upload Photo</span>
                  </div>
                )}
                <input
                  id="region-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />

                <div className="grid grid-cols-1 gap-x-6 gap-y-5">
                  <div>
                    <Label>Name</Label>
                    <Input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end w-full gap-3 mt-4">
                  <Button size="sm" variant="outline" onClick={closeModal} type="button">
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" disabled={saving}>
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
