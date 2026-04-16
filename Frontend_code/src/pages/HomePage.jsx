import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import { useTranslation } from "react-i18next";

// Import components
import AdBanner from "./AdBanner";
import LoadingOverlay from "../components/Homepagecomponents/LoadingOverlay";
import ScannerSection from "../components/Homepagecomponents/ScannerSection";
import ManualEntrySection from "../components/Homepagecomponents/ManualEntrySection";
import InstructionsModal from "../components/Homepagecomponents/InstructionsModal";
import Timmer from "../components/Timmer";
import AssistanceFooter from "../components/Homepagecomponents/AssistanceFooter";
import AirportHeader from "../components/Homepagecomponents/AirportHeader";
import BackgroundElements from "../components/Homepagecomponents/BackgroundElements";

// Import design tokens
import { designTokens } from "../styles/designTokens.js";

const API_URL = process.env.REACT_APP_API_URL;
const API_URL2 = process.env.REACT_APP_API_URL_KIOSK;
// Force WebSocket transport for minimal latency
const socket = io(API_URL2, { transports: ['websocket'] });

const HomePage = () => {
  const [flights, setFlights] = useState([]);
  
  const [selectedAirline, setSelectedAirline] = useState("");
  const [selectedFlightType, setSelectedFlightType] = useState("");
  const [loadingFlight, setLoadingFlight] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [barcodeDetected, setBarcodeDetected] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorModal, setErrorModal] = useState(null); // New state for persistent error modal

  const navigate = useNavigate();
  const { t } = useTranslation();

  // Load flights
  useEffect(() => {
    loadFlights();
  }, []);

  // WebSocket listeners
  useEffect(() => {
    setupSocketListeners();
    return cleanupSocketListeners;
  }, [flights, navigate, isProcessing]);

  const loadFlights = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/flights`);
      setFlights(response.data);
    } catch (err) {
      console.error("Failed to fetch flights:", err);
      setScanError("Unable to load airline data. Please use manual entry or seek assistance.");
    }
  };

  const setupSocketListeners = () => {
    socket.on("scan_start", handleScanStart);
    socket.on("barcode_data", handleBarcodeData);
    socket.on("connect", handleScannerConnect);
    socket.on("connect_error", handleScannerError);
  };

  const cleanupSocketListeners = () => {
    socket.off("scan_start");
    socket.off("barcode_data");
    socket.off("connect");
    socket.off("connect_error");
  };

  const handleScanStart = useCallback(({ barcode }) => {
    if (isProcessing) {
      console.log("Already processing, ignoring new scan start.");
      return;
    }

    console.log("Scan started, showing loading overlay");
    setIsProcessing(true);
    setBarcodeDetected(true);
    setLoadingFlight({
      name: "Scanning...",
      logo: null,
      flight: "---",
    });
  }, [isProcessing]);

  const handleBarcodeData = useCallback(({ barcode, details, error }) => {
    console.log("Barcode details:", details);
    if (error) {
      setScanError(error);
      setLoadingFlight(null);
      setBarcodeDetected(false);
      setIsProcessing(false);
      return;
    }

    if (!details) {
      setScanError("Invalid boarding pass. Please try again.");
      setLoadingFlight(null);
      setBarcodeDetected(false);
      setIsProcessing(false);
      setTimeout(() => setScanError(null), 3000);
      return;
    }

    // Wait for flights to load
    if (flights.length === 0) {
      setScanError("Flight data still loading, please wait...");
      setTimeout(() => setScanError(null), 2000);
      setLoadingFlight(null);
      setBarcodeDetected(false);
      setIsProcessing(false);
      return;
    }

    // Process the details
    processBarcodeData(details);
  }, [flights]);

  const processBarcodeData = (details) => {
    const matchedFlight = findMatchingFlight(details);

    if (!matchedFlight) {
      handleFlightNotFound();
      return;
    }

    const baggageData = createBaggageData(matchedFlight, details);
    // Update loading overlay with actual flight details
    setLoadingFlight({
      name: baggageData.airline,
      logo: baggageData.airlineLogo,
      flight: baggageData.flightNumber,
    });
    // Navigate immediately – no artificial delay
    navigate("/baggageCheckPage", { state: { baggageData } });
    // Reset states after navigation (component will unmount, but still clean up)
    setLoadingFlight(null);
    setBarcodeDetected(false);
    setIsProcessing(false);
  };

  const findMatchingFlight = (details) => {
    const scannedAirline = details.airlineName?.trim().toLowerCase();
    const scannedCode = details.airlineCode?.trim().toLowerCase();

    console.log("Scanned airline name:", scannedAirline);
    console.log("Scanned airline code:", scannedCode);

    // First try exact match on airline code (only if both are defined)
    if (scannedCode) {
      const codeMatch = flights.find(f => {
        const airlineCode = f.code?.trim().toLowerCase();
        return airlineCode && airlineCode === scannedCode;
      });
      if (codeMatch) {
        console.log("Exact code match found:", codeMatch);
        return codeMatch;
      }
    }

    // Then try exact match on airline name (only if both are defined)
    if (scannedAirline) {
      const exactNameMatch = flights.find(f => {
        const airlineName = f.airline?.trim().toLowerCase();
        return airlineName && airlineName === scannedAirline;
      });
      if (exactNameMatch) {
        console.log("Exact name match found:", exactNameMatch);
        return exactNameMatch;
      }
    }

    // Fallback: partial name match (least preferred)
    if (scannedAirline) {
      const partialMatch = flights.find(f => {
        const airlineName = f.airline?.trim().toLowerCase();
        return airlineName && (airlineName.includes(scannedAirline) || scannedAirline.includes(airlineName));
      });
      if (partialMatch) {
        console.log("Partial name match found:", partialMatch);
        return partialMatch;
      }
    }

    console.log("No match found");
    return null;
  };

  const createBaggageData = (flight, details) => {
    const maxWeight = details.flightType === "Domestic"
      ? flight.max_weight_domestic
      : flight.max_weight_international;

    const maxVolume = details.flightType === "Domestic"
      ? flight.max_volume_domestic
      : flight.max_volume_international;

    return {
      airline: flight.airline,
      airlineLogo: flight.logo,
      flightType: details.flightType,
      origin: details.origin,
      destination: details.destination,
      flightNumber: details.flightNumber,
      departureTime: details.departureTime,
      maxWeight,
      maxVolume,
      passengerName: details.passengerName,
      seat: details.seat,
    };
  };

  const handleFlightNotFound = () => {
    // Set persistent modal error instead of temporary toast
    setErrorModal({
      message: "No details found for this flight.",
      show: true,
    });
    setLoadingFlight(null);
    setBarcodeDetected(false);
    setIsProcessing(false);
  };

  const handleScannerConnect = () => {
    console.log("Scanner connected");
    setSocketConnected(true);
    setScanError(null);
  };

  const handleScannerError = () => {
    setSocketConnected(false);
    setScanError("Scanner unavailable. Please use manual entry.");
  };

  const handleManualEntry = () => {
    const match = flights.find((flight) => flight.airline === selectedAirline);
    if (!match) {
      setScanError("Please select a valid airline");
      setTimeout(() => setScanError(null), 3000);
      return;
    }

    const baggageData = createManualBaggageData(match);
    handleManualFlightLoading(baggageData);
  };

  const createManualBaggageData = (match) => ({
    airline: match.airline,
    airlineLogo: match.logo,
    flightType: selectedFlightType?.toLowerCase(),
    maxWeight: selectedFlightType?.toLowerCase() === 'domestic'
      ? match.max_weight_domestic
      : match.max_weight_international,
    maxVolume: selectedFlightType?.toLowerCase() === 'domestic'
      ? match.max_volume_domestic
      : match.max_volume_international,
    flightNumber: "---",
    passengerName: "Manual Entry",
  });

  const handleManualFlightLoading = (baggageData) => {
    setLoadingFlight({
      name: baggageData.airline,
      logo: baggageData.airlineLogo,
    });

    setTimeout(() => {
      navigate("/baggageCheckPage", { state: { baggageData } });
      setLoadingFlight(null);
    }, 1200);
  };

  const handleScanButton = () => {
    if (!socketConnected) {
      setScanError("Scanner not ready. Please wait.");
      return;
    }
    setScanning(true);
    socket.emit("trigger_scan");
    setTimeout(() => setScanning(false), 2000);
  };

  return (
    <div
      className="h-screen flex flex-col relative overflow-hidden"
      style={{
        ...styles.pageContainer,
        backgroundColor: "var(--theme-bg)",
        color: "var(--theme-font)",
      }}
    >
      <BackgroundElements />

      {loadingFlight && <LoadingOverlay loadingFlight={loadingFlight} />}
      <div className="h-[45vh] bg-black overflow-hidden">
        <AdBanner />
      </div>

      <Timmer />

      <div
        className="h-[55vh] flex flex-col overflow-hidden"
        style={{
          backgroundColor: "var(--theme-cardBg)",
          color: "var(--theme-font)",
        }}
      >
        <AirportHeader />
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-6xl mx-auto">
            {!socketConnected && (
              <div className="text-yellow-400 text-sm mb-2"
                      style={{
    
          color: "var(--theme-fontnew)",
        }}></div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ScannerSection
                scanning={scanning}
                barcodeDetected={barcodeDetected}
                onScan={handleScanButton}
                onShowInstructions={() => setShowInstructions(!showInstructions)}
              />

              <ManualEntrySection
                flights={flights}
                selectedAirline={selectedAirline}
                setSelectedAirline={setSelectedAirline}
                selectedFlightType={selectedFlightType}
                setSelectedFlightType={setSelectedFlightType}
                onManualEntry={handleManualEntry}
                t={t}
              />
            </div>

            {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}

            <AssistanceFooter />
          </div>
        </div>
      </div>

      {/* Persistent Error Modal */}
      {errorModal?.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div
            className="rounded-lg p-6 max-w-md mx-4 shadow-xl transform transition-all"
            style={{
              backgroundColor: "var(--theme-cardBg)",
              color: "var(--theme-font)",
            }}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold">Flight Details</h3>
              <button
                onClick={() => setErrorModal(null)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm">{errorModal.message}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setErrorModal(null)}
                className="px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: "var(--theme-border)",
                  color: "var(--theme-font)",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{styles.globalStyles}</style>
    </div>
  );
};

const styles = {
  pageContainer: {
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif",
    fontWeight: 400,
  },
  globalStyles: `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    
    @keyframes scan {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0) translateX(0); }
      50% { transform: translateY(-20px) translateX(10px); }
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%) skewY(-12deg); }
      100% { transform: translateX(100%) skewY(-12deg); }
    }
    
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
    
    .animate-progress {
      animation: progress 1.5s ease-in-out infinite;
    }
    
    .animate-scan {
      animation: scan 1s linear infinite;
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: rgba(59, 130, 246, 0.5);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(59, 130, 246, 0.7);
    }
    
    /* Selection color */
    ::selection {
      background-color: ${designTokens.primary[500]}40;
      color: ${designTokens.neutral[900]};
    }
  `,
};

export default HomePage;