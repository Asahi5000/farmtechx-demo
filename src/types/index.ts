import { Timestamp } from 'firebase/firestore';

export interface IslandGroup {
  id: string;
  name: string;
  tagline: string;
  image: string;
  mapImage?: string; // Highlighted map image URL
  mapZoomX?: number; // Zoom anchor X (0.0–1.0) — where the highlighted island group is
  mapZoomY?: number; // Zoom anchor Y (0.0–1.0) — where the highlighted island group is
  destinationCount: number;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Region {
  id: string;
  name: string;
  psgcCode: string;
  islandGroupId: string;
  islandGroupName: string;
  provinceCount: number;
  backgroundImage?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Festival {
  id: string;
  name: string;
  date: string; // When the festival is celebrated (e.g., "May 15-17", "Every 3rd week of October")
  coverImage: string;
  history: string;
  description: string;
  photos: string[];
  travelTips: string[];
  travelInfo: {
    office: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
}

export interface Province {
  id: string;
  name: string;
  psgcCode: string;
  regionId: string;
  regionName: string;
  islandGroupId?: string;
  islandGroupName?: string;
  image: string;
  tagline: string;
  photos: string[];
  festivals: Festival[];
  municipalityCount: number;
  mapImage?: string; // Highlighted region map image URL (for province detail page)
  mapZoomX?: number; // Zoom anchor X (0.0–1.0, fraction of image width) — where the highlighted province is
  mapZoomY?: number; // Zoom anchor Y (0.0–1.0, fraction of image height) — where the highlighted province is
  // Province-wide voting period for coming soon municipalities
  votingStartDate?: string; // ISO date when voting starts for this province
  votingEndDate?: string; // ISO date when voting ends (winner auto-enables)
  votingResolved?: boolean; // Flag to ensure auto-resolution only effectively runs once
  lastVotingResult?: string | null;
  lastVotingResultDate?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Content item for Things to Do, Places to Visit, Where to Eat, Where to Stay
export interface ContentItem {
  id: string;
  name: string;
  image: string; // Main hero image - REQUIRED
  rating: number; // Initial rating set by admin (will be replaced by user average) - REQUIRED
  description: string; // REQUIRED
  priceRange: string; // REQUIRED - e.g., "₱500-₱1000", "Free", "₱", "₱₱", "₱₱₱"
  
  // Amenities - REQUIRED (can be empty array)
  amenities: Array<{
    id: string;
    icon: string; // Ionicons name
    label: string;
  }>;
  
  // Location - REQUIRED
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    mapUrl: string; // Google Maps URL
  };
  
  // Photos gallery (admin + user-submitted) - REQUIRED (can be empty array)
  photos: string[]; // Array of image URLs
  
  // Auto-calculated from reviews (read-only in CMS) - OPTIONAL
  reviewCount?: number;
  averageRating?: number;

  // Additional optional fields (most relevant for placesToVisit)
  type?: string; // e.g. Beach, Park, Mountain, Island, Shrine
  pricing?: string; // Optional entrance fee / pricing info
  estimate?: string; // e.g. "2D 1N", "Half Day", "3-4 Hours"
}

// Transport option for land/sea/air
export interface TransportOption {
  id: string;
  companyName: string;
  logo: string;
  type: string; // Bus, Van, Ferry, Airplane, etc.
  route: string;
  duration: string;
  fareRange: string;
  schedule: string;
  contactNumber?: string;
  bookingUrl?: string;
  notes?: string;
}

// Transportation container
export interface Transportation {
  land?: TransportOption[];
  sea?: TransportOption[];
  air?: TransportOption[];
}

export type MunicipalityStatus = 'disabled' | 'enabled' | 'coming_soon';

export interface Municipality {
  id: string;
  name: string;
  psgcCode: string;
  provinceId: string;
  provinceName: string;
  regionId: string;
  regionName: string;
  islandGroupId: string;
  islandGroupName: string;
  status: MunicipalityStatus; // 'disabled' = hidden, 'enabled' = live, 'coming_soon' = voting active
  image: string;
  description: string;
  history: string;
  availableActivities: string[];
  // Traveler profile tags
  spendingLevels: string[];   // Budget-friendly, Mid-range, Luxury, High-value
  travelStyles: string[];    // Solo, Couples, Family, Barkada, Digital Nomad
  tripLengths: string[];     // Day-trip, Overnight, Long-stay
  thingsToDo: ContentItem[];
  placesToVisit: ContentItem[];
  whereToEat: ContentItem[];
  whereToStay: ContentItem[];
  transportation: Transportation;
  // Coming Soon voting field (voting dates are on Province level)
  voteCount?: number; // Track user votes
  // Featured / Popular Destinations
  isFeatured?: boolean;
  featuredOrder?: number;
  // Ratings (computed or fetched)
  averageRating?: number;
  rating?: number;
  computedRating?: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Available activities list
export const AVAILABLE_ACTIVITIES = [
  'Foodies',
  'Adventure Tourists',
  'Cultural Tourists',
  'Eco-tourists',
  'Nightlife',
  'Wellness Tourists',
  'Pilgrimage',
  'Sports Tourists',
];

// Traveler profile tag constants
export const SPENDING_LEVELS = [
  'Budget-friendly',
  'Mid-range',
  'Luxury',
  'High-value / Low-volume',
];

export const TRAVEL_STYLES = [
  'Solo Travelers',
  'Couples',
  'Family Travelers',
  'Barkada / Group',
  'Digital Nomads',
];

export const TRIP_LENGTHS = [
  'Day-trip',
  'Overnight',
  'Long-stay',
];

export interface PopularDestination {
  id: string;
  name: string;
  location: string;
  image: string;
  rating: number;
  type: string;
  priceEstimate: string;
  gallery: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// New: Featured attraction from municipality ContentItems (thingsToDo / placesToVisit)
export interface FeaturedAttraction {
  id: string;
  contentItemId: string;
  contentItemName: string;
  municipalityId: string;
  municipalityName: string;
  provinceName: string;
  image: string;
  featuredOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Review {
  id: string;
  attractionId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  photos?: string[];
  createdAt: Timestamp;
  municipalityId: string;
  category: string;
}
