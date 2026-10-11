import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Language, Translations, SUPPORTED_LANGUAGES, LanguageOption } from './types';
import { viTranslations } from './vi';
import { enTranslations } from './en';

const LANGUAGE_STORAGE_KEY = 'storytts_language';

const translationsMap: Record<Language, Translations> = {
  vi: viTranslations,
  en: enTranslations,
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<Translations>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
  supportedLanguages: LanguageOption[];
  currentLanguageOption: LanguageOption;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (key) => key,
  supportedLanguages: SUPPORTED_LANGUAGES,
  currentLanguageOption: SUPPORTED_LANGUAGES[0],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'vi' || saved === 'en') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'vi'; // Default is always Tiếng Việt
  });

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const currentDict = translationsMap[language] || viTranslations;
      const fallbackDict = viTranslations;

      const resolve = (dict: any, path: string): string | undefined => {
        const parts = path.split('.');
        let curr = dict;
        for (const part of parts) {
          if (curr && typeof curr === 'object' && part in curr) {
            curr = curr[part];
          } else {
            return undefined;
          }
        }
        return typeof curr === 'string' ? curr : undefined;
      };

      let result = resolve(currentDict, key);
      if (result === undefined) {
        result = resolve(fallbackDict, key) ?? key;
      }

      if (params && typeof result === 'string') {
        for (const [pKey, pVal] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        }
      }

      return result;
    },
    [language]
  );

  const currentLanguageOption = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES,
      currentLanguageOption,
    }),
    [language, setLanguage, t, currentLanguageOption]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
export const useTranslation = () => {
  const { t, language, setLanguage } = useContext(LanguageContext);
  return { t, language, setLanguage };
};

export { SUPPORTED_LANGUAGES };
