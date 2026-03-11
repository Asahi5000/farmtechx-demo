import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where,
  Timestamp,
  getCountFromServer,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { 
  IslandGroup, 
  Region, 
  Province, 
  Municipality, 
  PopularDestination,
  FeaturedAttraction 
} from '@/types';

// Collection names
export const COLLECTIONS = {
  ISLAND_GROUPS: 'islandGroups',
  REGIONS: 'regions',
  PROVINCES: 'provinces',
  MUNICIPALITIES: 'municipalities',
  POPULAR_DESTINATIONS: 'popularDestinations',
  REVIEWS: 'reviews',
};

// Helper function to upload image
export async function uploadImage(file: File, folder: string): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${folder}/${timestamp}_${file.name}`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// Helper function to delete image
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}

// Island Groups CRUD
export const islandGroupsService = {
  async getAll(): Promise<IslandGroup[]> {
    const q = query(collection(db, COLLECTIONS.ISLAND_GROUPS), orderBy('createdAt'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IslandGroup));
  },

  async create(data: Omit<IslandGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.ISLAND_GROUPS), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<IslandGroup>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ISLAND_GROUPS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ISLAND_GROUPS, id);
    await deleteDoc(docRef);
  },
};

// Regions CRUD
export const regionsService = {
  async getAll(): Promise<Region[]> {
    const q = query(collection(db, COLLECTIONS.REGIONS), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region));
  },

  async getByIslandGroup(islandGroupId: string): Promise<Region[]> {
    const q = query(
      collection(db, COLLECTIONS.REGIONS),
      where('islandGroupId', '==', islandGroupId),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region));
  },

  async create(data: Omit<Region, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.REGIONS), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<Region>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.REGIONS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.REGIONS, id);
    await deleteDoc(docRef);
  },
};

// Provinces CRUD
export const provincesService = {
  async getAll(): Promise<Province[]> {
    const q = query(collection(db, COLLECTIONS.PROVINCES), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Province));
  },

  async getByRegion(regionId: string): Promise<Province[]> {
    const q = query(
      collection(db, COLLECTIONS.PROVINCES),
      where('regionId', '==', regionId),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Province));
  },

  async create(data: Omit<Province, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PROVINCES), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<Province>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PROVINCES, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PROVINCES, id);
    await deleteDoc(docRef);
  },
};

// Municipalities CRUD
export const municipalitiesService = {
  async getAll(): Promise<Municipality[]> {
    const q = query(collection(db, COLLECTIONS.MUNICIPALITIES), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Municipality));
  },

  async getById(id: string): Promise<Municipality | null> {
    const docRef = doc(db, COLLECTIONS.MUNICIPALITIES, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Municipality;
    }
    return null;
  },

  async getByProvince(provinceId: string): Promise<Municipality[]> {
    const q = query(
      collection(db, COLLECTIONS.MUNICIPALITIES),
      where('provinceId', '==', provinceId)
    );
    const snapshot = await getDocs(q);
    const munis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Municipality));
    return munis.sort((a, b) => a.name.localeCompare(b.name));
  },

  async create(data: Omit<Municipality, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.MUNICIPALITIES), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<Municipality>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.MUNICIPALITIES, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.MUNICIPALITIES, id);
    await deleteDoc(docRef);
  },
};

// Popular Destinations CRUD (legacy)
export const popularDestinationsService = {
  async getAll(): Promise<PopularDestination[]> {
    const q = query(collection(db, COLLECTIONS.POPULAR_DESTINATIONS), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PopularDestination));
  },

  async create(data: Omit<PopularDestination, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.POPULAR_DESTINATIONS), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<PopularDestination>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.POPULAR_DESTINATIONS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.POPULAR_DESTINATIONS, id);
    await deleteDoc(docRef);
  },
};

// Featured Attractions CRUD (new - ContentItem-based)
const FEATURED_ATTRACTIONS_COLLECTION = 'featuredAttractions';
export const featuredAttractionsService = {
  async getAll(): Promise<FeaturedAttraction[]> {
    const q = query(collection(db, FEATURED_ATTRACTIONS_COLLECTION), orderBy('featuredOrder'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedAttraction));
  },

  async create(data: Omit<FeaturedAttraction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, FEATURED_ATTRACTIONS_COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<FeaturedAttraction>): Promise<void> {
    const docRef = doc(db, FEATURED_ATTRACTIONS_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, FEATURED_ATTRACTIONS_COLLECTION, id);
    await deleteDoc(docRef);
  },
};

// Featured Provinces CRUD (admin-ranked homepage section)
const FEATURED_PROVINCES_COLLECTION = 'featuredProvinces';

export interface FeaturedProvince {
  id: string;
  provinceId: string;
  provinceName: string;
  tagline: string;
  image: string;
  featuredOrder: number;
  createdAt?: any;
  updatedAt?: any;
}

export const featuredProvincesService = {
  async getAll(): Promise<FeaturedProvince[]> {
    const q = query(collection(db, FEATURED_PROVINCES_COLLECTION), orderBy('featuredOrder'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedProvince));
  },

  async create(data: Omit<FeaturedProvince, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, FEATURED_PROVINCES_COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<FeaturedProvince>): Promise<void> {
    const docRef = doc(db, FEATURED_PROVINCES_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, FEATURED_PROVINCES_COLLECTION, id);
    await deleteDoc(docRef);
  },
};

// Top Experiences CRUD (admin-ranked homepage section)
const TOP_EXPERIENCES_COLLECTION = 'topExperiences';

export interface TopExperience {
  id: string;
  name: string;
  icon: string;
  color: string;
  image: string;
  featuredOrder: number;
  createdAt?: any;
  updatedAt?: any;
}

export const topExperiencesService = {
  async getAll(): Promise<TopExperience[]> {
    const q = query(collection(db, TOP_EXPERIENCES_COLLECTION), orderBy('featuredOrder'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopExperience));
  },

  async create(data: Omit<TopExperience, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, TOP_EXPERIENCES_COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<TopExperience>): Promise<void> {
    const docRef = doc(db, TOP_EXPERIENCES_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, TOP_EXPERIENCES_COLLECTION, id);
    await deleteDoc(docRef);
  },
};

// Dashboard Metrics
export const dashboardService = {
  async getMetrics() {
    const [
      islandGroups,
      regions,
      provinces,
      municipalities,
      reviews,
      destinations
    ] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.ISLAND_GROUPS)),
      getDocs(collection(db, COLLECTIONS.REGIONS)),
      getDocs(collection(db, COLLECTIONS.PROVINCES)),
      getDocs(collection(db, COLLECTIONS.MUNICIPALITIES)),
      getDocs(collection(db, COLLECTIONS.REVIEWS)),
      getDocs(collection(db, COLLECTIONS.POPULAR_DESTINATIONS))
    ]);

    const activeMunicipalities = municipalities.docs.filter(d => d.data().status === 'enabled').length;
    
    // Count total photos from reviews
    let userPhotosCount = 0;
    const recentPhotos: Array<{ url: string; userName: string; createdAt: Timestamp }> = [];
    
    reviews.docs.forEach(doc => {
      const data = doc.data();
      if (data.photos && Array.isArray(data.photos)) {
        userPhotosCount += data.photos.length;
        data.photos.forEach((url: string) => {
          recentPhotos.push({
            url,
            userName: data.userName || 'Anonymous',
            createdAt: data.createdAt
          });
        });
      }
    });

    // Sort photos by date
    recentPhotos.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    return {
      islandGroups: islandGroups.size,
      regions: regions.size,
      provinces: provinces.size,
      municipalities: municipalities.size,
      activeMunicipalities,
      popularDestinations: destinations.size,
      reviews: reviews.size,
      userPhotos: userPhotosCount,
      recentPhotos: recentPhotos.slice(0, 12)
    };
  }
};
