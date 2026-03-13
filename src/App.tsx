/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shuffle, 
  Sparkles, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  Circle, 
  Compass,
  Wind,
  Sun,
  Cloud,
  CloudRain,
  History,
  Info,
  Plus,
  Share2,
  LogIn,
  LogOut,
  Layers,
  X,
  Navigation,
  Save,
  Mic,
  Video,
  FileText,
  StopCircle,
  Trash2,
  Search,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { generateAITheme, generateCombinedTheme, PRESET_THEMES, WalkTheme, fetchNearbyPOIs, generateDynamicPreset, getLocationContext, searchLocationContext } from './services/themeService';
import { auth, db, storage, signIn, logOut, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, setDoc, orderBy, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map Component to handle view updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentTheme, setCurrentTheme] = useState<WalkTheme | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mood, setMood] = useState('好奇');
  const [weather, setWeather] = useState('晴朗');
  const [season, setSeason] = useState('春季');
  const [preference, setPreference] = useState('市井生活');
  const [locationContext, setLocationContext] = useState<string>('城市街道');
  const [searchLocation, setSearchLocation] = useState('');
  const [walkMode, setWalkMode] = useState<'pure' | 'advanced'>('pure');
  const [activeTab, setActiveTab] = useState<'explore' | 'community'>('explore');
  const [recordUnit, setRecordUnit] = useState<'location' | 'event' | 'image'>('image');
  const [completedMissions, setCompletedMissions] = useState<Record<string, boolean>>({});
  const [missionMedia, setMissionMedia] = useState<Record<string, { type: 'photo' | 'video' | 'audio', data: string }>>({});
  const [activeMission, setActiveMission] = useState<string | null>(null);
  const [history, setHistory] = useState<WalkTheme[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [communityWalks, setCommunityWalks] = useState<any[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  
  // New Features State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [selectedThemesForCombine, setSelectedThemesForCombine] = useState<WalkTheme[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [path, setPath] = useState<{lat: number, lng: number, timestamp: number}[]>([]);
  const [pois, setPois] = useState<{title: string, uri: string, lat: number, lng: number}[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [capturedAudio, setCapturedAudio] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Sync user to firestore
        setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          lastLogin: serverTimestamp()
        }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const randomPreset = PRESET_THEMES[Math.floor(Math.random() * PRESET_THEMES.length)];
    setCurrentTheme(randomPreset);
  }, []);

  // Geolocation Tracking & POI Fetching
  useEffect(() => {
    let watchId: number;
    if (isTracking && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const newPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: Date.now()
          };
          setPath(prev => [...prev, newPoint]);

          // Fetch POIs if we don't have any or if we moved significantly (simplified check)
          if (pois.length === 0) {
            try {
              const nearbyPois = await fetchNearbyPOIs(pos.coords.latitude, pos.coords.longitude);
              // Note: Gemini returns titles and URIs. We'd ideally need coordinates.
              // For this demo, we'll mock coordinates near the user for display if not provided.
              const poisWithCoords = nearbyPois.map((p, i) => ({
                ...p,
                lat: pos.coords.latitude + (Math.random() - 0.5) * 0.01,
                lng: pos.coords.longitude + (Math.random() - 0.5) * 0.01
              }));
              setPois(poisWithCoords);
            } catch (err) {
              console.error("POI fetch error:", err);
            }
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking, pois.length]);

  useEffect(() => {
    if (activeTab === 'community') {
      const q = query(collection(db, 'walks'), where('isPublic', '==', true), orderBy('timestamp', 'desc'), limit(20));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const walks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCommunityWalks(walks);
      }, (error) => {
        console.error("Error fetching community walks:", error);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  const handleSearchLocation = async () => {
    if (!searchLocation.trim()) return;
    setIsGenerating(true);
    const context = await searchLocationContext(searchLocation);
    setLocationContext(context);
    setIsGenerating(false);
  };

  const handleRandomTheme = async () => {
    setIsGenerating(true);
    // Get location context if possible
    let context = locationContext;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const newContext = await getLocationContext(pos.coords.latitude, pos.coords.longitude);
        setLocationContext(newContext);
        const categories = ['形状', '色彩', '声音', '质感', '气味'];
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const theme = await generateDynamicPreset(randomCat, newContext, walkMode);
        setCurrentTheme(theme);
        resetWalk();
        setIsGenerating(false);
      });
    } else {
      const categories = ['形状', '色彩', '声音', '质感', '气味'];
      const randomCat = categories[Math.floor(Math.random() * categories.length)];
      const theme = await generateDynamicPreset(randomCat, context, walkMode);
      setCurrentTheme(theme);
      resetWalk();
      setIsGenerating(false);
    }
  };

  const handleAITheme = async () => {
    setIsGenerating(true);
    let context = locationContext;
    if (navigator.geolocation && !searchLocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const newContext = await getLocationContext(pos.coords.latitude, pos.coords.longitude);
        setLocationContext(newContext);
        const theme = await generateAITheme(mood, weather, season, preference, newContext, walkMode);
        setCurrentTheme(theme);
        resetWalk();
        setHistory(prev => [theme, ...prev].slice(0, 10));
        setIsGenerating(false);
      }, async () => {
        const theme = await generateAITheme(mood, weather, season, preference, context, walkMode);
        setCurrentTheme(theme);
        resetWalk();
        setHistory(prev => [theme, ...prev].slice(0, 10));
        setIsGenerating(false);
      });
    } else {
      const theme = await generateAITheme(mood, weather, season, preference, context, walkMode);
      setCurrentTheme(theme);
      resetWalk();
      setHistory(prev => [theme, ...prev].slice(0, 10));
      setIsGenerating(false);
    }
  };

  const handleCombineThemes = async () => {
    if (selectedThemesForCombine.length < 2) return;
    setIsGenerating(true);
    setShowCombineModal(false);
    const theme = await generateCombinedTheme(selectedThemesForCombine, locationContext, walkMode);
    setCurrentTheme(theme);
    resetWalk();
    setIsGenerating(false);
    setSelectedThemesForCombine([]);
  };

  const resetWalk = () => {
    setCompletedMissions({});
    setMissionMedia({});
    setActiveMission(null);
    setPath([]);
    setIsTracking(false);
    setCapturedPhoto(null);
    setCapturedVideo(null);
    setCapturedAudio(null);
    setNoteText('');
  };

  const toggleMission = (mission: string) => {
    setActiveMission(mission);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        if (activeMission) {
          setMissionMedia(prev => ({ ...prev, [activeMission]: { type: 'photo', data: dataUrl } }));
          setCompletedMissions(prev => ({ ...prev, [activeMission]: true }));
          setActiveMission(null);
        } else {
          setCapturedPhoto(dataUrl);
        }
        stopMediaStream();
      }
    }
  };

  const stopMediaStream = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          if (activeMission) {
            setMissionMedia(prev => ({ ...prev, [activeMission]: { type: 'video', data: dataUrl } }));
            setCompletedMissions(prev => ({ ...prev, [activeMission]: true }));
            setActiveMission(null);
          } else {
            setCapturedVideo(dataUrl);
          }
        };
        reader.readAsDataURL(blob);
        stopMediaStream();
      };
      mediaRecorder.start();
      setIsRecordingVideo(true);
    } catch (err) {
      console.error("Video recording error:", err);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecordingVideo) {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          if (activeMission) {
            setMissionMedia(prev => ({ ...prev, [activeMission]: { type: 'audio', data: dataUrl } }));
            setCompletedMissions(prev => ({ ...prev, [activeMission]: true }));
            setActiveMission(null);
          } else {
            setCapturedAudio(dataUrl);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.error("Audio recording error:", err);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const saveWalk = async () => {
    if (!user || !currentTheme) return;
    setIsUploading(true);
    try {
      let photoUrl = '';
      let videoUrl = '';
      let audioUrl = '';

      if (capturedPhoto) {
        const storageRef = ref(storage, `walks/${user.uid}/${Date.now()}_photo.jpg`);
        await uploadString(storageRef, capturedPhoto, 'data_url');
        photoUrl = await getDownloadURL(storageRef);
      }

      if (capturedVideo) {
        const storageRef = ref(storage, `walks/${user.uid}/${Date.now()}_video.webm`);
        await uploadString(storageRef, capturedVideo, 'data_url');
        videoUrl = await getDownloadURL(storageRef);
      }

      if (capturedAudio) {
        const storageRef = ref(storage, `walks/${user.uid}/${Date.now()}_audio.webm`);
        await uploadString(storageRef, capturedAudio, 'data_url');
        audioUrl = await getDownloadURL(storageRef);
      }

      const uploadedMissions = await Promise.all(
        Object.entries(missionMedia).map(async ([mission, media]: [string, any]) => {
          const storageRef = ref(storage, `walks/${user.uid}/${Date.now()}_mission_${Math.random().toString(36).substring(7)}.${media.type === 'photo' ? 'jpg' : 'webm'}`);
          await uploadString(storageRef, media.data, 'data_url');
          const url = await getDownloadURL(storageRef);
          return { mission, mediaUrl: url, mediaType: media.type };
        })
      );

      await addDoc(collection(db, 'walks'), {
        userId: user.uid,
        themeTitle: currentTheme.title,
        photoUrl,
        videoUrl,
        audioUrl,
        noteText,
        recordUnit,
        isPublic,
        locationName: locationContext,
        path,
        completedMissions: uploadedMissions,
        timestamp: serverTimestamp()
      });
      alert("漫步记录已保存到您的足迹！");
      resetWalk();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'walks');
    } finally {
      setIsUploading(false);
    }
  };

  const shareTheme = () => {
    if (!currentTheme) return;
    const text = `我正在进行一场 City Walk：${currentTheme.title}！快来加入我：${window.location.href}`;
    if (navigator.share) {
      navigator.share({ title: '城市漫步者', text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      alert("链接已复制到剪贴板！");
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        alert("登录窗口被浏览器拦截。请允许此网站的弹出窗口并重试。");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, no need to alert
      } else {
        console.error("Auth error:", error);
        alert("登录时发生错误。请重试。");
      }
    }
  };

  const weatherIcons = {
    '晴朗': <Sun className="w-4 h-4" />,
    '多云': <Cloud className="w-4 h-4" />,
    '雨天': <CloudRain className="w-4 h-4" />,
    '大风': <Wind className="w-4 h-4" />
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 md:p-12 max-w-4xl mx-auto">
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Compass className="w-6 h-6 text-brand-500" />
          <h1 className="serif text-2xl font-semibold tracking-tight hidden sm:block">城市漫步者</h1>
        </div>
        
        <div className="flex items-center bg-brand-100 p-1 rounded-full">
          <button 
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'explore' ? 'bg-white shadow-sm text-brand-900' : 'text-brand-900/60 hover:text-brand-900'}`}
          >
            探索
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${activeTab === 'community' ? 'bg-white shadow-sm text-brand-900' : 'text-brand-900/60 hover:text-brand-900'}`}
          >
            <Users className="w-4 h-4" /> 社区
          </button>
        </div>

        <div className="flex gap-4 items-center">
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-brand-200" alt="avatar" />
              <button onClick={logOut} className="p-2 rounded-full hover:bg-brand-200 transition-colors" title="退出登录">
                <LogOut className="w-5 h-5 opacity-60" />
              </button>
            </div>
          ) : (
            <button onClick={handleSignIn} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-full text-sm font-medium">
              <LogIn className="w-4 h-4" />
              登录
            </button>
          )}
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-full hover:bg-brand-200 transition-colors"
            title="历史记录"
          >
            <History className="w-5 h-5 opacity-60" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex-1 flex flex-col items-center gap-8">
        
        {activeTab === 'explore' && (
          <>
            {/* Controls */}
            <div className="w-full bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-brand-200 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center bg-brand-100 p-1 rounded-full">
                  <button 
                    onClick={() => setWalkMode('pure')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${walkMode === 'pure' ? 'bg-white shadow-sm text-brand-900' : 'text-brand-900/60 hover:text-brand-900'}`}
                  >
                    纯粹模式
                  </button>
                  <button 
                    onClick={() => setWalkMode('advanced')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${walkMode === 'advanced' ? 'bg-white shadow-sm text-brand-900' : 'text-brand-900/60 hover:text-brand-900'}`}
                  >
                    进阶模式
                  </button>
                </div>
                <div className="text-xs opacity-60 hidden md:block">
                  {walkMode === 'pure' ? '自由探索，单一维度' : '复杂任务，元素组合'}
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <input 
                    type="text" 
                    placeholder="搜索探索区域 (默认当前位置)" 
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white rounded-full border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <button onClick={handleSearchLocation} className="px-4 py-2 bg-brand-500 text-white rounded-full text-sm font-medium hover:bg-brand-600 transition-colors">
                  定位
                </button>
              </div>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-brand-200 flex flex-col gap-3">
            <label className="text-[10px] uppercase tracking-widest font-semibold opacity-50">当前心情</label>
            <div className="flex flex-wrap gap-2">
              {['好奇', '平静', '活力', '怀旧'].map(m => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${mood === m ? 'bg-brand-500 text-white' : 'bg-brand-200/50 hover:bg-brand-200'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-brand-200 flex flex-col gap-3">
            <label className="text-[10px] uppercase tracking-widest font-semibold opacity-50">天气环境</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(weatherIcons) as Array<keyof typeof weatherIcons>).map(w => (
                <button
                  key={w}
                  onClick={() => setWeather(w)}
                  className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-2 transition-all ${weather === w ? 'bg-brand-500 text-white' : 'bg-brand-200/50 hover:bg-brand-200'}`}
                >
                  {weatherIcons[w]}
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-brand-200 flex flex-col gap-3">
            <label className="text-[10px] uppercase tracking-widest font-semibold opacity-50">季节选择</label>
            <div className="flex flex-wrap gap-2">
              {['春季', '夏季', '秋季', '冬季'].map(s => (
                <button
                  key={s}
                  onClick={() => setSeason(s)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${season === s ? 'bg-brand-500 text-white' : 'bg-brand-200/50 hover:bg-brand-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-brand-200 flex flex-col gap-3">
            <label className="text-[10px] uppercase tracking-widest font-semibold opacity-50">散步偏好</label>
            <div className="flex flex-wrap gap-2">
              {['人文历史', '自然景观', '市井生活'].map(p => (
                <button
                  key={p}
                  onClick={() => setPreference(p)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${preference === p ? 'bg-brand-500 text-white' : 'bg-brand-200/50 hover:bg-brand-200'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Theme Card */}
        <div className="relative w-full aspect-[4/5] md:aspect-[16/9] max-h-[500px]">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-0 bg-white rounded-[40px] shadow-xl flex flex-col items-center justify-center gap-4 border border-brand-200"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Compass className="w-12 h-12 text-brand-500 opacity-20" />
                </motion.div>
                <p className="serif italic opacity-40">正在为您规划路径...</p>
              </motion.div>
            ) : currentTheme && (
              <motion.div
                key={currentTheme.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 bg-white rounded-[40px] shadow-xl overflow-hidden border border-brand-200 flex flex-col md:flex-row"
              >
                {/* Visual Side / Map */}
                <div 
                  className="w-full md:w-1/2 h-48 md:h-full relative overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: `${currentTheme.vibeColor}15` }}
                >
                  {isTracking && path.length > 0 ? (
                    <MapContainer 
                      center={[path[path.length-1].lat, path[path.length-1].lng]} 
                      zoom={15} 
                      className="w-full h-full z-0"
                      zoomControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapUpdater center={[path[path.length-1].lat, path[path.length-1].lng]} />
                      <Polyline positions={path.map(p => [p.lat, p.lng])} color={currentTheme.vibeColor} />
                      <Marker position={[path[path.length-1].lat, path[path.length-1].lng]}>
                        <Popup>您的当前位置</Popup>
                      </Marker>
                      {pois.map((poi, idx) => (
                        <Marker key={idx} position={[poi.lat, poi.lng]}>
                          <Popup>
                            <div className="p-1">
                              <h4 className="font-bold text-sm">{poi.title}</h4>
                              <a href={poi.uri} target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline">查看详情</a>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px', color: currentTheme.vibeColor }}></div>
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="serif text-8xl md:text-[12rem] font-bold opacity-10 select-none"
                        style={{ color: currentTheme.vibeColor }}
                      >
                        {currentTheme.category[0]}
                      </motion.div>
                    </>
                  )}
                  
                  <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full border border-brand-200">
                    <MapPin className="w-3 h-3 text-brand-500" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">{currentTheme.category} 漫步</span>
                  </div>
                  
                  {/* Map Footprint Indicator */}
                  {isTracking && (
                    <div className="absolute top-6 left-6 z-10 flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-full text-[10px] font-bold animate-pulse">
                      <Navigation className="w-3 h-3" />
                      追踪中...
                    </div>
                  )}
                </div>

                {/* Content Side */}
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-between overflow-y-auto">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="serif text-3xl md:text-4xl font-bold leading-tight">{currentTheme.title}</h2>
                      <button onClick={shareTheme} className="p-2 hover:bg-brand-100 rounded-full transition-colors">
                        <Share2 className="w-5 h-5 opacity-40" />
                      </button>
                    </div>
                    <p className="text-brand-900/60 leading-relaxed mb-8">{currentTheme.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] uppercase tracking-widest font-semibold opacity-50 block">您的任务</label>
                        <div className="flex items-center gap-2 bg-brand-100 p-1 rounded-lg">
                          <span className="text-[8px] font-bold opacity-40 px-1">记录单位:</span>
                          {(['location', 'event', 'image'] as const).map(unit => (
                            <button
                              key={unit}
                              onClick={() => setRecordUnit(unit)}
                              className={`text-[8px] px-1.5 py-0.5 rounded transition-all ${recordUnit === unit ? 'bg-brand-500 text-white' : 'opacity-40'}`}
                            >
                              {unit === 'location' ? '地点' : unit === 'event' ? '事件' : '图片'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {currentTheme.missions.map((mission, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <button
                            onClick={() => toggleMission(mission)}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors text-left group ${activeMission === mission ? 'bg-brand-200' : 'hover:bg-brand-100'}`}
                          >
                            {completedMissions[mission] ? (
                              <CheckCircle2 className="w-5 h-5 text-brand-500" />
                            ) : (
                              <Circle className="w-5 h-5 opacity-20 group-hover:opacity-40" />
                            )}
                            <span className={`text-sm flex-1 ${completedMissions[mission] ? 'line-through opacity-40' : ''}`}>
                              {mission}
                            </span>
                            {missionMedia[mission] && (
                              <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center">
                                {missionMedia[mission].type === 'photo' ? <ImageIcon className="w-3 h-3 text-white" /> : 
                                 missionMedia[mission].type === 'video' ? <Video className="w-3 h-3 text-white" /> : 
                                 <Mic className="w-3 h-3 text-white" />}
                              </div>
                            )}
                          </button>
                          
                          {/* Active Mission Media Capture Area */}
                          <AnimatePresence>
                            {activeMission === mission && !completedMissions[mission] && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pl-11 pr-3 overflow-hidden"
                              >
                                <div className="p-3 bg-brand-50 rounded-xl border border-brand-200 flex flex-col gap-2">
                                  <span className="text-[10px] font-bold opacity-50 uppercase">打卡此任务</span>
                                  <div className="flex gap-2">
                                    <button onClick={startCamera} className="flex-1 py-2 bg-white rounded-lg border border-brand-200 flex items-center justify-center gap-2 hover:bg-brand-100">
                                      <Camera className="w-4 h-4 opacity-60" /> <span className="text-xs">拍照</span>
                                    </button>
                                    <button onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording} className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${isRecordingVideo ? 'bg-red-500 text-white border-red-500' : 'bg-white border-brand-200 hover:bg-brand-100'}`}>
                                      {isRecordingVideo ? <StopCircle className="w-4 h-4" /> : <Video className="w-4 h-4 opacity-60" />} 
                                      <span className="text-xs">{isRecordingVideo ? '停止' : '录像'}</span>
                                    </button>
                                    <button onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording} className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${isRecordingAudio ? 'bg-red-500 text-white border-red-500' : 'bg-white border-brand-200 hover:bg-brand-100'}`}>
                                      {isRecordingAudio ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4 opacity-60" />} 
                                      <span className="text-xs">{isRecordingAudio ? '停止' : '录音'}</span>
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>

                    {/* Completed Missions Record Area */}
                    {Object.values(completedMissions).some(v => v) && (
                      <div className="mt-6 p-4 bg-brand-50 rounded-2xl border border-dashed border-brand-300">
                        <label className="text-[10px] uppercase tracking-widest font-semibold opacity-50 block mb-2">任务记录区</label>
                        <div className="space-y-3">
                          {Object.keys(completedMissions).filter(m => completedMissions[m]).map((m, i) => (
                            <div key={i} className="flex flex-col gap-2 text-xs opacity-80 bg-white p-2 rounded-lg border border-brand-100">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                                <span className="font-medium">{m}</span>
                              </div>
                              {missionMedia[m] && (
                                <div className="pl-3.5">
                                  {missionMedia[m].type === 'photo' && <img src={missionMedia[m].data} className="w-16 h-16 object-cover rounded-md" alt="mission" />}
                                  {missionMedia[m].type === 'video' && <video src={missionMedia[m].data} className="w-16 h-16 object-cover rounded-md" />}
                                  {missionMedia[m].type === 'audio' && <audio src={missionMedia[m].data} controls className="h-6 w-full max-w-[200px]" />}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          if (capturedPhoto) setCapturedPhoto(null);
                          else startCamera();
                        }}
                        className="flex items-center justify-center gap-2 py-2.5 bg-brand-900 text-white rounded-2xl hover:bg-brand-900/90 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="text-xs font-medium">{capturedPhoto ? '重拍照片' : '随手拍'}</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (capturedVideo) setCapturedVideo(null);
                          else if (isRecordingVideo) stopVideoRecording();
                          else startVideoRecording();
                        }}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl transition-all ${isRecordingVideo ? 'bg-red-500 text-white' : 'bg-brand-900 text-white'}`}
                      >
                        {isRecordingVideo ? <StopCircle className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                        <span className="text-xs font-medium">
                          {capturedVideo ? '重录视频' : (isRecordingVideo ? '停止录制' : '录像')}
                        </span>
                      </button>
                      <button 
                        onClick={() => {
                          if (capturedAudio) setCapturedAudio(null);
                          else if (isRecordingAudio) stopAudioRecording();
                          else startAudioRecording();
                        }}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl transition-all ${isRecordingAudio ? 'bg-red-500 text-white' : 'bg-brand-900 text-white'}`}
                      >
                        {isRecordingAudio ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        <span className="text-xs font-medium">
                          {capturedAudio ? '重录音频' : (isRecordingAudio ? '停止录音' : '录音')}
                        </span>
                      </button>
                      <button 
                        onClick={() => setIsTracking(!isTracking)}
                        className={`flex items-center justify-center gap-2 py-2.5 border rounded-2xl transition-all ${isTracking ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-brand-200 text-brand-900'}`}
                      >
                        <Navigation className="w-4 h-4" />
                        <span className="text-xs font-medium">{isTracking ? '停止追踪' : '开启地图'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-4 h-4 opacity-30" />
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="记录此刻的想法..."
                        className="w-full p-3 pl-10 bg-brand-100 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 text-sm h-20 resize-none"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between px-2">
                      <label className="flex items-center gap-2 text-sm opacity-70 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isPublic} 
                          onChange={(e) => setIsPublic(e.target.checked)}
                          className="rounded text-brand-500 focus:ring-brand-500"
                        />
                        公开分享到社区
                      </label>
                    </div>
                    
                    {user && (path.length > 0 || capturedPhoto || capturedVideo || capturedAudio || noteText || Object.keys(missionMedia).length > 0) && (
                      <button 
                        onClick={saveWalk}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span className="text-sm font-medium">{isUploading ? '保存中...' : '保存到足迹'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Media Previews */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Camera/Video Preview */}
          <AnimatePresence>
            {(capturedPhoto || capturedVideo || (videoRef.current?.srcObject)) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-4 rounded-3xl shadow-lg border border-brand-200 relative"
              >
                <button 
                  onClick={() => {
                    setCapturedPhoto(null);
                    setCapturedVideo(null);
                    stopMediaStream();
                  }}
                  className="absolute top-2 right-2 z-10 p-1 bg-white rounded-full shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
                
                {capturedPhoto ? (
                  <img src={capturedPhoto} className="w-full rounded-2xl" alt="captured" />
                ) : capturedVideo ? (
                  <video src={capturedVideo} className="w-full rounded-2xl" controls />
                ) : (
                  <div className="relative">
                    <video ref={videoRef} className="w-full rounded-2xl bg-black" playsInline muted />
                    {!isRecordingVideo && (
                      <button 
                        onClick={takePhoto}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full border-4 border-brand-500 flex items-center justify-center"
                      >
                        <div className="w-8 h-8 bg-brand-500 rounded-full" />
                      </button>
                    )}
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Audio Preview */}
          <AnimatePresence>
            {(capturedAudio || isRecordingAudio) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white p-4 rounded-3xl shadow-lg border border-brand-200 flex flex-col items-center justify-center gap-3"
              >
                <div className="flex justify-between w-full">
                  <span className="text-[10px] font-bold opacity-40 uppercase">音频记录</span>
                  <button onClick={() => setCapturedAudio(null)}><Trash2 className="w-4 h-4 opacity-30" /></button>
                </div>
                {isRecordingAudio ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium">录音中...</span>
                  </div>
                ) : (
                  <audio src={capturedAudio!} controls className="w-full h-8" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          <button 
            onClick={handleRandomTheme}
            disabled={isGenerating}
            className="px-6 py-4 bg-white border border-brand-200 rounded-full flex items-center gap-3 hover:bg-brand-200 transition-all disabled:opacity-50"
          >
            <Shuffle className="w-5 h-5 opacity-60" />
            <span className="font-medium">随机</span>
          </button>
          
          <button 
            onClick={() => setShowCombineModal(true)}
            disabled={isGenerating}
            className="px-6 py-4 bg-white border border-brand-200 rounded-full flex items-center gap-3 hover:bg-brand-200 transition-all disabled:opacity-50"
          >
            <Layers className="w-5 h-5 opacity-60" />
            <span className="font-medium">组合</span>
          </button>
 
          <button 
            onClick={() => setShowCreateModal(true)}
            disabled={isGenerating}
            className="px-6 py-4 bg-white border border-brand-200 rounded-full flex items-center gap-3 hover:bg-brand-200 transition-all disabled:opacity-50"
          >
            <Plus className="w-5 h-5 opacity-60" />
            <span className="font-medium">创建</span>
          </button>
          
          <button 
            onClick={handleAITheme}
            disabled={isGenerating}
            className="px-8 py-4 bg-brand-500 text-white rounded-full flex items-center gap-3 hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">AI 生成</span>
          </button>
        </div>
          </>
        )}

        {activeTab === 'community' && (
          <div className="w-full max-w-4xl">
            <h2 className="serif text-2xl font-bold mb-6">社区漫步足迹</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communityWalks.length === 0 ? (
                <div className="col-span-full text-center py-12 opacity-50">暂无公开的漫步记录，去探索并分享你的第一次漫步吧！</div>
              ) : (
                communityWalks.map((walk) => (
                  <div key={walk.id} className="bg-white rounded-3xl p-6 shadow-sm border border-brand-200 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{walk.themeTitle}</h3>
                        <p className="text-xs opacity-50 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> {walk.locationName || '未知地点'}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-1 bg-brand-100 rounded-full text-brand-900 font-medium">
                        {new Date(walk.timestamp?.toDate()).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {walk.noteText && (
                      <p className="text-sm opacity-80 italic">"{walk.noteText}"</p>
                    )}

                    {walk.completedMissions && walk.completedMissions.length > 0 && (
                      <div className="bg-brand-50 p-3 rounded-xl">
                        <span className="text-[10px] uppercase font-bold opacity-50 block mb-2">完成的任务</span>
                        <div className="flex flex-col gap-2">
                          {walk.completedMissions.map((m: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-brand-500 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <span>{m.mission}</span>
                                {m.mediaUrl && (
                                  <div className="mt-1">
                                    {m.mediaType === 'photo' && <img src={m.mediaUrl} className="w-16 h-16 object-cover rounded-md" alt="mission" />}
                                    {m.mediaType === 'video' && <video src={m.mediaUrl} className="w-16 h-16 object-cover rounded-md" />}
                                    {m.mediaType === 'audio' && <audio src={m.mediaUrl} controls className="h-6 w-full max-w-[200px]" />}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {walk.photoUrl && !walk.completedMissions?.some((m: any) => m.mediaUrl === walk.photoUrl) && (
                      <img src={walk.photoUrl} className="w-full h-48 object-cover rounded-2xl" alt="walk cover" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
 
      {/* Combine Modal */}
      <AnimatePresence>
        {showCombineModal && (
          <div className="fixed inset-0 z-50 bg-brand-900/40 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="serif text-2xl font-bold">组合主题</h3>
                <button onClick={() => setShowCombineModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <p className="text-sm opacity-60 mb-6 text-center italic">选择 2 个主题，将它们的灵魂融合为一次独特的漫步。</p>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                {PRESET_THEMES.map((t, i) => {
                  const isSelected = selectedThemesForCombine.some(st => st.title === t.title);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (isSelected) setSelectedThemesForCombine(prev => prev.filter(st => st.title !== t.title));
                        else if (selectedThemesForCombine.length < 2) setSelectedThemesForCombine(prev => [...prev, t]);
                      }}
                      className={`p-4 rounded-3xl border-2 transition-all text-left ${isSelected ? 'border-brand-500 bg-brand-500/5' : 'border-brand-200 hover:border-brand-500/30'}`}
                    >
                      <div className="text-[10px] uppercase font-bold opacity-40 mb-1">{t.category}</div>
                      <div className="font-bold text-sm leading-tight">{t.title}</div>
                    </button>
                  );
                })}
              </div>
 
              <button 
                onClick={handleCombineThemes}
                disabled={selectedThemesForCombine.length < 2}
                className="w-full py-4 bg-brand-900 text-white rounded-2xl font-bold disabled:opacity-20"
              >
                融合主题
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* Create Theme Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-brand-900/40 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="serif text-2xl font-bold">创建新主题</h3>
                <button onClick={() => setShowCreateModal(false)}><X className="w-6 h-6" /></button>
              </div>
              
              {!user ? (
                <div className="text-center py-12">
                  <p className="opacity-60 mb-6">请先登录以贡献社区。</p>
                  <button onClick={signIn} className="px-8 py-3 bg-brand-900 text-white rounded-full font-bold">使用 Google 登录</button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const title = formData.get('title') as string;
                  const description = formData.get('description') as string;
                  const category = formData.get('category') as string;
                  const missions = [formData.get('m1'), formData.get('m2'), formData.get('m3')].filter(Boolean) as string[];
 
                  try {
                    await addDoc(collection(db, 'themes'), {
                      title, description, category, missions,
                      authorId: user.uid,
                      authorName: user.displayName,
                      status: 'pending',
                      createdAt: serverTimestamp()
                    });
                    alert("主题已提交审核！");
                    setShowCreateModal(false);
                  } catch (err) {
                    handleFirestoreError(err, OperationType.CREATE, 'themes');
                  }
                }}>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold opacity-40">主题名称</label>
                    <input name="title" required className="w-full p-4 bg-brand-100 rounded-2xl border-none focus:ring-2 focus:ring-brand-500" placeholder="例如：霓虹夜行" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold opacity-40">描述</label>
                    <textarea name="description" required className="w-full p-4 bg-brand-100 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 h-24" placeholder="这次漫步的氛围是怎样的？" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold opacity-40">类别</label>
                    <select name="category" className="w-full p-4 bg-brand-100 rounded-2xl border-none focus:ring-2 focus:ring-brand-500">
                      <option>视觉</option>
                      <option>感官</option>
                      <option>互动</option>
                      <option>城市</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold opacity-40">任务 (需要 3 个)</label>
                    <input name="m1" required className="w-full p-3 bg-brand-100 rounded-xl mb-2" placeholder="任务 1" />
                    <input name="m2" required className="w-full p-3 bg-brand-100 rounded-xl mb-2" placeholder="任务 2" />
                    <input name="m3" required className="w-full p-3 bg-brand-100 rounded-xl" placeholder="任务 3" />
                  </div>
                  <button type="submit" className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold">提交主题</button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* History Overlay */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-brand-900/20 backdrop-blur-sm flex justify-end"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-md bg-white h-full shadow-2xl p-8 overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="serif text-2xl font-bold">往期漫步</h3>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-brand-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {history.length === 0 ? (
                  <p className="opacity-40 italic">暂无历史记录。开始漫步吧！</p>
                ) : (
                  history.map((h, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-brand-200 hover:border-brand-500 transition-colors cursor-pointer" onClick={() => { setCurrentTheme(h); setShowHistory(false); }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.vibeColor }}></div>
                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">{h.category}</span>
                      </div>
                      <h4 className="font-bold mb-1">{h.title}</h4>
                      <p className="text-xs opacity-60 line-clamp-2">{h.description}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Footer */}
      <footer className="w-full mt-12 pt-8 border-t border-brand-200 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40">
        <p className="text-xs">© 2026 城市漫步者。带着意图去漫步。</p>
        <div className="flex gap-6 text-xs font-medium uppercase tracking-widest">
          <a href="#" className="hover:opacity-100 transition-opacity">关于</a>
          <a href="#" className="hover:opacity-100 transition-opacity">隐私</a>
          <a href="#" className="hover:opacity-100 transition-opacity">指南</a>
        </div>
      </footer>
    </div>
  );
}
