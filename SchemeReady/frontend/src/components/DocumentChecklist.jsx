import { localizeTernary } from "../l10n";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { translations } from '../translations';
import { tokenFetch, tokenFetchJson } from '../auth/tokenFetch';
import { FolderCheck, UploadCloud, CheckCircle2, AlertCircle, FileDown, FileText, Sparkles, ArrowRight, RefreshCw, Eye, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const DOC_CONFIG = [
  { id: 'doc-aadhaar', backendKey: 'identity', name: 'Aadhaar / Voter ID (KYC)', mandatory: true },
  { id: 'doc-caste', backendKey: 'caste_cert', name: 'Caste Certificate (RD Number)', mandatory: true },
  { id: 'doc-income', backendKey: 'income_cert', name: 'Income Certificate', mandatory: true },
  { id: 'doc-bank', backendKey: 'identity', name: 'Bank Account Passbook / Proof', mandatory: true },
  { id: 'doc-quotation', backendKey: 'quotation', name: 'Business / Machinery Quotation', mandatory: false }
];

function formatBytes(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function DocumentChecklist({ lang = 'en', profile, setProfile, selectedScheme, onProceedToPack }) {
  const t = translations[lang] || translations.en;
  const isHindi = lang === 'hi';
  const fileInputRef = useRef(null);
  const [activeUploadDocId, setActiveUploadDocId] = useState(null);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [viewingDoc, setViewingDoc] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const userId = profile?.id || '';

  const localizeDocTitle = (id, fallback) => {
    if (lang === 'en') return fallback;
    const map = {
      'doc-aadhaar': { hi: 'आधार / मतदाता पहचान पत्र (KYC)', kn: 'ಆಧಾರ್ / ಮತದಾರರ ಗುರುತಿನ ಚೀಟಿ (KYC)', ta: 'ஆதார் / வாக்காளர் அடையாள அட்டை (KYC)', te: 'ఆధార్ / ఓటర్ ఐడి (KYC)', mr: 'आधार / मतदार ओळखपत्र (KYC)', bn: 'আধার / ভোটার পরিচয়পত্র (KYC)' },
      'doc-caste': { hi: 'जाति प्रमाण पत्र (आरडी नंबर)', kn: 'ಜಾತಿ ಪ್ರಮಾಣಪತ್ರ (RD ಸಂಖ್ಯೆ)', ta: 'சாதி சான்றிதழ் (RD எண்)', te: 'కుల ధృవీకరణ పత్రం (RD నంబర్)', mr: 'जातीचे प्रमाणपत्र (RD क्रमांक)', bn: 'জাতিগত শংসাপত্র (RD নম্বর)' },
      'doc-income': { hi: 'आय प्रमाण पत्र', kn: 'ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ', ta: 'வருமான சான்றிதழ்', te: 'ఆదాయ ధృవీకరణ పత్రం', mr: 'उत्पन्न प्रमाणपत्र', bn: 'আয় শংসাপত্র' },
      'doc-bank': { hi: 'बैंक खाता पासबुक / प्रमाण', kn: 'ಬ್ಯಾಂಕ್ ಖಾತೆ ಪಾಸ್‌ಬುಕ್ / ಪುರಾವೆ', ta: 'வங்கி கணக்கு பாஸ்புக் / சான்று', te: 'బ్యాంక్ ఖాతా పాస్‌బుక్ / రుజువు', mr: 'बँक खाते पासबुक / पुरावा', bn: 'ব্যাংক একাউন্ট পাসবই / প্রমাণ' },
      'doc-quotation': { hi: 'व्यावसायिक मशीनरी / स्टॉक कोटेशन', kn: 'ವ್ಯಾಪಾರ ಯಂತ್ರೋಪಕರಣ / ಸ್ಟಾಕ್ ಕೊಟೇಶನ್', ta: 'வணிக இயந்திரங்கள் / இருப்பு விலைப்புள்ளி', te: 'వ్యాపార యంత్రాలు / స్టాక్ కొటేషన్', mr: 'व्यावसायिक यंत्रसामग्री / स्टॉक कोटेशन', bn: 'বাণিজ্যিক যন্ত্রপাতি / স্টক কোটেশন' }
    };
    return map[id]?.[lang] || fallback;
  };

  const getStatusLabel = (type) => {
    const c = t.checklist || {};
    return type === 'verified' ? (c.statusVerified || 'Verified') : (c.statusMissing || 'Missing');
  };

  const refreshDocuments = async () => {
    if (!userId) { setUploadedDocs({}); setLoadingDocs(false); return; }
    setLoadingDocs(true);
    try {
      const rows = await tokenFetchJson('documents/mine');
      const grouped = {};
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const config = DOC_CONFIG.find((item) => item.backendKey === row.documentKey && !grouped[item.id]);
        if (!config) return;
        grouped[config.id] = { ...row, id: row.id, documentKey: row.documentKey, checklistId: config.id, statusType: 'verified' };
      });
      setUploadedDocs(grouped);
      setUploadError(null);
    } catch (err) {
      setUploadError(err?.message || 'Unable to load your saved documents. Please make sure the backend and database are running.');
    } finally { setLoadingDocs(false); }
  };

  useEffect(() => { refreshDocuments(); }, [userId]);

  const triggerFileUpload = (docId) => {
    setUploadError(null);
    setActiveUploadDocId(docId);
    if (fileInputRef.current) { fileInputRef.current.value = null; fileInputRef.current.click(); }
  };

  const validateFile = (file) => {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(extension)) return 'Please upload a PDF, JPG/JPEG, or PNG file.';
    if (!ACCEPTED_TYPES.has(file.type)) return 'The selected file type is not supported.';
    if (file.size < 1) return 'The selected file is empty.';
    if (file.size > MAX_UPLOAD_BYTES) return 'File size must be 5 MB or smaller.';
    return null;
  };

  const updateProfileForUpload = (id) => {
    const labels = {
      'doc-caste': { flag: 'hasCasteCertificate', doc: 'Caste certificate' },
      'doc-income': { flag: 'hasIncomeCertificate', doc: 'Income certificate' },
      'doc-quotation': { doc: 'Business quotation' },
      'doc-aadhaar': { doc: 'Aadhaar/KYC' },
      'doc-bank': { doc: 'Bank passbook' }
    };
    const item = labels[id];
    if (!item) return;
    setProfile((p) => ({ ...p, ...(item.flag ? { [item.flag]: true } : {}), uploadedDocs: Array.from(new Set([...(p.uploadedDocs || []), item.doc])) }));
  };

  const uploadDocument = async (file) => {
    const checklistId = activeUploadDocId;
    const config = DOC_CONFIG.find((item) => item.id === checklistId);
    const validationError = validateFile(file);
    if (!config) return;
    if (validationError) { setUploadError(validationError); return; }
    if (!userId) { setUploadError('Please sign in before uploading documents.'); return; }
    setUploading(true); setUploadError(null);
    try {
      const form = new FormData();
      form.append('docKey', config.backendKey);
      form.append('file', file);
      if (profile?.applicationPackId) form.append('applicationPackId', profile.applicationPackId);
      const response = await tokenFetch('documents', { method: 'POST', body: form });
      if (!response.ok) {
        let detail = '';
        try { detail = (await response.json())?.error || ''; } catch {}
        throw new Error(detail || `Upload failed with status ${response.status}.`);
      }
      const saved = await response.json();
      setUploadedDocs((prev) => ({ ...prev, [checklistId]: { ...saved, id: saved.id, checklistId, documentKey: config.backendKey, byteLength: saved.byteLength ?? file.size, contentType: file.type, statusType: 'verified', originalFileName: saved.originalFileName || file.name } }));
      updateProfileForUpload(checklistId);
      setUploadSuccessNotice(isHindi ? `"${file.name}" सफलतापूर्वक सर्वर पर सहेजा गया।` : `"${file.name}" was uploaded and saved successfully.`);
      setTimeout(() => setUploadSuccessNotice(null), 5000);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch (err) { setUploadError(err?.message || 'Upload failed. Please try again.'); }
    finally { setUploading(false); }
  };

  const handleFileChange = (e) => { const file = e.target.files?.[0]; if (file) uploadDocument(file); };

  const openDocument = async (doc) => {
    if (!doc?.id) return;
    try {
      const response = await tokenFetch(`documents/${doc.id}`);
      if (!response.ok) throw new Error('Unable to open the saved document.');
      const blob = await response.blob();
      setViewingDoc({ ...doc, previewUrl: URL.createObjectURL(blob), contentType: blob.type || doc.contentType || '' });
    } catch (err) { setUploadError(err?.message || 'Unable to open the saved document.'); }
  };

  const deleteDocument = async (doc) => {
    if (!doc?.id) return;
    try {
      const response = await tokenFetch(`documents/${doc.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) throw new Error('Unable to delete the document.');
      await refreshDocuments();
      setViewingDoc(null);
      setUploadSuccessNotice('Document deleted successfully.');
    } catch (err) { setUploadError(err?.message || 'Unable to delete the document.'); }
  };

  const docs = useMemo(() => DOC_CONFIG.map((config) => {
    const saved = uploadedDocs[config.id];
    return { ...config, statusType: saved ? 'verified' : 'missing', fileName: saved?.originalFileName || null, fileSize: saved?.byteLength || null, fileId: saved?.id || null };
  }), [uploadedDocs]);
  const pendingDocs = docs.filter((d) => d.statusType === 'missing');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 font-sans">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider mb-2"><FolderCheck className="w-3.5 h-3.5 text-emerald-600" /><span>{localizeTernary('दस्तावेज चेकलिस्ट एवं सत्यापन', 'Document Checklist & Verification', lang)}</span></div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{localizeTernary('सरकारी दस्तावेज डोजियर', 'Government Document Dossier', lang)}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{isHindi ? <> <strong>{selectedScheme?.schemeName || 'माइक्रो क्रेडिट योजना (MCS)'}</strong> के लिए कॉन्फ़िगर किया गया। अपने कंप्यूटर से दस्तावेज़ अपलोड करें और सुरक्षित रूप से सहेजें। </> : <>Configured for <strong>{selectedScheme?.schemeName || 'Micro Credit Scheme (MCS)'}</strong>. Upload documents from your computer and save them securely on the server.</>}</p>
        </div>
        <div className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-medium">✓ PDF, JPG, PNG • Max 5 MB</div>
      </div>

      {uploadSuccessNotice && <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs flex items-center space-x-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span className="font-bold">{uploadSuccessNotice}</span></div>}
      {uploadError && <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl text-xs flex items-center space-x-2.5"><AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><span className="font-bold">{uploadError}</span></div>}

      {pendingDocs.length > 0 ? <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-4 text-xs space-y-2 text-left"><div className="flex items-center space-x-2 text-amber-900 font-bold"><AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /><span>{isHindi ? `लंबित दस्तावेज सुधार (${pendingDocs.length} कार्रवाइयां आवश्यक)` : `Pending Document Remediation (${pendingDocs.length} Actions Needed)`}</span></div><p className="text-amber-800 text-[11px] leading-relaxed font-normal">{localizeTernary('सत्यापित दस्तावेज अपलोड करने के लिए नीचे क्लिक करें:', 'Click below to select and upload your documents:', lang)}</p><div className="flex flex-wrap gap-2 pt-1">{pendingDocs.map((pd) => <span key={pd.id} className="bg-white border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-2"><span>⚠️</span><span>{localizeDocTitle(pd.id, pd.name)}</span><button disabled={uploading} onClick={() => triggerFileUpload(pd.id)} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center space-x-1"><UploadCloud className="w-3 h-3" /><span>{localizeTernary('फ़ाइल चुनें', 'Choose File', lang)}</span></button></span>)}</div></div> : <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs flex items-center justify-between"><div className="flex items-center space-x-2 text-emerald-900 font-bold"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>{localizeTernary('सभी आवश्यक दस्तावेज सत्यापित!', 'All required documents verified!', lang)}</span></div><span className="bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full text-[10px] font-bold">100% Bank Ready</span></div>}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"><table className="w-full text-left text-xs border-collapse"><thead><tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold"><th className="p-4">Document Title</th><th className="p-4">Requirement</th><th className="p-4">Status</th><th className="p-4">Attached File</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{docs.map((doc) => { const saved = uploadedDocs[doc.id]; return <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-4 font-bold text-slate-900"><div className="flex items-center space-x-2"><FileText className="w-4 h-4 text-slate-400 shrink-0" /><span>{localizeDocTitle(doc.id, doc.name)}</span></div></td><td className="p-4">{doc.mandatory ? <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Mandatory</span> : <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Optional</span>}</td><td className="p-4"><span className={`inline-flex items-center space-x-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${saved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{saved ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}<span>{saved ? getStatusLabel('verified') : getStatusLabel('missing')}</span></span></td><td className="p-4 font-mono text-[11px] text-slate-600">{saved ? <div><button onClick={() => openDocument(saved)} className="text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer truncate max-w-[180px]" title="View saved document">{saved.originalFileName}</button><span className="text-[10px] text-slate-400 font-sans ml-1">({formatBytes(saved.byteLength)})</span></div> : <span className="text-slate-400 italic">No file uploaded</span>}</td><td className="p-4 text-right"><div className="inline-flex items-center gap-2">{saved ? <><button onClick={() => openDocument(saved)} className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center space-x-1"><Eye className="w-3 h-3" /><span>View</span></button><button onClick={() => triggerFileUpload(doc.id)} disabled={uploading} className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-xl font-bold text-[11px] inline-flex items-center space-x-1"><RefreshCw className="w-3 h-3" /><span className="hidden sm:inline">Replace</span></button></> : <button onClick={() => triggerFileUpload(doc.id)} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs inline-flex items-center space-x-1.5"><UploadCloud className="w-3.5 h-3.5" /><span>Upload</span></button>}</div></td></tr>; })}</tbody></table></div>

      <div className="flex justify-end pt-2"><button onClick={onProceedToPack} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-2 cursor-pointer active:scale-95"><span>View Application Pack →</span><ArrowRight className="w-3.5 h-3.5" /></button></div>

      {viewingDoc && <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"><div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl relative max-h-[90vh] overflow-y-auto"><button onClick={() => { URL.revokeObjectURL(viewingDoc.previewUrl); setViewingDoc(null); }} className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 font-bold">✕</button><div className="border-b border-slate-200 pb-4 text-center"><div className="inline-flex items-center space-x-2 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider"><Sparkles className="w-3 h-3 text-emerald-600" /><span>Saved Beneficiary Document</span></div><h3 className="text-lg font-black text-slate-900 mt-2">{localizeDocTitle(viewingDoc.checklistId, docs.find((d) => d.id === viewingDoc.checklistId)?.name || 'Document')}</h3><p className="text-xs text-slate-500 font-mono mt-1">{viewingDoc.originalFileName} ({formatBytes(viewingDoc.byteLength)})</p></div><div className="border rounded-2xl overflow-hidden bg-slate-100 p-2 min-h-[300px] flex items-center justify-center">{(viewingDoc.contentType || '').startsWith('image/') ? <img src={viewingDoc.previewUrl} alt={viewingDoc.originalFileName} className="max-h-[60vh] w-auto mx-auto object-contain rounded-xl shadow-md" /> : <iframe src={viewingDoc.previewUrl} title={viewingDoc.originalFileName} className="w-full h-[60vh] rounded-xl border border-slate-300" /></div><div className="flex items-center justify-between"><button onClick={() => deleteDocument(viewingDoc)} className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Delete</button><div className="flex items-center gap-2"><button onClick={() => { const a = document.createElement('a'); a.href = viewingDoc.previewUrl; a.download = viewingDoc.originalFileName; a.click(); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"><FileDown className="w-3.5 h-3.5" />Download</button><button onClick={() => { URL.revokeObjectURL(viewingDoc.previewUrl); setViewingDoc(null); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs">Done</button></div></div></div></div>}

      {loadingDocs && <div className="fixed bottom-4 right-4 bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-2 text-xs font-bold text-slate-600">Loading saved documents…</div>}
    </div>
  );
}
