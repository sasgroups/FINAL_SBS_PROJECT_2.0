import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

export default function AdBanner() {
  // State for ads list, current ad index, loading/error status, kiosk ID, and playing state
  const [ads, setAds] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [KIOSK_ID, setKioskId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs for caching media elements, timer, video and image elements
  const mediaCache = useRef(new Map());
  const nextAdTimer = useRef(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);

  // --- Retrieve Kiosk ID from localStorage on mount ---
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

  // --- Helper to build the full URL for an ad ---
  const getAdSource = useCallback((ad) => {
    if (!ad) return "";
    // If the ad object already provides a direct URL, use it
    if (ad.url) {
      return ad.url;
    }
    // Fallback or default ads use a standard path
    if (ad.is_fallback || ad.is_default) {
      return `${API_URL}/uploads/${ad.filename}`;
    }
    // Normal ad: construct URL from filename
    return `${API_URL}/uploads/${ad.filename}`;
  }, [API_URL]);

  // --- Determine if an ad is a video based on type or file extension ---
  const isAdVideo = useCallback((ad) => {
    return ad.type?.toLowerCase() === "video" || 
           ad.filename?.endsWith(".mp4") ||
           ad.filename?.endsWith(".webm") ||
           ad.filename?.endsWith(".mov");
  }, []);

  // --- Preload a single media (image or video) and store in cache ---
  const preloadMedia = useCallback((ad) => {
    const adSource = getAdSource(ad);
    const isVideo = isAdVideo(ad);

    return new Promise((resolve) => {
      if (isVideo) {
        // Create a hidden video element to preload
        const video = document.createElement("video");
        video.src = adSource;
        video.preload = "auto";
        video.muted = true; // required for autoplay in many browsers

        video.addEventListener("loadeddata", () => {
          // Store metadata in cache
          mediaCache.current.set(ad.filename, {
            type: "video",
            element: video,
            duration: video.duration * 1000 || 15000, // fallback 15s
            loaded: true,
            ad: ad,
            source: adSource
          });
          resolve(true);
        });

        video.addEventListener("error", () => {
          console.warn(`Failed to load video: ${adSource}`);
          // Store as failed but still allow fallback to image
          mediaCache.current.set(ad.filename, {
            type: "image",
            element: null,
            duration: 7000,
            loaded: false,
            ad: ad,
            source: adSource
          });
          resolve(false);
        });

        video.load(); // start loading
      } else {
        // Preload image
        const img = new Image();
        img.src = adSource;

        img.onload = () => {
          mediaCache.current.set(ad.filename, {
            type: "image",
            element: img,
            duration: 7000, // default image duration
            loaded: true,
            ad: ad,
            source: adSource
          });
          resolve(true);
        };

        img.onerror = () => {
          console.warn(`Failed to load image: ${adSource}`);
          mediaCache.current.set(ad.filename, {
            type: "image",
            element: null,
            duration: 7000,
            loaded: false,
            ad: ad,
            source: adSource
          });
          resolve(false);
        };
      }
    });
  }, [isAdVideo, getAdSource]);

  // --- Preload all ads in parallel (used in background) ---
  const preloadAllAds = useCallback(async (adsList) => {
    const preloadPromises = adsList.map(ad => preloadMedia(ad));
    await Promise.all(preloadPromises);
  }, [preloadMedia]);

  // --- Play the given ad using the video or image element ---
  const playCurrentAd = useCallback((ad) => {
    if (!ad) return;

    const cachedAd = mediaCache.current.get(ad.filename);
    const isVideo = isAdVideo(ad);

    // Clear any previously scheduled timer
    if (nextAdTimer.current) clearTimeout(nextAdTimer.current);

    if (isVideo && videoRef.current) {
      const adSource = getAdSource(ad);

      // Set source and load video
      videoRef.current.src = adSource;
      videoRef.current.load();

      const playPromise = videoRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            // Set a backup timer based on video duration (in case onEnded doesn't fire)
            const duration = cachedAd?.duration || 15000;
            nextAdTimer.current = setTimeout(() => {
              if (videoRef.current && !videoRef.current.ended) {
                setCurrentAdIndex(prev => (prev + 1) % ads.length);
              }
            }, duration);
          })
          .catch((e) => {
            if (e.name === 'AbortError') {
              // Ignore AbortError: caused when component unmounts or src changes rapidly
              return;
            }
            console.error("Video play failed:", e);
            // If video fails, skip to next ad
            setCurrentAdIndex(prev => (prev + 1) % ads.length);
          });
      }
    } else {
      // For images, set a timer to move to next ad
      const duration = cachedAd?.duration || 7000;
      nextAdTimer.current = setTimeout(() => {
        setCurrentAdIndex(prev => (prev + 1) % ads.length);
      }, duration);
      setIsPlaying(false);
    }
  }, [ads.length, getAdSource, isAdVideo]);

  // --- Video event handlers ---
  const handleVideoEnded = useCallback(() => {
    // Video finished naturally, move to next ad
    if (nextAdTimer.current) clearTimeout(nextAdTimer.current);
    setCurrentAdIndex(prev => (prev + 1) % ads.length);
  }, [ads.length]);

  const handleVideoError = useCallback((e) => {
    console.error("Video error:", e);
    setIsPlaying(false);
    if (nextAdTimer.current) clearTimeout(nextAdTimer.current);
    setCurrentAdIndex(prev => (prev + 1) % ads.length);
  }, [ads.length]);

  const handleVideoCanPlay = useCallback(() => {
    // Video is ready, mark as playing
    setIsPlaying(true);
  }, []);

  // --- Image error fallback ---
  const handleImageError = useCallback((e) => {
    console.error("Image load error");
    e.target.src = `${API_URL}/uploads/default-ad.png`;
  }, [API_URL]);

  // --- Fetch ads for the specific kiosk ---
  useEffect(() => {
    if (!KIOSK_ID) return;

    const fetchAds = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`Loading ads for kiosk: ${KIOSK_ID}`);

        const response = await axios.get(`${API_URL}/api/ads/kiosk/${KIOSK_ID}`, {
          timeout: 10000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        let adsData = [];

        if (response.data && response.data.success === true) {
          adsData = response.data.ads || [];
          console.log(`Extracted ${adsData.length} ads from response`);
        } else {
          throw new Error('Invalid response format');
        }

        // If no ads returned, use a default ad
        if (!adsData.length) {
          adsData = [{
            id: 0,
            filename: "default-ad.png",
            type: "image",
            title: "Welcome",
            is_default: true
          }];
        }

        setAds(adsData);

        // 🚀 OPTIMIZATION: Preload all ads in the background – do NOT await
        preloadAllAds(adsData).catch(err => {
          console.error("Background preload failed:", err);
        });

        // ✅ Immediately play the first ad without waiting for preload
        if (adsData.length > 0) {
          playCurrentAd(adsData[0]);
        }

      } catch (error) {
        console.error("Failed to fetch ads:", error);
        setError("Failed to load advertisements");

        // Fallback to default ad
        const defaultAd = [{
          id: 0,
          filename: "default-ad.png",
          type: "image",
          title: "Welcome",
          is_default: true
        }];

        setAds(defaultAd);
        // For fallback, we still preload but also play immediately
        await preloadAllAds(defaultAd); // await here because we need cache for duration?
        if (defaultAd.length > 0) {
          playCurrentAd(defaultAd[0]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAds();

    // Auto-refresh ads every 5 minutes to pick up changes
    const refreshInterval = setInterval(fetchAds, 5 * 60 * 1000);

    // Cleanup on unmount or kiosk change
    return () => {
      if (nextAdTimer.current) clearTimeout(nextAdTimer.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
      mediaCache.current.clear();
      clearInterval(refreshInterval);
    };
  }, [KIOSK_ID, preloadAllAds, playCurrentAd]);

  // --- Effect to handle ad rotation (triggered when index changes) ---
  useEffect(() => {
    if (!ads.length || isLoading || !KIOSK_ID) return;

    const currentAd = ads[currentAdIndex];
    if (!currentAd) return;

    playCurrentAd(currentAd);

    // Cleanup timer on unmount or before next ad
    return () => {
      if (nextAdTimer.current) clearTimeout(nextAdTimer.current);
    };
  }, [currentAdIndex, ads, isLoading, KIOSK_ID, playCurrentAd]);

  // --- Render UI ---

  // If no kiosk ID and not loading, show configuration error
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

  // Loading state
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

  // No ads after loading
  if (!ads.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-2xl">No advertisements available.</p>
        </div>
      </div>
    );
  }

  // Current ad details
  const currentAd = ads[currentAdIndex];
  const cachedAd = mediaCache.current.get(currentAd.filename);
  const isVideo = isAdVideo(currentAd);
  const adSource = getAdSource(currentAd);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">

      {/* Error overlay (if any) */}
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

      {/* Video element (hidden when showing an image) */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover object-center ${isVideo ? 'block' : 'hidden'}`}
        muted
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        autoPlay
        loop={isVideo && ads.length === 1}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        onCanPlayThrough={handleVideoCanPlay}
      />

      {/* Image element (shown only for images) */}
      {!isVideo && (
        <img
          ref={imageRef}
          src={adSource}
          alt={currentAd.title || "Ad"}
          className="w-full h-full object-cover object-center"
          onError={handleImageError}
        />
      )}

      {/* Preload indicator – shows if cached media isn't fully loaded yet */}
      {cachedAd && !cachedAd.loaded && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-2"></div>
            <div className="text-white text-sm">Buffering...</div>
          </div>
        </div>
      )}

    </div>
  );
}