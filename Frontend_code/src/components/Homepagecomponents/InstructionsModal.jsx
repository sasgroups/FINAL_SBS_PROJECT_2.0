import React from "react";
import { designTokens } from "../../styles/designTokens";
import { useTranslation } from "react-i18next";

const InstructionsModal = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: designTokens.neutral[900] }}>
            {t('How_to_scan_boarding_pass') || 'How to Scan Your Boarding Pass'}
          </h3>
          {/* Close button restored */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5"
              style={{ color: designTokens.neutral[500] }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">1</div>
            <p className="text-sm" style={{ color: designTokens.neutral[700] }}>
              {t('Hold_boarding_pass_barcode')}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">2</div>
            <p className="text-sm" style={{ color: designTokens.neutral[700] }}>
              {t('Keep_steady_6_8_inches')}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">3</div>
            <p className="text-sm" style={{ color: designTokens.neutral[700] }}>
              {t('Wait_for_confirmation')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;