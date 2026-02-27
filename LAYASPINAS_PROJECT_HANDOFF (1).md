# LayasPinas — Project Handoff Document
**Last Updated:** February 27, 2026  
**Prepared for:** New AI Agent Handoff (Antigravity IDE / Claude)

---

## 🗂️ Project Overview

**LayasPinas** is a Philippine municipality travel app built by **LayasPinas IT Solutions**.

### Projects / Paths
| Project | Purpose |
|:--------|:--------|
| `layaspinas_new_dashboard` | Next.js CMS dashboard for admin content management |
| `LayasPinas` | React Native / Expo mobile app |

### Tech Stack
- **CMS:** Next.js, Tailwind CSS, Firebase Firestore, Firebase Storage
- **App:** React Native (Expo), Expo Router, Firebase Firestore, Ionicons
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage

---

## 🏗️ Data Architecture

### Firestore Structure
```
municipalities/{municipalityId}
  ├── name, provinceName, description, heroImage, etc.
  ├── localTips: string[]
  ├── transportation: { ... }
  ├── placesToVisit: ContentItem[]
  ├── thingsToDo: ContentItem[]
  ├── whereToEat: ContentItem[]
  ├── whereToStay: ContentItem[]
  │
  ├── /activities/{activityId}        ← subcollection (placesToVisit)
  └── /rooms/{roomId}                 ← subcollection (whereToStay)
```

### ContentItem Interface (`types/index.ts`)
```typescript
amenities: Array<{ id: string; icon: string; label: string }>
// All other fields below are also on ContentItem:
// name, image, description, priceRange, rating, type, estimate
// bestTimeToDo, operatingHours, cuisineType
// propertyType, checkInTime, checkOutTime, startingPrice, roomTypes
// contactNumber, contactEmail, facebookLink
// mustTryDish, mustTryDishDescription, mustTryDishImage
// location: { coordinates: { latitude, longitude }, mapUrl }
// photos: string[]
```

---

## 📋 Content Categories — Fields Per Accordion

### 📍 Places to Visit (`placesToVisit`)
| Field | Type |
|:------|:-----|
| Hero Image | Image upload |
| Name | Text |
| Entrance Fee | Text (`priceRange`) |
| Initial Rating | Star selector |
| Description | Textarea |
| Type | Text |
| Duration | Text (`estimate`) |
| Operating Hours | Text (`operatingHours`) |
| Manage Activities | Navigation button → `/municipalities/[id]/manage-activities/[itemId]` |
| Contact Details | Contact Number, Contact Email, Facebook Page |
| Location Details | Latitude, Longitude, Google Maps URL |
| Amenities | Toggle chips (predefined list with icons) |
| Photo Gallery | Multi-image upload |

### 🎯 Things to Do (`thingsToDo`)
| Field | Type |
|:------|:-----|
| Hero Image | Image upload |
| Name | Text |
| Expected Cost | Text (`priceRange`) |
| Best Time to Do | Text (`bestTimeToDo`) |
| Description | Textarea |
| Type | Text |
| Duration | Text (`estimate`) |
| Photo Gallery | Multi-image upload |
> ❌ No Rating, No Location, No Contact, No Amenities

### 🍽️ Where to Eat (`whereToEat`)
| Field | Type |
|:------|:-----|
| Hero Image | Image upload |
| Name | Text |
| Price Range | Dropdown (Free / ₱ / ₱₱ / ₱₱₱) |
| Initial Rating | Star selector |
| Operating Hours | Text (`operatingHours`) |
| Cuisine Type | Text (`cuisineType`) |
| Contact Details | Contact Number, Contact Email, Facebook Page |
| Description | Textarea |
| Location Details | Latitude, Longitude, Google Maps URL |
| Amenities | Toggle chips (predefined list) |
| Must-Try Dish | Dish Name, Dish Image, Dish Description |
| Photo Gallery | Multi-image upload |

### 🏨 Where to Stay (`whereToStay`)
| Field | Type |
|:------|:-----|
| Hero Image | Image upload |
| Name | Text |
| Price Range | Dropdown (₱ / ₱₱ / ₱₱₱ / ₱₱₱₱) — NO "Free" option |
| Initial Rating | Star selector |
| Property Type | Dropdown (Resort, Hotel, Transient House, Homestay, Glamping, Inn, Pension House) |
| Starting Price | Text (e.g. ₱1,200 per night) |
| Check-in Time | Dropdown (6:00 AM – 12:00 AM hourly) |
| Check-out Time | Dropdown (6:00 AM – 12:00 AM hourly) |
| Operating Hours | Text (e.g. Reception open 24 hours) |
| Description | Textarea |
| Location Details | Latitude, Longitude, Google Maps URL |
| Amenities | Toggle chips (predefined list) |
| Manage Rooms | Navigation button → `/municipalities/[id]/manage-rooms/[itemId]` |
| Contact & Booking Details | Contact Number, Contact Email, Facebook/Booking Link |
| Photo Gallery | Multi-image upload |

---

## 🎨 Amenities System

### Storage Format (Firestore)
```typescript
amenities: Array<{ id: string; icon: string; label: string }>
// e.g. { id: "free-wifi", icon: "wifi-outline", label: "Free WiFi" }
```

### Master Lists (`src/constants/amenities.ts`)
**whereToStay:** Free WiFi, Parking, Swimming Pool, Air Conditioning, Hot Shower, Kitchen, Breakfast Included, Pet-Friendly, Generator, CCTV, Restaurant/Cafe, Beachfront, Baggage Storage, Wheelchair Accessible

**whereToEat:** Free WiFi, Parking, Al Fresco, Air Conditioning, Pet-Friendly, High Chairs, Takeout, Delivery, Reservations, Live Music, Drive-Thru, Cards Accepted, Restrooms, Wheelchair Accessible

**placesToVisit:** Restrooms, Parking, Entrance Fee, Lifeguard, Picnic Area, Camping Allowed, Swimming Area, Guide Available, First Aid, Sari-Sari Store, Cottages/Cabanas, Souvenir Shop, Shower/Changing Rooms, Viewing Deck, Wheelchair Accessible

**thingsToDo:** ❌ No amenities

### CMS UI Pattern
- Toggle chips — selected = solid blue, unselected = gray outlined
- Clicking a chip adds/removes the full `{id, icon, label}` object

### App Display
- 3-column grid, each amenity: circular icon (blue bg) centered + label below

---

## 📱 Mobile App — attraction/[id].tsx

### Info Bars Per Category
| Category | Column 1 | Column 2 | Column 3 | Column 4 |
|:---------|:---------|:---------|:---------|:---------|
| placesToVisit | RATING | FEE | TYPE | HOURS (fallback: DURATION) |
| thingsToDo | COST | TYPE | DURATION | — |
| whereToEat | COST | CUISINE | HOURS | — |
| whereToStay | RATING | TYPE (first word only) | CHECK-IN | — |

### Section Order Per Category

**placesToVisit:**
Hero → Info Bar → Description → Activities → Amenities → Contact Details → Location/Map → Reviews

**thingsToDo:**
Hero → Info Bar → Description → Reviews

**whereToEat:**
Hero → Info Bar → Description → Must-Try Dish → Amenities → Contact Details → Location/Map → Reviews

**whereToStay:**
Hero → Info Bar → Description → Rooms (with Check-in/Check-out/Hours note) → Amenities → Contact Details → Location/Map → Reviews → **Sticky Bottom Bar**

### Conditional Rendering Guards
```javascript
// Location/Map — shown for:
['placesToVisit', 'whereToEat', 'whereToStay'].includes(category)

// Amenities — shown for:
['placesToVisit', 'whereToEat', 'whereToStay'].includes(category)

// Contact Details — shown for:
['placesToVisit', 'whereToEat', 'whereToStay'].includes(category)

// Rating — hidden for thingsToDo
// Sticky Bottom Bar — whereToStay only
// Must-Try Dish — whereToEat only
// Rooms — whereToStay only
// Activities — placesToVisit only
// Best Time to Do — thingsToDo only
```

### Where to Stay Sticky Bottom Bar
- Fixed at bottom, white bg, subtle top shadow
- Left: "Starting from" (gray label) + price bold (large)
- Right: "Contact Property" button (solid blue)
- Tap → opens tel: / Facebook / mailto: (in priority order)
- Hidden if no `startingPrice`

---

## 🏠 Manage Rooms (`/municipalities/[id]/manage-rooms/[propertyId]`)

### Firestore Path
`municipalities/{id}/rooms` — filtered by `propertyId`

### Room Fields
| Field | Type |
|:------|:-----|
| Room Name* | Text (required) |
| Room Photos | Multi-image upload (stored: `rooms/{propertyId}/{timestamp}_{filename}`) |
| Price per Night | Text |
| Capacity | Number |
| Bed Type | Dropdown (Single, Double, Queen, King, Bunk Bed, Mixed) |
| Room Description | Textarea |
| Availability | Toggle (Available / Unavailable, default: Available) |

### Room Detail Page (`app/room/[roomId].tsx`)
- Same layout as `app/activity/[activityId].tsx`
- Hero carousel → Room name → Availability badge → Description → Room Details (Bed+Capacity) → Price/Night → More Rooms section
- "Gallery" badge (not "See all")
- "More Rooms" = horizontal scroll of other rooms from same property

---

## 🏃 Manage Activities (`/municipalities/[id]/manage-activities/[attractionId]`)

### Firestore Path
`municipalities/{id}/activities` — filtered by `attractionId`

### Activity Fields
| Field | Type |
|:------|:-----|
| Name* | Text (required) |
| Cover Images | Multi-image upload |
| Description | Textarea |
| Best Time to Visit | Text |
| What to Wear | Chip/tag input |

### Activity Detail Page (`app/activity/[activityId].tsx`)
- Hero carousel with parallax → Name → Description → Best Time to Visit → What to Wear chips → "More in this Spot" horizontal scroll

---

## 🗺️ Municipality Page (`app/municipality/[id].tsx`)

### Location Subtitle Format
`"Municipality, Province"` — e.g. "Talisay, Camarines Norte"  
(fetched: `provinceName` from municipality document)

### Sections Displayed
1. Hero image
2. Description
3. Things to Do
4. Places to Visit
5. Where to Eat
6. Where to Stay
7. Transportation
8. Local Tips (lightbulb icon per tip)

---

## 💡 Local Tips

### CMS
- Chip/tag input in municipality page (not inside content accordions)
- Stored as `localTips: string[]` on municipality document
- Placeholder: "e.g. Strong Globe signal, Bring cash — no ATMs nearby"

### App Display
- Each tip: lightbulb icon + tip text as a row
- Same header style as other sections

---

## 🗃️ CMS — Card List + Inline Expand Pattern

### How It Works
- Each content item shows as a **compact card** when collapsed:
  - 60x60 thumbnail (gray camera placeholder if no image)
  - Bold name (or "New Item" italic if blank)
  - Subtitle per category (type · rating, cuisineType · priceRange, propertyType · startingPrice)
  - Edit (pencil) + Delete (trash) buttons
- Clicking **Edit** expands the card inline with blue left border tint
- Only **one item** can be expanded at a time
- Each expanded card has its own **Save Item** button → saves to Firestore immediately
- **Add Item** → appends blank card and auto-expands it

### Save Buttons
| Button | Saves What |
|:-------|:-----------|
| Save Item (per card) | Individual content item (placesToVisit, thingsToDo, whereToEat, whereToStay) |
| Save Content Changes (bottom of page) | Transportation + Local Tips only |

### Delete
- Immediate Firestore save on delete — no need for global Save

---

## 🚌 Transportation
> ⚠️ **PENDING** — Not yet implemented. Owner is consulting with partner before deciding on structure.

---

## 🗺️ Map / Roam Page (`app/(tabs)/roam.tsx`)

### Fullscreen Immersive Mode
- **Fullscreen button** → tab bar slides DOWN off screen + Roam/Explore toggle card slides UP off screen
- **Minimize button** → both animate back to original position
- Uses `FullscreenMapContext` (`contexts/FullscreenMapContext.tsx`)
- `Animated.parallel` — 300ms, `Easing.ease`
- Header height measured dynamically via `onLayout` — uses `-headerHeight - 20` buffer

### Files Modified for Fullscreen
- `contexts/FullscreenMapContext.tsx` — NEW file, shared context
- `app/(tabs)/_layout.tsx` — wrapped with `FullscreenMapProvider`
- `components/CustomTabBar.tsx` — uses `tabBarTranslateY` animated value
- `app/(tabs)/roam.tsx` — uses `toggleFullscreen()` from context

---

## 🔐 Firestore Security Rules

### Current Rules Summary
```
/users/{userId}           — auth read/write own
/posts/{postId}           — auth read all, write own
/comments/{commentId}     — auth read all, write own
/reviews/{reviewId}       — public read, auth create, write own
/islandGroups/{docId}     — public read, auth write
/regions/{docId}          — public read, auth write
/provinces/{docId}        — public read, auth write
/municipalities/{docId}   — public read, auth write
  /activities/{activityId} — public read, auth write
  /rooms/{roomId}          — public read, auth write  ← ADDED
/popularDestinations      — public read, auth write
/featuredAttractions      — public read, auth write
/adminProfiles/{userId}   — auth read/write own
```

---

## 📝 Design Decisions & Conventions

### Category Distinctions
| Category | Has Location | Has Rating | Has Amenities | Has Contact |
|:---------|:------------|:-----------|:--------------|:------------|
| placesToVisit | ✅ | ✅ | ✅ | ✅ |
| thingsToDo | ❌ | ❌ | ❌ | ❌ |
| whereToEat | ✅ | ✅ | ✅ | ✅ |
| whereToStay | ✅ | ✅ | ✅ | ✅ |

### Naming Conventions
- `priceRange` — shared Firestore key, label varies per category in CMS
- `estimate` — Firestore key for duration/time field
- `operatingHours` — shared key for whereToEat, placesToVisit, whereToStay
- Activity cards: `activityThumb` style = 90x90, borderRadius 12, margin 10
- Room cards: same `activityThumb` style

### Location Subtitle
- Format: `"Municipality, Province"` — NOT hardcoded "Philippines"
- Fetched from municipality document's `provinceName` field

### Price Display
- Info bar COST: peso signs only (strip parentheses from priceRange)
- Sticky bar PRICE: `startingPrice.split('/')[0]` to strip suffix
- Info bar TYPE: `propertyType.split(' ')[0]` for whereToStay (first word only)

---

## ⏭️ Next Steps (Planned)

### Tomorrow's Focus
1. **Trip Planner / Itinerary Feature** — AI-powered trip creation flow
2. **Bucket Lists Page** — User can save places/activities to a bucket list
3. **Transportation Section** — After consulting with partner
4. **Real Data Entry** — Add actual municipality data per category

### Pending Decisions
- Transportation accordion structure (consulting with partner)

---

## 🚀 Trip Planner Feature — Full Flow

### Trigger
- Center "+" tab in bottom navigation (`CustomTabBar.tsx`)
- Tap → floating modal with two options:
  - **Create New Trip** — opens trip planner flow
  - **Add Spots** — add places to existing trip or bucket list

### Create New Trip — Step by Step
1. Bottomsheet (gradient design) opens
2. **"Where are we going?"** — search input, scoped to Philippines / LayasPinas municipalities
3. **Trip Preferences** — category chips (Places to Visit, Things to Do, Where to Eat, Where to Stay)
4. **Trip Duration** — date picker or number of days
5. **System processes** — pulls content from Firestore based on destination + preferences + ratings
6. **Suggestions list** — user can swipe to remove items or manually add their own
7. **User approves** selections
8. **Progress/loading bottomsheet** — shows selected places above a Google Maps view
9. **Google Maps route** — auto-directs route between all selected locations using existing `location.coordinates` per ContentItem, shows order of places
10. **Save** → written to `users/{userId}/itineraries/{id}`

### Firestore Structure
```
users/{userId}/itineraries/{itineraryId}
  ├── title: string
  ├── coverImage: string
  ├── startDate: Timestamp
  ├── endDate: Timestamp
  ├── createdAt: Timestamp
  ├── municipalityIds: string[]
  └── days: Array<{
        dayNumber: number,
        date: Timestamp,
        items: Array<{
          id: string,
          time: string,
          title: string,
          category: string,
          municipalityId: string,
          contentItemName: string,
          heroImage: string,
          notes: string
        }>
      }>

users/{userId}/bucketList/{docId}
  ├── contentItemName: string
  ├── category: string
  ├── municipalityId: string
  ├── municipalityName: string
  ├── provinceName: string
  ├── heroImage: string
  ├── savedAt: Timestamp
  └── visited: boolean
```

---

## 🔧 Backend — Firebase Cloud Functions

### Architecture Decision
- **No separate backend server needed** — Firebase Cloud Functions handles all server-side logic
- **CMS Dashboard** (`layaspinas_new_dashboard`) will have a new section for backend/API management
- **Mobile app** calls Cloud Functions for API-dependent features

### Cloud Functions Needed
| Function | Purpose | API Used |
|:---------|:--------|:---------|
| `generateTripSuggestions` | Pull + rank content based on destination + preferences | Firestore (internal) |
| `getRouteDirections` | Get optimized route between selected locations | Google Directions API |
| `generateItinerary` | AI-powered itinerary text generation | LLM API (OpenAI/Claude) |

### CMS Backend Section (to be built)
- New section in `layaspinas_new_dashboard` sidebar
- Manage API keys, Cloud Function configs, usage monitoring
- Separate category from content management

### Firestore Security Rules to Add
```
/users/{userId}/bucketList/{docId}  — auth read/write own
/users/{userId}/itineraries/{docId} — auth read/write own
```

### Notes
- Google Directions API — paid, managed via Google Console (owner has account)
- LLM API calls — handled server-side via Cloud Functions (API keys never exposed to client)
- `thingsToDo` has no coordinates — will be listed below map, not pinned

---

## 🛠️ Common Patterns Used

### Chip/Tag Input Pattern (CMS)
```jsx
// Enter key or Add button appends to array
// X button removes from array
// Used for: Custom Room Types, Local Tips (municipality level)
```

### Multi-Image Upload Pattern (CMS)
```jsx
// Same pattern as Hero Image upload
// Stored: Firebase Storage path + download URL saved to Firestore
// Used for: Photo Gallery, Activity Cover Images, Room Photos
```

### Contact Details Section (App)
```jsx
// Shows rows only when data exists:
// phone (call-outline icon, tel: link)
// email (mail-outline icon, mailto: link)  
// facebook (logo-facebook icon, extracts page name from URL)
```

### Must-Try Dish Card (App — whereToEat only)
```jsx
// Horizontal card: 80x80 image left
// Right: dish name bold + description + orange "MUST TRY" badge
// White card, borderRadius 12, subtle shadow
```

---

*This document covers all completed work as of February 27, 2026.*  
*Generated from LayasPinas development session.*
