import React, { useState,useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Eye, EyeOff, X } from "lucide-react";
import AutoKioskSender from "../components/AutoKioskSender";
import VirtualKeyboard from "../components/VirtualKeyboard";

const API_URL = process.env.REACT_APP_API_URL ;

export default function LoginPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("kiosk");

  // Kiosk fields
  const [kioskName, setKioskName] = useState("");
  const [kioskPassword, setKioskPassword] = useState("");
  const [showKioskPassword, setShowKioskPassword] = useState(false);

  // Admin fields
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Input refs
  const kioskNameRef = useRef(null);
  const kioskPasswordRef = useRef(null);
  const adminEmailRef = useRef(null);
  const adminPasswordRef = useRef(null);
 
  // --- Kiosk Login ---
  const handleKioskLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_URL}/api/kiosks/login`, {
        kiosk_name: kioskName,
        password: kioskPassword,
      });

      localStorage.setItem("kioskToken", res.data.token);
      localStorage.setItem("kiosk_id", res.data.kiosk_id);
      localStorage.setItem("kiosk_name", res.data.kiosk_name);
      localStorage.setItem("kiosk_location", res.data.kiosk_location);

      navigate("/ad_player");
    } catch (err) {
      setError(err.response?.data?.message || "Kiosk login failed");
    } finally {
      setLoading(false);
    }
  };

  // --- Admin Login ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_URL}/api/admin/login`, {
        email: adminEmail,
        password: adminPassword,
      });

      localStorage.setItem("adminToken", res.data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  // --- Virtual Keyboard Input ---
  const handleVirtualKeyPress = (key) => {
    const updateValue = (setter, value) => {
      if (key === "Backspace") setter(value.slice(0, -1));
      else if (key === "Enter") {
        if (activeTab === "kiosk") handleKioskLogin(new Event("submit"));
        else handleAdminLogin(new Event("submit"));
      } else setter(value + key);
    };

    if (focusedInput === "kioskName") updateValue(setKioskName, kioskName);
    else if (focusedInput === "kioskPassword") updateValue(setKioskPassword, kioskPassword);
    else if (focusedInput === "adminEmail") updateValue(setAdminEmail, adminEmail);
    else if (focusedInput === "adminPassword") updateValue(setAdminPassword, adminPassword);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-800 to-slate-600 relative">
      {/* --- Login Card --- */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white -mt-28 rounded-2xl shadow-2xl p-8 w-full max-w-md z-10"
      >
        {/* <AutoKioskSender /> */}

        <h1 className="text-3xl font-bold text-center text-slate-800 mb-6">
          LOGIN PAGE
        </h1>

        {/* --- Tabs --- */}
        <div className="flex mb-6 justify-center gap-4">
          {["kiosk", "admin"].map((tab) => (
            <button
              key={tab}
              className={`px-6 py-2 rounded-t-lg font-semibold transition-all ${
                activeTab === tab
                  ? "bg-slate-700 text-white"
                  : "bg-gray-200 text-slate-700"
              }`}
              onClick={() => setActiveTab(tab)}
              disabled={loading}
            >
              {activeTab === tab && loading
                ? "Logging in..."
                : tab === "kiosk"
                ? "Kiosk"
                : "Admin"}
            </button>
          ))}
        </div>

        {/* --- Error Message --- */}
        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        {/* --- Kiosk Login Form --- */}
        {activeTab === "kiosk" && (
          <form onSubmit={handleKioskLogin} className="space-y-4">
            <div>
              <label className="block text-slate-600 mb-2">Kiosk Name</label>
              <input
                ref={kioskNameRef}
                type="text"
                value={kioskName}
                placeholder="Enter kiosk name"
                onFocus={() => {
                  setFocusedInput("kioskName");
                  setShowKeyboard(true);
                }}
                onChange={(e) => setKioskName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-slate-600 mb-2">Password</label>
              <input
                ref={kioskPasswordRef}
                type={showKioskPassword ? "text" : "password"}
                value={kioskPassword}
                placeholder="Enter password"
                onFocus={() => {
                  setFocusedInput("kioskPassword");
                  setShowKeyboard(true);
                }}
                onChange={(e) => setKioskPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowKioskPassword(!showKioskPassword)}
                className="absolute right-3 top-9 text-gray-500"
              >
                {showKioskPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="w-full bg-slate-700 text-white py-2 rounded-lg shadow-lg hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </motion.button>
          </form>
        )}

        {/* --- Admin Login Form --- */}
        {activeTab === "admin" && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-slate-600 mb-2">Email</label>
              <input
                ref={adminEmailRef}
                type="email"
                value={adminEmail}
                placeholder="Enter admin email"
                onFocus={() => {
                  setFocusedInput("adminEmail");
                  setShowKeyboard(true);
                }}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-slate-600 mb-2">Password</label>
              <input
                ref={adminPasswordRef}
                type={showAdminPassword ? "text" : "password"}
                value={adminPassword}
                placeholder="Enter password"
                onFocus={() => {
                  setFocusedInput("adminPassword");
                  setShowKeyboard(true);
                }}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                className="absolute right-3 top-9 text-gray-500"
              >
                {showAdminPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="w-full bg-slate-700 text-white py-2 rounded-lg shadow-lg hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </motion.button>
          </form>
        )}
      </motion.div>

      {/* --- Virtual Keyboard (Outside Login Box) --- */}
      {showKeyboard && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 w-full max-w-4xl mx-auto px-4 z-20 bg-gray-200 rounded-xl shadow-lg p-4"
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-700">Virtual Keyboard</h4>
            <button
              onClick={() => setShowKeyboard(false)}
              className="text-gray-600 hover:text-red-500"
            >
              <X size={20} />
            </button>
          </div>

          <VirtualKeyboard onKeyPress={handleVirtualKeyPress} />
        </motion.div>
      )}
    </div>
  );
}
