"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { municipalitiesService } from "@/config/firestoreService";
import { Municipality, ContentItem, Transportation, TransportOption } from "@/types";
import { ArrowLeft, Tag, Loader2, Plus, Trash2, Camera, Navigation, Utensils, Star, Bed, Bus, Ship, Plane, Image as ImageIcon, ChevronDown, ChevronUp, Lightbulb, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { storage } from "@/config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const AVAILABLE_ACTIVITIES = [
  'Foodies', 'Adventure Tourists', 'Cultural Tourists', 'Eco-tourists',
  'Nightlife', 'Wellness Tourists', 'Pilgrimage', 'Sports Tourists',
];

const SPENDING_LEVELS = [
  'Budget-friendly', 'Mid-range', 'Luxury', 'High-value / Low-volume',
];

const TRAVEL_STYLES = [
  'Solo Travelers', 'Couples', 'Family Travelers', 'Barkada / Group', 'Digital Nomads',
];

const TRIP_LENGTHS = [
  'Day-trip', 'Overnight', 'Long-stay',
];

const emptyContentItem = (): ContentItem => ({
  id: crypto.randomUUID(),
  name: '',
  image: '',
  rating: 0,
  description: '',
  priceRange: '',
  amenities: [],
  location: { address: '', coordinates: { latitude: 0, longitude: 0 }, mapUrl: '' },
  photos: [],
  type: '',
  pricing: '',
  estimate: '',
  bestTimeToDo: ''
});

const emptyTransportOption = (): TransportOption => ({
  id: crypto.randomUUID(),
  companyName: '',
  logo: '',
  type: '',
  route: '',
  duration: '',
  fareRange: '',
  schedule: '',
  contactNumber: '',
  bookingUrl: '',
  notes: ''
});

export default function MunicipalityManagePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { showToast } = useToast();

  const [municipality, setMunicipality] = useState<Municipality | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTags, setSavingTags] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [isDirtyTags, setIsDirtyTags] = useState(false);
  const [isDirtyContent, setIsDirtyContent] = useState(false);

  // Tags Form State
  const [activities, setActivities] = useState<string[]>([]);
  const [spending, setSpending] = useState<string[]>([]);
  const [travelStyles, setTravelStyles] = useState<string[]>([]);
  const [tripLengths, setTripLengths] = useState<string[]>([]);

  // Content Items State
  const [thingsToDo, setThingsToDo] = useState<ContentItem[]>([]);
  const [placesToVisit, setPlacesToVisit] = useState<ContentItem[]>([]);
  const [whereToEat, setWhereToEat] = useState<ContentItem[]>([]);
  const [whereToStay, setWhereToStay] = useState<ContentItem[]>([]);

  // Transportation State
  const [transportation, setTransportation] = useState<Transportation>({ land: [], sea: [], air: [] });

  // Local Tips State
  const [localTips, setLocalTips] = useState<string[]>([]);

  // Accordion State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    thingsToDo: false,
    placesToVisit: false,
    whereToEat: false,
    whereToStay: false,
    transportation: false,
    localTips: false
  });
  
  const [activeTransportTab, setActiveTransportTab] = useState<'land'|'sea'|'air'>('land');

  // Upload progress tracking
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMuni = async () => {
      try {
        const data = await municipalitiesService.getById(id);
        if (data) {
          setMunicipality(data);
          setActivities(data.availableActivities || []);
          setSpending(data.spendingLevels || []);
          setTravelStyles(data.travelStyles || []);
          setTripLengths(data.tripLengths || []);
          // New sections
          setThingsToDo(data.thingsToDo || []);
          setPlacesToVisit(data.placesToVisit || []);
          setWhereToEat(data.whereToEat || []);
          setWhereToStay(data.whereToStay || []);
          setTransportation(data.transportation || { land: [], sea: [], air: [] });
          setLocalTips(data.localTips || []);
        } else {
          showToast("Municipality not found", "error");
          router.push("/municipalities");
        }
      } catch (error) {
        console.error("Failed to fetch municipality", error);
        showToast("Error loading profile", "error");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchMuni();
  }, [id, router, showToast]);

  // Track tag changes after initial load  
  const tagsLoadedRef = React.useRef(false);
  useEffect(() => {
    if (!tagsLoadedRef.current) { tagsLoadedRef.current = true; return; }
    setIsDirtyTags(true);
  }, [activities, spending, travelStyles, tripLengths]);

  // Track content changes after initial load
  const contentLoadedRef = React.useRef(false);
  useEffect(() => {
    if (!contentLoadedRef.current) { contentLoadedRef.current = true; return; }
    setIsDirtyContent(true);
  }, [thingsToDo, placesToVisit, whereToEat, whereToStay, transportation, localTips]);

  const handleToggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  // --- SAVE ACTIONS ---
  const handleSaveTags = async () => {
    setSavingTags(true);
    try {
      await municipalitiesService.update(id, {
        availableActivities: activities,
        spendingLevels: spending,
        travelStyles,
        tripLengths,
      });
      showToast("Tags & Attributes saved successfully", "success");
      setIsDirtyTags(false);
    } catch (error) {
      showToast("Failed to save tags", "error");
    } finally {
      setSavingTags(false);
    }
  };

  const handleSaveContentAndTransport = async () => {
    setSavingContent(true);
    try {
      await municipalitiesService.update(id, {
        thingsToDo,
        placesToVisit,
        whereToEat,
        whereToStay,
        transportation,
        localTips
      });
      showToast("Content & Transportation saved successfully", "success");
      setIsDirtyContent(false);
    } catch (error) {
      showToast("Failed to save content", "error");
    } finally {
      setSavingContent(false);
    }
  };

  // --- HELPERS ---
  const updateContentItem = (
    setState: React.Dispatch<React.SetStateAction<ContentItem[]>>,
    idx: number,
    field: string,
    value: any
  ) => {
    setState(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const updateContentLocation = (
    setState: React.Dispatch<React.SetStateAction<ContentItem[]>>,
    idx: number,
    field: string,
    value: any
  ) => {
    setState(prev => {
      const copy = [...prev];
      if (field === 'latitude' || field === 'longitude') {
        copy[idx].location.coordinates = { ...copy[idx].location.coordinates, [field]: value };
      } else {
        copy[idx].location = { ...copy[idx].location, [field]: value };
      }
      return copy;
    });
  };

  const handleAddAmenity = (setState: React.Dispatch<React.SetStateAction<ContentItem[]>>, idx: number) => {
    setState(prev => {
      const copy = [...prev];
      if (!copy[idx].amenities) copy[idx].amenities = [];
      copy[idx].amenities.push({ id: crypto.randomUUID(), icon: 'star', label: 'New Amenity' });
      return copy;
    });
  };

  const updateAmenity = (setState: React.Dispatch<React.SetStateAction<ContentItem[]>>, itemIdx: number, amIdx: number, field: string, value: string) => {
    setState(prev => {
      const copy = [...prev];
      if (!copy[itemIdx].amenities) copy[itemIdx].amenities = [];
      copy[itemIdx].amenities[amIdx] = { ...copy[itemIdx].amenities[amIdx], [field]: value };
      return copy;
    });
  };

  const removeAmenity = (setState: React.Dispatch<React.SetStateAction<ContentItem[]>>, itemIdx: number, amIdx: number) => {
    setState(prev => {
      const copy = [...prev];
      if (!copy[itemIdx].amenities) copy[itemIdx].amenities = [];
      copy[itemIdx].amenities.splice(amIdx, 1);
      return copy;
    });
  };

  // --- RENDERERS ---
  const StarSelector = ({ rating, onChange }: { rating: number, onChange: (v: number) => void }) => {
    return (
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[1,2,3,4,5].map(v => (
            <div key={v} className="relative w-6 h-6 cursor-pointer">
              {/* Background empty star */}
              <Star className="absolute inset-0 w-6 h-6 text-gray-300" />
              
              {/* Foreground filled star (full or partial) */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ width: rating >= v ? '100%' : rating >= v - 0.5 ? '50%' : '0%' }}
              >
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              </div>

              {/* Hitboxes for half and full click */}
              <div 
                className="absolute inset-y-0 left-0 w-1/2 z-10" 
                onClick={() => onChange(v - 0.5)}
              />
              <div 
                className="absolute inset-y-0 right-0 w-1/2 z-10" 
                onClick={() => onChange(v)}
              />
            </div>
          ))}
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{rating.toFixed(1)} / 5</span>
      </div>
    );
  };

  const renderContentItems = (
    title: string,
    icon: React.ReactNode,
    sectionKey: string,
    items: ContentItem[],
    setItems: React.Dispatch<React.SetStateAction<ContentItem[]>>
  ) => {
    const isOpen = openSections[sectionKey];
    return (
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        <button 
          onClick={() => handleToggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors dark:hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
              {icon}
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {items.length} item{items.length !== 1 && 's'}
              </p>
            </div>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {isOpen && (
          <div className="p-5 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-transparent space-y-6">
            {items.map((item, idx) => (
              <div key={item.id} className="p-5 bg-white border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-700 relative">
                <button 
                  className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-500/10"
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Hero Image */}
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <Label>Hero Image (Hover to change)</Label>
                    <label className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 group cursor-pointer dark:bg-gray-800 dark:border-gray-600 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} className="w-full h-full object-cover" alt="Hero" />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {uploadingItemId === `hero_${item.id}` ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Camera className="w-8 h-8 text-white" />}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingItemId(`hero_${item.id}`);
                          try {
                            const url = await uploadFile(file, 'municipalities/content');
                            updateContentItem(setItems, idx, 'image', url);
                          } catch (err) {
                            showToast("Failed to upload image", "error");
                          } finally {
                            setUploadingItemId(null);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Basic Details */}
                  <div>
                    <Label>Name</Label>
                    <Input 
                      placeholder={sectionKey === 'thingsToDo' ? 'e.g. Countryside Cycling, Street Food Crawl' : ''} 
                      value={item.name} 
                      onChange={(e) => updateContentItem(setItems, idx, 'name', e.target.value)} 
                    />
                  </div>
                  <div>
                    <Label>
                      {title === 'Things to Do' ? 'Expected Cost' : 
                       title === 'Places to Visit' ? 'Entrance Fee' : 
                       'Price Range'}
                    </Label>
                    {(title === 'Where to Eat' || title === 'Where to Stay') ? (
                      <select
                        className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white"
                        value={item.priceRange}
                        onChange={(e) => updateContentItem(setItems, idx, 'priceRange', e.target.value)}
                      >
                        <option value="" disabled>Select price range</option>
                        <option value="Free">Free</option>
                        <option value="₱ (Budget)">₱ (Budget)</option>
                        <option value="₱₱ (Mid-range)">₱₱ (Mid-range)</option>
                        <option value="₱₱₱ (Premium)">₱₱₱ (Premium)</option>
                      </select>
                    ) : (
                      <Input 
                        placeholder={title === 'Things to Do' ? 'e.g. Free, Budget-friendly, ₱50-₱100' : 'e.g. Free, ₱50 environmental fee, ₱100/person'}
                        value={item.priceRange} 
                        onChange={(e) => updateContentItem(setItems, idx, 'priceRange', e.target.value)} 
                      />
                    )}
                  </div>

                  {/* Things to Do specific fields */}
                  {sectionKey === 'thingsToDo' && (
                    <div className="col-span-1">
                      <Label>Best Time to Do</Label>
                      <Input 
                        placeholder="e.g. Early Morning, Dry Season" 
                        value={item.bestTimeToDo || ''} 
                        onChange={(e) => updateContentItem(setItems, idx, 'bestTimeToDo', e.target.value)} 
                      />
                    </div>
                  )}
                  
                  {sectionKey !== 'thingsToDo' && (
                    <div className="col-span-1 border border-gray-200 dark:border-gray-700 p-3 rounded-lg flex flex-col justify-center">
                      <Label className="mb-2">Initial Rating</Label>
                      <StarSelector rating={item.rating || 0} onChange={(v) => updateContentItem(setItems, idx, 'rating', v)} />
                    </div>
                  )}

                  {/* Where to Eat specific fields: Hours & Cuisine */}
                  {sectionKey === 'whereToEat' && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Operating Hours</Label>
                        <Input 
                          placeholder="e.g. 7AM–10PM, Mon–Sat" 
                          value={item.operatingHours || ''} 
                          onChange={(e) => updateContentItem(setItems, idx, 'operatingHours', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label>Cuisine Type</Label>
                        <Input 
                          placeholder="e.g. Filipino, Seafood, Cafe" 
                          value={item.cuisineType || ''} 
                          onChange={(e) => updateContentItem(setItems, idx, 'cuisineType', e.target.value)} 
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Use a single word or short category
                        </p>
                      </div>
                      <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Label className="md:col-span-2 uppercase text-xs font-bold text-gray-500 tracking-wider mb-2">Contact Details</Label>
                        <div>
                          <Label>Contact Number</Label>
                          <Input 
                            placeholder="e.g. 0917-123-4567" 
                            value={item.contactNumber || ''} 
                            onChange={(e) => updateContentItem(setItems, idx, 'contactNumber', e.target.value)} 
                          />
                        </div>
                        <div>
                          <Label>Contact Email</Label>
                          <Input 
                            placeholder="e.g. kape.veranda@gmail.com" 
                            value={item.contactEmail || ''} 
                            onChange={(e) => updateContentItem(setItems, idx, 'contactEmail', e.target.value)} 
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Facebook Page</Label>
                          <Input 
                            placeholder="e.g. https://facebook.com/kapeveranda" 
                            value={item.facebookLink || ''} 
                            onChange={(e) => updateContentItem(setItems, idx, 'facebookLink', e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <textarea 
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white"
                      rows={3}
                      value={item.description}
                      onChange={(e) => updateContentItem(setItems, idx, 'description', e.target.value)}
                    />
                  </div>

                  {/* Type and Estimate (Places & Things to Do) */}
                  {(sectionKey === 'placesToVisit' || sectionKey === 'thingsToDo') && (
                    <>
                      <div>
                        <Label>Type</Label>
                        <Input 
                          placeholder={sectionKey === 'thingsToDo' ? 'e.g. Outdoor, Cultural, Food, Water' : 'e.g. Beach, Park, Mountain, Island, Shrine'} 
                          value={item.type || ''} 
                          onChange={(e) => updateContentItem(setItems, idx, 'type', e.target.value)} 
                        />
                        {sectionKey === 'thingsToDo' && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Use a single word or short category
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <Input 
                          placeholder="e.g. 30 min, 1-2 hrs, Half Day" 
                          value={item.estimate || ''} 
                          onChange={(e) => updateContentItem(setItems, idx, 'estimate', e.target.value)} 
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Keep this short to prevent layout stretching in the app
                        </p>
                      </div>
                    </>
                  )}

                  {/* Places to Visit specific fields */}
                  {sectionKey === 'placesToVisit' && (
                    <div className="md:col-span-2">
                      <button 
                        type="button" 
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors"
                        onClick={() => router.push(`/municipalities/${id}/manage-activities/${item.id}`)}
                      >
                        <Navigation className="w-4 h-4" /> Manage Activities
                      </button>
                    </div>
                  )}

                  {/* Location Details (Hide for Things to Do) */}
                  {sectionKey !== 'thingsToDo' && (
                    <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <Label className="md:col-span-2 uppercase text-xs font-bold text-gray-500 tracking-wider mb-2">Location Details</Label>
                      <div>
                        <Label>Latitude</Label>
                        <Input type="number" value={item.location?.coordinates.latitude || 0} onChange={(e) => updateContentLocation(setItems, idx, 'latitude', parseFloat(e.target.value))} />
                      </div>
                      <div>
                        <Label>Longitude</Label>
                        <Input type="number" value={item.location?.coordinates.longitude || 0} onChange={(e) => updateContentLocation(setItems, idx, 'longitude', parseFloat(e.target.value))} />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Google Maps URL</Label>
                        <Input value={item.location?.mapUrl || ''} onChange={(e) => updateContentLocation(setItems, idx, 'mapUrl', e.target.value)} />
                      </div>
                    </div>
                  )}

                  {/* Amenities (Hide for Things to Do) */}
                  {sectionKey !== 'thingsToDo' && (
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <Label>Amenities</Label>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <Input 
                          placeholder="e.g. Public Benches, Free WiFi, Family-Friendly" 
                          id={`amenity-input-${item.id}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              const val = input.value.trim();
                              if (val) {
                                const newAmenity = { id: crypto.randomUUID(), icon: 'checkmark-circle-outline', label: val };
                                updateContentItem(setItems, idx, 'amenities', [...(item.amenities || []), newAmenity]);
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          const input = document.getElementById(`amenity-input-${item.id}`) as HTMLInputElement;
                          const val = input?.value.trim();
                          if (val) {
                            const newAmenity = { id: crypto.randomUUID(), icon: 'checkmark-circle-outline', label: val };
                            updateContentItem(setItems, idx, 'amenities', [...(item.amenities || []), newAmenity]);
                            input.value = '';
                          }
                        }}>
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(item.amenities || []).map((am, amIdx) => (
                          <span key={am.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium dark:bg-blue-500/10 dark:text-blue-400">
                            {am.label}
                            <button
                              type="button"
                              onClick={() => removeAmenity(setItems, idx, amIdx)}
                              className="ml-1 text-blue-400 hover:text-red-500 transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Must-Try Dish (Where to Eat specific) */}
                  {sectionKey === 'whereToEat' && (
                    <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <Label className="md:col-span-2 uppercase text-xs font-bold text-gray-500 tracking-wider mb-2">Must-Try Dish</Label>
                      <div>
                          <Label>Must-Try Dish Name</Label>
                          <Input 
                            placeholder="e.g. Bicol Express, Grilled Tuna Belly" 
                            value={item.mustTryDish || ''} 
                            onChange={(e) => updateContentItem(setItems, idx, 'mustTryDish', e.target.value)} 
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Must-Try Dish Image</Label>
                          <label className="relative w-full h-32 rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 group cursor-pointer dark:bg-gray-800 dark:border-gray-600 flex items-center justify-center">
                            {item.mustTryDishImage ? (
                              <img src={item.mustTryDishImage} className="w-full h-full object-cover" alt="Must Try Dish" />
                            ) : (
                              <Camera className="w-8 h-8 text-gray-400" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              {uploadingItemId === `musttry_${item.id}` ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Camera className="w-8 h-8 text-white" />}
                            </div>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingItemId(`musttry_${item.id}`);
                                try {
                                  const url = await uploadFile(file, 'municipalities/content');
                                  updateContentItem(setItems, idx, 'mustTryDishImage', url);
                                } catch (err) {
                                  showToast("Failed to upload image", "error");
                                } finally {
                                  setUploadingItemId(null);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Must-Try Dish Description</Label>
                          <Input 
                            placeholder="e.g. Crispy battered fish served with fries and house sauce" 
                            value={item.mustTryDishDescription || ''} 
                            onChange={(e) => updateContentItem(setItems, idx, 'mustTryDishDescription', e.target.value)} 
                          />
                        </div>
                    </div>
                  )}

                  {/* Photo Gallery */}
                  <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
                    <Label>Photo Gallery</Label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {(item.photos || []).map((url, pIdx) => (
                        <div key={pIdx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                          <img src={url} className="w-full h-full object-cover" alt="Gallery" />
                          <button
                            onClick={() => {
                              const newPhotos = item.photos.filter((_, i) => i !== pIdx);
                              updateContentItem(setItems, idx, 'photos', newPhotos);
                            }}
                            className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                        {uploadingItemId === `gallery_${item.id}` ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : <Plus className="w-6 h-6 text-gray-400" />}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            setUploadingItemId(`gallery_${item.id}`);
                            try {
                              const uploadPromises = Array.from(files).map(file => uploadFile(file, 'municipalities/gallery'));
                              const urls = await Promise.all(uploadPromises);
                              updateContentItem(setItems, idx, 'photos', [...(item.photos || []), ...urls]);
                            } catch (err) {
                              showToast("Failed to upload photos", "error");
                            } finally {
                              setUploadingItemId(null);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                </div>
              </div>
            ))}
            <div className="flex justify-center mt-4">
              <Button onClick={() => setItems(prev => [...prev, emptyContentItem()])} variant="outline" className="w-full border-dashed">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTransportOptions = () => {
    const list = transportation[activeTransportTab] || [];
    const isOpen = openSections['transportation'];

    return (
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        <button 
          onClick={() => handleToggleSection('transportation')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors dark:hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
              <Bus className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Transportation
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Land: {(transportation.land||[]).length}, Sea: {(transportation.sea||[]).length}, Air: {(transportation.air||[]).length}
              </p>
            </div>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {isOpen && (
          <div>
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {(['land', 'sea', 'air'] as const).map(tab => (
                <button
                  key={tab}
                  className={`flex-1 py-3 font-medium text-sm transition-colors border-b-2 ${activeTransportTab === tab ? 'border-brand-500 text-brand-500 bg-white dark:bg-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                  onClick={() => setActiveTransportTab(tab)}
                >
                  <span className="capitalize">{tab}</span>
                </button>
              ))}
            </div>

            <div className="p-5 bg-gray-50/50 dark:bg-transparent space-y-6 border-t border-gray-100 dark:border-white/[0.05]">
              {(list || []).map((item, idx) => (
                <div key={item.id} className="p-5 bg-white border border-gray-200 rounded-xl dark:bg-gray-900 dark:border-gray-700 relative">
                  <button 
                    className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-500/10"
                    onClick={() => setTransportation(prev => ({ ...prev, [activeTransportTab]: prev[activeTransportTab]!.filter((_, i) => i !== idx) }))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                    <div className="col-span-1 lg:col-span-3 flex items-center gap-4">
                      <label className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border bg-gray-100 dark:bg-gray-800 cursor-pointer group">
                        {item.logo ? <img src={item.logo} className="w-full h-full object-cover" alt="Logo" /> : <ImageIcon className="w-6 h-6 m-auto mt-4 text-gray-400" />}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {uploadingItemId === `logo_${item.id}` ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Camera className="w-4 h-4 text-white" />}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingItemId(`logo_${item.id}`);
                          try {
                            const url = await uploadFile(file, 'municipalities/transport');
                            setTransportation(prev => {
                              const copy = { ...prev };
                              copy[activeTransportTab]![idx] = { ...copy[activeTransportTab]![idx], logo: url };
                              return copy;
                            });
                          } catch (err) {
                            showToast("Failed to upload logo", "error");
                          } finally {
                            setUploadingItemId(null);
                          }
                        }} />
                      </label>
                      <div className="flex-1">
                        <Label>Company Name</Label>
                        <Input value={item.companyName} onChange={e => setTransportation(prev => {
                          const copy = { ...prev };
                          copy[activeTransportTab]![idx] = { ...copy[activeTransportTab]![idx], companyName: e.target.value };
                          return copy;
                        })}/>
                      </div>
                    </div>

                    <div><Label>Type</Label><Input value={item.type} onChange={e => setTransportation(prev => { const copy = {...prev}; copy[activeTransportTab]![idx].type = e.target.value; return copy; })}/></div>
                    <div><Label>Route</Label><Input value={item.route} onChange={e => setTransportation(prev => { const copy = {...prev}; copy[activeTransportTab]![idx].route = e.target.value; return copy; })}/></div>
                    <div><Label>Duration</Label><Input value={item.duration} onChange={e => setTransportation(prev => { const copy = {...prev}; copy[activeTransportTab]![idx].duration = e.target.value; return copy; })}/></div>
                    <div><Label>Fare Range</Label><Input value={item.fareRange} onChange={e => setTransportation(prev => { const copy = {...prev}; copy[activeTransportTab]![idx].fareRange = e.target.value; return copy; })}/></div>
                    <div><Label>Schedule</Label><Input value={item.schedule} onChange={e => setTransportation(prev => { const copy = {...prev}; copy[activeTransportTab]![idx].schedule = e.target.value; return copy; })}/></div>
                    <div><Label>Contact Number (Opt)</Label><Input value={item.contactNumber||''} onChange={e => setTransportation(prev => { const copy = {...prev}; copy[activeTransportTab]![idx].contactNumber = e.target.value; return copy; })}/></div>
                    
                    <div className="col-span-1 lg:col-span-3"><Label>Booking URL (Opt)</Label><Input value={item.bookingUrl||''} onChange={e => setTransportation(prev => { const copy = {...prev}; copy[activeTransportTab]![idx].bookingUrl = e.target.value; return copy; })}/></div>
                    <div className="col-span-1 lg:col-span-3">
                      <Label>Notes (Opt)</Label>
                      <textarea className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white" rows={2} value={item.notes||''} onChange={e => setTransportation(prev => { const copy = {...prev}; copy[activeTransportTab]![idx].notes = e.target.value; return copy; })}/>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-center mt-4">
                <Button onClick={() => setTransportation(prev => ({ ...prev, [activeTransportTab]: [...prev[activeTransportTab]!, emptyTransportOption()] }))} variant="outline" className="w-full border-dashed">
                  <Plus className="w-4 h-4 mr-2" /> Add {activeTransportTab} Transport Option
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLocalTips = () => {
    const isOpen = openSections['localTips'];
    return (
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        <button 
          onClick={() => handleToggleSection('localTips')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors dark:hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Local Tips
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {localTips.length} tip{localTips.length !== 1 && 's'}
              </p>
            </div>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {isOpen && (
          <div className="p-5 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-transparent space-y-4">
            <div className="flex flex-col gap-3 mb-4">
              <textarea
                id="local-tip-input"
                rows={3}
                placeholder="e.g. Bring extra water since the trail has limited shade during midday. Strong Globe signal available at the peak."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-500 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const input = e.target as HTMLTextAreaElement;
                    const val = input.value.trim();
                    if (val) {
                      setLocalTips([...localTips, val]);
                      input.value = '';
                    }
                  }
                }}
              />
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => {
                  const input = document.getElementById('local-tip-input') as HTMLTextAreaElement;
                  const val = input?.value.trim();
                  if (val) {
                    setLocalTips([...localTips, val]);
                    input.value = '';
                  }
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Add Tip
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {localTips.map((tip, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 bg-brand-50 text-brand-600 px-3 py-1.5 rounded-full text-sm font-medium dark:bg-brand-500/10 dark:text-brand-400">
                  {tip}
                  <button
                    type="button"
                    onClick={() => setLocalTips(localTips.filter((_, i) => i !== idx))}
                    className="ml-1 text-brand-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            {localTips.length === 0 && (
              <p className="text-sm text-gray-500 italic dark:text-gray-400">
                No local tips added yet.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!municipality) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/municipalities")}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-title-md2 font-semibold text-black dark:text-white">
              Manage Municipality — {municipality.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Section 1: Tags & Attributes */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] sm:p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Section 1: Tags & Attributes
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Classify the destination to improve platform search and filtering.
              </p>
            </div>
          </div>
          <Button onClick={handleSaveTags} disabled={savingTags || !isDirtyTags} size="sm">
            {savingTags ? "Saving..." : "Save Tags"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 dark:text-white/90">Available Activities</h4>
            <div className="flex flex-col gap-3">
              {AVAILABLE_ACTIVITIES.map((item) => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
                    checked={activities.includes(item)}
                    onChange={() => {
                      if (activities.includes(item)) setActivities(activities.filter((i) => i !== item));
                      else setActivities([...activities, item]);
                    }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 dark:text-white/90">Spending Levels</h4>
            <div className="flex flex-col gap-3">
              {SPENDING_LEVELS.map((item) => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
                    checked={spending.includes(item)}
                    onChange={() => {
                      if (spending.includes(item)) setSpending(spending.filter((i) => i !== item));
                      else setSpending([...spending, item]);
                    }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 dark:text-white/90">Travel Styles</h4>
            <div className="flex flex-col gap-3">
              {TRAVEL_STYLES.map((item) => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
                    checked={travelStyles.includes(item)}
                    onChange={() => {
                      if (travelStyles.includes(item)) setTravelStyles(travelStyles.filter((i) => i !== item));
                      else setTravelStyles([...travelStyles, item]);
                    }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 dark:text-white/90">Trip Lengths</h4>
            <div className="flex flex-col gap-3">
              {TRIP_LENGTHS.map((item) => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
                    checked={tripLengths.includes(item)}
                    onChange={() => {
                      if (tripLengths.includes(item)) setTripLengths(tripLengths.filter((i) => i !== item));
                      else setTripLengths([...tripLengths, item]);
                    }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Content & Transportation</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage all sub-content for this destination</p>
      </div>

      {renderContentItems('Things to Do', <Navigation className="w-5 h-5" />, 'thingsToDo', thingsToDo, setThingsToDo)}
      {renderContentItems('Places to Visit', <Camera className="w-5 h-5" />, 'placesToVisit', placesToVisit, setPlacesToVisit)}
      {renderContentItems('Where to Eat', <Utensils className="w-5 h-5" />, 'whereToEat', whereToEat, setWhereToEat)}
      {renderContentItems('Where to Stay', <Bed className="w-5 h-5" />, 'whereToStay', whereToStay, setWhereToStay)}
      {renderTransportOptions()}
      {renderLocalTips()}

      <div className="flex justify-end pt-8">
        <Button onClick={handleSaveContentAndTransport} disabled={savingContent || !isDirtyContent} className="px-8 shadow-sm">
          {savingContent ? "Saving Content..." : "Save Content Changes"}
        </Button>
      </div>
    </div>
  );
}
