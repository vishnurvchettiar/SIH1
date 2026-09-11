import { SUPPORTED_LANGUAGES, getTranslations } from './translations';

export { SUPPORTED_LANGUAGES, getTranslations };

export const SPEECH_LOCALES = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(({ code, speech }) => [code, speech])
);

export function translate(lang, key, fallback = key) {
  const dict = getTranslations(lang);
  return key.split('.').reduce((value, part) => value?.[part], dict) ?? fallback;
}
