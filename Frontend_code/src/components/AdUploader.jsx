import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  UploadCloud, 
  Monitor, 
  Globe, 
  ChevronDown, 
  Check, 
  AlertCircle,
  FileVideo,
  ImageIcon
} from "lucide-react";

export default function AdUploader({ onUpload }) {
  const [file, setFile] = useState(null);
  const [kioskId, setKioskId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [kiosks, setKiosks] = useState([]);
  const [showKioskDropdown, setShowKioskDropdown] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetchKiosks();
  }, []);

  const fetchKiosks = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/kiosks/getAllKiosks`);
      setKiosks(res.data);
    } catch (err) {
      console.error("Error fetching kiosks:", err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('Please select an image (JPEG, PNG, GIF, WEBP) or video (MP4, WebM, MOV) file.');
      return;
    }
    
    // ✅ Changed file size limit from 100MB to 1GB (1024 * 1024 * 1024 bytes)
    const MAX_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB
    if (selectedFile.size > MAX_SIZE_BYTES) {
      alert('File size must be less than 1GB'); // ✅ updated alert text
      return;
    }
    
    setFile(selectedFile);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please choose a file first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append("file", file);
    
    if (kioskId) {
      formData.append("kiosk_id", kioskId);
    }

    try {
      const response = await axios.post(`${API_URL}/api/ads/upload`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data" 
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setTimeout(() => {
        setUploadProgress(100);
        setTimeout(() => {
          setFile(null);
          setKioskId("");
          setUploadProgress(0);
          if (onUpload) onUpload();
        }, 300);
      }, 500);

    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response?.data : "❌ Upload failed. Please try again.");
      alert(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('video/')) {
      return <FileVideo className="w-6 h-6 text-red-500" />;
    } else if (fileType?.startsWith('image/')) {
      return <ImageIcon className="w-6 h-6 text-blue-500" />;
    }
    return <UploadCloud className="w-6 h-6 text-gray-500" />;
  };

  const getSelectedKioskName = () => {
    if (!kioskId) return "All Kiosks (Global)";
    const selected = kiosks.find(k => String(k.id) === kioskId);
    return selected ? `${selected.name} (Kiosk #${selected.id})` : "Select Kiosk";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-2xl mx-auto bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <UploadCloud className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Upload Advertisement</h2>
            <p className="text-blue-100">Add media content for your kiosk network</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* File Upload Card */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,video/*"
            />
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center w-full h-48 rounded-xl border-3 border-dashed cursor-pointer transition-all duration-300 ${
                file 
                  ? 'border-green-400 bg-green-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {file ? (
                <div className="text-center p-4">
                  <div className="flex items-center justify-center mb-3">
                    {getFileIcon(file.type)}
                  </div>
                  <p className="font-semibold text-gray-800 truncate max-w-xs">{file.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{formatFileSize(file.size)}</p>
                  <p className="text-xs text-gray-500 mt-2">Click to change file</p>
                </div>
              ) : (
                <div className="text-center p-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <UploadCloud className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-lg font-semibold text-gray-700 mb-1">Select a file</p>
                  <p className="text-sm text-gray-500 mb-3">or drag and drop here</p>
                  <p className="text-xs text-gray-400">Supports: Images (JPG, PNG, GIF) • Videos (MP4, WebM)</p>
                  <p className="text-xs text-gray-400 mt-1">Max size: 1GB</p> {/* ✅ Updated hint text */}
                </div>
              )}
            </label>
          </div>

          {/* Upload Progress */}
          {isUploading && uploadProgress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Kiosk Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Monitor className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-800">Target Kiosk</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              !kioskId 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-purple-100 text-purple-800 border border-purple-200'
            }`}>
              {!kioskId ? 'GLOBAL AD' : 'TARGETED AD'}
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowKioskDropdown(!showKioskDropdown)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                showKioskDropdown 
                  ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                {!kioskId ? (
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Globe className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">All Kiosks (Global)</p>
                      <p className="text-sm text-gray-500">Will display on all kiosk screens</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Monitor className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800 truncate max-w-xs">
                        {getSelectedKioskName()}
                      </p>
                      <p className="text-sm text-gray-500">Will display only on selected kiosk</p>
                    </div>
                  </div>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                showKioskDropdown ? 'transform rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown */}
            {showKioskDropdown && (
              <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto">
                {/* Global Option */}
                <div
                  onClick={() => {
                    setKioskId("");
                    setShowKioskDropdown(false);
                  }}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    !kioskId 
                      ? 'bg-green-50 border-l-4 border-green-500' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      !kioskId ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Globe className={`w-5 h-5 ${
                        !kioskId ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">All Kiosks (Global)</p>
                      <p className="text-sm text-gray-500">Display on all kiosks</p>
                    </div>
                  </div>
                  {!kioskId && <Check className="w-5 h-5 text-green-600" />}
                </div>

                <div className="border-t border-gray-100"></div>

                {/* Kiosk Options */}
                <div className="p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                    Specific Kiosks ({kiosks.length})
                  </p>
                  {kiosks.map((kiosk) => (
                    <div
                      key={kiosk.id}
                      onClick={() => {
                        setKioskId(String(kiosk.id));
                        setShowKioskDropdown(false);
                      }}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                        kioskId === String(kiosk.id)
                          ? 'bg-purple-50 border-l-4 border-purple-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          kioskId === String(kiosk.id) ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          <Monitor className={`w-5 h-5 ${
                            kioskId === String(kiosk.id) ? 'text-purple-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{kiosk.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              ID: {kiosk.id}
                            </span>
                            {kiosk.location && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                                📍 {kiosk.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {kioskId === String(kiosk.id) && (
                        <Check className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">Targeting Tip</p>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Global Ads</span> are perfect for company announcements and promotions. 
                  <span className="font-medium ml-2">Specific Kiosk Ads</span> work best for location-based content.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="flex flex-col  sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            {file && (
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded ${
                  file.type.startsWith('video/') ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {getFileIcon(file.type)}
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-gray-500">{formatFileSize(file.size)} • {file.type}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-center items-center">
          
          <button
            onClick={handleUpload}
            disabled={isUploading || !file}
            className={`relative px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center space-x-2 min-w-[180px] ${
              isUploading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : !file 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                <span>Upload Now</span>
              </>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showKioskDropdown && (
        <div 
          className="fixed inset-0 z-0"
          onClick={() => setShowKioskDropdown(false)}
        />
      )}
    </div>
  );
}