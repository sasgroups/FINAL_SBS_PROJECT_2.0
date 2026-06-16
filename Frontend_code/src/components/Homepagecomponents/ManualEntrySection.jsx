import React, { useState, useRef, useEffect } from "react";

const ManualEntrySection = ({
  flights,
  selectedAirline,
  setSelectedAirline,
  onManualEntry,
  t,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Drag to scroll state
  const listRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [dragged, setDragged] = useState(false);

  const handlePointerDown = (e) => {
    if (!listRef.current) return;
    setIsDragging(true);
    setDragged(false);
    setStartY(e.pageY);
    setScrollTop(listRef.current.scrollTop);
    listRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !listRef.current) return;
    const y = e.pageY;
    const walk = (y - startY) * 1.5;
    if (Math.abs(walk) > 5) setDragged(true);
    listRef.current.scrollTop = scrollTop - walk;
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    if (listRef.current && listRef.current.hasPointerCapture(e.pointerId)) {
      listRef.current.releasePointerCapture(e.pointerId);
    }
  };




  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const airlines = [...new Set((flights || []).map((f) => f.airline))];

  const selectAirline = (airline) => {
    setSelectedAirline(airline);
    setDropdownOpen(false);
  };

  const isReady = Boolean(selectedAirline);

  return (
    <div
      className="rounded-3xl p-px relative overflow-hidden h-full shadow-2xl"
      style={{
        background: isReady
          ? "rgba(255,255,255,0.18)"
          : "rgba(100,116,139,0.35)",
        transition: "background 0.5s ease",
      }}
    >
      <div
        className="relative rounded-[23px] p-6 h-full flex flex-col w-full"
        style={{ backgroundColor: "var(--theme-cardBg)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 mb-5 pb-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="p-3 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white drop-shadow-sm leading-tight">
              {t("manualEntry")}
            </h2>
            <p className="text-xs mt-0.5 font-medium text-white opacity-50">
              {t("alternativeMethod")} • 2 minutes
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-grow flex flex-col justify-between gap-5">
          {/* Airline Dropdown */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[13px] font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />
                {t("selectAirline")}
              </label>
              {selectedAirline && (
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#ffffff",
                  }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  {t("selected")}
                </span>
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-200 outline-none font-semibold text-sm cursor-pointer text-left"
                style={{
                  color: "var(--theme-font)",
                  opacity: selectedAirline ? 1 : 0.6,
                  backgroundColor: selectedAirline
                    ? "var(--theme-bg)"
                    : "rgba(255,255,255,0.04)",
                  borderColor: selectedAirline
                    ? "var(--theme-border)"
                    : "rgba(255,255,255,0.1)",
                }}
              >
                <span>{selectedAirline || t("chooseAirline")}</span>
                <svg
                  className={`w-4 h-4 text-white opacity-50 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown panel – single scroll container, thin scrollbar */}
              {dropdownOpen && (
                <div
                  ref={listRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="absolute left-0 right-0 mt-2 rounded-2xl z-50 cursor-grab active:cursor-grabbing"
                  style={{
                    background: "var(--theme-cardBg)",
                    border: "1px solid var(--theme-border)",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
                    maxHeight: 220,
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    scrollbarWidth: "thin", // Firefox
                    scrollbarColor: "rgba(255,255,255,0.4) rgba(255,255,255,0.1)",
                    touchAction: "none",
                  }}
                >
                  {/* Thin scrollbar styling for WebKit (Chrome, Safari, Edge) */}
                  <style>
                    {`
                      .absolute.left-0.right-0.mt-2.rounded-2xl.z-50::-webkit-scrollbar {
                        width: 4px;
                        height: 4px;
                      }
                      .absolute.left-0.right-0.mt-2.rounded-2xl.z-50::-webkit-scrollbar-track {
                        background: rgba(255,255,255,0.08);
                        border-radius: 10px;
                      }
                      .absolute.left-0.right-0.mt-2.rounded-2xl.z-50::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.35);
                        border-radius: 10px;
                      }
                      .absolute.left-0.right-0.mt-2.rounded-2xl.z-50::-webkit-scrollbar-thumb:hover {
                        background: rgba(255,255,255,0.6);
                      }
                    `}
                  </style>

                  {airlines.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-white opacity-40 text-center">
                      No airlines available
                    </div>
                  ) : (
                    airlines.map((airline, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          if (dragged) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          selectAirline(airline);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium transition-colors duration-100 flex items-center gap-3 select-none"
                        style={{
                          color: "var(--theme-font)",
                          opacity: selectedAirline === airline ? 1 : 0.75,
                          backgroundColor:
                            selectedAirline === airline
                              ? "var(--theme-border)"
                              : "transparent",
                          borderBottom:
                            idx < airlines.length - 1
                              ? "1px solid var(--theme-border)"
                              : "none",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedAirline !== airline)
                            e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          if (selectedAirline !== airline)
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                        }}
                      >
                        {selectedAirline === airline && (
                          <svg
                            className="w-3.5 h-3.5 text-white shrink-0 opacity-80"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        <span
                          className={selectedAirline === airline ? "" : "ml-6"}
                        >
                          {airline}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex items-center justify-center width-full">
            <button
              onClick={onManualEntry}
              disabled={!isReady}
              className="w-fit px-8 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 border"
              style={
                isReady
                  ? {
                      backgroundColor: "var(--theme-font)",
                      borderColor: "var(--theme-font)",
                      color: "var(--theme-bg)",
                      boxShadow: "0 4px 14px rgba(255,255,255,0.15)",
                    }
                  : {
                      backgroundColor: "var(--theme-border)",
                      borderColor: "var(--theme-border)",
                      color: "var(--theme-font)",
                      opacity: 0.4,
                      cursor: "not-allowed",
                    }
              }
            >
              {isReady ? (
                <>
                  <span>{t("continueToBaggageCheck")}</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 opacity-30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"
                    />
                  </svg>
                  <span>{t("selectAirline")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualEntrySection;