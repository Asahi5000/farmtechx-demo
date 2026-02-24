"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { featuredAttractionsService, municipalitiesService } from "@/config/firestoreService";
import { FeaturedAttraction, Municipality } from "@/types";
import { GripVertical, Search, Plus, Trash2, Loader2, Save, Image as ImageIcon, MapPin, ChevronDown } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/button/Button";

const ITEM_TYPE = "ATTRACTION";
const MAX_FEATURED = 10;

// ─── Draggable Card ───────────────────────────────────────────────────────────

interface DraggableItemProps {
  item: FeaturedAttraction;
  index: number;
  rating: number | null;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  removeItem: (id: string) => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item, index, rating, moveItem, removeItem }) => {
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
          <img src={item.image} alt={item.contentItemName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-800 dark:text-white/90 truncate">
          {item.contentItemName}
          {rating !== null && rating > 0 ? (
            <span className="ml-2 text-sm text-yellow-500 font-medium">⭐ {rating.toFixed(1)}</span>
          ) : (
            <span className="ml-2 text-sm text-gray-400 font-medium">—</span>
          )}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          <MapPin className="w-3 h-3 inline mr-1" />
          {item.municipalityName}, {item.provinceName}
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

// ─── Search Result Item ───────────────────────────────────────────────────────

interface AttractionResult {
  contentItemId: string;
  contentItemName: string;
  image: string;
  municipalityId: string;
  municipalityName: string;
  provinceName: string;
  category: string; // "Things to Do" | "Places to Visit"
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PopularDestinationsPage() {
  const [featuredItems, setFeaturedItems] = useState<FeaturedAttraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirtyOrder, setIsDirtyOrder] = useState(false);
  const [ratingMap, setRatingMap] = useState<Record<string, number | null>>({});
  const { showToast } = useToast();

  // Section B state
  const [municipalities, setMunicipalities] = useState<{ value: string; label: string; provinceName: string }[]>([]);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AttractionResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allMunisLoaded, setAllMunisLoaded] = useState(false);
  const [muniCache, setMuniCache] = useState<Record<string, Municipality>>({});

  // Load featured items
  const loadFeatured = async () => {
    setLoading(true);
    try {
      const items = await featuredAttractionsService.getAll();
      setFeaturedItems(items);
      setIsDirtyOrder(false);

      // Fetch ratings from parent municipality documents
      const uniqueMuniIds = [...new Set(items.map(i => i.municipalityId))];
      const ratings: Record<string, number | null> = {};
      await Promise.all(uniqueMuniIds.map(async (muniId) => {
        try {
          const muni = await municipalitiesService.getById(muniId);
          if (muni) {
            const allContentItems = [...(muni.thingsToDo || []), ...(muni.placesToVisit || [])];
            allContentItems.forEach(ci => {
              ratings[`${muniId}_${ci.id}`] = ci.rating > 0 ? ci.rating : null;
            });
          }
        } catch {}
      }));
      setRatingMap(ratings);
    } catch (error) {
      console.error("Failed to load featured attractions", error);
      showToast("Failed to load featured attractions.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load municipality dropdown options
  const loadMunicipalities = async () => {
    try {
      const allMunis = await municipalitiesService.getAll();
      const options = allMunis
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(m => ({
          value: m.id,
          label: `${m.name} — ${m.provinceName}`,
          provinceName: m.provinceName || ""
        }));
      setMunicipalities(options);
      setAllMunisLoaded(true);
    } catch (error) {
      console.error("Failed to load municipalities", error);
    }
  };

  useEffect(() => {
    loadFeatured();
    loadMunicipalities();
  }, []);

  // ─── Section B: Search logic ──────────────────────────────────────────────

  const extractAttractions = (muni: Municipality): AttractionResult[] => {
    const results: AttractionResult[] = [];
    
    (muni.thingsToDo || []).forEach(item => {
      results.push({
        contentItemId: item.id,
        contentItemName: item.name,
        image: item.image || "",
        municipalityId: muni.id,
        municipalityName: muni.name,
        provinceName: muni.provinceName || "",
        category: "Things to Do"
      });
    });

    (muni.placesToVisit || []).forEach(item => {
      results.push({
        contentItemId: item.id,
        contentItemName: item.name,
        image: item.image || "",
        municipalityId: muni.id,
        municipalityName: muni.name,
        provinceName: muni.provinceName || "",
        category: "Places to Visit"
      });
    });

    return results;
  };

  // Fetch municipality document and extract attractions
  const fetchMunicipalityAttractions = async (muniId: string): Promise<AttractionResult[]> => {
    if (muniCache[muniId]) {
      return extractAttractions(muniCache[muniId]);
    }

    const muni = await municipalitiesService.getById(muniId);
    if (!muni) return [];

    setMuniCache(prev => ({ ...prev, [muniId]: muni }));
    return extractAttractions(muni);
  };

  // Handle municipality selection
  useEffect(() => {
    if (!selectedMunicipalityId) {
      setSearchResults([]);
      return;
    }

    const doFetch = async () => {
      setSearchLoading(true);
      try {
        const results = await fetchMunicipalityAttractions(selectedMunicipalityId);
        setSearchResults(results);
      } catch (error) {
        console.error("Failed to fetch municipality", error);
      } finally {
        setSearchLoading(false);
      }
    };

    doFetch();
  }, [selectedMunicipalityId]);

  // Handle text search across all municipalities that have been fetched
  // When search query provided without a municipality, search within cached munis
  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query && !selectedMunicipalityId) return [];
    
    if (selectedMunicipalityId) {
      // Filter within selected municipality
      if (!query) return searchResults;
      return searchResults.filter(r =>
        r.contentItemName.toLowerCase().includes(query)
      );
    }

    // No municipality selected but search query present — search across cached munis
    const allResults: AttractionResult[] = [];
    Object.values(muniCache).forEach(muni => {
      const attractions = extractAttractions(muni);
      attractions.forEach(a => {
        if (a.contentItemName.toLowerCase().includes(query)) {
          allResults.push(a);
        }
      });
    });
    return allResults;
  }, [searchQuery, searchResults, selectedMunicipalityId, muniCache]);

  // Check if attraction is already featured
  const isAlreadyFeatured = (contentItemId: string, municipalityId: string) => {
    return featuredItems.some(f =>
      f.contentItemId === contentItemId && f.municipalityId === municipalityId
    );
  };

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
      await featuredAttractionsService.delete(id);
      setFeaturedItems(prev => prev.filter(f => f.id !== id));
      showToast("Attraction removed from featured.", "success");
    } catch (error) {
      console.error("Failed to remove featured attraction", error);
      showToast("Failed to remove.", "error");
    }
  };

  const handleAdd = async (result: AttractionResult) => {
    if (featuredItems.length >= MAX_FEATURED) {
      showToast("Maximum of 10 featured attractions allowed.", "warning");
      return;
    }

    if (isAlreadyFeatured(result.contentItemId, result.municipalityId)) return;

    try {
      const newOrder = featuredItems.length + 1;
      const newId = await featuredAttractionsService.create({
        contentItemId: result.contentItemId,
        contentItemName: result.contentItemName,
        municipalityId: result.municipalityId,
        municipalityName: result.municipalityName,
        provinceName: result.provinceName,
        image: result.image,
        featuredOrder: newOrder,
      });

      setFeaturedItems(prev => [...prev, {
        id: newId,
        contentItemId: result.contentItemId,
        contentItemName: result.contentItemName,
        municipalityId: result.municipalityId,
        municipalityName: result.municipalityName,
        provinceName: result.provinceName,
        image: result.image,
        featuredOrder: newOrder,
      } as FeaturedAttraction]);

      showToast(`"${result.contentItemName}" added to featured!`, "success");
    } catch (error) {
      console.error("Failed to add featured attraction", error);
      showToast("Failed to add attraction.", "error");
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const updates = featuredItems.map((item, index) =>
        featuredAttractionsService.update(item.id, { featuredOrder: index + 1 })
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

  // ─── Check if user has a query or municipality selected ───────────────────

  const hasSearchIntent = searchQuery.trim().length > 0 || selectedMunicipalityId.length > 0;

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
              Popular Destinations
            </h2>
            <p className="text-sm text-gray-500 mt-1">Feature specific attractions from municipalities on the mobile app homepage.</p>
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
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${featuredItems.length === MAX_FEATURED ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'}`}>
              {featuredItems.length} / {MAX_FEATURED} featured
            </span>
          </div>

          <div className="bg-gray-50/50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[150px]">
            {featuredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No attractions featured yet.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Select a municipality below and add attractions.</p>
              </div>
            ) : (
              featuredItems.map((item, index) => (
                <DraggableItem
                  key={item.id}
                  index={index}
                  item={item}
                  rating={ratingMap[`${item.municipalityId}_${item.contentItemId}`] ?? null}
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
                Add Destinations
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select a municipality and browse its attractions to feature them. Max {MAX_FEATURED}.
              </p>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-6">
            {/* Municipality dropdown */}
            <div className="w-full sm:w-1/2 relative">
              <select
                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white appearance-none text-sm"
                value={selectedMunicipalityId}
                onChange={(e) => setSelectedMunicipalityId(e.target.value)}
              >
                <option value="">Filter by Municipality...</option>
                {municipalities.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Search */}
            <div className="w-full sm:w-1/2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search attraction by name..."
                className="w-full rounded-lg border border-gray-300 bg-transparent py-3 pl-11 pr-4 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Results */}
          {searchLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : !hasSearchIntent ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Select a municipality or search for an attraction to begin
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="col-span-full py-8 text-center text-gray-500">
              No matching attractions found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResults.slice(0, 30).map((result) => {
                const alreadyFeatured = isAlreadyFeatured(result.contentItemId, result.municipalityId);

                return (
                  <div
                    key={`${result.municipalityId}-${result.contentItemId}`}
                    className={`flex items-center p-3 border rounded-xl shadow-sm hover:shadow transition-shadow ${
                      alreadyFeatured
                        ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    }`}
                  >
                    <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 mr-3">
                      {result.image ? (
                        <img src={result.image} alt={result.contentItemName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-medium text-sm text-gray-800 dark:text-white/90 truncate">
                        {result.contentItemName}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {result.municipalityName}, {result.provinceName}
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                        {result.category}
                      </span>
                    </div>
                    {alreadyFeatured ? (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium dark:bg-green-500/20 dark:text-green-400 flex-shrink-0">
                        Featured
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdd(result)}
                        disabled={featuredItems.length >= MAX_FEATURED}
                        className="flex-shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {filteredResults.length > 30 && (
                <div className="col-span-full py-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg dark:bg-gray-800/50">
                  Showing 30 results. Refine your search to find more specific attractions.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
