import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Database, CheckCircle, XCircle, BarChart2 } from "lucide-react";
import GeoHeatMap from "../components/GeoHeatMap";
const API_URL = process.env.REACT_APP_API_URL;

export default function MaintenancePage() {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [kiosks, setKiosks] = useState([]);
  const [filterKiosk, setFilterKiosk] = useState("");

  const today = new Date();
  const [filterYear, setFilterYear] = useState(today.getFullYear());
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1);
  const [filterDay, setFilterDay] = useState("");
  const [filterAirline, setFilterAirline] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 9;
  const pageNumberLimit = 12;
  const [maxPageNumberLimit, setMaxPageNumberLimit] = useState(12);
  const [minPageNumberLimit, setMinPageNumberLimit] = useState(1);

  // Safe parse status
  const safeParseStatus = (statusStr) => {
    try {
      if (!statusStr) return { weight: "ok", volume: "ok" };
      if (typeof statusStr === "object") return statusStr;
      return JSON.parse(statusStr);
    } catch {
      return { weight: "ok", volume: "ok" };
    }
  };

  // Fetch kiosks
  useEffect(() => {
    const abortController = new AbortController();
    const fetchKiosks = async () => {
      try {
        const res = await fetch(`${API_URL}/api/kiosks/getAllKiosks`, { signal: abortController.signal });
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setKiosks(data);
      } catch (err) {}
    };
    fetchKiosks();
    return () => abortController.abort();
  }, []);

  // Fetch baggage records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_URL}/api/baggage/all`);
      if (filterKiosk) url.searchParams.append("kiosk_id", filterKiosk);
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setRecords(data || []);
      setFilteredRecords(data || []);
    } catch (err) { } 
    finally {
      requestAnimationFrame(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filterKiosk]);

  // Apply frontend filters (year, month, day, airline)
  useEffect(() => {
    let filtered = [...records];

    if (filterYear)
      filtered = filtered.filter(
        (r) => new Date(r.created_at).getFullYear() === Number(filterYear)
      );
    if (filterMonth)
      filtered = filtered.filter(
        (r) => new Date(r.created_at).getMonth() + 1 === Number(filterMonth)
      );
    if (filterDay)
      filtered = filtered.filter(
        (r) => new Date(r.created_at).getDate() === Number(filterDay)
      );
    if (filterAirline)
      filtered = filtered.filter(
        (r) => r.airline?.toLowerCase() === filterAirline.toLowerCase()
      );

    setFilteredRecords(filtered);
    setCurrentPage(1);
    setMinPageNumberLimit(1);
    setMaxPageNumberLimit(pageNumberLimit);
  }, [filterYear, filterMonth, filterDay, filterAirline, records]);

  const resetFilters = () => {
    setFilterKiosk("");
    setFilterYear(today.getFullYear());
    setFilterMonth(today.getMonth() + 1);
    setFilterDay("");
    setFilterAirline("");
  };

  const downloadCSV = () => {
    if (!filteredRecords.length) {
      alert("No records to download!");
      return;
    }

    const headers = [
      "Kiosk",
      "Airline",
      "Flight Type",
      "Origin",
      "Destination",
      "Weight",
      "Height",
      "Width",
      "Length",
      "Volume",
      "Status Weight",
      "Status Volume",
      "Created At",
    ];

    const rows = filteredRecords.map((r) => {
      const status = safeParseStatus(r.status);
      return [
        kiosks.find((k) => k.id === r.kiosk_id)?.name || "-",
        r.airline || "",
        r.flight_type || "",
        r.origin || "",
        r.destination || "",
        r.weight || "",
        r.height || "",
        r.width || "",
        r.length || "",
        r.volume || "",
        status.weight || "",
        status.volume || "",
        new Date(r.created_at).toLocaleString(),
      ];
    });

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `baggage_data_${filterYear}-${filterMonth || "all"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && records.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg font-semibold text-gray-600">Loading records...</p>
      </div>
    );

  // --- Status counts ---
  const totalRecords = filteredRecords.length;
  const weightOk = filteredRecords.filter(
    (r) => safeParseStatus(r.status).weight === "ok"
  ).length;
  const weightOver = totalRecords - weightOk;

  const volumeOk = filteredRecords.filter(
    (r) => safeParseStatus(r.status).volume === "ok"
  ).length;
  const volumeOver = totalRecords - volumeOk;

  const successCount = filteredRecords.filter((r) => {
    const s = safeParseStatus(r.status);
    return s.weight === "ok" && s.volume === "ok";
  }).length;

  // --- Chart Data ---
  const chartData = filteredRecords.reduce((acc, r) => {
    const dateObj = new Date(r.created_at);
    const day = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${dateObj.getDate().toString().padStart(2, "0")}`;
    if (!acc[day])
      acc[day] = { date: day, total: 0, weight_over: 0, volume_over: 0, success: 0 };
    acc[day].total += 1;
    const status = safeParseStatus(r.status);
    if (status.weight === "over") acc[day].weight_over += 1;
    if (status.volume === "over") acc[day].volume_over += 1;
    if (status.weight === "ok" && status.volume === "ok") acc[day].success += 1;
    return acc;
  }, {});
  const chartArray = Object.values(chartData);

  const statusColors = {
    ok: "bg-green-200 text-green-800",
    over: "bg-red-200 text-red-800",
  };

  const years = [...new Set(records.map((r) => new Date(r.created_at).getFullYear()))];
  const airlines = [...new Set(records.map((r) => r.airline))];
  const months = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" },
  ];

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  const handleClick = (number) => setCurrentPage(number);
  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      if (currentPage + 1 > maxPageNumberLimit) {
        setMaxPageNumberLimit(maxPageNumberLimit + pageNumberLimit);
        setMinPageNumberLimit(minPageNumberLimit + pageNumberLimit);
      }
    }
  };
  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      if ((currentPage - 1) % pageNumberLimit === 0) {
        setMaxPageNumberLimit(maxPageNumberLimit - pageNumberLimit);
        setMinPageNumberLimit(minPageNumberLimit - pageNumberLimit);
      }
    }
  };

  return (
    <div className="flex h-[100%] min-h-screen flex-col justify-between bg-gray-50 p-6 text-gray-900 font-sans">
      <h1 className="text-3xl font-extrabold text-center mb-8 text-gray-800">
        🛠 GateWeigh Smart
      </h1>

      {/* Filter Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-md mb-8 flex flex-wrap gap-4 justify-center items-center">
        {/* Kiosk */}
        <select
          className="px-4 py-2 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          value={filterKiosk}
          onChange={(e) => setFilterKiosk(e.target.value)}
        >
          <option value="">All Kiosks</option>
          {kiosks.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          className="px-4 py-2 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Month */}
        <select
          className="px-4 py-2 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        >
          <option value="">All Months</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Day */}
        <select
          className="px-4 py-2 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
        >
          <option value="">All Days</option>
          {[...Array(31)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>

        {/* Airline */}
        <select
          className="px-4 py-2 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          value={filterAirline}
          onChange={(e) => setFilterAirline(e.target.value)}
        >
          <option value="">All Airlines</option>
          {airlines.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <button
          className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
          onClick={resetFilters}
        >
          Reset Filterss
        </button>

        <button
          className="px-5 py-2 rounded-xl bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition"
          onClick={downloadCSV}
        >
          ⬇ Download CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
        {[
          {
            title: "Total Records",
            value: totalRecords,
            color: "text-gray-800",
            icon: <Database className="w-6 h-6 text-gray-500" />,
          },
          {
            title: "Weight OK",
            value: weightOk,
            color: "text-green-600",
            icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          },
          {
            title: "Weight Over",
            value: weightOver,
            color: "text-red-600",
            icon: <XCircle className="w-6 h-6 text-red-500" />,
          },
          {
            title: "Volume OK",
            value: volumeOk,
            color: "text-green-600",
            icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          },
          {
            title: "Volume Over",
            value: volumeOver,
            color: "text-red-600",
            icon: <XCircle className="w-6 h-6 text-red-500" />,
          },
          {
            title: "Total Success",
            value: successCount,
            color: "text-blue-600",
            icon: <BarChart2 className="w-6 h-6 text-blue-500" />,
          },
        ].map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-2xl shadow-md p-5 whitespace-nowrap text-center border flex flex-col justify-between h-32 hover:shadow-xl transition"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold">{card.title}</span>
              {card.icon}
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>
{/* 🌎 Geospatial Heat Map */}
{/* <GeoHeatMap kioskLocations={kiosks} baggageRecords={filteredRecords} /> */}

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-md p-5 mb-8">
        <h2 className="text-xl font-semibold mb-4">Daily Baggage Status</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartArray}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#8884d8" />
            <Bar dataKey="success" fill="#82ca9d" />
            <Bar dataKey="weight_over" fill="#ff6b6b" />
            <Bar dataKey="volume_over" fill="#ffa500" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-x-auto p-4">
       {/* Records Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
  {currentRecords.map((r, idx) => {
    const status = safeParseStatus(r.status);
    const kioskName = kiosks.find((k) => k.id === r.kiosk_id)?.name || r.kiosk || "-";

    return (
      <div
        key={r.id}
        className="bg-white shadow-md rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-all duration-300"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">
            {/* {r.airline || "-"} ({kioskName}) */}
               {r.airline }
          </h2>
          <span className="text-xs md:text-sm text-gray-400">
            {new Date(r.created_at).toLocaleString()}
          </span>
        </div>

        {/* Flight Info */}
        <p className="text-sm text-gray-500 mb-4 truncate">
          ✈️ {r.flight_type || "-"} ({r.origin || "-"} → {r.destination || "-"})
        </p>

        {/* Weight & Dimensions */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs md:text-sm">Weight</span>
            <span className="text-2xl font-bold text-gray-700">
              {r.weight ? Math.floor(r.weight) : 0} kg
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-gray-400 text-xs md:text-sm">L + W + H</span>
            <span className="text-xl font-bold text-gray-700">
              {r.length ? Math.floor(r.length) : 0} + {r.width ? Math.floor(r.width) : 0} +{" "}
              {r.height ? Math.floor(r.height) : 0} cm
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex justify-between mt-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status.weight === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            Weight: {status.weight?.toUpperCase() || "OK"}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status.volume === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            Volume: {status.volume?.toUpperCase() || "OK"}
          </span>
        </div>
      </div>
    );
  })}
</div>
        {/* Pagination */}
        <div className="flex justify-center mt-4 space-x-2">
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            onClick={handlePrev}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((number) => number >= minPageNumberLimit && number <= maxPageNumberLimit)
            .map((number) => (
              <button
                key={number}
                onClick={() => handleClick(number)}
                className={`px-3 py-1 rounded ${
                  currentPage === number
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {number}
              </button>
            ))}
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
