import React, { useState } from "react";
import { motion } from "framer-motion";

export default function VirtualKeyboard({ onKeyPress }) {
  const [capsLock, setCapsLock] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);

  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const numbers = "1234567890".split("");
  const symbols = "!@#$%^&*()-_=+[]{}.".split(""); // <-- added dot

  const handleKeyClick = (key) => {
    if (key === "Backspace") onKeyPress("Backspace");
    else if (key === "Space") onKeyPress(" ");
    else if (key === "Enter") onKeyPress("Enter");
    else onKeyPress(key);
  };

  const getDisplayKeys = () => {
    if (showSymbols) return symbols;
    if (capsLock) return letters.map((l) => l.toUpperCase());
    return letters;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="keyboard-container bg-slate-100 rounded-2xl p-5 shadow-inner mt-4 text-center select-none"
    >
      {/* Number row */}
      <div className="flex justify-center mb-2 flex-wrap">
        {numbers.map((n) => (
          <motion.button
            whileTap={{ scale: 0.9 }}
            key={n}
            className="m-1 w-12 h-12 bg-white text-slate-800 text-lg font-medium rounded-lg shadow hover:bg-slate-200"
            onClick={() => handleKeyClick(n)}
          >
            {n}
          </motion.button>
        ))}
      </div>

      {/* Letters / Symbols row */}
      <div className="flex justify-center mb-2 flex-wrap">
        {getDisplayKeys().map((key) => (
          <motion.button
            whileTap={{ scale: 0.9 }}
            key={key}
            className="m-1 w-12 h-12 bg-white text-slate-800 text-lg font-semibold rounded-lg shadow hover:bg-slate-200"
            onClick={() => handleKeyClick(key)}
          >
            {key}
          </motion.button>
        ))}
      </div>

      {/* Bottom control row */}
      <div className="flex justify-center gap-2 mt-3 flex-wrap">
        <motion.button
          whileTap={{ scale: 0.9 }}
          className={`px-4 py-2 rounded-lg text-lg font-semibold shadow ${
            capsLock ? "bg-slate-700 text-white" : "bg-white text-slate-800"
          }`}
          onClick={() => setCapsLock(!capsLock)}
        >
          Caps
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className={`px-4 py-2 rounded-lg text-lg font-semibold shadow ${
            showSymbols ? "bg-slate-700 text-white" : "bg-white text-slate-800"
          }`}
          onClick={() => setShowSymbols(!showSymbols)}
        >
          {showSymbols ? "ABC" : "@#"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="px-8 py-2 rounded-lg text-lg font-semibold shadow bg-white text-slate-800 hover:bg-slate-200"
          onClick={() => handleKeyClick("Space")}
        >
          Space
        </motion.button>

        {/* New permanent dot button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="px-4 py-2 rounded-lg text-lg font-semibold shadow bg-white text-slate-800 hover:bg-slate-200"
          onClick={() => handleKeyClick(".")}
        >
          .
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="px-4 py-2 rounded-lg text-lg font-semibold shadow bg-white text-slate-800 hover:bg-slate-200"
          onClick={() => handleKeyClick("Backspace")}
        >
          ⌫
        </motion.button>
      </div>
    </motion.div>
  );
}