"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { featuredProvincesService, provincesService } from "@/config/firestoreService";
import { FeaturedProvince } from "@/config/firestoreService";
import { Province } from "@/types";
import { GripVertical, Search, Plus, Trash2, Loader2, Save, Image as ImageIcon, MapPin } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/button/Button";

const ITEM_TYPE = "PROVINCE";
const MAX_FEATURED = 6;

// ─── Draggable Card ────────────────────────────────────────────────────────────

interface DraggableItemProps {
  item: FeaturedProvince;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  removeItem: (id: string) => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item, index, moveItem, removeItem }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<
    { id: string; index: number },
    void,
    { handlerId: string | symbol | null }
  >({
    accept: ITEM_TYPE,
    collect(monitor) {
      return { handlerId: monitor.getHandlerId() };
    },
    hover(dragItem, monitor) {
      if (!ref.current) return;
      const dragIndex = dragItem.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      moveItem(dragIndex, hoverIndex);
      dragItem.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => ({ id: item.id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 p-4 mb-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
      data-handler-id={handlerId}
    >
      <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="w-8 font-semibold text-gray-400 dark:text-gray-500">
        #{index + 1}
      </div>
      <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        {item.image ? (
          <img src={item.image} alt={item.provinceName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-800 dark:text-white/90 truncate">
          {item.provinceName}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          <MapPin className="w-3 h-3 inline mr-1" />
          {item.tagline}
        </p>
      </div>
      <button
        onClick={() => removeItem(item.id)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-500/10 transition-colors"
        title="Remove from featured"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FeaturedProvincesPage() {
  const [featuredItems, setFeaturedItems] = useState<FeaturedProvince[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirtyOrder, setIsDirtyOrder] = useState(false);
  const { showToast } = useToast();

  // Section B state
  const [allProvinces, setAllProvinces] = useState<Province[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load featured provinces
  const loadFeatured = async () => {
    setLoading(true);
    try {
      const items = await featuredProvincesService.getAll();
      setFeaturedItems(items);
      setIsDirtyOrder(false);
    } catch (error) {
      console.error("Failed to load featured provinces", error);
      showToast("Failed to load featured provinces.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load all provinces for the search panel
  const loadProvinces = async () => {
    try {
      const data = await provincesService.getAll();
      setAllProvinces(data);
    } catch (error) {
      console.error("Failed to load provinces", error);
    }
  };

  useEffect(() => {
    loadFeatured();
    loadProvinces();
  }, []);

  // ─── Section B: Search / filter ──────────────────────────────────────────

  const filteredProvinces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProvinces;
    return allProvinces.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
  }, [searchQuery, allProvinces]);

  const isAlreadyFeatured = (provinceId: string) =>
    featuredItems.some((f) => f.provinceId === provinceId);

  // ─── Section A: Drag / Reorder ────────────────────────────────────────────

  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    setFeaturedItems((prevItems) => {
      const newItems = [...prevItems];
      const draggedItem = newItems[dragIndex];
      newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, draggedItem);
      return newItems;
    });
    setIsDirtyOrder(true);
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await featuredProvincesService.delete(id);
      setFeaturedItems((prev) => prev.filter((f) => f.id !== id));
      showToast("Province removed from featured.", "success");
    } catch (error) {
      console.error("Failed to remove featured province", error);
      showToast("Failed to remove.", "error");
    }
  };

  const handleAdd = async (province: Province) => {
    if (featuredItems.length >= MAX_FEATURED) {
      showToast(`Maximum of ${MAX_FEATURED} featured provinces allowed.`, "warning");
      return;
    }
    if (isAlreadyFeatured(province.id)) return;

    try {
      const newOrder = featuredItems.length + 1;
      const newId = await featuredProvincesService.create({
        provinceId: province.id,
        provinceName: province.name,
        tagline: (province as any).tagline || "",
        image: province.image || "",
        featuredOrder: newOrder,
      });

      setFeaturedItems((prev) => [
        ...prev,
        {
          id: newId,
          provinceId: province.id,
          provinceName: province.name,
          tagline: (province as any).tagline || "",
          image: province.image || "",
          featuredOrder: newOrder,
        } as FeaturedProvince,
      ]);

      showToast(`"${province.name}" added to featured!`, "success");
    } catch (error) {
      console.error("Failed to add featured province", error);
      showToast("Failed to add province.", "error");
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const updates = featuredItems.map((item, index) =>
        featuredProvincesService.update(item.id, { featuredOrder: index + 1 })
      );
      await Promise.all(updates);
      showToast("Featured order saved successfully.", "success");
      setIsDirtyOrder(false);
    } catch (error) {
      console.error("Error saving featured order", error);
      showToast("Failed to save order.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-title-md2 font-semibold text-black dark:text-white">
              Featured Provinces
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose up to {MAX_FEATURED} provinces to feature on the mobile app homepage. Drag to reorder.
            </p>
          </div>
          <Button onClick={handleSaveOrder} disabled={saving || !isDirtyOrder} className="shadow-sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Order"}
          </Button>
        </div>

        {/* Section A: Currently Featured */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Currently Featured
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                featuredItems.length === MAX_FEATURED
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                  : "bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
              }`}
            >
              {featuredItems.length} / {MAX_FEATURED} featured
            </span>
          </div>

          <div className="bg-gray-50/50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[150px]">
            {featuredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No provinces featured yet.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Search for a province below and add it.
                </p>
              </div>
            ) : (
              featuredItems.map((item, index) => (
                <DraggableItem
                  key={item.id}
                  index={index}
                  item={item}
                  moveItem={moveItem}
                  removeItem={handleRemove}
                />
              ))
            )}
          </div>
        </div>

        {/* Section B: Add Provinces */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-gray-100 pb-5 dark:border-white/[0.05]">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Add Provinces
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Search and select provinces to feature. Max {MAX_FEATURED}.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search province by name..."
              className="w-full rounded-lg border border-gray-300 bg-transparent py-3 pl-11 pr-4 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProvinces.slice(0, 30).map((province) => {
              const alreadyFeatured = isAlreadyFeatured(province.id);
              return (
                <div
                  key={province.id}
                  className={`flex items-center p-3 border rounded-xl shadow-sm hover:shadow transition-shadow ${
                    alreadyFeatured
                      ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  }`}
                >
                  <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 mr-3">
                    {province.image ? (
                      <img src={province.image} alt={province.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-medium text-sm text-gray-800 dark:text-white/90 truncate">
                      {province.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {(province as any).tagline || (province as any).regionName || "—"}
                    </p>
                  </div>
                  {alreadyFeatured ? (
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium dark:bg-green-500/20 dark:text-green-400 flex-shrink-0">
                      Featured
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdd(province)}
                      disabled={featuredItems.length >= MAX_FEATURED}
                      className="flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
            {filteredProvinces.length === 0 && (
              <div className="col-span-full py-8 text-center text-gray-500">
                No provinces found.
              </div>
            )}
            {filteredProvinces.length > 30 && (
              <div className="col-span-full py-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg dark:bg-gray-800/50">
                Showing 30 results. Refine your search to find more.
              </div>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
