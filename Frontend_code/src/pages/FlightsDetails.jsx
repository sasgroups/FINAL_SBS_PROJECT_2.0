import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Plane, 
  Search, 
  Filter, 
  Download, 
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  Scale,
  Package,
  AlertCircle,
  Calendar,
  Hash,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL;

const Flights = () => {
  const [flights, setFlights] = useState([]);
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [formData, setFormData] = useState({
    airline: '',
    flight_code: '',
    max_weight: '',
    volume: ''
  });
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch flights
  const fetchFlights = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/flights`);
      setFlights(res.data);
      setFilteredFlights(res.data);
    } catch (err) {
      console.error('Error fetching flights:', err);
      showMessage('Failed to fetch flights', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  // Filter flights based on search input
  useEffect(() => {
    let result = flights;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(flight =>
        flight.airline?.toLowerCase().includes(term) ||
        flight.flight_code?.toLowerCase().includes(term) ||
        flight.flight_number?.toLowerCase().includes(term)
      );
    }

    setFilteredFlights(result);
  }, [searchTerm, flights]);

  const showMessage = (text, type, duration = 3000) => {
    setMessage({ text, type });
    if (duration > 0) {
      setTimeout(() => setMessage({ text: '', type: '' }), duration);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ 
      ...prev, 
      [e.target.name]: e.target.value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.airline.trim()) {
      showMessage('Airline name is required', 'error');
      return;
    }
    if (!formData.flight_code.trim()) {
      showMessage('Flight code is required', 'error');
      return;
    }
    if (!formData.max_weight || Number.isNaN(Number(formData.max_weight))) {
      showMessage('Max weight is required', 'error');
      return;
    }
    if (!formData.volume || Number.isNaN(Number(formData.volume))) {
      showMessage('Volume is required', 'error');
      return;
    }

    try {
      if (editId) {
        await axios.put(`${API_URL}/api/flights/${editId}`, formData);
        showMessage('Flight updated successfully!', 'success');
      } else {
        await axios.post(`${API_URL}/api/flights`, formData);
        showMessage('Flight added successfully!', 'success');
      }

      resetForm();
      fetchFlights();
    } catch (err) {
      console.error('Error saving flight:', err);
      showMessage(err.response?.data?.message || 'Error saving flight', 'error');
    }
  };

  const handleEdit = (flight) => {
    setFormData({
      airline: flight.airline || '',
      flight_code: flight.flight_code || flight.flight_number || '',
      max_weight: flight.max_weight || '',
      volume: flight.max_volume || ''
    });
    setEditId(flight.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/flights/${id}`);
      fetchFlights();
      showMessage('Flight deleted successfully!', 'success');
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting flight:', err);
      showMessage('Failed to delete flight', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      airline: '',
      flight_code: '',
      max_weight: '',
      volume: ''
    });
    setEditId(null);
    setShowModal(false);
  };

  const getFlightStats = () => {
    const total = flights.length;
    const configured = flights.filter(f => 
      f.max_weight || f.max_volume
    ).length;

    return { total, configured };
  };

  const stats = getFlightStats();

  if (loading && flights.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
                  <div className="h-8 bg-slate-200 rounded w-16"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="h-12 bg-slate-200 rounded mb-4"></div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded mb-2"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Plane className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Airline Configuration</h1>
                  <p className="text-slate-600 mt-1">Manage airline cargo capacity and flight details</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add New Airline
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Airlines</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Plane className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Configured Flights</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stats.configured}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search airlines or flight codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeFilter === 'all'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Plane className="w-4 h-4" />
                      <span className="hidden sm:inline">All</span>
                    </button>
                <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Message Notification */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 rounded-xl p-4 border ${message.type === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <p className={`font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {message.text}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Airlines Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th className="py-4 px-6 text-left">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-slate-700">Airline</span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-left">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-slate-700">Flight Code</span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-left">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-slate-700">Weight</span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-left">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-slate-700">Volume</span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-left">
                    <span className="font-semibold text-slate-700">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredFlights.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-4 bg-slate-100 rounded-2xl mb-4">
                          <Plane className="w-12 h-12 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-700 mb-2">No airlines found</h3>
                        <p className="text-slate-500 mb-6">
                          {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first airline'}
                        </p>
                        {!searchTerm && (
                          <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add First Airline
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFlights.map((flight, index) => (
                    <motion.tr
                      key={flight.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-xl">
                            <Plane className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{flight.airline}</p>
                            <p className="text-sm text-slate-500">ID: {flight.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                          <Hash className="w-4 h-4 text-slate-500" />
                          <span className="font-mono font-medium text-slate-700">
                            {flight.flight_code || flight.flight_number || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-slate-600" />
                            <span className="text-sm text-slate-700">
                              {flight.max_weight || 'N/A'} kg
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-slate-600" />
                            <span className="text-sm text-slate-700">
                              {flight.max_volume || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(flight)}
                            className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(flight.id)}
                            className="p-2.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-600">
          <p>
            Showing <span className="font-semibold text-slate-900">{filteredFlights.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{flights.length}</span> airlines
          </p>
        </div>
      </div>

      {/* Add/Edit Modal - FIXED VERSION */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col"
              style={{ maxHeight: '90vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header - Fixed */}
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Plane className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {editId ? 'Edit Airline' : 'Add New Airline'}
                      </h2>
                      <p className="text-slate-600">Configure airline cargo capacity</p>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500 hover:text-red-500" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Basic Info */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Plane className="w-5 h-5 text-blue-600" />
                        Basic Information
                      </h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Airline Name *
                        </label>
                        <input
                          name="airline"
                          value={formData.airline}
                          onChange={handleChange}
                          placeholder="e.g., American Airlines"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Flight Code
                        </label>
                        <input
                          name="flight_code"
                          value={formData.flight_code}
                          onChange={handleChange}
                          placeholder="e.g., AA123"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Capacity */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-green-600" />
                        Capacity
                      </h3>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Max Weight
                        </label>
                        <div className="relative">
                          <input
                            name="max_weight"
                            type="number"
                            value={formData.max_weight}
                            onChange={handleChange}
                            placeholder="e.g., 500"
                            className="w-full px-4 py-3 pl-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                            <Scale className="w-5 h-5" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Volume
                        </label>
                        <div className="relative">
                          <input
                            name="volume"
                            type="number"
                            value={formData.volume}
                            onChange={handleChange}
                            placeholder="e.g., 150"
                            className="w-full px-4 py-3 pl-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                            <Package className="w-5 h-5" />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Form Actions - Always Visible at Bottom */}
                </form>
              </div>

              {/* Fixed Footer with Action Buttons */}
              <div className="flex-shrink-0 border-t border-slate-200 bg-white p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Fields marked with * are required</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={handleSubmit}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
                    >
                      {editId ? 'Update Airline' : 'Add Airline'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal - Also Fixed */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Airline</h3>
                <p className="text-slate-600">
                  Are you sure you want to delete this airline? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-xl hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all"
                >
                  Delete Airline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default Flights;