import React, { useEffect, useState, useRef, useCallback } from "react";
import { cacheVideo, getCachedVideo, cleanupOrphanedVideos } from "../utils/videoCache";

const API_URL = process.env.REACT_APP_API_URL;

export default function AdBanner() {
  const [ads, setAds] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [KIOSK_ID, setKioskId] = useState(null);

  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const downloadingSet = useRef(new Set());
  
  const [activeAdUrl, setActiveAdUrl] = useState("");

  const adsRef = useRef(ads);
  useEffect(() => {
    adsRef.current = ads;
  }, [ads]);

  useEffect(() => {
    const kioskId = localStorage.getItem("kiosk_id");
    if (kioskId) {
      setKioskId(kioskId);
    } else {
      console.warn("No KIOSK_ID found in localStorage");
      setError("Kiosk ID not found. Please set up the kiosk.");
      setIsLoading(false);
    }
  }, []);

  const getAdSource = useCallback((ad) => {
    if (!ad) return `${API_URL}/uploads/default-ad.png`;
    if (ad.url) return ad.url;
    if (ad.filename) return `${API_URL}/uploads/${ad.filename}`;
    return `${API_URL}/uploads/default-ad.png`;
  }, [API_URL]);

  const isAdVideo = useCallback((ad) => {
    return ad?.type?.toLowerCase() === "video" || 
           ad?.filename?.endsWith(".mp4") ||
           ad?.filename?.endsWith(".webm") ||
           ad?.filename?.endsWith(".mov");
  }, []);

  const compareAds = (oldAds, newAds) => {
    if (!oldAds || !newAds) return true;
    if (oldAds.length !== newAds.length) return true;
    
    const oldIds = oldAds.map(ad => ad.id).sort().join(',');
    const newIds = newAds.map(ad => ad.id).sort().join(',');
    
    return oldIds !== newIds;
  };

  const loadAds = useCallback(async (showLoading = true) => {
    if (!KIOSK_ID) return;
    
    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      
      const cacheBust = new Date().getTime();
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000);
      
      const response = await fetch(`${API_URL}/api/ads/kiosk/${KIOSK_ID}?t=${cacheBust}`, {
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        signal: abortController.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Invalid response format');
      
      const data = await response.json();
      
      let adsData = [];
      if (data && data.success === true) {
        adsData = data.ads || [];
      } else {
        throw new Error('Invalid response format');
      }

      if (!adsData.length) {
        adsData = [{
          id: 0,
          filename: "default-ad.png",
          type: "image",
          title: "Welcome",
          is_default: true
        }];
      }

      setAds(prevAds => {
        const hasChanged = compareAds(prevAds, adsData);
        if (hasChanged) {
           setCurrentAdIndex(0);
           return adsData;
        }
        return prevAds;
      });
    } catch (err) {
      console.error("Failed to fetch ads:", err);
      if (adsRef.current.length === 0) {
          setError("Failed to load advertisements");
          setAds([{
            id: 0,
            filename: "default-ad.png",
            type: "image",
            title: "Welcome",
            is_default: true
          }]);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [KIOSK_ID, API_URL]);

  useEffect(() => {
    if (!KIOSK_ID) return;
    
    loadAds(true);
    
    const eventSource = new EventSource(`${API_URL}/api/ads/kiosk/${KIOSK_ID}/updates-stream`);
    
    eventSource.onmessage = (event) => {
      try {
        if (!event.data) return;
        const data = JSON.parse(event.data);
        if (data.event === 'ads_updated') {
          console.log("SSE push received in Banner: Ads updated!");
          loadAds(false);
        }
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    };
    
    eventSource.onerror = () => {
      console.log("SSE Stream error or reconnecting for banner...");
    };

    return () => {
      eventSource.close();
    };
  }, [KIOSK_ID, loadAds, API_URL]);

  // Preload next image
  useEffect(() => {
    if (ads.length > 1) {
      const nextAd = ads[(currentAdIndex + 1) % ads.length];
      if (nextAd && !isAdVideo(nextAd)) {
        const img = new Image();
        img.src = getAdSource(nextAd);
      }
    }
  }, [currentAdIndex, ads, getAdSource, isAdVideo]);

  // Background caching & orphaned clearance
  useEffect(() => {
    if (!ads || ads.length === 0) return;

    const autoDownloadVideos = async () => {
      const activeVideoUrls = ads
        .filter(ad => isAdVideo(ad))
        .map(ad => getAdSource(ad))
        .filter(url => url);

      if (activeVideoUrls.length > 0) {
        await cleanupOrphanedVideos(activeVideoUrls);

        for (const url of activeVideoUrls) {
          if (!downloadingSet.current.has(url)) {
            downloadingSet.current.add(url);
            getCachedVideo(url).then(cached => {
              if (!cached) {
                console.log(`⬇️ Background downloading video: ${url}`);
                fetch(url)
                  .then(res => {
                    if (!res.ok) throw new Error("Network not ok");
                    return res.blob();
                  })
                  .then(blob => cacheVideo(url, blob))
                  .catch(err => console.error(`Failed to cache ${url}`, err))
                  .finally(() => downloadingSet.current.delete(url));
              } else {
                downloadingSet.current.delete(url);
              }
            });
          }
        }
      }
    };
    autoDownloadVideos();
  }, [ads, getAdSource, isAdVideo]);

  // Cache-First Playback Resolver
  useEffect(() => {
    let objectUrl = null;
    let isActive = true;

    const resolveAdUrl = async () => {
      const currentAd = ads[currentAdIndex];
      if (!currentAd) {
        if (isActive) setActiveAdUrl(`${API_URL}/uploads/default-ad.png`);
        return;
      }

      const remoteUrl = getAdSource(currentAd);

      if (isAdVideo(currentAd)) {
        const cachedBlob = await getCachedVideo(remoteUrl);
        if (cachedBlob && isActive) {
          objectUrl = URL.createObjectURL(cachedBlob);
          console.log(`▶️ Playing from local cache: ${remoteUrl}`);
          setActiveAdUrl(objectUrl);
        } else if (isActive) {
          console.log(`🌐 Playing from remote (not cached yet): ${remoteUrl}`);
          setActiveAdUrl(remoteUrl);
        }
      } else {
        if (isActive) setActiveAdUrl(remoteUrl);
      }
    };

    resolveAdUrl();

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [ads, currentAdIndex, getAdSource, isAdVideo, API_URL]);

  // Ad rotation logic
  useEffect(() => {
    if (ads.length <= 1) return;
    
    const currentAd = ads[currentAdIndex];
    if (!currentAd) return;
    
    if (!isAdVideo(currentAd)) {
      // Show image for 7 seconds
      const timer = setTimeout(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, 7000);
      
      return () => clearTimeout(timer);
    }
  }, [ads, currentAdIndex, isAdVideo]);

  const handleVideoEnded = () => {
    setCurrentAdIndex((prev) => (prev + 1) % ads.length);
  };

  const handleVideoError = (e) => {
    console.error("Video playback error:", e);
    setTimeout(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, 1000);
  };

  const handleImageError = (e) => {
    console.error("Image load error:", e);
    e.target.src = `${API_URL}/uploads/default-ad.png`;
    e.target.onerror = () => {
      setTimeout(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, 1000);
    };
  };

  if (!KIOSK_ID && !isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center p-4">
          <div className="text-red-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xl font-semibold">Kiosk Not Configured</p>
          <p className="text-gray-400 mt-2">Please set up the kiosk ID in settings</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
          <p>Loading advertisements...</p>
        </div>
      </div>
    );
  }

  if (!ads.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-2xl">No advertisements available.</p>
        </div>
      </div>
    );
  }

  const currentAd = ads[currentAdIndex];
  if (!currentAd) return null;
  const isVideo = isAdVideo(currentAd);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/80 text-white p-3 rounded z-10">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {isVideo ? (
        <video
          key={activeAdUrl}
          ref={videoRef}
          src={activeAdUrl}
          className="w-full h-full object-contain block"
          muted
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          autoPlay
          preload="auto"
          loop={ads.length <= 1}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        />
      ) : (
        <img
          key={activeAdUrl}
          ref={imageRef}
          src={activeAdUrl}
          alt={currentAd.title || "Ad"}
          className="w-full h-full object-contain"
          onError={handleImageError}
        />
      )}
    </div>
  );
}