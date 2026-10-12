import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  FaTachometerAlt,   // Dashboard
  FaPlane,           // Airline Management
  FaUserShield,      // Admin Manager
  FaCogs,            // System Config
  FaDesktop,         // Kiosk Management
  FaChartBar,        // Kiosk Status
  FaSignOutAlt       // Logout
} from 'react-icons/fa';
import { useNavigate } from "react-router-dom";

const MenageAds = lazy(() => import('./MenageAds'));
const FlightsDetails = lazy(() => import('./FlightsDetails'));
const Setteings = lazy(() => import('./setteings'));
const MaintenancePage = lazy(() => import('./MaintenancePage'));
const AddKioskPage = lazy(() => import('./AddKioskPage'));
const DeviceStatusDashboard = lazy(() => import('./DeviceStatusDashboard'));

const Maintenance = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();

  // Check for token on component mount and when activeTab changes
  useEffect(() => {
    checkAuthentication();
  }, [activeTab]);

  const checkAuthentication = () => {
    const adminToken = localStorage.getItem("adminToken");
    
    // If no token exists, redirect to login page
    if (!adminToken && !kioskToken) {
      navigate("/");
      return false;
    }
    return true;
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  const handleTabChange = (tab) => {
    // Check authentication before changing tab
    if (checkAuthentication()) {
      setActiveTab(tab);
    }
  };

  // If checkAuthentication fails, the component will redirect
  // This prevents rendering the UI if no token exists
  const adminToken = localStorage.getItem("adminToken");
  const kioskToken = localStorage.getItem("kioskToken");
  
  if (!adminToken && !kioskToken) {
    // Return null or a loading indicator while redirecting
    return null;
  }

  return (
    <div className="bg-gray-300 flex">
      {/* Sidebar */}
      <aside className="fixed left-0 h-full w-20 bg-slate-800 text-white flex flex-col  py-4">
        <div>
          {/* 1️⃣ Dashboard */}
          <IconButton 
            icon={<FaTachometerAlt />} 
            isActive={activeTab === "dashboard"} 
            onClick={() => handleTabChange("dashboard")} 
          />

          {/* 2️⃣ Airline Management */}
          <IconButton 
            icon={<FaPlane />} 
            isActive={activeTab === "airlines"} 
            onClick={() => handleTabChange("airlines")} 
          />

          {/* 3️⃣ Admin / Ad Manager */}
          <IconButton 
            icon={<FaUserShield />} 
            isActive={activeTab === "adminManager"} 
            onClick={() => handleTabChange("adminManager")} 
          />

          {/* 4️⃣ System Configuration */}
          <IconButton 
            icon={<FaCogs />} 
            isActive={activeTab === "systemConfig"} 
            onClick={() => handleTabChange("systemConfig")} 
          />

          {/* 5️⃣ Kiosk Management */}
          <IconButton 
            icon={<FaDesktop />} 
            isActive={activeTab === "kioskManagement"} 
            onClick={() => handleTabChange("kioskManagement")} 
          />

          {/* 6️⃣ Kiosk Status */}
          <IconButton 
            icon={<FaChartBar />} 
            isActive={activeTab === "kioskStatus"} 
            onClick={() => handleTabChange("kioskStatus")} 
          />
           
          {/* 7️⃣ Real Time API Dashboard */}
          {/* <IconButton 
            icon={<FaChartBar />} 
            isActive={activeTab === "RealTimeApiDashboard"} 
            onClick={() => handleTabChange("RealTimeApiDashboard")} 
          /> */}
        </div>

        <div className="flex flex-col items-center space-y-4">
          <IconButton 
            icon={<FaSignOutAlt />} 
            onClick={handleLogout} 
            className="hover:bg-red-600" 
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-20 bg-gray-100 min-h-screen p-6 flex-grow overflow-y-auto w-full">
        <Suspense fallback={
          <div className="flex h-full w-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-slate-800"></div>
          </div>
        }>
          {activeTab === "dashboard" && (
            <>
              <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
              <MaintenancePage />
            </>
          )}
          {activeTab === "airlines" && <FlightsDetails />}
          {activeTab === "adminManager" && <MenageAds />}
          {activeTab === "systemConfig" && <Setteings />}
          {activeTab === "kioskManagement" && <AddKioskPage />}
          {activeTab === "kioskStatus" && <DeviceStatusDashboard />}
        </Suspense>
      </main>
    </div>
  );
};

const IconButton = ({ icon, onClick, isActive, className = "" }) => (
  <button
    className={`flex items-center justify-center w-16 h-16 text-2xl rounded-lg transition-all duration-200
      ${isActive ? "bg-slate-700 scale-105" : "hover:bg-slate-700 hover:scale-105"} ${className}`}
    onClick={onClick}
  >
    {icon}
  </button>
);

export default Maintenance;