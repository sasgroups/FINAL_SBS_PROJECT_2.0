import React, { useState, useEffect, useRef } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";

const TimerModal = () => {
  const [timerStart, setTimerStart] = useState(null);
  const [modalTimerStart, setModalTimerStart] = useState(null);
  const [timer, setTimer] = useState(null);
  const [modalTimer, setModalTimer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const countdownRef = useRef(null);
  const modalTimerRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const API_URL = process.env.REACT_APP_API_URL;

  // Fetch timeout settings from API
  useEffect(() => {
    const fetchTimeoutSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/page-timeouts`);
        const data = await res.json();
        if (data.length > 0) {
          const latest = data[0];
          setTimerStart(latest.page_time);
          setModalTimerStart(latest.cofrom_time);
          setTimer(latest.page_time);
          setModalTimer(latest.cofrom_time);
        }
      } catch (err) {
        console.error("Failed to fetch timeout settings:", err);
      }
    };

    fetchTimeoutSettings();
  }, [API_URL]);

  // Timer logic
  useEffect(() => {
    if (timerStart === null || modalTimerStart === null) return;

    countdownRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) {
          clearInterval(countdownRef.current);
          setShowModal(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [timerStart, modalTimerStart]);

  useEffect(() => {
    if (showModal && modalTimer > 0) {
      modalTimerRef.current = setInterval(() => {
        setModalTimer((prevModalTimer) => prevModalTimer - 1);
      }, 1000);
      return () => clearInterval(modalTimerRef.current);
    } else if (modalTimer === 0) {
      handleCancel();
    }
  }, [showModal, modalTimer]);

  const getStrokeColor = (time) => {
    if (time > 15) return '#4caf50';
    if (time > 10) return '#ff9800';
    return '#f44336';
  };

  const handleContinue = () => {
    setShowModal(false);
    setTimer(timerStart);
    setModalTimer(modalTimerStart);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) {
          clearInterval(countdownRef.current);
          setShowModal(true);
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCancel = () => {
    navigate('/ad_player');
  };

  // Wait for settings to load
  if (timerStart === null || modalTimerStart === null) {
    return (
      <div
        className="p-4"
        style={{ color: 'var(--theme-font)', opacity: 0.7 }}
      >
        Loading timeout settings...
      </div>
    );
  }

  return (
    <>
      {/* Main timer circle */}
      <div className="w-24 h-24 flex items-center justify-center absolute top-32 left-6">
        <CircularProgressbar
          value={(timer / timerStart) * 100}
          text={`${timer}`}
          styles={{
            path: { stroke: getStrokeColor(timer), strokeWidth: 8 },
            trail: { stroke: 'var(--theme-border)', strokeWidth: 8 },
            text: {
              fill: getStrokeColor(timer),
              fontSize: '40px',
              fontWeight: 'bold',
              textAnchor: 'middle',
              dominantBaseline: 'central',
            },
          }}
        />
      </div>

      {/* Modal overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div
            className="p-8 rounded-2xl shadow-xl max-w-[510px] w-full relative"
            style={{
              backgroundColor: 'var(--theme-cardBg)',
              color: 'var(--theme-font)',
            }}
          >
            <h2 className="text-4xl font-bold text-center mb-4" style={{ color: 'var(--theme-font)' }}>
              {t("timesUp")}!
            </h2>
            <p className="text-xl text-center mb-6" style={{ color: 'var(--theme-font)' }}>
              {t("areYouThere")}..
            </p>
            <div className="w-20 h-20 mx-auto mb-6">
              <CircularProgressbar
                value={(modalTimer / modalTimerStart) * 100}
                text={`${modalTimer}`}
                styles={{
                  path: { stroke: '#4caf50', strokeWidth: 10 },
                  trail: { stroke: 'var(--theme-border)', strokeWidth: 10 },
                  text: {
                    fill: 'var(--theme-font)',
                    fontSize: '2rem',
                    fontWeight: '600',
                    textAnchor: 'middle',
                    dominantBaseline: 'central',
                  },
                }}
              />
            </div>

            <div className="flex justify-between gap-6">
              <button
                onClick={handleContinue}
                className="text-xl w-[30%] px-2 py-2 rounded-md shadow-md transition-colors"
                style={{
                  backgroundColor: 'var(--theme-border)',
                  border: `1px solid var(--theme-font)`,
                  color: 'var(--theme-font)',
                }}
              >
                {t("continue")}
              </button>
              <button
                onClick={handleCancel}
                className="text-xl w-[30%] px-2 py-2 rounded-md shadow-md transition-colors"
                style={{
                  backgroundColor: 'var(--theme-border)',
                  border: `1px solid var(--theme-font)`,
                  color: 'var(--theme-font)',
                }}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TimerModal;