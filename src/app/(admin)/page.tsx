"use client";
import React, { useEffect, useState } from "react";
import { 
  getCountFromServer, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs 
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { COLLECTIONS, municipalitiesService, provincesService } from "@/config/firestoreService";
import { Municipality, Province } from "@/types";
import { 
  MapPin, 
  Image as ImageIcon, 
  ListTree, 
  Box, 
  CheckCircle2, 
  Clock, 
  Star, 
  Map, 
  MessageSquare,
  Activity,
  Award
} from "lucide-react";

// Helper for top-rated
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

export default function DashboardHome() {
  const [stats, setStats] = useState({
    islandGroups: 0,
    regions: 0,
    provinces: 0,
    municipalities: 0,
    enabled: 0,
    comingSoon: 0,
    reviews: 0,
    featured: 0
  });

  const [recentActivity, setRecentActivity] = useState<Municipality[]>([]);
  const [votingProvinces, setVotingProvinces] = useState<Province[]>([]);
  const [topRated, setTopRated] = useState<(Municipality & { computedRating: number })[]>([]);
  const [loading, setLoading] = useState(true);

  // For live countdown
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const colIsland = collection(db, COLLECTIONS.ISLAND_GROUPS);
        const colRegion = collection(db, COLLECTIONS.REGIONS);
        const colProv = collection(db, COLLECTIONS.PROVINCES);
        const colMuni = collection(db, COLLECTIONS.MUNICIPALITIES);
        const colReviews = collection(db, COLLECTIONS.REVIEWS);

        // Fetch Stats
        const [
          islandSnap, regionSnap, provSnap, muniSnap, reviewsSnap,
          enabledSnap, comingSoonSnap, featuredSnap
        ] = await Promise.all([
          getCountFromServer(colIsland),
          getCountFromServer(colRegion),
          getCountFromServer(colProv),
          getCountFromServer(colMuni),
          getCountFromServer(colReviews),
          getCountFromServer(query(colMuni, where('status', '==', 'enabled'))),
          getCountFromServer(query(colMuni, where('status', '==', 'coming_soon'))),
          getCountFromServer(query(colMuni, where('isFeatured', '==', true)))
        ]);

        setStats({
          islandGroups: islandSnap.data().count,
          regions: regionSnap.data().count,
          provinces: provSnap.data().count,
          municipalities: muniSnap.data().count,
          enabled: enabledSnap.data().count,
          comingSoon: comingSoonSnap.data().count,
          reviews: reviewsSnap.data().count,
          featured: featuredSnap.data().count
        });

        // Recent Activity
        const recentQ = query(colMuni, orderBy('updatedAt', 'desc'), limit(5));
        const recentSnap = await getDocs(recentQ);
        setRecentActivity(recentSnap.docs.map(d => ({ id: d.id, ...d.data() } as Municipality)));

        // All Munis for top rated
        const allMunisRaw = await municipalitiesService.getAll();
        
        // Deduplicate munis safely
        const uniqueMuniIds = new Set<string>();
        const uniqueMunis = allMunisRaw.filter(m => {
          if (uniqueMuniIds.has(m.id)) return false;
          uniqueMuniIds.add(m.id);
          return true;
        });

        const ratedMunis = uniqueMunis.map(m => ({
          ...m,
          computedRating: computeMunicipalityRating(m)
        })).filter(m => m.computedRating !== null) as (Municipality & { computedRating: number })[];
        
        ratedMunis.sort((a, b) => b.computedRating - a.computedRating);
        setTopRated(ratedMunis.slice(0, 5));

        // Voting Provinces
        const allProvs = await provincesService.getAll();
        const activeVoting = allProvs.filter(p => {
          if (!p.votingStartDate || !p.votingEndDate) return false;
          const start = new Date(p.votingStartDate as any);
          const end = new Date(p.votingEndDate as any);
          return now >= start && now <= end;
        });
        setVotingProvinces(activeVoting);

      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
    // Intentionally run once on mount. 'now' is updating every second but we don't refetch Firestore
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDistance = (end: Date) => {
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    return `${days}d ${hours}h ${mins}m ${secs}s`;
  };

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome to the LayasPinas Content Management System</p>
        </div>
      </div>

      {/* Grid 1: Database Size */}
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-2">Database Architecture</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Island Groups" value={stats.islandGroups} icon={MapPin} color="bg-blue-50 text-blue-600" />
        <StatCard title="Regions" value={stats.regions} icon={Map} color="bg-cyan-50 text-cyan-600" />
        <StatCard title="Provinces" value={stats.provinces} icon={ListTree} color="bg-amber-50 text-amber-600" />
        <StatCard title="Municipalities" value={stats.municipalities} icon={Box} color="bg-violet-50 text-violet-600" />
      </div>

      {/* Grid 2: Operational Metrics */}
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-8">Operational Metrics</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Enabled" value={stats.enabled} icon={CheckCircle2} color="bg-green-50 text-green-600" />
        <StatCard title="Coming Soon" value={stats.comingSoon} icon={Clock} color="bg-orange-50 text-orange-600" />
        <StatCard title="User Reviews" value={stats.reviews} icon={MessageSquare} color="bg-pink-50 text-pink-600" />
        <StatCard title="Featured Places" value={stats.featured} icon={Star} color="bg-yellow-50 text-yellow-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Updates</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentActivity.map(m => (
              <div key={m.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 overflow-hidden border border-gray-200 dark:border-gray-600">
                  {m.image ? (
                    <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                  ) : <ImageIcon className="w-4 h-4 m-3 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.provinceName}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium mb-1 ${
                    m.status === 'enabled' ? 'bg-green-100 text-green-700' :
                    m.status === 'coming_soon' ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {m.status === 'enabled' ? 'Active' : m.status === 'coming_soon' ? 'Soon' : 'Disabled'}
                  </span>
                  <p className="text-[10px] text-gray-400">{timeAgo(m.updatedAt?.toDate() || new Date())}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Voting & Top Rated Container */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Active Voting */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Active Voting</h3>
            </div>
            {votingProvinces.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No live voting periods right now.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                {votingProvinces.map(p => (
                  <div key={p.id} className="p-4 rounded-xl border border-orange-100 bg-orange-50 dark:bg-gray-900/50 dark:border-orange-500/20">
                    <h4 className="font-bold text-orange-800 dark:text-orange-400">{p.name}</h4>
                    <div className="mt-2 font-mono text-xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">
                      {formatDistance(new Date(p.votingEndDate as any))}
                    </div>
                    <p className="text-xs text-orange-600/80 dark:text-orange-500/60 mt-1 uppercase tracking-wider font-semibold">Ends Soon</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Rated Destinations */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex-1">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Highest Rated Destinations</h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {topRated.length === 0 ? (
                <div className="col-span-full py-8 text-center text-gray-500 text-sm">No fully rated destinations yet.</div>
              ) : (
                topRated.map((m, i) => (
                  <div key={m.id} className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="absolute top-2 left-2 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-xs font-bold z-10">
                      {i + 1}
                    </div>
                    <div className="absolute top-2 right-2 bg-yellow-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center justify-center text-white text-xs font-bold z-10 gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-white" /> {m.computedRating.toFixed(1)}
                    </div>
                    <div className="h-32 bg-gray-100 dark:bg-gray-800 w-full">
                      {m.image ? (
                        <img src={m.image} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : <ImageIcon className="w-8 h-8 m-auto mt-10 text-gray-300" />}
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 absolute bottom-0 w-full border-t border-gray-100 dark:border-gray-700/50">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{m.name}</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{m.provinceName}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
