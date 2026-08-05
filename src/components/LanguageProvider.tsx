"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { type Lang, type Translations, LANGUAGES, getTranslations } from "@/lib/i18n";

const STORAGE_KEY = "lang";
const DEFAULT_LANG: Lang = "en";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  dir: "ltr" | "rtl";
}

const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: getTranslations(DEFAULT_LANG),
  dir: "ltr",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && LANGUAGES.find(l => l.code === stored)) {
        setLangState(stored);
      }
    } catch { /* ignore */ }
  }, []);

  // Apply dir to <html> whenever lang changes
  useEffect(() => {
    const langMeta = LANGUAGES.find(l => l.code === lang);
    const dir = langMeta?.dir ?? "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }

  const langMeta = LANGUAGES.find(l => l.code === lang);
  const dir = langMeta?.dir ?? "ltr";

  return (
    <LangContext.Provider value={{ lang, setLang, t: getTranslations(lang), dir }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  return useContext(LangContext);
}
