"use client";

import React, { useEffect, useState } from "react";
import { islandGroupsService } from "@/config/firestoreService";
import { IslandGroup } from "@/types";
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
import Label from "@/components/form/Label";
import { useToast } from "@/context/ToastContext";
import { AnimatePresence, motion } from "framer-motion";
import { storage } from "@/config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function IslandGroupsPage() {
  const [data, setData] = useState<IslandGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<IslandGroup | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formTagline, setFormTagline] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const groups = await islandGroupsService.getAll();
      setData(groups);
    } catch (error) {
      console.error("Failed to load island groups", error);
      showToast("Failed to load island groups.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = (group: IslandGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormTagline(group.tagline);
    setFormDescription(group.description || "");
    setFormImage(group.image || "");
    setImageFile(null);
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingGroup(null);
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
    if (!editingGroup) return;

    setSaving(true);
    let finalImageUrl = formImage;
    try {
      if (imageFile) {
        const fileRef = ref(storage, `island-groups/${imageFile.name}_${Date.now()}`);
        await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      await islandGroupsService.update(editingGroup.id, {
        name: formName,
        tagline: formTagline,
        description: formDescription,
        image: finalImageUrl,
      });
      showToast("Island group updated successfully.", "success");
      closeModal();
      loadData(); // refresh list
    } catch (error) {
      console.error("Failed to update island group", error);
      showToast("Failed to update island group.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">
          Island Groups
        </h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[800px]">
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
                    Tagline
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Destinations
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
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-5 py-4 text-gray-500" colSpan={5}>
                      No island groups found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="w-16 h-12 overflow-hidden rounded bg-gray-100">
                          {group.image ? (
                            // Use regular img tag since we are pulling from external firebase domains
                            // Next.js Image component would require domain configuration in next.config.ts
                            <img
                              src={group.image}
                              alt={group.name}
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
                        {group.name}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {group.tagline}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {group.destinationCount}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(group)}
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
                  Edit Island Group
                </h4>

                {formImage ? (
                  <div 
                    className="relative w-full h-[250px] overflow-hidden rounded-xl bg-gray-100 border border-gray-200 dark:border-gray-700 group cursor-pointer"
                    onClick={() => document.getElementById('island-image-upload')?.click()}
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
                    onClick={() => document.getElementById('island-image-upload')?.click()}
                  >
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium">Upload Photo</span>
                  </div>
                )}
                <input
                  id="island-image-upload"
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
                      onChange={(e) => { setFormName(e.target.value); setIsDirty(true); }}
                      required
                    />
                  </div>

                  <div>
                    <Label>Tagline</Label>
                    <Input
                      type="text"
                      value={formTagline}
                      onChange={(e) => { setFormTagline(e.target.value); setIsDirty(true); }}
                      required
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500"
                      rows={4}
                      value={formDescription}
                      onChange={(e) => { setFormDescription(e.target.value); setIsDirty(true); }}
                      required
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
