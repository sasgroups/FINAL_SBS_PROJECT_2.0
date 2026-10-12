import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cacheVideo, getCachedVideo, cleanupOrphanedVideos } from "../utils/videoCache";
const API_URL = process.env.REACT_APP_API_URL;

// Carousel data moved outside component to avoid re-creations
const carouselData = [
  {
    title: "Welcome to Smart Baggage Check",
    description: "Fast, accurate weight and dimension measurement for all airlines",
  },
  {
    title: "Touch Screen to Begin",
    description: "Place your baggage on the scale and follow the instructions",
  },
  {
    title: "Multiple Airlines Supported",
    description: "Real-time baggage limit checking for over 50 airlines worldwide",
  },
];

export default function WelcomeAdPage() {
  const navigate = useNavigate();
  
  // Initialize with cached ads for instant LCP render
  const [ads, setAds] = useState(() => {
    try {
      const cached = localStorage.getItem("cachedAds");
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [adIndex, setAdIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(() => !localStorage.getItem("cachedAds"));
  const [KIOSK_ID, setKioskId] = useState(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const downloadingSet = useRef(new Set());
  
  // Local active URL for caching (either remote HTTP or local Blob URL)
  const [activeAdUrl, setActiveAdUrl] = useState("/default-ad.png");
  
  // Refs for polling
  const pollIntervalRef = useRef(null);
  const adVersionRef = useRef(null);

  // --- Secret Admin Gesture: touch ad area with 4+ fingers for 5 seconds ---
  const adAreaPointers = useRef(new Set());
  const adminHoldTimer = useRef(null);

  const startAdminTimer = useCallback(() => {
    if (adminHoldTimer.current) return; // already running
    adminHoldTimer.current = setTimeout(() => {
      navigate("/admin");
    }, 5000);
  }, [navigate]);

  const cancelAdminTimer = useCallback(() => {
    if (adminHoldTimer.current) {
      clearTimeout(adminHoldTimer.current);
      adminHoldTimer.current = null;
    }
  }, []);

  const handleAdAreaPointerDown = useCallback((e) => {
    adAreaPointers.current.add(e.pointerId);
    if (adAreaPointers.current.size >= 4) {
      startAdminTimer();
    }
  }, [startAdminTimer]);

  const handleAdAreaPointerUp = useCallback((e) => {
    adAreaPointers.current.delete(e.pointerId);
    if (adAreaPointers.current.size < 4) {
      cancelAdminTimer();
    }
  }, [cancelAdminTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cancelAdminTimer(); };
  }, [cancelAdminTimer]);
  // --- End Secret Admin Gesture ---


  useEffect(() => {
    // Preconnect to API to speed up network requests
    if (API_URL) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = API_URL;
      document.head.appendChild(link);
    }

    const token = localStorage.getItem("kioskToken");
    const id = localStorage.getItem("kiosk_id");

    if (!token || !id) {
      navigate("/");
      return;
    }

    setKioskId(id);
    
    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [navigate]);

  // Function to get ad source with fallback
  const getAdSource = useCallback((ad) => {
    if (!ad) return "/default-ad.png";
    
    if (ad.is_fallback || ad.is_default) {
      return "/default-ad.png";
    }
    
    if (ad.url) {
      return ad.url;
    }
    
    if (ad.filename) {
      return `${API_URL}/uploads/${ad.filename}`;
    }
    
    return "/default-ad.png";
  }, [API_URL]);

  // Function to check if ads have changed
  const compareAds = (oldAds, newAds) => {
    if (!oldAds || !newAds) return true;
    if (oldAds.length !== newAds.length) return true;
    
    // Compare IDs
    const oldIds = oldAds.map(ad => ad.id).sort().join(',');
    const newIds = newAds.map(ad => ad.id).sort().join(',');
    
    if (oldIds !== newIds) return true;
    
    return false;
  };

  // Function to load ads with polling - SIMPLIFIED VERSION
  const loadAds = async (showLoading = true) => {
    if (!KIOSK_ID) return;
    
    try {
      if (showLoading) setIsLoading(true);
      
      const cacheBust = new Date().getTime(); // Cache bust down to the millisecond
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 5000);
      
      const response = await fetch(`${API_URL}/api/ads/kiosk/${KIOSK_ID}?t=${cacheBust}`, {
        signal: abortController.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();
      
      if (data && data.success === true) {
        const adsArray = data.ads || [];
        
        if (adsArray.length > 0) {
          setAds(prevAds => {
            const hasChanged = compareAds(prevAds, adsArray);
            console.log("Ads fetch complete. Changed?", hasChanged);
            if (hasChanged) {
              try {
                localStorage.setItem("cachedAds", JSON.stringify(adsArray));
              } catch (e) {}
              // Reset to first ad when ads change
              setAdIndex(0);
              return adsArray;
            }
            return prevAds;
          });
        } else {
          // Fallback to default ad
          const fallback = [{
            id: 0,
            filename: "default-ad.png",
            type: "image",
            title: "Welcome to Baggage Check",
            is_default: true,
            kiosk_id: null
          }];
          setAds(fallback);
          try { localStorage.setItem("cachedAds", JSON.stringify(fallback)); } catch (e) {}
        }
      }
    } catch (error) {
      // Only set fallback if we have no ads at all
      if (ads.length === 0) {
        setAds([{
          id: 0,
          filename: "default-ad.png",
          type: "image",
          title: "Welcome to Baggage Check",
          is_default: true,
          kiosk_id: null
        }]);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Initial load and setup Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (!KIOSK_ID) return;
    
    // Initial load
    loadAds(true);
    
    // EventSource (SSE) handles automatic reconnection inherently perfectly over standard HTTP
    const eventSource = new EventSource(`${API_URL}/api/ads/kiosk/${KIOSK_ID}/updates-stream`);
    
    eventSource.onmessage = (event) => {
      try {
        if (!event.data) return;
        const data = JSON.parse(event.data);
        if (data.event === 'ads_updated') {
          console.log("SSE push received: Ads updated! Fetching new ads instantly...");
          loadAds(false);
        } else if (data.event === 'connected') {
          console.log("Connected to Ad Updates SSE stream!");
        }
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    };
    
    eventSource.onerror = (error) => {
      console.log("SSE Stream error or reconnecting...");
    };

    // Cleanup
    return () => {
      eventSource.close();
    };
  }, [KIOSK_ID]);

  // Preload next image to ensure smooth transitions and better caching
  useEffect(() => {
    if (ads.length > 1) {
      const nextAd = ads[(adIndex + 1) % ads.length];
      if (nextAd && nextAd.type === "image") {
        const img = new Image();
        img.src = getAdSource(nextAd);
      }
    }
  }, [adIndex, ads, getAdSource]);

  // Background caching & orphaned clearance
  useEffect(() => {
    if (!ads || ads.length === 0) return;

    const autoDownloadVideos = async () => {
      const activeVideoUrls = ads
        .filter(ad => ad?.type === "video")
        .map(ad => getAdSource(ad))
        .filter(url => url && url !== "/default-ad.png");

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
  }, [ads, getAdSource]);

  // Cache-First Playback Resolver
  useEffect(() => {
    let objectUrl = null;
    let isActive = true;

    const resolveAdUrl = async () => {
      const currentAd = ads[adIndex];
      if (!currentAd) {
        if (isActive) setActiveAdUrl("/default-ad.png");
        return;
      }

      const remoteUrl = getAdSource(currentAd);

      if (currentAd.type === "video" && remoteUrl !== "/default-ad.png") {
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
  }, [ads, adIndex, getAdSource]);

  // Carousel auto-slide
  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselData.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Ad rotation logic
  useEffect(() => {
    if (ads.length <= 1) return;
    
    const currentAd = ads[adIndex];
    
    if (currentAd?.type === "image") {
      // Show image for 7 seconds
      const timer = setTimeout(() => {
        setAdIndex((prev) => (prev + 1) % ads.length);
      }, 7000);
      
      return () => clearTimeout(timer);
    }
    
    // For videos, handle in onEnded event
  }, [ads, adIndex]);

  // Handle video end
  const handleVideoEnded = () => {
    setAdIndex((prev) => (prev + 1) % ads.length);
  };

  // Handle video errors
  const handleVideoError = (e) => {
    console.error("Video playback error:", e);
    
    // Try to play next ad
    setTimeout(() => {
      setAdIndex((prev) => (prev + 1) % ads.length);
    }, 1000);
  };

  // Handle image errors
  const handleImageError = (e) => {
    console.error("Image load error:", e);
    
    // Use relative path for default image in public folder
    e.target.src = "/default-ad.png";
    
    // If default also fails, go to next ad
    e.target.onerror = () => {
      console.error("Default ad image also failed to load");
      setTimeout(() => {
        setAdIndex((prev) => (prev + 1) % ads.length);
      }, 1000);
    };
  };

  // Navigate on click
  const handleClick = () => {
    navigate("/home");
  };

  // Safely get current ad with fallback
  const currentAd = ads[adIndex] || {
    id: 0,
    filename: "default-ad.png",
    type: "image",
    title: "Welcome to Baggage Check",
    is_default: true
  };

  const isImage = currentAd.type === "image";
  const isVideo = currentAd.type === "video";
  const hasAds = ads.length > 0;

  // If still loading after 5 seconds, show something anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        if (ads.length === 0) {
          setAds([{
            id: 0,
            filename: "default-ad.png",
            type: "image",
            title: "Welcome to Baggage Check",
            is_default: true,
            kiosk_id: null
          }]);
        }
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isLoading, ads.length]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col cursor-pointer"
      style={{
        backgroundColor: "var(--theme-bg)", // Use theme background
      }}
      onClick={handleClick}
    >
      {/* Loading screen - ONLY show for initial load */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "var(--theme-bg)" }}
        >
          <div className="flex flex-col items-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mb-4"
              style={{
                borderColor: "var(--theme-font)",
                borderTopColor: "transparent",
                borderBottomColor: "transparent",
              }}
            ></div>
            <p style={{ color: "var(--theme-font)", opacity: 0.8 }}>Loading advertisements...</p>
            <p className="text-sm mt-2" style={{ color: "var(--theme-font)", opacity: 0.6 }}>
              Kiosk ID: {KIOSK_ID}
            </p>
          </div>
        </div>
      )}


      {/* Top Carousel */}
      <div
        className="h-[11%] min-h-[120px] pb-6 flex flex-col items-center justify-center p-2"
        style={{
          background: `linear-gradient(to bottom, var(--theme-bg), var(--theme-bg))`,
        }}
      >
        <div className="w-full h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold mb-1 tracking-tight" style={{ color: "var(--theme-font)" }}>
            {carouselData[carouselIndex].title}
          </h1>
          <p className="text-lg mb-2" style={{ color: "var(--theme-font)", opacity: 0.8 }}>
            {carouselData[carouselIndex].description}
          </p>
          <p className="text-xl font-semibold" style={{ color: "var(--theme-fontnew)", opacity: 0.9 }}>
            Touch anywhere to continue
          </p>
        </div>

        <div className="flex mt-2 gap-2">
          {carouselData.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCarouselIndex(idx);
              }}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  idx === carouselIndex
                    ? "var(--theme-font)"
                    : "rgba(0, 0, 0, 0.5)",
                opacity: idx === carouselIndex ? 1 : 0.5,
                transform: idx === carouselIndex ? "scale(1.1)" : "scale(1)",
              }}
              aria-label={`Go to slide ${idx + 1}`}
            ></button>
          ))}
        </div>
      </div>

      {/* Ad Display Area */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ backgroundColor: "#000000" }}
        onPointerDown={handleAdAreaPointerDown}
        onPointerUp={handleAdAreaPointerUp}
        onPointerCancel={handleAdAreaPointerUp}
      >
        {hasAds ? (
          isImage ? (
            <div className="w-full h-full flex items-center justify-center">
              <img
                key={activeAdUrl}
                ref={imageRef}
                src={activeAdUrl}
                className="w-full h-full object-cover"
                alt={currentAd.title || "Advertisement"}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={handleImageError}
              />
            </div>
          ) : isVideo ? (
            <div className="w-full h-full">
              <video
                key={activeAdUrl}
                ref={videoRef}
                src={activeAdUrl}
                autoPlay
                loop={isVideo && ads.length === 1}
                muted
                playsInline
                className="w-full h-full object-cover"
                onEnded={handleVideoEnded}
                onError={handleVideoError}
                preload="auto"
                disablePictureInPicture
                disableRemotePlayback
              />
              
              <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/50 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black/50 to-transparent"></div>
              
              {currentAd.title && (
                <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1.5 rounded text-sm backdrop-blur-sm">
                  {currentAd.title}
                </div>
              )}
            </div>
          ) : (
            // Unknown type, show default
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <img
                src="/default-ad.png"
                alt="Default Advertisement"
                className="w-full h-full object-cover"
              />
            </div>
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white">
            <img
              src="/default-ad.png"
              alt="Default Advertisement"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-10 text-center">
              <p className="text-2xl">No advertisements available.</p>
              <p className="text-lg mt-2 text-gray-400">Touch screen to continue</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        video {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000;
          -webkit-transform: translateZ(0);
          -webkit-backface-visibility: hidden;
          -webkit-perspective: 1000;
        }
        
        * {
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Optimize for 4K displays */
        @media (min-width: 3840px) {
          .text-3xl { font-size: 2.5rem; }
          .text-xl { font-size: 1.75rem; }
          .text-lg { font-size: 1.5rem; }
          .text-sm { font-size: 1rem; }
        }
        
        /* Force hardware acceleration */
        .bg-black {
          -webkit-transform: translate3d(0,0,0);
          transform: translate3d(0,0,0);
        }
      `}</style>
    </div>
  );
}