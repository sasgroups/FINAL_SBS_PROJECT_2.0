import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Eye, EyeOff, X } from "lucide-react";
import VirtualKeyboard from "../components/VirtualKeyboard";

const API_URL = process.env.REACT_APP_API_URL;

export default function LoginPage() {
  const navigate = useNavigate();

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
  const adminEmailRef = useRef(null);
  const adminPasswordRef = useRef(null);


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
      else if (key === "Enter") handleAdminLogin(new Event("submit"));
      else setter(value + key);
    };

    if (focusedInput === "adminEmail") updateValue(setAdminEmail, adminEmail);
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
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-6">
          Admin Login
        </h1>

        {/* --- Error Message --- */}
        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        {/* --- Admin Login Form --- */}
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

      {/* --- Back Button --- */}
      {!showKeyboard && (
        <button
          onClick={() => navigate("/ad_player")}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-full backdrop-blur-sm border border-white/30 shadow-lg transition-all"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
