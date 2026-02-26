# CMS Accordion Field Audit

> **File:** `layaspinas_new_dashboard/src/app/(admin)/municipalities/[id]/page.tsx`
> **Date:** February 27, 2026

All 4 content accordions share a single `renderContentItems()` function. Fields are conditionally rendered based on `sectionKey`.

---

## Quick Reference Matrix

| Field | placesToVisit | thingsToDo | whereToEat | whereToStay |
|:------|:---:|:---:|:---:|:---:|
| Hero Image | ✅ | ✅ | ✅ | ✅ |
| Name | ✅ | ✅ | ✅ | ✅ |
| Price / Fee / Cost | ✅ text | ✅ text | ✅ dropdown | ✅ dropdown |
| Initial Rating | ✅ | ❌ | ✅ | ✅ |
| Best Time to Do | ❌ | ✅ | ❌ | ❌ |
| Operating Hours | ✅ | ❌ | ✅ | ❌ |
| Cuisine Type | ❌ | ❌ | ✅ | ❌ |
| Property Type | ❌ | ❌ | ❌ | ✅ |
| Starting Price | ❌ | ❌ | ❌ | ✅ |
| Check-in Time | ❌ | ❌ | ❌ | ✅ |
| Check-out Time | ❌ | ❌ | ❌ | ✅ |
| Description | ✅ | ✅ | ✅ | ✅ |
| Type | ✅ | ✅ | ❌ | ❌ |
| Duration | ✅ | ✅ | ❌ | ❌ |
| Manage Activities | ✅ | ❌ | ❌ | ❌ |
| Manage Rooms | ❌ | ❌ | ❌ | ✅ |
| Contact Details | ✅ (3) | ❌ | ✅ (3) | ✅ (3) |
| Location Details | ✅ (3) | ❌ | ✅ (3) | ✅ (3) |
| Amenities | ✅ | ✅ | ✅ | ✅ |
| Must-Try Dish | ❌ | ❌ | ✅ (3) | ❌ |
| Photo Gallery | ✅ | ✅ | ✅ | ✅ |

---

## Detailed Field Order Per Accordion

### 📍 Places to Visit

| # | Field | Input Type | Firestore Key | Scope |
|--:|:------|:-----------|:--------------|:------|
| 1 | Hero Image | Image upload | `image` | Shared |
| 2 | Name | Text input | `name` | Shared |
| 3 | Entrance Fee | Text input | `priceRange` | Shared (label varies) |
| 4 | Initial Rating | Star selector (1–5) | `rating` | Shared (not thingsToDo) |
| 5 | Description | Textarea | `description` | Shared |
| 6 | Type | Text input | `type` | placesToVisit + thingsToDo |
| 7 | Duration | Text input | `estimate` | placesToVisit + thingsToDo |
| 8 | 🔘 Manage Activities | Navigation button | — | **placesToVisit only** |
| 9 | Operating Hours | Text input | `operatingHours` | **placesToVisit only** |
| 10 | **CONTACT DETAILS** | *Sub-header* | — | **placesToVisit only** |
| 10a | → Contact Number | Text input | `contactNumber` | ↑ |
| 10b | → Contact Email | Text input | `contactEmail` | ↑ |
| 10c | → Facebook Page | Text input | `facebookLink` | ↑ |
| 11 | **LOCATION DETAILS** | *Sub-header* | — | Shared (not thingsToDo) |
| 11a | → Latitude | Number input | `location.coordinates.latitude` | ↑ |
| 11b | → Longitude | Number input | `location.coordinates.longitude` | ↑ |
| 11c | → Google Maps URL | Text input | `location.mapUrl` | ↑ |
| 12 | Amenities | Toggle chip buttons | `amenities[]` | Shared |
| 13 | Photo Gallery | Multi-image upload | `photos[]` | Shared |

---

### 🎯 Things to Do

| # | Field | Input Type | Firestore Key | Scope |
|--:|:------|:-----------|:--------------|:------|
| 1 | Hero Image | Image upload | `image` | Shared |
| 2 | Name | Text input | `name` | Shared |
| 3 | Expected Cost | Text input | `priceRange` | Shared (label varies) |
| 4 | Best Time to Do | Text input | `bestTimeToDo` | **thingsToDo only** |
| 5 | Description | Textarea | `description` | Shared |
| 6 | Type | Text input | `type` | placesToVisit + thingsToDo |
| 7 | Duration | Text input | `estimate` | placesToVisit + thingsToDo |
| 8 | Amenities | Toggle chip buttons | `amenities[]` | Shared |
| 9 | Photo Gallery | Multi-image upload | `photos[]` | Shared |

> No Rating · No Location · No Contact Details

---

### 🍽️ Where to Eat

| # | Field | Input Type | Firestore Key | Scope |
|--:|:------|:-----------|:--------------|:------|
| 1 | Hero Image | Image upload | `image` | Shared |
| 2 | Name | Text input | `name` | Shared |
| 3 | Price Range | Dropdown (Free / ₱ / ₱₱ / ₱₱₱) | `priceRange` | Shared (label varies) |
| 4 | Initial Rating | Star selector (1–5) | `rating` | Shared (not thingsToDo) |
| 5 | Operating Hours | Text input | `operatingHours` | **whereToEat only** |
| 6 | Cuisine Type | Text input | `cuisineType` | **whereToEat only** |
| 7 | **CONTACT DETAILS** | *Sub-header* | — | **whereToEat only** |
| 7a | → Contact Number | Text input | `contactNumber` | ↑ |
| 7b | → Contact Email | Text input | `contactEmail` | ↑ |
| 7c | → Facebook Page | Text input | `facebookLink` | ↑ |
| 8 | Description | Textarea | `description` | Shared |
| 9 | **LOCATION DETAILS** | *Sub-header* | — | Shared (not thingsToDo) |
| 9a | → Latitude | Number input | `location.coordinates.latitude` | ↑ |
| 9b | → Longitude | Number input | `location.coordinates.longitude` | ↑ |
| 9c | → Google Maps URL | Text input | `location.mapUrl` | ↑ |
| 10 | Amenities | Toggle chip buttons | `amenities[]` | Shared |
| 11 | **MUST-TRY DISH** | *Sub-header* | — | **whereToEat only** |
| 11a | → Dish Name | Text input | `mustTryDish` | ↑ |
| 11b | → Dish Image | Image upload | `mustTryDishImage` | ↑ |
| 11c | → Dish Description | Text input | `mustTryDishDescription` | ↑ |
| 12 | Photo Gallery | Multi-image upload | `photos[]` | Shared |

---

### 🏨 Where to Stay

| # | Field | Input Type | Firestore Key | Scope |
|--:|:------|:-----------|:--------------|:------|
| 1 | Hero Image | Image upload | `image` | Shared |
| 2 | Name | Text input | `name` | Shared |
| 3 | Price Range | Dropdown (₱ / ₱₱ / ₱₱₱ / ₱₱₱₱) | `priceRange` | Shared (label varies) |
| 4 | Initial Rating | Star selector (1–5) | `rating` | Shared (not thingsToDo) |
| 5 | Property Type | Dropdown (7 options) | `propertyType` | **whereToStay only** |
| 6 | Starting Price | Text input | `startingPrice` | **whereToStay only** |
| 7 | Check-in Time | Dropdown (19 times) | `checkInTime` | **whereToStay only** |
| 8 | Check-out Time | Dropdown (19 times) | `checkOutTime` | **whereToStay only** |
| 9 | Description | Textarea | `description` | Shared |
| 10 | **LOCATION DETAILS** | *Sub-header* | — | Shared (not thingsToDo) |
| 10a | → Latitude | Number input | `location.coordinates.latitude` | ↑ |
| 10b | → Longitude | Number input | `location.coordinates.longitude` | ↑ |
| 10c | → Google Maps URL | Text input | `location.mapUrl` | ↑ |
| 11 | Amenities | Toggle chip buttons | `amenities[]` | Shared |
| 12 | 🔘 Manage Rooms | Navigation button | — | **whereToStay only** |
| 13 | **CONTACT & BOOKING DETAILS** | *Sub-header* | — | **whereToStay only** |
| 13a | → Contact Number | Text input | `contactNumber` | ↑ |
| 13b | → Contact Email | Text input | `contactEmail` | ↑ |
| 13c | → Facebook / Booking Link | Text input | `facebookLink` | ↑ |
| 14 | Photo Gallery | Multi-image upload | `photos[]` | Shared |

---

## Notes

- **Price Range** field label changes per category: *Entrance Fee* (placesToVisit), *Expected Cost* (thingsToDo), *Price Range* (whereToEat, whereToStay)
- **Price Range** input type changes: text input for placesToVisit/thingsToDo, dropdown for whereToEat/whereToStay
- **whereToStay dropdown** excludes "Free" option but adds "₱₱₱₱ (Luxury)"
- **Amenities** use category-specific option sets via `CATEGORY_AMENITIES[sectionKey]`
- **Contact Details** sub-header label varies: "Contact Details" (placesToVisit, whereToEat) vs "Contact & Booking Details" (whereToStay)
