import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
  Compass,
  History,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  Search,
  Shuffle,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  AppUser,
  consumeLoginCallback,
  getStoredToken,
  loadCurrentUser,
  logoutFromServer,
  redirectToWechatLogin,
} from './services/authApi';
import {
  PRESET_THEMES,
  WalkTheme,
  generateAITheme,
  generateCombinedTheme,
  generateDynamicPreset,
  MapPOI,
  getLocationContext,
  searchLocationContext,
} from './services/themeService';
import { createWalk, fetchPublicWalks, WalkItem } from './services/walkApi';
import { submitTheme } from './services/themeCommunityApi';
import { fetchNearbyPois, searchLocations } from './services/mapApi';

type SearchLocation = {
  name: string;
  lat: number;
  lng: number;
};

type PathPoint = {
  lat: number;
  lng: number;
  timestamp: number;
};

const RANDOM_CATEGORIES = ['形状漫步', '颜色漫步', '声音漫步', '街区漫步', '质感漫步'];
const COMBINE_CATEGORIES = ['形状漫步', '颜色漫步', '声音漫步', '街区漫步', '自然漫步'];
const DEFAULT_CENTER: [number, number] = [31.2304, 121.4737];
const DEFAULT_POI_ICON = new L.Icon.Default();
const ACTIVE_POI_ICON = L.divIcon({
  className: 'selected-poi-marker',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#f59e0b;border:3px solid white;box-shadow:0 4px 12px rgba(15,23,42,0.28);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapViewUpdater(props: { center: [number, number] }) {
  const { center } = props;
  const map = useMap();

  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);

  return null;
}

function MapClickSelector(props: { onSelect: (lat: number, lng: number) => void }) {
  const { onSelect } = props;

  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function calculatePathDistance(points: PathPoint[]) {
  if (points.length < 2) {
    return 0;
  }

  let totalMeters = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalMeters += L.latLng(points[index - 1].lat, points[index - 1].lng).distanceTo(
      L.latLng(points[index].lat, points[index].lng),
    );
  }

  return totalMeters;
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<'explore' | 'community'>('explore');
  const [currentTheme, setCurrentTheme] = useState<WalkTheme | null>(PRESET_THEMES[0]);
  const [history, setHistory] = useState<WalkTheme[]>([]);
  const [communityWalks, setCommunityWalks] = useState<WalkItem[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mood, setMood] = useState('好奇');
  const [weather, setWeather] = useState('晴朗');
  const [season, setSeason] = useState('春季');
  const [preference, setPreference] = useState('城市生活');
  const [walkMode, setWalkMode] = useState<'pure' | 'advanced'>('pure');
  const [locationContext, setLocationContext] = useState('城市街道');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchResults, setSearchResults] = useState<SearchLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SearchLocation | null>(null);
  const [selectedThemesForCombine, setSelectedThemesForCombine] = useState<string[]>([]);
  const [nearbyPois, setNearbyPois] = useState<MapPOI[]>([]);
  const [selectedPoiKey, setSelectedPoiKey] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [path, setPath] = useState<PathPoint[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [showCreateTheme, setShowCreateTheme] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const callbackPayload = consumeLoginCallback();
    const token = callbackPayload?.token || getStoredToken();
    if (!token) {
      return;
    }

    loadCurrentUser()
      .then(setUser)
      .catch((error) => {
        console.error('Error loading current user:', error);
        setUser(null);
      });
  }, []);

  useEffect(() => {
    if (activeTab !== 'community') {
      return;
    }

    setIsLoadingCommunity(true);
    fetchPublicWalks()
      .then(setCommunityWalks)
      .catch((error) => {
        console.error('Error fetching community walks:', error);
      })
      .finally(() => {
        setIsLoadingCommunity(false);
      });
  }, [activeTab]);

  useEffect(() => {
    if (!isTracking || !navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setPath((prev) => [
          ...prev,
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now(),
          },
        ]);
      },
      (error) => {
        console.error('Track location error:', error);
      },
      { enableHighAccuracy: true },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking]);

  useEffect(() => {
    if (!selectedLocation) {
      setNearbyPois([]);
      setSelectedPoiKey(null);
      return;
    }

    fetchNearbyPois(selectedLocation.lat, selectedLocation.lng)
      .then(setNearbyPois)
      .catch((error) => {
        console.error('Fetch nearby POIs error:', error);
        setNearbyPois([]);
      });
  }, [selectedLocation]);

  const currentLocationName = useMemo(
    () => selectedLocation?.name || searchLocation || '当前位置',
    [searchLocation, selectedLocation],
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedLocation) {
      return [selectedLocation.lat, selectedLocation.lng];
    }
    if (path.length > 0) {
      const lastPoint = path[path.length - 1];
      return [lastPoint.lat, lastPoint.lng];
    }
    return DEFAULT_CENTER;
  }, [path, selectedLocation]);

  const pathCoordinates = useMemo(() => path.map((point) => [point.lat, point.lng] as [number, number]), [path]);
  const pathDistanceKm = useMemo(() => calculatePathDistance(path) / 1000, [path]);

  const pushThemeHistory = (theme: WalkTheme) => {
    setCurrentTheme(theme);
    setHistory((prev) => [theme, ...prev].slice(0, 10));
  };

  const resolveBrowserLocation = async () => {
    if (!navigator.geolocation) {
      throw new Error('当前浏览器不支持定位。');
    }

    const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
      });
    });

    const lat = coords.coords.latitude;
    const lng = coords.coords.longitude;
    const context = await getLocationContext(lat, lng);

    setLocationContext(context);
    setSelectedLocation({
      name: '当前位置',
      lat,
      lng,
    });
    setSearchLocation('当前位置');
    setSearchResults([]);

    return {
      locationName: '当前位置',
      locationContextText: context,
    };
  };

  const resolveCurrentContext = async (): Promise<{ locationName: string; locationContextText: string }> => {
    if (selectedLocation) {
      return {
        locationName: selectedLocation.name,
        locationContextText: locationContext,
      };
    }

    if (searchLocation.trim()) {
      return {
        locationName: searchLocation.trim(),
        locationContextText: locationContext,
      };
    }

    try {
      return await resolveBrowserLocation();
    } catch (error) {
      console.error('Get current geolocation error:', error);
    }

    return {
      locationName: '当前位置',
      locationContextText: locationContext,
    };
  };

  const handleSearchLocation = (query: string) => {
    setSearchLocation(query);
    setSelectedLocation(null);

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const data = await searchLocations(query);
        setSearchResults(data);
      } catch (error) {
        console.error('Search location error:', error);
      }
    }, 400);
  };

  const handleSubmitSearch = async () => {
    const keyword = searchLocation.trim();
    if (!keyword) {
      return;
    }

    setIsGenerating(true);
    try {
      const results = await searchLocations(keyword);
      setSearchResults(results);
      if (results.length > 0) {
        await handleSelectLocation(results[0]);
      } else {
        alert('没有找到匹配的地点，请换个关键词试试。');
      }
    } catch (error) {
      console.error('Submit search error:', error);
      alert('地点搜索失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectLocation = async (location: SearchLocation) => {
    setSelectedLocation(location);
    setSelectedPoiKey(null);
    setSearchLocation(location.name);
    setSearchResults([]);
    setIsGenerating(true);
    try {
      const context = await getLocationContext(location.lat, location.lng);
      setLocationContext(context);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsGenerating(true);
    try {
      await resolveBrowserLocation();
    } catch (error) {
      console.error('Use current location error:', error);
      alert('获取当前位置失败，请检查浏览器定位权限。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectMapPoint = async (lat: number, lng: number) => {
    setIsGenerating(true);
    try {
      const context = await getLocationContext(lat, lng);
      const locationName = `地图选点 (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setSelectedLocation({ name: locationName, lat, lng });
      setSelectedPoiKey(null);
      setSearchLocation(locationName);
      setSearchResults([]);
      setLocationContext(context);
    } catch (error) {
      console.error('Select map point error:', error);
      alert('地图选点失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPoi = async (poi: MapPOI) => {
    if (typeof poi.lat !== 'number' || typeof poi.lng !== 'number') {
      return;
    }

    setIsGenerating(true);
    try {
      const [geoContext, nameContext] = await Promise.all([
        getLocationContext(poi.lat, poi.lng),
        searchLocationContext(poi.title),
      ]);
      const mergedContext = nameContext && nameContext !== poi.title ? nameContext : geoContext;
      const poiKey = `${poi.title}-${poi.lat}-${poi.lng}`;
      setSelectedLocation({
        name: poi.title,
        lat: poi.lat,
        lng: poi.lng,
      });
      setSelectedPoiKey(poiKey);
      setSearchLocation(poi.title);
      setSearchResults([]);
      setLocationContext(mergedContext);
    } catch (error) {
      console.error('Select POI error:', error);
      alert('切换到该 POI 失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRandomTheme = async () => {
    setIsGenerating(true);
    try {
      const { locationName, locationContextText } = await resolveCurrentContext();
      const category = RANDOM_CATEGORIES[Math.floor(Math.random() * RANDOM_CATEGORIES.length)];
      const theme = await generateDynamicPreset(category, locationName, locationContextText, walkMode);
      pushThemeHistory(theme);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAiTheme = async () => {
    setIsGenerating(true);
    try {
      const { locationName, locationContextText } = await resolveCurrentContext();
      const theme = await generateAITheme(
        mood,
        weather,
        season,
        preference,
        locationName,
        locationContextText,
        walkMode,
      );
      pushThemeHistory(theme);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCombineThemes = async () => {
    if (selectedThemesForCombine.length < 2) {
      alert('请至少选择两个主题方向。');
      return;
    }

    setIsGenerating(true);
    try {
      const { locationName, locationContextText } = await resolveCurrentContext();
      const theme = await generateCombinedTheme(selectedThemesForCombine, locationName, locationContextText, walkMode);
      pushThemeHistory(theme);
      setSelectedThemesForCombine([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await redirectToWechatLogin();
    } catch (error) {
      console.error('Auth error:', error);
      alert('登录失败，请稍后重试。');
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutFromServer();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const handleSaveWalk = async () => {
    if (!user) {
      alert('请先登录后再保存记录。');
      return;
    }

    if (!currentTheme) {
      alert('请先生成一个主题。');
      return;
    }

    setIsSaving(true);
    try {
      await createWalk({
        themeTitle: currentTheme.title,
        themeCategory: currentTheme.category,
        locationName: currentLocationName,
        recordUnit: 'location',
        isPublic,
        noteText,
        path,
        completedMissions: [],
      });
      alert('漫步记录已保存。');
      setNoteText('');
      setPath([]);
      setIsTracking(false);
    } catch (error) {
      console.error('Save walk error:', error);
      alert('保存漫步记录失败，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitTheme = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const missions = ['m1', 'm2', 'm3']
      .map((key) => String(formData.get(key) || '').trim())
      .filter(Boolean);

    try {
      await submitTheme({ title, description, category, missions });
      alert('主题已提交，等待审核。');
      setShowCreateTheme(false);
    } catch (error) {
      console.error('Submit theme error:', error);
      alert('提交主题失败，请稍后重试。');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,white_42%,#f8fafc)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-6 md:px-8">
        <header className="flex flex-col gap-4 rounded-[32px] border border-amber-100 bg-white/80 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">城市漫步者</h1>
              <p className="text-sm text-slate-500">重新发现城市角落的 City Walk 工具</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full bg-slate-100 p-1">
              <button
                onClick={() => setActiveTab('explore')}
                className={`rounded-full px-4 py-2 text-sm ${activeTab === 'explore' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
              >
                探索
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className={`rounded-full px-4 py-2 text-sm ${activeTab === 'community' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
              >
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  社区
                </span>
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                  <img
                    src={user.avatar || 'https://placehold.co/40x40?text=U'}
                    alt="avatar"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="text-sm">{user.nickname}</span>
                </div>
                <button onClick={handleSignOut} className="rounded-full border border-slate-200 bg-white p-3">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                <LogIn className="h-4 w-4" />
                游客登录
              </button>
            )}
          </div>
        </header>

        {activeTab === 'explore' ? (
          <main className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-6">
              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex rounded-full bg-slate-100 p-1">
                      <button
                        onClick={() => setWalkMode('pure')}
                        className={`rounded-full px-4 py-2 text-sm ${walkMode === 'pure' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                      >
                        纯净模式
                      </button>
                      <button
                        onClick={() => setWalkMode('advanced')}
                        className={`rounded-full px-4 py-2 text-sm ${walkMode === 'advanced' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                      >
                        进阶模式
                      </button>
                    </div>
                    <button
                      onClick={() => setShowCreateTheme((prev) => !prev)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                    >
                      提交自定义主题
                    </button>
                    <button
                      onClick={handleUseCurrentLocation}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                    >
                      使用当前定位
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchLocation}
                      onChange={(event) => handleSearchLocation(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleSubmitSearch();
                        }
                      }}
                      placeholder="搜索地点，例如：上海武康路"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none ring-0"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                        {searchResults.map((location) => (
                          <button
                            key={`${location.lat}-${location.lng}`}
                            onClick={() => handleSelectLocation(location)}
                            className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 last:border-b-0"
                          >
                            {location.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => void handleSubmitSearch()}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                    >
                      搜索并定位
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoSelect label="当前心情" value={mood} onChange={setMood} options={['好奇', '平静', '活力', '怀旧']} />
                    <InfoSelect label="天气" value={weather} onChange={setWeather} options={['晴朗', '多云', '雨天', '大风']} />
                    <InfoSelect label="季节" value={season} onChange={setSeason} options={['春季', '夏季', '秋季', '冬季']} />
                    <InfoSelect label="偏好" value={preference} onChange={setPreference} options={['城市生活', '街区观察', '自然角落', '建筑细节']} />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold">地图与路线</h2>
                    <p className="text-sm text-slate-500">查看当前地点和漫步轨迹</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <div className="rounded-full bg-slate-100 px-3 py-1">轨迹点 {path.length}</div>
                    <div className="rounded-full bg-slate-100 px-3 py-1">距离 {pathDistanceKm.toFixed(2)} km</div>
                    <div className="rounded-full bg-slate-100 px-3 py-1">POI {nearbyPois.length}</div>
                  </div>
                </div>

                <div className="h-[360px]">
                  <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapViewUpdater center={mapCenter} />
                    <MapClickSelector onSelect={(lat, lng) => void handleSelectMapPoint(lat, lng)} />
                    {selectedLocation && (
                      <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
                        <Popup>{selectedLocation.name}</Popup>
                      </Marker>
                    )}
                    {!selectedLocation && pathCoordinates.length > 0 && (
                      <Marker position={pathCoordinates[pathCoordinates.length - 1]}>
                        <Popup>当前轨迹位置</Popup>
                      </Marker>
                    )}
                    {nearbyPois
                      .filter((poi) => typeof poi.lat === 'number' && typeof poi.lng === 'number')
                      .map((poi, index) => (
                        <Marker
                          key={`${poi.title}-${index}`}
                          position={[poi.lat as number, poi.lng as number]}
                          icon={selectedPoiKey === `${poi.title}-${poi.lat}-${poi.lng}` ? ACTIVE_POI_ICON : DEFAULT_POI_ICON}
                        >
                          <Popup>
                            <div className="space-y-1">
                              <div className="font-medium">{poi.title}</div>
                              <button
                                onClick={() => void handleSelectPoi(poi)}
                                className="block text-sm text-amber-700 underline"
                              >
                                设为当前地点
                              </button>
                              <a href={poi.uri} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 underline">
                                查看地图链接
                              </a>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    {pathCoordinates.length > 1 && <Polyline positions={pathCoordinates} pathOptions={{ color: '#f59e0b', weight: 5 }} />}
                  </MapContainer>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="mb-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleUseCurrentLocation}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                    >
                      定位到当前位置
                    </button>
                    <button
                      onClick={() => {
                        setPath([]);
                        setIsTracking(false);
                      }}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                    >
                      清空轨迹
                    </button>
                    <div className="rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-900">
                      点击地图也可以直接选点
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-slate-700">附近可逛点</h3>
                  {nearbyPois.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">选择地点后，这里会显示附近推荐点位。</p>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {nearbyPois.map((poi, index) => (
                        <button
                          key={`${poi.title}-${index}`}
                          onClick={() => void handleSelectPoi(poi)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selectedPoiKey === `${poi.title}-${poi.lat}-${poi.lng}`
                              ? 'border-amber-300 bg-amber-50 shadow-sm'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <div className="font-medium text-slate-800">{poi.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {selectedPoiKey === `${poi.title}-${poi.lat}-${poi.lng}`
                              ? '当前已选中，AI 将围绕这里生成环境和主题'
                              : '点击切换到这里并刷新 AI 地点环境'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Current Theme</p>
                    <h2 className="mt-1 text-2xl font-semibold">{currentTheme?.title || '等待生成主题'}</h2>
                  </div>
                  {isGenerating && <LoaderCircle className="h-5 w-5 animate-spin text-amber-500" />}
                </div>

                <div
                  className="rounded-[28px] p-5 text-white"
                  style={{ background: `linear-gradient(135deg, ${currentTheme?.vibeColor || '#334155'}, #0f172a)` }}
                >
                  <p className="text-sm opacity-85">{currentTheme?.category || '探索'}</p>
                  <p className="mt-3 text-lg leading-8">{currentTheme?.description || '点击按钮生成新的漫步主题。'}</p>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <div className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    当前地点：{currentLocationName}
                  </div>
                  <div className="mt-1 text-slate-600">地点环境：{locationContext}</div>
                </div>

                <div className="mt-5 space-y-3">
                  {(currentTheme?.missions || []).map((mission, index) => (
                    <div key={`${mission}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      {index + 1}. {mission}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={handleGenerateRandomTheme}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    <Shuffle className="h-4 w-4" />
                    随机生成
                  </button>
                  <button
                    onClick={handleGenerateAiTheme}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI 生成
                  </button>
                  <button
                    onClick={() => setIsTracking((prev) => !prev)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                  >
                    {isTracking ? '停止轨迹记录' : '开始轨迹记录'}
                  </button>
                </div>

                <div className="mt-6">
                  <p className="mb-2 text-sm font-medium text-slate-600">组合主题方向</p>
                  <div className="flex flex-wrap gap-2">
                    {COMBINE_CATEGORIES.map((category) => {
                      const selected = selectedThemesForCombine.includes(category);
                      return (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedThemesForCombine((prev) => {
                              if (prev.includes(category)) {
                                return prev.filter((item) => item !== category);
                              }
                              if (prev.length >= 2) {
                                return prev;
                              }
                              return [...prev, category];
                            });
                          }}
                          className={`rounded-full px-4 py-2 text-sm ${selected ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white'}`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleCombineThemes}
                    className="mt-3 rounded-full border border-slate-200 px-4 py-2 text-sm"
                  >
                    组合生成主题
                  </button>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">保存本次漫步</h3>
                  <History className="h-5 w-5 text-slate-400" />
                </div>

                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="写一点这次漫步的感受"
                  className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none"
                />

                <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
                  同时发布到社区
                </label>

                <div className="mt-3 text-sm text-slate-500">当前轨迹点数量：{path.length}</div>

                <button
                  onClick={handleSaveWalk}
                  disabled={isSaving}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  保存漫步记录
                </button>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">最近生成历史</h3>
                <div className="mt-4 space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-500">还没有生成历史。</p>
                  ) : (
                    history.map((theme, index) => (
                      <button
                        key={`${theme.title}-${index}`}
                        onClick={() => setCurrentTheme(theme)}
                        className="block w-full rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <div className="text-sm font-medium">{theme.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{theme.category}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {showCreateTheme && (
                <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold">提交自定义主题</h3>
                  {!user ? (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                      请先登录后再提交主题。
                    </div>
                  ) : (
                    <form className="mt-4 space-y-3" onSubmit={handleSubmitTheme}>
                      <input name="title" required placeholder="主题名称" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                      <textarea name="description" required placeholder="主题描述" className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3" />
                      <select name="category" className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                        <option>视觉</option>
                        <option>感官</option>
                        <option>城市</option>
                        <option>自然</option>
                      </select>
                      <input name="m1" required placeholder="任务 1" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                      <input name="m2" required placeholder="任务 2" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                      <input name="m3" required placeholder="任务 3" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                      <button type="submit" className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-white">
                        提交主题
                      </button>
                    </form>
                  )}
                </div>
              )}
            </aside>
          </main>
        ) : (
          <main className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">社区漫步</h2>
                <p className="text-sm text-slate-500">查看大家公开发布的漫步记录</p>
              </div>
              {isLoadingCommunity && <LoaderCircle className="h-5 w-5 animate-spin text-amber-500" />}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {communityWalks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  暂时还没有社区内容，等你来发布第一条记录。
                </div>
              ) : (
                communityWalks.map((walk) => (
                  <article key={walk.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{walk.themeCategory || '城市'}</div>
                    <h3 className="mt-2 text-lg font-semibold">{walk.themeTitle}</h3>
                    <p className="mt-1 text-sm text-slate-500">{walk.locationName || '未填写地点'}</p>
                    {walk.noteText && <p className="mt-4 text-sm leading-7 text-slate-700">{walk.noteText}</p>}
                    {walk.photoUrl && (
                      <img src={walk.photoUrl} alt={walk.themeTitle} className="mt-4 h-48 w-full rounded-2xl object-cover" />
                    )}
                  </article>
                ))
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function InfoSelect(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const { label, value, options, onChange } = props;

  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-sm outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
