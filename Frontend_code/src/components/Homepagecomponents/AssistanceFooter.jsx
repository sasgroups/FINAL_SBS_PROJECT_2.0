import React from "react";
import { useTranslation } from "react-i18next";

const AssistanceFooter = () => {
  const { t } = useTranslation();

  return (
    <div
      className="mt-6 pt-5 pb-8 px-1"
      style={{
        borderTop: `1px solid var(--theme-border)`,
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Assistance */}
        <div
          className="flex items-center gap-3 p-4 rounded-lg backdrop-blur-sm"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              border: `1px solid var(--theme-border)`,
            }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: "var(--theme-font)" }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p
              className="text-sm font-semibold mb-0.5"
              style={{ color: "var(--theme-font)" }}
            >
              {t("needAssistance")}
            </p>
            <p className="text-xs" style={{ color: "var(--theme-font)", opacity: 0.7 }}>
              {t("call")}:{" "}
              <span className="font-medium" style={{ color: "var(--theme-font)" }}>
                {t("phoneNumber")}
              </span>
            </p>
          </div>
        </div>

        {/* Status */}
        <div
          className="flex items-center justify-center gap-3 p-4 rounded-lg backdrop-blur-sm"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
            border: `1px solid rgba(255,255,255,0.1)`,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--theme-font)", opacity: 0.5 }}
              ></div>
            </div>
            <div>
              <p
                className="text-xs font-semibold"
                style={{ color: "var(--theme-font)" }}
              >
                {t("systemOperational")}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--theme-font)", opacity: 0.6 }}
              >
                {t("uptime", { percent: "98%" })}
              </p>
            </div>
          </div>

          <div
            className="h-8 w-px"
            style={{ backgroundColor: "var(--theme-border)" }}
          ></div>

          <div>
            <p
              className="text-xs"
              style={{ color: "var(--theme-font)", opacity: 0.6 }}
            >
              {t("averageWaitTime")}
            </p>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--theme-font)" }}
            >
              {t("waitTime", { minutes: 2 })}
            </p>
          </div>
        </div>

        {/* Security */}
        <div
          className="flex items-center justify-center p-4 rounded-lg backdrop-blur-sm"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
            border: `1px solid rgba(255,255,255,0.1)`,
          }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg
                className="w-3 h-3"
                style={{ color: "var(--theme-font)", opacity: 0.7 }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--theme-font)" }}
              >
                Secure Connection
              </p>
            </div>
            <p
              className="text-xs"
              style={{ color: "var(--theme-font)", opacity: 0.6 }}
            >
              {t("encryptedData")} • {t("support247")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistanceFooter;