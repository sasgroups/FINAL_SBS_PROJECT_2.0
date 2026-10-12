import React from "react";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ml", label: "മലയാളം" },   // Malayalam
  { code: "kn", label: "ಕನ್ನಡ" },    // Kannada
];
export default function LanguageTabs() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    // Handle RTL when Arabic is selected
  };

  return (
    <div
      className="flex justify-center w-full items-center py-3 px-4"
      style={{
        borderBottom: `1px solid var(--theme-border)`,
      }}
    >
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-center gap-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="px-4 py-2.5 text-xl font-medium transition-all duration-200"
              style={{
                color: 'var(--theme-font)',
                opacity: i18n.language === lang.code ? 1 : 0.5,
                borderBottom: i18n.language === lang.code
                  ? `2px solid var(--theme-font)`
                  : 'none',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}