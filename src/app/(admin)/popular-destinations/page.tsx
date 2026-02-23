"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { municipalitiesService } from "@/config/firestoreService";
import { Municipality } from "@/types";
import { GripVertical, Search, Plus, Trash2, Loader2, Save, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";

const ITEM_TYPE = "DESTINATION";

function computeMunicipalityRating(municipality: Municipality): number | null {
  const allItems = [
    ...(municipality.thingsToDo || []),
    ...(municipality.placesToVisit || []),
    ...(municipality.whereToEat || []),
    ...(municipality.whereToStay || []),
  ];
  const rated = allItems.filter(item => item.rating && item.rating > 0);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, item) => acc + item.rating, 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

interface DraggableItemProps {
  item: Municipality;
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
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;
      
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      
      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      // Time to actually perform the action
      moveItem(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      dragItem.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => {
      return { id: item.id, index };
    },
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
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-800 dark:text-white/90">
          {item.name}
          {item.computedRating !== null && item.computedRating !== undefined ? (
            <span className="ml-2 text-sm text-yellow-500 font-medium">⭐ {item.computedRating.toFixed(1)}</span>
          ) : (
            <span className="ml-2 text-sm text-gray-400 font-medium">—</span>
          )}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{item.provinceName}</p>
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

export default function PopularDestinationsPage() {
  const [featuredItems, setFeaturedItems] = useState<Municipality[]>([]);
  const [unfeaturedItems, setUnfeaturedItems] = useState<Municipality[]>([]);
  const [originalFeaturedIds, setOriginalFeaturedIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const allMunisRaw = await municipalitiesService.getAll();
      
      // (2) Fix duplicate municipalities by ID
      const uniqueIds = new Set<string>();
      const allMunis = allMunisRaw.filter(m => {
        if (uniqueIds.has(m.id)) return false;
        uniqueIds.add(m.id);
        return true;
      }).map(m => ({
        ...m,
        computedRating: computeMunicipalityRating(m)
      }));

      const featured = allMunis.filter(m => m.isFeatured).sort((a,b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));
      
      // (5) Remove duplicates from Section A by ensuring strict separation
      const featuredIds = new Set(featured.map(m => m.id));
      
      // (4) Auto-sort Section B by descending rating
      const unfeatured = allMunis
        .filter(m => !featuredIds.has(m.id))
        .sort((a,b) => (b.computedRating || 0) - (a.computedRating || 0));
      
      setFeaturedItems(featured);
      setUnfeaturedItems(unfeatured);
      setOriginalFeaturedIds(featured.map(m => m.id));
    } catch (error) {
      console.error("Failed to load municipalities", error);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    setFeaturedItems((prevItems) => {
      const newItems = [...prevItems];
      const draggedItem = newItems[dragIndex];
      newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, draggedItem);
      return newItems;
    });
  }, []);

  const handleRemove = (id: string) => {
    const itemToRemove = featuredItems.find(m => m.id === id);
    if (!itemToRemove) return;

    setFeaturedItems(prev => prev.filter(m => m.id !== id));
    
    setUnfeaturedItems(prev => {
      if (prev.some(m => m.id === id)) return prev;
      const newList = [itemToRemove, ...prev];
      return newList.sort((a,b) => (b.computedRating || 0) - (a.computedRating || 0));
    });
  };

  const handleAdd = (id: string) => {
    if (featuredItems.length >= 10) {
      showToast("Maximum of 10 featured destinations allowed.", "warning");
      return;
    }
    
    const itemToAdd = unfeaturedItems.find(m => m.id === id);
    if (!itemToAdd) return;
    
    if (featuredItems.some(m => m.id === id)) return;

    setFeaturedItems(prev => [...prev, itemToAdd]);
    setUnfeaturedItems(prev => prev.filter(m => m.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentFeaturedIds = featuredItems.map(m => m.id);
      const removedIds = originalFeaturedIds.filter(id => !currentFeaturedIds.includes(id));

      // Build updates array
      const updatePromises = [
        ...featuredItems.map((m, index) => 
          municipalitiesService.update(m.id, { isFeatured: true, featuredOrder: index + 1 })
        ),
        ...removedIds.map(id => 
          municipalitiesService.update(id, { isFeatured: false, featuredOrder: 0 })
        )
      ];

      await Promise.all(updatePromises);
      showToast("Featured destinations saved successfully.", "success");
      setOriginalFeaturedIds(currentFeaturedIds);
    } catch (error) {
      console.error("Error saving featured destinations", error);
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  // (3) Fix search in Section B
  const query = searchQuery.trim().toLowerCase();
  const filteredUnfeatured = query 
    ? unfeaturedItems.filter(m => {
        const nameStr = (m.name || "").toLowerCase();
        const provStr = (m.provinceName || "").toLowerCase();
        return nameStr.includes(query) || provStr.includes(query);
      })
    : unfeaturedItems;

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
              Popular Destinations
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage the top destinations featured on the mobile app homepage.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="shadow-sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Order"}
          </Button>
        </div>

        {/* Section A: Currently Featured */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Section A — Currently Featured
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${featuredItems.length === 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'}`}>
              {featuredItems.length} / 10 featured
            </span>
          </div>

          <div className="bg-gray-50/50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[150px]">
            {featuredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No destinations featured yet.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Search and add municipalities below.</p>
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

        {/* Section B: Add Destinations */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-gray-100 pb-5 dark:border-white/[0.05]">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Section B — Add Destinations
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Search available municipalities to feature them. Max 10.
              </p>
            </div>
            <div className="w-full sm:w-1/3 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or province..."
                className="w-full rounded-lg border border-gray-300 bg-transparent py-3 pl-11 pr-4 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUnfeatured.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-500">
                No matching municipalities found.
              </div>
            ) : (
              filteredUnfeatured.slice(0, 30).map((muni) => ( // limit to 30 for perf
                <div key={muni.id} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm hover:shadow transition-shadow">
                  <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 mr-3">
                    {muni.image ? (
                      <img src={muni.image} alt={muni.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-medium text-sm text-gray-800 dark:text-white/90 truncate">
                      {muni.name}
                      {muni.computedRating !== null && muni.computedRating !== undefined ? (
                        <span className="ml-2 text-xs text-yellow-500 font-medium">⭐ {muni.computedRating.toFixed(1)}</span>
                      ) : (
                        <span className="ml-2 text-xs text-gray-400 font-medium">—</span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{muni.provinceName}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleAdd(muni.id)}
                    disabled={featuredItems.length >= 10}
                    className="flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
            
            {filteredUnfeatured.length > 30 && (
               <div className="col-span-full py-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg dark:bg-gray-800/50">
                 Showing 30 results. Use the search bar to find more specific municipalities.
               </div>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
