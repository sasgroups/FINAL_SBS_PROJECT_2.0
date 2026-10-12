import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  Server, 
  MapPin, 
  Globe 
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL;

export default function AddKioskPage() {
  const navigate = useNavigate();
  const [kiosks, setKiosks] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Add modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newIpAddress, setNewIpAddress] = useState("");

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState(null);

  // Get token function
  const getToken = () => localStorage.getItem("adminToken");

  // Check authentication
  const checkAuth = () => {
    const token = getToken();
    if (!token) {
      navigate("/");
      return false;
    }
    return true;
  };

  // On mount: fetch kiosks
  useEffect(() => {
    fetchKiosks();
  }, []);

  const fetchKiosks = async () => {
    try {
      const token = getToken();
      if (!checkAuth()) return;
      
      const res = await axios.get(`${API_URL}/api/kiosks`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setKiosks(res.data);
    } catch (err) {
      console.error("Fetch kiosks failed:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
      } else {

        
        setStatus({ type: "error", message: "Failed to fetch kiosks" });
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  // === Add Kiosk ===
  const handleAddKiosk = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    setLoading(true);

    const token = getToken();
    if (!checkAuth()) return;

    try {
      const res = await axios.post(
        `${API_URL}/api/kiosks`,
        {
          name: newName,
          password: newPassword,
          location: newLocation || null,
          ip_address: newIpAddress || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatus({ 
        type: "success", 
        message: "Kiosk added successfully!" 
      });

      setKiosks((prev) => [
        ...prev,
        {
          id: res.data.kioskId,
          name: newName,
          location: newLocation,
          ip_address: newIpAddress,
          created_at: new Date().toISOString(),
        },
      ]);

      // Reset form fields
      setNewName("");
      setNewPassword("");
      setNewLocation("");
      setNewIpAddress("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Add kiosk failed:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
      } else {
        setStatus({ 
          type: "error", 
          message: err.response?.data?.message || "Failed to add kiosk" 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // === Edit Kiosk ===
  const handleEditClick = (kiosk) => {
    setSelectedKiosk({
      ...kiosk,
      ip_address: kiosk.ip_address || "",
    });
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setSelectedKiosk(null);
    setShowEditModal(false);
  };

  const handleUpdateKiosk = async () => {
    const token = getToken();
    if (!checkAuth() || !selectedKiosk) return;

    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/api/kiosks/${selectedKiosk.id}`,
        {
          name: selectedKiosk.name,
          location: selectedKiosk.location || null,
          ip_address: selectedKiosk.ip_address || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setKiosks((prev) =>
        prev.map((k) => 
          k.id === selectedKiosk.id ? { ...k, ...selectedKiosk } : k
        )
      );
      
      setStatus({ 
        type: "success", 
        message: "Kiosk updated successfully!" 
      });
      
      handleModalClose();
    } catch (err) {
      console.error("Update kiosk failed:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
      } else {
        setStatus({ 
          type: "error", 
          message: err.response?.data?.message || "Failed to update kiosk" 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // === Delete Kiosk ===
  const handleDeleteKiosk = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete kiosk "${name}"?`)) return;

    const token = getToken();
    if (!checkAuth()) return;

    setDeletingId(id);

    try {
      await axios.delete(`${API_URL}/api/kiosks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setKiosks((prev) => prev.filter((k) => k.id !== id));
      setStatus({ 
        type: "success", 
        message: "Kiosk deleted successfully!" 
      });
    } catch (err) {
      console.error("Delete kiosk failed:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
      } else {
        setStatus({ 
          type: "error", 
          message: "Failed to delete kiosk" 
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Auto-hide status message after 3 seconds
  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => {
        setStatus({ type: "", message: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status.message]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-12">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
              Kiosk Management
            </h1>
            <p className="text-slate-600 mt-2">
              Manage your kiosks efficiently and securely
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-full px-4 py-2 shadow-sm border border-slate-200">
              <span className="text-slate-700 font-medium">
                {kiosks.length} Kiosk{kiosks.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-xl hover:bg-red-50 border border-red-200 transition-colors shadow-sm"
            >
              <LogOut size={18} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        <AnimatePresence>
          {status.message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 rounded-xl p-4 flex items-center gap-3 shadow-md ${
                status.type === "success"
                  ? "bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-800"
                  : "bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 text-rose-800"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle className="text-emerald-600" />
              ) : (
                <XCircle className="text-rose-600" />
              )}
              <span className="font-medium">{status.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Kiosk Button */}
        <div className="flex justify-center mb-10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-300 font-semibold text-lg"
          >
            <Plus size={22} />
            Add New Kiosk
          </motion.button>
        </div>

        {/* Kiosk Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {kiosks.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-slate-200 to-blue-100 rounded-full flex items-center justify-center mb-6">
                <Server size={48} className="text-slate-400" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-700 mb-2">
                No kiosks found
              </h3>
              <p className="text-slate-500 mb-8">
                Get started by adding your first kiosk
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-md transition-all duration-300 font-medium"
              >
                <Plus size={20} />
                Add First Kiosk
              </button>
            </div>
          ) : (
            kiosks.map((kiosk) => (
              <motion.div
                key={kiosk.id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-3 rounded-xl">
                    <Server className="text-indigo-600" size={24} />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(kiosk)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="Edit kiosk"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteKiosk(kiosk.id, kiosk.name)}
                      disabled={deletingId === kiosk.id}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete kiosk"
                    >
                      {deletingId === kiosk.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {kiosk.name}
                </h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500">Location</p>
                      <p className="text-slate-700 font-medium">
                        {kiosk.location || "Not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Globe size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-500">IP Address</p>
                      <p className={`font-medium ${kiosk.ip_address ? 'text-green-600' : 'text-slate-400'}`}>
                        {kiosk.ip_address || "Not configured"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Added on {new Date(kiosk.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Add Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="Create New Kiosk"
      >
        <form onSubmit={handleAddKiosk} className="space-y-6">
          <FormField
            label="Kiosk Name"
            value={newName}
            onChange={setNewName}
            placeholder="Enter kiosk name"
            required
            icon={<Server size={18} />}
          />
          
          <FormField
            label="Password"
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            placeholder="Enter secure password"
            required
            icon="🔒"
          />
          
          <FormField
            label="Location"
            value={newLocation}
            onChange={setNewLocation}
            placeholder="e.g., Main Entrance, Floor 2"
            icon={<MapPin size={18} />}
          />
          
          <FormField
            label="IP Address (Optional)"
            value={newIpAddress}
            onChange={setNewIpAddress}
            placeholder="192.168.1.100 or with port"
            icon={<Globe size={18} />}
            helperText="For connecting to kiosk backend service"
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </span>
              ) : (
                "Create Kiosk"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={handleModalClose} 
        title="Edit Kiosk"
      >
        {selectedKiosk && (
          <div className="space-y-6">
            <FormField
              label="Kiosk Name"
              value={selectedKiosk.name}
              onChange={(val) => setSelectedKiosk({ ...selectedKiosk, name: val })}
              placeholder="Enter kiosk name"
              icon={<Server size={18} />}
            />
            
            <FormField
              label="Location"
              value={selectedKiosk.location || ""}
              onChange={(val) => setSelectedKiosk({ ...selectedKiosk, location: val })}
              placeholder="e.g., Main Entrance, Floor 2"
              icon={<MapPin size={18} />}
            />
            
            <FormField
              label="IP Address"
              value={selectedKiosk.ip_address || ""}
              onChange={(val) => setSelectedKiosk({ ...selectedKiosk, ip_address: val })}
              placeholder="192.168.1.100 or with port"
              icon={<Globe size={18} />}
              helperText="For connecting to kiosk backend service"
            />

            <PasswordUpdateSection 
              selectedKiosk={selectedKiosk}
              setSelectedKiosk={setSelectedKiosk}
            />

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleModalClose}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateKiosk}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </span>
                ) : (
                  "Update Kiosk"
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <XCircle size={22} className="text-slate-400" />
            </button>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// Form Field Component
const FormField = ({ label, value, onChange, type = "text", placeholder, required = false, icon, helperText }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
          icon ? 'pl-10' : ''
        }`}
      />
    </div>
    {helperText && (
      <p className="mt-2 text-xs text-slate-500">{helperText}</p>
    )}
  </div>
);

// Password Update Section for Edit Modal
const PasswordUpdateSection = ({ selectedKiosk, setSelectedKiosk }) => {
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handlePasswordUpdate = () => {
    setSelectedKiosk({
      ...selectedKiosk,
      password: newPassword,
    });
    setNewPassword("");
    setShowPasswordUpdate(false);
  };

  return (
    <div className="border-t border-slate-200 pt-6">
      <button
        type="button"
        onClick={() => setShowPasswordUpdate(!showPasswordUpdate)}
        className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <span className="text-sm font-medium">
          {showPasswordUpdate ? "Cancel Password Change" : "Change Password"}
        </span>
      </button>
      
      {showPasswordUpdate && (
        <div className="mt-4 space-y-4">
          <FormField
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            placeholder="Enter new password"
            icon="🔒"
          />
          <button
            type="button"
            onClick={handlePasswordUpdate}
            className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-medium transition-all"
          >
            Update Password
          </button>
        </div>
      )}
    </div>
  );
};