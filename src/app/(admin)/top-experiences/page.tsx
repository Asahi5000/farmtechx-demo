"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { topExperiencesService, TopExperience } from "@/config/firestoreService";
import {
  IoBoatOutline,
  IoWaterOutline,
  IoWalkOutline,
  IoRestaurantOutline,
  IoTrophyOutline,
  IoCameraOutline,
  IoSunnyOutline,
  IoBicycleOutline,
  IoCarOutline,
  IoAirplaneOutline,
  IoFishOutline,
  IoLeafOutline,
  IoFlameOutline,
  IoStarOutline,
  IoHeartOutline,
  IoCompassOutline,
  IoMapOutline,
  IoBedOutline,
  IoCafeOutline,
  IoWineOutline,
  IoMusicalNotesOutline,
} from "react-icons/io5";
import {
  GripVertical,
  Plus,
  Trash2,
  Loader2,
  Save,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/button/Button";

const ITEM_TYPE = "EXPERIENCE";
const MAX_FEATURED = 8;

// ─── Auto-assigned color palette (index-based) ───────────────────────────────

const COLOR_PALETTE = [
  "#0EA5E9",
  "#06B6D4",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
];

// ─── Icon registry — maps Ionicons name → react-icons/io5 component ──────────

const ICON_OPTIONS: { name: string; label: string; Component: React.ElementType }[] = [
  { name: "boat-outline",          label: "Boat",          Component: IoBoatOutline },
  { name: "water-outline",         label: "Water",         Component: IoWaterOutline },
  { name: "walk-outline",          label: "Hiking",        Component: IoWalkOutline },
  { name: "restaurant-outline",    label: "Food",          Component: IoRestaurantOutline },
  { name: "trophy-outline",        label: "Trophy",        Component: IoTrophyOutline },
  { name: "camera-outline",        label: "Camera",        Component: IoCameraOutline },
  { name: "sunny-outline",         label: "Beach",         Component: IoSunnyOutline },
  { name: "bicycle-outline",       label: "Cycling",       Component: IoBicycleOutline },
  { name: "car-outline",           label: "Road Trip",     Component: IoCarOutline },
  { name: "airplane-outline",      label: "Travel",        Component: IoAirplaneOutline },
  { name: "fish-outline",          label: "Fishing",       Component: IoFishOutline },
  { name: "leaf-outline",          label: "Eco",           Component: IoLeafOutline },
  { name: "flame-outline",         label: "Adventure",     Component: IoFlameOutline },
  { name: "star-outline",          label: "Star",          Component: IoStarOutline },
  { name: "heart-outline",         label: "Wellness",      Component: IoHeartOutline },
  { name: "compass-outline",       label: "Explore",       Component: IoCompassOutline },
  { name: "map-outline",           label: "Map",           Component: IoMapOutline },
  { name: "bed-outline",           label: "Lodging",       Component: IoBedOutline },
  { name: "cafe-outline",          label: "Café",          Component: IoCafeOutline },
  { name: "wine-outline",          label: "Nightlife",     Component: IoWineOutline },
  { name: "musical-notes-outline", label: "Music",         Component: IoMusicalNotesOutline },
];

// ─── Color swatch helper ──────────────────────────────────────────────────────

const ColorSwatch = ({ color }: { color: string }) => (
  <span
    className="inline-block w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
    style={{ backgroundColor: color || "#E5E7EB" }}
  />
);

// ─── Draggable Row ────────────────────────────────────────────────────────────

interface DraggableItemProps {
  item: TopExperience;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  removeItem: (id: string) => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  index,
  moveItem,
  removeItem,
}) => {
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
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  // Find the matching react-icon component
  const iconEntry = ICON_OPTIONS.find((o) => o.name === item.icon);
  const IconComp = iconEntry?.Component;

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

      {/* Image preview */}
      <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-800 dark:text-white/90 truncate">
          {item.name}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <ColorSwatch color={item.color} />
          {IconComp ? (
            <IconComp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : null}
          <code className="text-xs text-gray-400 dark:text-gray-500">{item.icon}</code>
        </div>
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

// ─── Add Experience Form ──────────────────────────────────────────────────────

interface AddFormProps {
  onAdd: (data: Omit<TopExperience, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  isAtMax: boolean;
  nextColor: string;
}

const EMPTY_FORM = { name: "", icon: "", image: "" };

const AddExperienceForm: React.FC<AddFormProps> = ({ onAdd, isAtMax, nextColor }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const isValid = form.name.trim() && form.icon.trim() && form.image.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || adding || isAtMax) return;
    setAdding(true);
    try {
      await onAdd({
        name: form.name.trim(),
        icon: form.icon.trim(),
        color: nextColor,
        image: form.image.trim(),
        featuredOrder: 0, // assigned by parent
      });
      setForm(EMPTY_FORM);
      setPreviewError(false);
    } finally {
      setAdding(false);
    }
  };

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Row 1: Name + Image URL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Experience Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Island Hopping"
            className="w-full rounded-lg border border-gray-300 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white text-sm"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Cover Image URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 bg-transparent py-2.5 px-4 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white text-sm"
            value={form.image}
            onChange={(e) => {
              set("image", e.target.value);
              setPreviewError(false);
            }}
            required
          />
        </div>
      </div>

      {/* Auto-color badge preview */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>Badge color (auto-assigned):</span>
        <ColorSwatch color={nextColor} />
        <code className="text-xs">{nextColor}</code>
      </div>

      {/* Icon Picker Grid */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Icon <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-7 sm:grid-cols-11 gap-2">
          {ICON_OPTIONS.map(({ name, label, Component }) => {
            const isSelected = form.icon === name;
            return (
              <button
                key={name}
                type="button"
                title={label}
                onClick={() => set("icon", name)}
                className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Component className="w-6 h-6" />
                <span className="text-[9px] leading-tight text-center truncate w-full">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        {form.icon && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Selected: <code className="text-brand-500">{form.icon}</code>
          </p>
        )}
      </div>

      {/* Image Preview */}
      {form.image && !previewError && (
        <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
            <img
              src={form.image}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setPreviewError(true)}
            />
          </div>
          <div>
            <p className="font-medium text-gray-800 dark:text-white/90">
              {form.name || "Experience Name"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <ColorSwatch color={nextColor} />
              {form.icon && (() => {
                const entry = ICON_OPTIONS.find((o) => o.name === form.icon);
                return entry ? <entry.Component className="w-4 h-4 text-gray-500" /> : null;
              })()}
              <code className="text-xs text-gray-500">{form.icon || "select icon"}</code>
            </div>
          </div>
        </div>
      )}
      {previewError && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️ Could not load image preview. Check the URL.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isValid || adding || isAtMax}
          className="shadow-sm"
        >
          {adding ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          {isAtMax ? `Max ${MAX_FEATURED} reached` : "Add Experience"}
        </Button>
      </div>
    </form>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TopExperiencesPage() {
  const [featuredItems, setFeaturedItems] = useState<TopExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirtyOrder, setIsDirtyOrder] = useState(false);
  const { showToast } = useToast();

  const loadFeatured = async () => {
    setLoading(true);
    try {
      const items = await topExperiencesService.getAll();
      setFeaturedItems(items);
      setIsDirtyOrder(false);
    } catch (error) {
      console.error("Failed to load top experiences", error);
      showToast("Failed to load top experiences.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatured();
  }, []);

  // Next auto-assigned color based on current count
  const nextColor = COLOR_PALETTE[featuredItems.length % COLOR_PALETTE.length];

  // ─── Drag / Reorder ──────────────────────────────────────────────────────

  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    setFeaturedItems((prev) => {
      const next = [...prev];
      const dragged = next[dragIndex];
      next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, dragged);
      return next;
    });
    setIsDirtyOrder(true);
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await topExperiencesService.delete(id);
      setFeaturedItems((prev) => prev.filter((f) => f.id !== id));
      showToast("Experience removed.", "success");
    } catch (error) {
      console.error("Failed to remove experience", error);
      showToast("Failed to remove.", "error");
    }
  };

  const handleAdd = async (
    data: Omit<TopExperience, "id" | "createdAt" | "updatedAt">
  ) => {
    if (featuredItems.length >= MAX_FEATURED) {
      showToast(`Maximum of ${MAX_FEATURED} experiences allowed.`, "warning");
      return;
    }
    try {
      const newOrder = featuredItems.length + 1;
      const newId = await topExperiencesService.create({
        ...data,
        featuredOrder: newOrder,
      });
      setFeaturedItems((prev) => [
        ...prev,
        { id: newId, ...data, featuredOrder: newOrder } as TopExperience,
      ]);
      showToast(`"${data.name}" added to Top Experiences!`, "success");
    } catch (error) {
      console.error("Failed to add experience", error);
      showToast("Failed to add experience.", "error");
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      await Promise.all(
        featuredItems.map((item, index) =>
          topExperiencesService.update(item.id, { featuredOrder: index + 1 })
        )
      );
      showToast("Order saved successfully.", "success");
      setIsDirtyOrder(false);
    } catch (error) {
      console.error("Error saving order", error);
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
              Top Experiences
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose up to {MAX_FEATURED} experiences to feature on the mobile app
              homepage. Drag to reorder.
            </p>
          </div>
          <Button
            onClick={handleSaveOrder}
            disabled={saving || !isDirtyOrder}
            className="shadow-sm"
          >
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
                <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  No experiences added yet.
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Use the form below to add your first experience.
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

        {/* Section B: Add Experience Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] sm:p-6 shadow-sm">
          <div className="mb-6 border-b border-gray-100 pb-5 dark:border-white/[0.05]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Add Experience
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Fill in the details below to add a new experience to the homepage. Max{" "}
              {MAX_FEATURED} total.
            </p>
          </div>
          <AddExperienceForm
            onAdd={handleAdd}
            isAtMax={featuredItems.length >= MAX_FEATURED}
            nextColor={nextColor}
          />
        </div>
      </div>
    </DndProvider>
  );
}
