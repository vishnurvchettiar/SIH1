import React from 'react';
import { Globe2, Phone, ArrowLeft, SunMedium } from 'lucide-react';
import { getTranslations, SUPPORTED_LANGUAGES } from '../translations';

export default function GovUtilityHeader({ lang = 'en', setLang, onBackToPortal, fontSize, setFontSize, highContrast, setHighContrast }) {
  const t = getTranslations(lang);
  const gov = t.govHeader || {};
  return (
    <header className="w-full bg-[#0D2A4A] text-slate-200 border-b border-white/10 relative z-50">
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /><span className="font-extrabold tracking-wide text-white text-[11px] sm:text-xs">{gov.govtOfIndia || 'GOVERNMENT OF INDIA'}</span></div>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300 font-medium hidden md:inline text-[11px]">{gov.ministries || 'Ministry of Social Justice & Empowerment • Ministry of MSME'}</span>
          <span className="text-amber-400 font-mono text-[10px] hidden lg:inline bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">{gov.sovereignPortal || 'PM-SURAJ & NSFDC Sovereign Portal'}</span>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-300 text-[11px]"><Phone className="w-3.5 h-3.5 text-emerald-400" /><span>{gov.tollFree || 'Toll-Free Helpline:'}</span><span className="font-mono font-bold text-white tracking-wide">1800-11-2026</span></div>
          <div className="flex items-center space-x-1 bg-slate-900/80 px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold">
            <button onClick={() => setFontSize?.('sm')} title={t.common?.smallFont || 'Standard Font Size'} className={`px-1.5 py-0.5 rounded hover:bg-white/10 ${fontSize === 'sm' ? 'text-amber-400 font-black' : 'text-slate-400'}`}>A-</button>
            <button onClick={() => setFontSize?.('md')} title={t.common?.mediumFont || 'Medium Font Size'} className={`px-1.5 py-0.5 rounded hover:bg-white/10 ${fontSize === 'md' ? 'text-amber-400 font-black' : 'text-slate-400'}`}>A</button>
            <button onClick={() => setFontSize?.('lg')} title={t.common?.largeFont || 'Large Font Size'} className={`px-1.5 py-0.5 rounded hover:bg-white/10 ${fontSize === 'lg' ? 'text-amber-400 font-black' : 'text-slate-400'}`}>A+</button>
          </div>
          <button onClick={() => setHighContrast?.(!highContrast)} className={`p-1.5 rounded-lg border text-[11px] flex items-center space-x-1 ${highContrast ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold' : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-white/10'}`} title={gov.contrast || 'Toggle High Contrast'} aria-label={gov.contrast || 'Toggle High Contrast'}><SunMedium className="w-3.5 h-3.5" /><span className="hidden xl:inline text-[10px]">{gov.contrast || 'Contrast'}</span></button>
          <div className="flex items-center space-x-1 border-l border-slate-700 pl-3"><Globe2 className="w-3.5 h-3.5 text-slate-400" /><select value={lang} onChange={(e) => setLang?.(e.target.value)} className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-[11px]" aria-label={t.navbar?.languageLabel || 'Select language'}>{SUPPORTED_LANGUAGES.map(({ code, label }) => <option key={code} value={code} className="text-slate-900">{label}</option>)}</select></div>
          {onBackToPortal && <button onClick={onBackToPortal} className="inline-flex items-center space-x-1 bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg border border-white/15"><ArrowLeft className="w-3 h-3 text-amber-400" /><span>{gov.portalHome || 'Portal Home'}</span></button>}
        </div>
      </div>
    </header>
  );
}
