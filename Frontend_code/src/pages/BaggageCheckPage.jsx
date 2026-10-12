import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Timmer from "../components/Timer";
import { useTranslation } from "react-i18next";
import AdBanner from "./AdBanner";
import Language from "../components/Language";

const AnimatedNumber = ({ value, decimals = 0, duration = 800 }) => {
  const numericValue = parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = React.useRef(0);

  useEffect(() => {
    const startValue = prevValueRef.current;
    if (startValue === numericValue) return;

    let startTimestamp = null;
    let animationFrame;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const current = startValue + (numericValue - startValue) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(numericValue);
        prevValueRef.current = numericValue;
      }
    };
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [numericValue, duration]);

  return <>{displayValue.toFixed(decimals)}</>;
};

const CalculatingNumbers = ({ length = 2 }) => {
  const [val, setVal] = useState("0".repeat(length));
  useEffect(() => {
    const interval = setInterval(() => {
      let str = "";
      for (let i = 0; i < length; i++) {
        str += Math.floor(Math.random() * 10).toString();
      }
      setVal(str);
    }, 100);
    return () => clearInterval(interval);
  }, [length]);

  return <>{val}</>;
};

const API_URL = process.env.REACT_APP_API_URL;
const API_URL2 = process.env.REACT_APP_API_URL_KIOSK;
const API_URL3 = process.env.REACT_APP_API_URL_Camera;

export default function BaggageCheckPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { baggageData = {} } = location.state || {};

  const [currentWeight, setCurrentWeight] = useState(0);
  const [volume, setVolume] = useState(0);
  const [dimensions, setDimensions] = useState({
    height: 0,
    width: 0,
    length: 0,
  });
  const [objectDetected, setObjectDetected] = useState(false);
  const [noBagTimeout, setNoBagTimeout] = useState(false);
  const [weightStable, setWeightStable] = useState(false);
  const [hardwareError, setHardwareError] = useState(false);
  const { airline = "", origin, destination } = baggageData;



  const [limits, setLimits] = useState(() => {
    if (baggageData?.maxWeight && baggageData?.maxVolume) {
      return { maxWeight: baggageData.maxWeight, maxVolume: baggageData.maxVolume };
    }
    return { maxWeight: null, maxVolume: null };
  });
  const [isLoadingLimits, setIsLoadingLimits] = useState(() => !(baggageData?.maxWeight && baggageData?.maxVolume));

  const { t } = useTranslation();

  const isLoadingVolume = currentWeight > 0.1 && (!objectDetected || volume === 0);
  const isReady = currentWeight > 0.1 && objectDetected && volume > 0;

  // Status functions with custom yellow thresholds
  const getWeightStatus = (value, limit) => {
    if (value <= 0) return "gray";
    const diff = value - limit;
    if (diff <= 0) return "green";
    if (diff > 0 && diff <= 1) return "yellow";
    return "red";
  };

  const getVolumeStatus = (value, limit) => {
    if (value <= 0) return "gray";
    const diff = value - limit;
    if (diff <= 0) return "green";
    if (diff > 0 && diff <= 5) return "yellow";
    return "red";
  };

  const handleCompleteCheck = async () => {
    if (!isReady) {
      alert(t("noBaggageDetectedAlert") || "Please place baggage on the scale");
      return;
    }

    const payload = {
      airline,
      origin,
      destination,
      weight: currentWeight,
      height: dimensions.height,
      width: dimensions.width,
      length: dimensions.length,
      volume,
      status: {
        weight: currentWeight <= limits.maxWeight ? "ok" : "over",
        volume: volume <= limits.maxVolume ? "ok" : "over",
      },
    };

    console.log("📦 Sending baggage data:", payload);

    try {
      const res = await fetch(`${API_URL}/api/baggage/save-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save check");
      const data = await res.json();
      console.log("✅ Backend response:", data);
      navigate("/ad_player");
    } catch (err) {
      console.error("❌ Failed to save baggage check:", err.message);
      alert("❌ Failed to save baggage check!");
    }
  };

  // Fetch weight every 1s with stability check
  useEffect(() => {
    let stableCount = 0;
    let previousWeight = 0;
    let errorCount = 0;

    const fetchWeight = async () => {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 900); // Prevent overlapping 1s intervals
      try {
        const res = await fetch(`${API_URL2}/api/weight?t=${Date.now()}`, {
          signal: abortController.signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Fetch failed");

        const data = await res.json();
        errorCount = 0; // reset on success
        if (data?.weight !== undefined) {
          const newWeight = parseFloat(data.weight) || 0;
          setCurrentWeight(newWeight);

          if (Math.abs(newWeight - previousWeight) < 0.1) {
            stableCount++;
            if (stableCount >= 3 && newWeight > 0.1) {
              setWeightStable(true);
            }
          } else {
            stableCount = 0;
            setWeightStable(false);
          }
          previousWeight = newWeight;
        }
      } catch (err) {
        errorCount++;
        if (errorCount >= 2) {
          setCurrentWeight(0);
          setWeightStable(false);
          setHardwareError(true);
        }
      }
    };

    fetchWeight();
    const interval = setInterval(fetchWeight, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch object/dimensions every 5s
  useEffect(() => {
    let timeoutId;
    let errorCount = 0;

    const fetchObject = async () => {
      const abortController = new AbortController();
      const timeoutIdFetch = setTimeout(() => abortController.abort(), 4500);
      try {
        const res = await fetch(`${API_URL3}/api/detection`, {
          signal: abortController.signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        clearTimeout(timeoutIdFetch);
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        errorCount = 0;

        if (data?.detected && weightStable && currentWeight > 0.1) {
          clearTimeout(timeoutId);
          setDimensions({
            height: data.height_cm,
            width: data.width_cm,
            length: data.length_cm,
          });
          const totalLinearCm = data.height_cm + data.width_cm + data.length_cm;
          setVolume(Math.round(totalLinearCm));
          setObjectDetected(true);
          setNoBagTimeout(false);
        } else {
          setDimensions({ height: 0, width: 0, length: 0 });
          setVolume(0);
          setObjectDetected(false);

          timeoutId = setTimeout(() => setNoBagTimeout(true), 1500);
        }
      } catch (err) {
        errorCount++;
        if (errorCount >= 1) {
          setHardwareError(true);
        }
      }
    };

    fetchObject();
    const interval = setInterval(fetchObject, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [currentWeight, weightStable]);

  // Fetch airline limits with loading state
  useEffect(() => {
    const fetchLimits = async () => {
      // Return early since limits are already seeded synchronously from route state.
      if (baggageData.maxWeight && baggageData.maxVolume) {
        return;
      }

      setIsLoadingLimits(true);
      try {
        if (airline) {
          const cacheBust = Math.floor(Date.now() / 300000); // 5 min cache
          const res = await fetch(`${API_URL}/api/flights?t=${cacheBust}`);
          if (!res.ok) throw new Error("Failed to fetch");
          const data = await res.json();

          const match = data.find((f) => f.airline === airline);
          if (match) {
            setLimits({
              maxWeight: match.max_weight,
              maxVolume: match.max_volume,
            });
          } else {
            setLimits({ maxWeight: null, maxVolume: null });
          }
        } else {
          setLimits({ maxWeight: null, maxVolume: null });
        }
      } catch (err) {
        setLimits({ maxWeight: null, maxVolume: null });
      } finally {
        setIsLoadingLimits(false);
      }
    };

    fetchLimits();
  }, [airline, baggageData]);

  const weightLimit = parseFloat(limits.maxWeight) || 0;
  const volumeLimit = parseFloat(limits.maxVolume) || 0;

  const weightStatus = getWeightStatus(currentWeight, weightLimit);
  const volumeStatus = getVolumeStatus(volume, volumeLimit);

  const checkInRequired =
    (weightStatus === 'yellow' || weightStatus === 'red') ||
    (volumeStatus === 'yellow' || volumeStatus === 'red');

  const baggageRecommendation = (() => {
    if (currentWeight <= 0.1 || volume === 0 || !objectDetected) {
      return {
        title: t('Awaiting_measurement') || 'Awaiting measurement',
        description:
          t('Awaiting_measurement_desc') ||
          'Place your baggage on the scale to check whether it qualifies as cabin baggage or requires check-in.',
        tone: 'info',
      };
    }

    if (!checkInRequired) {
      return {
        title: t('Cabin_baggage_OK') || 'Cabin baggage OK',
        description:
          t('Cabin_baggage_OK_desc') ||
          'Your bag is within the allowed weight and size limits for cabin baggage. Keep it with you onboard.',
        tone: 'success',
      };
    }

    return {
      title: t('Check_in_baggage_required') || 'Check-in baggage required',
      description:
        t('Check_in_baggage_required_desc') ||
        'Your bag exceeds the cabin weight or size limit. Please use check-in baggage at the counter.',
      tone: 'warning',
    };
  })();
  const statusColors = {
    gray: {
      bg: "rgba(0, 0, 0, 0.05)",
      border: "var(--theme-border)",
      text: "rgba(0, 0, 0, 0.5)",
      icon: "⚪",
    },
    green: {
      bg: "rgba(16, 185, 129, 0.1)",
      border: "rgba(16, 185, 129, 0.3)",
      text: "#10b981",
      icon: "✅",
    },
    yellow: {
      bg: "rgba(245, 158, 11, 0.1)",
      border: "rgba(245, 158, 11, 0.3)",
      text: "#f59e0b",
      icon: "⚠️",
    },
    red: {
      bg: "rgba(239, 68, 68, 0.1)",
      border: "rgba(239, 68, 68, 0.3)",
      text: "#ef4444",
      icon: "❌",
    },
  };

  if (isLoadingLimits) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--theme-bg)" }}
      >
        <div
          className="rounded-xl p-8 shadow-lg max-w-md text-center"
          style={{
            backgroundColor: "var(--theme-cardBg)",
            border: `1px solid var(--theme-border)`,
          }}
        >
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent mx-auto mb-4"
            style={{ borderColor: "var(--theme-border)", borderTopColor: "transparent" }}></div>
          <p style={{ color: "var(--theme-font)" }}>Loading airline limits...</p>
        </div>
      </div>
    );
  }

  if (!limits.maxWeight || !limits.maxVolume) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--theme-bg)" }}
      >
        <div
          className="rounded-xl p-8 shadow-lg max-w-md text-center"
          style={{
            backgroundColor: "var(--theme-cardBg)",
            border: `1px solid var(--theme-border)`,
          }}
        >
          <h1 className="text-2xl font-bold text-red-400 mb-3">
            ❌ {t("missingData")}
          </h1>
          <p className="mb-6" style={{ color: "var(--theme-font)" }}>
            {t("missingDataDesc")}
          </p>
          <button
            className="px-6 py-3 rounded-lg transition-colors"
            style={{
              backgroundColor: "var(--theme-cardBg)",
              border: `1px solid var(--theme-border)`,
              color: "var(--theme-font)",
            }}
            onClick={() => navigate(-1)}
          >
            {t("goBack")}
          </button>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div
      className="flex flex-col relative overflow-hidden"
      style={{ height: "100dvh", width: "100vw", backgroundColor: "var(--theme-bg)" }}
    >
      {hardwareError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="rounded-2xl p-10 shadow-2xl max-w-lg text-center transform transition-all scale-100" style={{ backgroundColor: 'var(--theme-cardBg)', border: '1px solid var(--theme-border)' }}>
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100/20 mb-6 border border-red-500/30">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-red-500">
              {t("System Error") || "System Error"}
            </h2>
            <p className="text-xl mb-8" style={{ color: 'var(--theme-font)' }}>
              {t("There is a problem with the kiosk. Please contact airline staff for assistance.") || "There is a problem with the kiosk. Please contact airline staff for assistance."}
            </p>
            <button
              className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-lg font-semibold transition-colors w-full shadow-lg"
              onClick={() => navigate('/ad_player')}
            >
              {t("goBack") || "Go Back"}
            </button>
          </div>
        </div>
      )}

      {/* Top Ad */}
      <div style={{ height: "50dvh", flexShrink: 0 }}>
        <AdBanner height="100%" />
      </div>

      {/* Bottom Content */}
      <div className="overflow-y-auto px-4" style={{ height: "50dvh", flexShrink: 0 }}>
        <Timmer />
        <div className="w-full">
          <Language />
        </div>

        <div
          className="rounded-xl p-8 shadow-lg w-full max-w-7xl flex flex-col gap-6 justify-center items-center m-10 mx-auto backdrop-blur-sm"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            border: `1px solid var(--theme-border)`,
            color: "var(--theme-font)",
          }}
        >
          {currentWeight <= 0.1 ? (
            /* ----- No baggage at all ----- */
            <div
              className="flex flex-col items-center justify-center gap-4 py-20 rounded-xl"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                border: `1px solid var(--theme-border)`,
                color: "var(--theme-font)",
              }}
            >
              <span className="text-6xl mb-2">🛄</span>
              <p className="text-2xl" style={{ color: "var(--theme-font)" }}>
                {t("No_Baggage_Detected")}
              </p>
              <p className="text-lg" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
                {t("noBaggageDetectedAlert")}
              </p>
              <div
                className="mt-4 p-4 rounded-lg"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
              >
                <p className="text-sm" style={{ color: "var(--theme-font)", opacity: 0.6 }}>
                  {t("Current_reading_Weight")} = {currentWeight.toFixed(2)} {t("Kg")}
                </p>
              </div>
            </div>
          ) : (
            /* ----- Measurement Layout ----- */
            <>
              <div className="mb-2 flex flex-col items-center justify-center gap-2">
                <h1 className="text-3xl font-bold" style={{ color: "var(--theme-font)" }}>
                  ⚖️ {t("placeBaggage")}
                </h1>
                <p className="mt-2" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
                  {t("scaleInstruction")}
                </p>
                {airline && (
                  <div
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.05)",
                      border: `1px solid var(--theme-border)`,
                    }}
                  >
                    <span style={{ color: "var(--theme-font)" }}>✈️ {airline}</span>
                    <span style={{ color: "var(--theme-font)", opacity: 0.6 }}>•</span>
                    <span style={{ color: "var(--theme-font)" }}>
                      {origin}  {destination}
                    </span>
                  </div>
                )}
              </div>
              <div
                className="mt-6 rounded-3xl p-6 border shadow-sm w-full max-w-3xl"
                style={{
                  backgroundColor:
                    baggageRecommendation.tone === 'success'
                      ? 'rgba(16, 185, 129, 0.08)'
                      : baggageRecommendation.tone === 'warning'
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(148, 163, 184, 0.08)',
                  border: `1px solid ${baggageRecommendation.tone === 'success'
                    ? 'rgba(16, 185, 129, 0.25)'
                    : baggageRecommendation.tone === 'warning'
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(148, 163, 184, 0.3)'
                    }`,
                }}
              >
                <div className="flex flex-col gap-4 items-center justify-center w-full max-w-3xl">
                  <div className="flex justify-between gap-2 w-full items-center">
                    <p className="text-lg font-semibold" style={{ color: 'var(--theme-font)' }}>
                      {baggageRecommendation.title}
                    </p>
                    <div className="flex items-center gap-3 text-sm font-semibold" style={{ color: 'var(--theme-font)', opacity: 0.85 }}>
                      <span>
                        {baggageRecommendation.tone === 'success'
                          ? '✅'
                          : baggageRecommendation.tone === 'warning'
                            ? '⚠️'
                            : 'ℹ️'}
                      </span>
                      <span>
                        {checkInRequired
                          ? t('Please_take_this_bag_to_check_in') || 'Please take this bag to check-in.'
                          : t('This_bag_is_okay_for_cabin_baggage') || 'This bag is okay for cabin baggage.'}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--theme-font)', opacity: 0.85 }}>
                    {baggageRecommendation.description}
                  </p>

                </div>
              </div>
              {/* Measurement Cards */}
              <div className="flex justify-center gap-8 w-full mt-6 max-w-5xl">
                {/* Weight Card */}
                <div
                  className={`relative w-full  px-4 py-8  rounded-2xl shadow-xl backdrop-blur-sm transition-all duration-300`}
                  style={{
                    backgroundColor: statusColors[weightStatus].bg,
                    border: `1px solid ${statusColors[weightStatus].border}`,
                  }}
                >
                  <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl rounded-full shadow-lg p-3"
                    style={{
                      backgroundColor: "var(--theme-cardBg)",
                      border: `1px solid var(--theme-border)`,
                    }}
                  >
                    ⚖️
                  </div>
                  <h2 className="text-xl text-center font-semibold mb-4" style={{ color: "var(--theme-font)" }}>
                    {t("weight")}
                  </h2>
                  <p className="text-7xl text-center font-dsdigital" style={{ color: statusColors[weightStatus].text }}>
                    {currentWeight > 0 ? <AnimatedNumber value={currentWeight} decimals={2} /> : "--"}{" "}
                    <span className="text-2xl ml-2" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
                      {t("kg")}
                    </span>
                  </p>
                  <div className="mt-8 flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
                        {t("max")}:
                      </p>
                      <p className="text-xl font-semibold" style={{ color: "var(--theme-font)" }}>
                        {limits.maxWeight || "--"} {t("kg")}
                      </p>
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg"
                      style={{
                        backgroundColor: statusColors[weightStatus].bg,
                        border: `1px solid ${statusColors[weightStatus].border}`,
                      }}
                    >
                      <p
                        className="text-lg font-semibold flex items-center gap-2"
                        style={{ color: statusColors[weightStatus].text }}
                      >
                        <span>{statusColors[weightStatus].icon}</span>
                        {weightStatus === "gray"
                          ? t("noBaggage")
                          : weightStatus === "green"
                            ? t("withinLimit")
                            : weightStatus === "yellow"
                              ? t("slightlyOver")
                              : t("overLimit")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Volume Card */}
                <div
                  className={`relative w-full px-4 py-8  rounded-2xl shadow-xl backdrop-blur-sm transition-all duration-300`}
                  style={{
                    backgroundColor: statusColors[volumeStatus].bg,
                    border: `1px solid ${statusColors[volumeStatus].border}`,
                  }}
                >
                  <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl rounded-full shadow-lg p-3"
                    style={{
                      backgroundColor: "var(--theme-cardBg)",
                      border: `1px solid var(--theme-border)`,
                    }}
                  >
                    📏
                  </div>
                  <h2 className="text-xl text-center font-semibold mb-4" style={{ color: "var(--theme-font)" }}>
                    {t("Total_Size")}
                  </h2>
                  <p className="text-7xl text-center font-dsdigital tracking-widest" style={{ color: isLoadingVolume ? "var(--theme-font)" : statusColors[volumeStatus].text }}>
                    {isLoadingVolume ? <CalculatingNumbers length={3} /> : volume > 0 ? <AnimatedNumber value={volume} decimals={0} /> : "--"}{" "}
                    <span className="text-2xl ml-2" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
                      cm
                    </span>
                  </p>
                  <div className="mt-8 flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
                        {t("max")}:
                      </p>
                      <p className="text-xl font-semibold" style={{ color: "var(--theme-font)" }}>
                        {limits.maxVolume || "--"} cm
                      </p>
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg"
                      style={{
                        backgroundColor: statusColors[volumeStatus].bg,
                        border: `1px solid ${statusColors[volumeStatus].border}`,
                      }}
                    >
                      <p
                        className="text-lg font-semibold flex items-center gap-2"
                        style={{ color: isLoadingVolume ? "var(--theme-font)" : statusColors[volumeStatus].text }}
                      >
                        <span>{isLoadingVolume ? "⏳" : statusColors[volumeStatus].icon}</span>
                        {isLoadingVolume
                          ? t("Measuring...")
                          : volumeStatus === "gray"
                            ? t("noBaggage")
                            : volumeStatus === "green"
                              ? t("withinLimit")
                              : volumeStatus === "yellow"
                                ? t("slightlyOver")
                                : t("overLimit")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Dimensions */}
              <div className="flex justify-center gap-8 w-full max-w-6xl mt-8">
                <div
                  className="flex flex-col items-center justify-center flex-1 p-4 rounded-xl"
                  style={{
                    backgroundColor: "#1e293b",
                    border: `1px solid var(--theme-border)`,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.73)",
                  }}
                >
                  <p className="text-sm mb-2" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
                    {t("Length")}
                  </p>
                  <p className="text-4xl font-dsdigital" style={{ color: "var(--theme-font)" }}>
                    {isLoadingVolume ? <CalculatingNumbers length={2} /> : dimensions.length > 0 ? <AnimatedNumber value={dimensions.length} decimals={0} /> : "--"}
                  </p>
                  <span className="text-sm" style={{ color: "var(--theme-font)", opacity: 0.6 }}>
                    cm
                  </span>
                </div>

                <div
                  className="flex flex-col items-center justify-center flex-1 p-4 rounded-xl"
                  style={{
                    backgroundColor: "#1e293b",
                    border: `1px solid var(--theme-border)`,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <p className="text-sm mb-2" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
                    {t("Width")}
                  </p>
                  <p className="text-4xl font-dsdigital" style={{ color: "var(--theme-font)" }}>
                    {isLoadingVolume ? <CalculatingNumbers length={2} /> : dimensions.width > 0 ? <AnimatedNumber value={dimensions.width} decimals={0} /> : "--"}
                  </p>
                  <span className="text-sm" style={{ color: "var(--theme-font)", opacity: 0.6 }}>
                    cm
                  </span>
                </div>

                <div
                  className="flex flex-col items-center justify-center flex-1 p-4 rounded-xl"
                  style={{
                    backgroundColor: "#1e293b",
                    border: `1px solid var(--theme-border)`,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <p className="text-sm mb-2" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
                    {t("Height")}
                  </p>
                  <p className="text-4xl font-dsdigital" style={{ color: "var(--theme-font)" }}>
                    {isLoadingVolume ? <CalculatingNumbers length={2} /> : dimensions.height > 0 ? <AnimatedNumber value={dimensions.height} decimals={0} /> : "--"}
                  </p>
                  <span className="text-sm" style={{ color: "var(--theme-font)", opacity: 0.6 }}>
                    cm
                  </span>
                </div>
              </div>

            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-6 mt-16 flex-wrap justify-center">
            <button
              className="px-8 py-3 font-semibold rounded-xl transition-all duration-200"
              style={{
                backgroundColor: "var(--theme-font)",
                border: `1px solid var(--theme-font)`,
                color: "var(--theme-bg)",
              }}
              onClick={() => navigate(-1)}
            >
              {t("scanAgain")}
            </button>
            <button
              className={`px-8 py-3 font-semibold rounded-xl transition-all duration-200 ${!isReady
                ? "cursor-not-allowed"
                : "hover:scale-105 shadow-lg"
                }`}
              style={{
                backgroundColor: !isReady
                  ? "rgba(255, 255, 255, 0.62)"
                  : "var(--theme-font)",
                border: `1px solid var(--theme-border)`,
                color: "var(--theme-bg)",
                opacity: !isReady ? 1 : 1,
              }}
              onClick={handleCompleteCheck}
              disabled={!isReady}
            >
              {t("completeCheck")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}