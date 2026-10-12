import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import io from "socket.io-client";
import {
  Wifi, WifiOff, Scale, Camera, Barcode, AlertCircle,
  RefreshCw, CheckCircle, XCircle, Clock, MapPin, Power,
  ChevronDown, ChevronUp, Terminal
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL;
const socket = io(API_URL);

const KioskStatusDashboard = () => {
  const [allKiosks, setAllKiosks] = useState([]);
  const [kioskStatuses, setKioskStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "status", direction: "desc" });

  // Raw data monitor
  const [rawDataLog, setRawDataLog] = useState([]);
  const [showRawData, setShowRawData] = useState(false);
  const [lastRawData, setLastRawData] = useState(null);
  const logContainerRef = useRef(null);

  // Stable hardware status tracking (to avoid flapping)
  // Structure: { "kioskId_scale": { displayed, lastRaw, count }, ... }
  const [stableHardware, setStableHardware] = useState({});

  const isComponentOnline = (statusValue) => {
    if (!statusValue) return false;
    return statusValue.toString().toLowerCase().includes("online");
  };

  // Update displayed hardware status with debounce (2 consecutive same)
  const updateHardwareStatus = (kioskId, component, rawOnline) => {
    const key = `${kioskId}_${component}`;
    setStableHardware(prev => {
      const current = prev[key] || { displayed: rawOnline, lastRaw: rawOnline, count: 1 };
      const newCount = (current.lastRaw === rawOnline) ? current.count + 1 : 1;
      let newDisplayed = current.displayed;
      // Only change displayed status after 2 consecutive identical reports
      if (newCount >= 2 && current.displayed !== rawOnline) {
        newDisplayed = rawOnline;
      }
      return {
        ...prev,
        [key]: {
          displayed: newDisplayed,
          lastRaw: rawOnline,
          count: newCount
        }
      };
    });
  };

  useEffect(() => {
    if (logContainerRef.current && showRawData) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [rawDataLog, showRawData]);

  const fetchAllKiosks = async () => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000);
    try {
      const res = await fetch(`${API_URL}/api/kiosks/getAllKiosks`, { signal: abortController.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Fetch Error");
      const data = await res.json();
      setAllKiosks(data || []);
    } catch (err) {}
  };

  const fetchStatuses = useCallback(async () => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 2000); // Strict timeout for 3s poll
    try {
      const res = await fetch(`${API_URL}/api/kiosks/all`, { signal: abortController.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Fetch Error");
      const data = await res.json();
      setKioskStatuses(data || {});
      setLastUpdated(new Date());
      addToLog("REST Poll", data);
    } catch (err) {}
  }, []);

  const addToLog = (source, data) => {
    const timestamp = new Date().toLocaleTimeString();
    setRawDataLog(prev => {
      const newLog = [{ timestamp, source, data: JSON.parse(JSON.stringify(data)) }, ...prev];
      return newLog.slice(0, 15);
    });
    setLastRawData(data);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchAllKiosks(), fetchStatuses()]);
      setLoading(false);
    };
    fetchInitialData();
    const interval = setInterval(fetchStatuses, 3000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  useEffect(() => {
    socket.on("update_dashboard", (data) => {
      console.log("📡 Real-time update received:", data);
      addToLog("Socket.IO", data);
      setKioskStatuses(data);
      setLastUpdated(new Date());
    });
    return () => {
      socket.off("update_dashboard");
    };
  }, []);

  // When kioskStatuses changes, feed raw hardware statuses into the stable updater
  useEffect(() => {
    Object.entries(kioskStatuses).forEach(([kioskId, status]) => {
      const id = String(kioskId);
      const scaleOnline = isComponentOnline(status.scaleStatus);
      const scannerOnline = isComponentOnline(status.scannerStatus);
      const cameraOnline = isComponentOnline(status.realsenseStatus);
      updateHardwareStatus(id, "scale", scaleOnline);
      updateHardwareStatus(id, "scanner", scannerOnline);
      updateHardwareStatus(id, "camera", cameraOnline);
    });
  }, [kioskStatuses]);

  const completeKiosks = useMemo(() => {
    const kioskMap = new Map();
    allKiosks.forEach(kiosk => {
      const rawId = kiosk.id || kiosk.kiosk_id || kiosk.kiosk_name;
      const id = String(rawId);
      kioskMap.set(id, { ...kiosk, id });
    });
    Object.entries(kioskStatuses).forEach(([statusKey, status]) => {
      const id = String(statusKey);
      const existing = kioskMap.get(id);
      if (existing) {
        kioskMap.set(id, { ...existing, ...status, id });
      } else {
        kioskMap.set(id, {
          id,
          kiosk_name: status.kiosk_name || `Kiosk ${id}`,
          kiosk_location: status.kiosk_location || "Unknown",
          ...status,
        });
      }
    });
    return Array.from(kioskMap.values());
  }, [allKiosks, kioskStatuses]);

  const mergedKiosks = useMemo(() => {
    return completeKiosks
      .map((kiosk) => {
        const kioskId = String(kiosk.id || kiosk.kiosk_id || kiosk.kiosk_name);
        const status = kioskStatuses[kioskId] || {};
        const hasRealTimeData = !!kioskStatuses[kioskId];
        const isOnline = hasRealTimeData;

        // Get stable displayed status for each component
        const scaleKey = `${kioskId}_scale`;
        const scannerKey = `${kioskId}_scanner`;
        const cameraKey = `${kioskId}_camera`;
        const scaleOnline = stableHardware[scaleKey]?.displayed ?? false;
        const scannerOnline = stableHardware[scannerKey]?.displayed ?? false;
        const cameraOnline = stableHardware[cameraKey]?.displayed ?? false;

        return {
          ...kiosk,
          ...status,
          id: kioskId,
          isOnline,
          components: {
            scale: { online: scaleOnline, name: "Weighing Scale" },
            scanner: { online: scannerOnline, name: "Barcode Scanner" },
            camera: { online: cameraOnline, name: "Camera" }
          },
          onlineComponents: [scaleOnline, scannerOnline, cameraOnline].filter(Boolean).length,
          totalComponents: 3,
          kiosk_name:
  kiosk.kiosk_name ||
  kiosk.kiosk_id ||
  kiosk.name ||
  status.kiosk_name ||
  `Kiosk ${kioskId}`,
          kiosk_location: kiosk.kiosk_location || status.kiosk_location || "Unknown",
          lastUpdated: status.lastUpdated || status.lastSeen || kiosk.last_updated
        };
      })
      .sort((a, b) => {
        // Online first, then by name for stability
        if (a.isOnline !== b.isOnline) {
          return sortConfig.direction === "desc"
            ? (b.isOnline ? 1 : -1) - (a.isOnline ? 1 : -1)
            : (a.isOnline ? 1 : -1) - (b.isOnline ? 1 : -1);
        }
        const nameA = (a.kiosk_name || "").toLowerCase();
        const nameB = (b.kiosk_name || "").toLowerCase();
        if (nameA !== nameB) {
          return sortConfig.direction === "desc" ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
        }
        return String(a.id).localeCompare(String(b.id));
      });
  }, [completeKiosks, kioskStatuses, stableHardware, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const totalKiosks = mergedKiosks.length;
  const onlineKiosks = mergedKiosks.filter(k => k.isOnline).length;
  const offlineKiosks = totalKiosks - onlineKiosks;
  const filteredKiosks = mergedKiosks.filter(k => {
    if (filter === "all") return true;
    return filter === "online" ? k.isOnline : !k.isOnline;
  });
console.log("test",filteredKiosks)
  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchAllKiosks(), fetchStatuses()]);
    setLoading(false);
  };

  const ComponentStatusCell = ({ online, name }) => (
    <div className="flex flex-col items-center">
      {name === "Weighing Scale" && <Scale size={24} className={online ? "text-green-500" : "text-red-500"} />}
      {name === "Barcode Scanner" && <Barcode size={24} className={online ? "text-green-500" : "text-red-500"} />}
      {name === "Camera" && <Camera size={24} className={online ? "text-green-500" : "text-red-500"} />}
      <span className={`text-xs mt-1 px-2 py-1 rounded-full ${online ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
        {online ? "Online" : "Offline"}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <div className="mr-3 p-2 bg-blue-100 rounded-lg"><Power className="text-blue-600" size={28} /></div>
              Kiosk Status Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Monitor all kiosk devices in real-time</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              <Clock size={16} className="inline mr-1" />
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
            </div>
            <button onClick={handleRefresh} disabled={loading} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              <RefreshCw size={18} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SummaryCard title="Total Kiosks" count={totalKiosks} icon={<Power size={24} />} color="bg-gradient-to-r from-gray-500 to-gray-600" onClick={() => setFilter("all")} active={filter === "all"} />
          <SummaryCard title="Online" count={onlineKiosks} icon={<Wifi size={24} />} color="bg-gradient-to-r from-green-500 to-emerald-600" onClick={() => setFilter("online")} active={filter === "online"} />
          <SummaryCard title="Offline" count={offlineKiosks} icon={<WifiOff size={24} />} color="bg-gradient-to-r from-red-500 to-rose-600" onClick={() => setFilter("offline")} active={filter === "offline"} />
        </div>
      </div>

      {/* Kiosk Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Kiosk Status ({filteredKiosks.length} of {totalKiosks})</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filter:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {["all", "online", "offline"].map((f) => (<button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === f ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>))}
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("status")}><div className="flex items-center">Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}</div></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("kiosk_name")}><div className="flex items-center">Kiosk Name {sortConfig.key === "kiosk_name" && (sortConfig.direction === "asc" ? "↑" : "↓")}</div></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weighing Scale</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode Scanner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Camera</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && filteredKiosks.length === 0 ? ( 
                <tr><td colSpan="7" className="px-6 py-12 text-center"><div className="flex justify-center items-center"><RefreshCw className="animate-spin text-blue-500 mr-3" /><span>Loading...</span></div></td></tr>
              ) : filteredKiosks.length === 0 && !loading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center"><div className="flex flex-col items-center text-gray-500"><AlertCircle size={48} className="mb-4" /><p>No kiosks found</p></div></td></tr>
              ) : (
                filteredKiosks.map((kiosk) => (
                  <tr key={kiosk.id} className={`hover:bg-gray-50 transition-colors ${kiosk.isOnline ? "bg-green-50/50" : "bg-red-50/50"}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg mr-3 ${kiosk.isOnline ? "bg-green-100" : "bg-red-100"}`}>
                          {kiosk.isOnline ? <CheckCircle className="text-green-600" size={20} /> : <XCircle className="text-red-600" size={20} />}
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${kiosk.isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {kiosk.isOnline ? "Online" : "Offline"}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">{kiosk.onlineComponents} of {kiosk.totalComponents} components online</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="font-medium text-gray-900">{kiosk.kiosk_name}</div></td>
                    <td className="px-6 py-4"><div className="flex items-center"><MapPin size={16} className="text-gray-400 mr-2" /><span>{kiosk.location}</span></div></td>
                    <td className="px-6 py-4"><ComponentStatusCell online={kiosk.components.scale.online} name={kiosk.components.scale.name} /></td>
                    <td className="px-6 py-4"><ComponentStatusCell online={kiosk.components.scanner.online} name={kiosk.components.scanner.name} /></td>
                    <td className="px-6 py-4"><ComponentStatusCell online={kiosk.components.camera.online} name={kiosk.components.camera.name} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center"><Clock size={16} className="text-gray-400 mr-2" />
                        <div>{kiosk.lastUpdated ? new Date(kiosk.lastUpdated).toLocaleDateString() : "Never"}<br /><span className="text-sm text-gray-500">{kiosk.lastUpdated ? new Date(kiosk.lastUpdated).toLocaleTimeString() : ""}</span></div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>Showing <span className="font-semibold">{filteredKiosks.length}</span> of <span className="font-semibold">{totalKiosks}</span> kiosks</div>
            <div className="flex items-center space-x-4"><span className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div><span className="mr-3">Online</span><div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div><span>Offline</span></span><span className="text-xs">Auto-refresh every 3s</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-white rounded-lg shadow">
        <h3 className="font-medium text-gray-700 mb-3">Status Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center"><div className="p-2 bg-green-100 rounded-lg mr-3"><CheckCircle className="text-green-600" size={20} /></div><div><p className="font-medium">Online</p><p className="text-sm text-gray-600">Kiosk is sending real‑time data (working)</p></div></div>
          <div className="flex items-center"><div className="p-2 bg-red-100 rounded-lg mr-3"><XCircle className="text-red-600" size={20} /></div><div><p className="font-medium">Offline</p><p className="text-sm text-gray-600">No data received from this kiosk</p></div></div>
          <div className="flex items-center"><div className="p-2 bg-blue-100 rounded-lg mr-3"><AlertCircle className="text-blue-600" size={20} /></div><div><p className="font-medium">Component Status</p><p className="text-sm text-gray-600">Individual components may be offline</p></div></div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, count, icon, color, onClick, active }) => (
  <div onClick={onClick} className={`relative p-5 rounded-xl shadow-lg cursor-pointer transition-all transform hover:scale-[1.02] ${active ? "ring-2 ring-offset-2 ring-blue-500 shadow-lg" : ""} ${color} text-white`}>
    <div className="flex justify-between items-start">
      <div><p className="text-sm opacity-90">{title}</p><p className="text-3xl font-bold mt-2">{count}</p></div>
      <div className="p-3 bg-white/20 rounded-lg">{icon}</div>
    </div>
    {active && <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full"></div>}
  </div>
);

export default KioskStatusDashboard;