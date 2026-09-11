import { localizeTernary } from "../l10n";
import React, { useEffect, useState, useRef } from 'react';
import { translations } from '../translations';
import { 
  FolderCheck, UploadCloud, CheckCircle2, Clock, AlertCircle, FileDown, FileText, Sparkles, ArrowRight, RefreshCw, Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { createObjectUrl, listDocuments, revokeObjectUrl, saveDocument } from '../storage/documentStorage';

const BASE_DOCS = [
  { id: 'doc-aadhaar', name: 'Aadhaar / Voter ID (KYC)', status: 'Missing', statusType: 'missing', actionType: 'upload', mandatory: true },
  { id: 'doc-caste', name: 'Caste Certificate (RD Number)', status: 'Missing', statusType: 'missing', actionType: 'upload', mandatory: true },
  { id: 'doc-income', name: 'Income Certificate', status: 'Missing', statusType: 'missing', actionType: 'upload', mandatory: true },
  { id: 'doc-bank', name: 'Bank Account Passbook / Proof', status: 'Missing', statusType: 'missing', actionType: 'upload', mandatory: true },
  { id: 'doc-quotation', name: 'Business / Machinery Quotation', status: 'Missing', statusType: 'missing', actionType: 'upload', mandatory: false },
  { id: 'doc-dpr', name: 'One-Page Project Report (DPR)', status: 'Generated', statusType: 'generated', actionType: 'download', mandatory: true, fileName: 'project_viability_report.pdf', fileSize: '185 KB' }
];

export default function DocumentChecklist({ lang = 'en', profile, setProfile, selectedScheme, onProceedToPack }) {
  const t = translations[lang] || translations.en;
  const isHindi = lang === 'hi';
  const fileInputRef = useRef(null);
  const [activeUploadDocId, setActiveUploadDocId] = useState(null);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState(null);
  const [savedDocs, setSavedDocs] = useState([]);
  const [docs, setDocs] = useState(BASE_DOCS);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [digiLockerSyncing, setDigiLockerSyncing] = useState(false);

  const userId = profile?.id || 'anonymous';

  const getDocTitle = (id, fallback) => {
    if (lang === 'en') return fallback;
    const map = {
      'doc-aadhaar': { hi: 'आधार / मतदाता पहचान पत्र (KYC)', kn: 'ಆಧಾರ್ / ಮತದಾರರ ಗುರುತಿನ ಚೀಟಿ (KYC)', ta: 'ஆதார் / வாக்காளர் அடையாள அட்டை (KYC)', te: 'ఆధార్ / ఓటర్ ఐడి (KYC)', mr: 'आधार / मतदार ओळखपत्र (KYC)', bn: 'আধার / ভোটার পরিচয়পত্র (KYC)' },
      'doc-caste': { hi: 'जाति प्रमाण पत्र (आरडी नंबर)', kn: 'ಜಾತಿ ಪ್ರಮಾಣಪತ್ರ (RD ಸಂಖ್ಯೆ)', ta: 'சாதி சான்றிதழ் (RD எண்)', te: 'కుల ధృవీకరణ పత్రం (RD నంబర్)', mr: 'जातीचे प्रमाणपत्र (RD क्रमांक)', bn: 'জাতিগত শংসাপত্র (RD নম্বর)' },
      'doc-income': { hi: 'आय प्रमाण पत्र (तहसीलदार प्रमाणित)', kn: 'ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ (ತಹಶೀಲ್ದಾರ್ ದೃಢೀಕರಿಸಿದ)', ta: 'வருமான சான்றிதழ் (வட்டாட்சியர் சான்றளித்தது)', te: 'ఆదాయ ధృవీకరణ పత్రం (తహశీల్దార్ ధృవీకరించినది)', mr: 'उत्पन्न प्रमाणपत्र (तहसीलदार प्रमाणित)', bn: 'আয় শংসাপত্র (তহশিলদার প্রত্যয়িত)' },
      'doc-bank': { hi: 'बैंक खाता पासबुक / प्रमाण', kn: 'ಬ್ಯಾಂಕ್ ಖಾತೆ ಪಾಸ್‌ಬುಕ್ / ಪುರಾವೆ', ta: 'வங்கி கணக்கு பாஸ்புக் / சான்று', te: 'బ్యాంక్ ఖాతా పాస్‌బుక్ / రుజువు', mr: 'बँक खाते पासबुक / पुरावा', bn: 'ব্যাংক একাউন্ট পাসবই / প্রমাণ' },
      'doc-quotation': { hi: 'व्यावसायिक मशीनरी / स्टॉक कोटेशन', kn: 'ವ್ಯಾಪಾರ ಯಂತ್ರೋಪಕರಣ / ಸ್ಟಾಕ್ ಕೊಟೇಶನ್', ta: 'வணிக இயந்திரங்கள் / இருப்பு விலைப்புள்ளி', te: 'వ్యాపార యంత్రాలు / స్టాక్ కొటేషన్', mr: 'व्यावसायिक यंत्रसामग्री / स्टॉक कोटेशन', bn: 'বাণিজ্যিক যন্ত্রপাতি / স্টক কোটেশন' },
      'doc-dpr': { hi: 'एक-पेज प्रोजेक्ट रिपोर्ट (डीपीआर)', kn: 'ಒಂದು ಪುಟದ ಯೋಜನಾ ವರದಿ (DPR)', ta: 'ஒரு பக்க திட்ட அறிக்கை (DPR)', te: 'ఒక పేజీ ప్రాజెక్ట్ నివేదిక (DPR)', mr: 'एक-पानी प्रकल्प अहवाल (DPR)', bn: 'এক পৃষ্ঠার প্রকল্প প্রতিবেদন (DPR)' }
    };
    return map[id]?.[lang] || map[id]?.hi || fallback;
  };

  const getStatusLabel = (statusType, rawStatus) => {
    const tCheck = t.checklist || {};
    if (statusType === 'verified') return tCheck.statusVerified || 'Verified';
    if (statusType === 'pending') return tCheck.statusPending || 'Pending review';
    if (statusType === 'missing') return tCheck.statusMissing || 'Missing';
    if (statusType === 'uploaded') return tCheck.statusUploaded || 'Uploaded';
    if (statusType === 'generated') return tCheck.statusGenerated || 'Generated';
    return rawStatus;
  };

  const hydrateDocuments = async () => {
    try {
      const records = await listDocuments(userId);
      setSavedDocs(records);
      setDocs(prev => prev.map(doc => {
        const record = records.find(item => item.docId === doc.id);
        if (!record) return doc;
        return {
          ...doc,
          status: 'Uploaded',
          statusType: 'uploaded',
          fileName: record.name,
          fileSize: record.size > 1024 * 1024 ? `${(record.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(record.size / 1024))} KB`
        };
      }));
    } catch (error) {
      setUploadSuccessNotice(`Document storage is unavailable: ${error.message}`);
      setTimeout(() => setUploadSuccessNotice(null), 5000);
    }
  };

  useEffect(() => {
    hydrateDocuments();
  }, [userId]);

  const triggerFileUpload = (docId) => {
    setActiveUploadDocId(docId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    const id = activeUploadDocId;
    if (!file || !id) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const extensionOk = /\.(pdf|png|jpe?g|doc|docx)$/i.test(file.name);
    const maxSize = 10 * 1024 * 1024;
    if ((!allowedTypes.includes(file.type) && !extensionOk) || file.size > maxSize) {
      setUploadSuccessNotice('Upload failed: please select a PDF, JPG, JPEG, PNG, DOC, or DOCX file up to 10 MB.');
      setTimeout(() => setUploadSuccessNotice(null), 5000);
      return;
    }

    try {
      await saveDocument(userId, id, file);
      await hydrateDocuments();

      if (id === 'doc-caste') {
        setProfile(p => ({ ...p, hasCasteCertificate: true, uploadedDocs: Array.from(new Set([...(p.uploadedDocs || []), 'Caste certificate'])) }));
      } else if (id === 'doc-income') {
        setProfile(p => ({ ...p, hasIncomeCertificate: true, uploadedDocs: Array.from(new Set([...(p.uploadedDocs || []), 'Income certificate'])) }));
      } else if (id === 'doc-quotation') {
        setProfile(p => ({ ...p, uploadedDocs: Array.from(new Set([...(p.uploadedDocs || []), 'Business quotation'])) }));
      } else if (id === 'doc-aadhaar') {
        setProfile(p => ({ ...p, uploadedDocs: Array.from(new Set([...(p.uploadedDocs || []), 'Aadhaar/KYC'])) }));
      } else if (id === 'doc-bank') {
        setProfile(p => ({ ...p, uploadedDocs: Array.from(new Set([...(p.uploadedDocs || []), 'Bank passbook'])) }));
      }

      const sizeText = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      setUploadSuccessNotice(isHindi ? `"${file.name}" सफलतापूर्वक सहेजा गया (${sizeText})। अब आप इसे देख सकते हैं।` : `"${file.name}" uploaded successfully (${sizeText}). You can view it now.`);
      setTimeout(() => setUploadSuccessNotice(null), 5000);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch (error) {
      setUploadSuccessNotice(`Upload failed: ${error.message}`);
      setTimeout(() => setUploadSuccessNotice(null), 5000);
    } finally {
      e.target.value = '';
    }
  };

  const handleView = async (doc) => {
    try {
      const records = await listDocuments(userId);
      const record = records.find(item => item.docId === doc.id);
      if (!record) {
        setViewingDoc({ ...doc, missingFile: true });
        return;
      }
      const url = createObjectUrl(record);
      setViewingDoc({ ...doc, fileName: record.name, fileSize: record.size > 1024 * 1024 ? `${(record.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(record.size / 1024))} KB`, previewUrl: url, recordType: record.type });
    } catch (error) {
      setUploadSuccessNotice(`Unable to open document: ${error.message}`);
      setTimeout(() => setUploadSuccessNotice(null), 5000);
    }
  };

  const closeViewer = () => {
    if (viewingDoc?.previewUrl) revokeObjectUrl(viewingDoc.previewUrl);
    setViewingDoc(null);
  };

  const handleDigiLockerBulkSync = () => {
    setDigiLockerSyncing(true);
    setTimeout(() => setDigiLockerSyncing(false), 1000);
    setUploadSuccessNotice('DigiLocker sync is a UI simulation; use device upload for persistent files.');
    setTimeout(() => setUploadSuccessNotice(null), 5000);
  };

  const pendingDocs = docs.filter(d => d.statusType === 'missing' || d.statusType === 'pending');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 font-sans">
      <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider mb-2"><FolderCheck className="w-3.5 h-3.5 text-emerald-600" /><span>{localizeTernary('दस्तावेज चेकलिस्ट एवं सत्यापन', 'Document Checklist & Verification', lang)}</span></div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{localizeTernary('सरकारी दस्तावेज डोजियर', 'Government Document Dossier', lang)}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Configured for <strong>{selectedScheme?.schemeName || 'Micro Credit Scheme (MCS)'}</strong>. Upload a file from your device and it will be stored for this user in browser storage.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={handleDigiLockerBulkSync} disabled={digiLockerSyncing} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-2 transition-all shadow-xs active:scale-95 cursor-pointer"><Sparkles className="w-3.5 h-3.5 text-emerald-300" /><span>{digiLockerSyncing ? 'Fetching...' : '1-Click DigiLocker Sync'}</span></button>
          <div className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-medium">✓ PDF, JPG, PNG supported · Max 10 MB</div>
        </div>
      </div>

      {uploadSuccessNotice && <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs flex items-center space-x-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span className="font-bold">{uploadSuccessNotice}</span></div>}

      {pendingDocs.length > 0 ? <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-4 text-xs space-y-2 text-left"><div className="flex items-center space-x-2 text-amber-900 font-bold"><AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /><span>{isHindi ? `लंबित दस्तावेज सुधार (${pendingDocs.length} कार्रवाइयां आवश्यक)` : `Pending Document Remediation (${pendingDocs.length} Actions Needed)`}</span></div><p className="text-amber-800 text-[11px] leading-relaxed">{localizeTernary('ऋण मूल्यांकन से पहले चैनल पार्टनर्स को सत्यापित दस्तावेजों की आवश्यकता होती है। अपने कंप्यूटर से चुनने और अपलोड करने के लिए नीचे क्लिक करें:', 'Channel Partners require verified documentation before loan appraisal. Choose and upload files from your computer:', lang)}</p><div className="flex flex-wrap gap-2 pt-1">{pendingDocs.map(pd => <span key={pd.id} className="bg-white border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-2 shadow-xs"><span>⚠️</span><span>{getDocTitle(pd.id, pd.name)}</span><button onClick={() => triggerFileUpload(pd.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg inline-flex items-center space-x-1"><UploadCloud className="w-3 h-3" /><span>{localizeTernary('फ़ाइल चुनें', 'Choose File', lang)}</span></button></span>)}</div></div> : <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs flex items-center justify-between"><div className="flex items-center space-x-2 text-emerald-900 font-bold"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>{localizeTernary('सभी आवश्यक दस्तावेज सत्यापित!', 'All Required Documents Uploaded!', lang)}</span></div></div>}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"><table className="w-full text-left text-xs border-collapse"><thead><tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold"><th className="p-4">Document Title</th><th className="p-4">Requirement</th><th className="p-4">Status</th><th className="p-4">Attached File</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{docs.map(doc => { const isUploaded = doc.statusType === 'uploaded'; const isGenerated = doc.statusType === 'generated'; return <tr key={doc.id} className="hover:bg-slate-50/50"><td className="p-4 font-bold text-slate-900"><div className="flex items-center space-x-2"><FileText className="w-4 h-4 text-slate-400" /><span>{getDocTitle(doc.id, doc.name)}</span></div></td><td className="p-4 text-slate-600">{doc.mandatory ? 'Mandatory' : 'Optional / As Required'}</td><td className="p-4"><span className={`inline-flex items-center space-x-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${isUploaded || isGenerated ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{isUploaded || isGenerated ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}<span>{getStatusLabel(doc.statusType, doc.status)}</span></span></td><td className="p-4 font-mono text-[11px] text-slate-600">{doc.fileName ? <button onClick={() => handleView(doc)} className="text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer truncate max-w-[180px]" title="Click to view document">{doc.fileName}</button> : <span className="text-slate-400 italic">No file uploaded</span>}</td><td className="p-4 text-right">{isUploaded ? <div className="inline-flex items-center space-x-1.5"><button onClick={() => handleView(doc)} className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center space-x-1"><Eye className="w-3 h-3" />View</button><button onClick={() => triggerFileUpload(doc.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-xl font-bold text-[11px] inline-flex items-center space-x-1"><RefreshCw className="w-3 h-3" />Replace</button></div> : isGenerated ? <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs"><FileDown className="w-3.5 h-3.5 inline mr-1" />Print / Save</button> : <button onClick={() => triggerFileUpload(doc.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs inline-flex items-center space-x-1.5"><UploadCloud className="w-3.5 h-3.5" />Upload File</button>}</td></tr>; })}</tbody></table></div>

      <div className="flex justify-end pt-2"><button onClick={onProceedToPack} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"><span>View Application Pack →</span><ArrowRight className="w-3.5 h-3.5" /></button></div>

      {viewingDoc && <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"><div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl relative max-h-[90vh] overflow-y-auto"><button onClick={closeViewer} className="absolute right-5 top-4 text-slate-500 hover:text-slate-900 text-xl">✕</button><div className="border-b border-slate-200 pb-4 text-center"><h3 className="text-lg font-black text-slate-900">{getDocTitle(viewingDoc.id, viewingDoc.name)}</h3><p className="text-xs text-slate-500 font-mono mt-1">File: {viewingDoc.fileName} {viewingDoc.fileSize && `(${viewingDoc.fileSize})`}</p></div>{viewingDoc.missingFile ? <div className="p-8 text-center text-slate-500">The saved file could not be found. Please upload it again.</div> : viewingDoc.recordType?.startsWith('image/') ? <div className="border rounded-2xl bg-slate-100 p-2 flex justify-center"><img src={viewingDoc.previewUrl} alt={viewingDoc.name} className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md" /></div> : viewingDoc.recordType === 'application/pdf' ? <iframe src={viewingDoc.previewUrl} title={viewingDoc.name} className="w-full h-[65vh] rounded-xl border border-slate-300" /> : <div className="p-8 bg-slate-50 rounded-2xl text-center text-slate-600">Preview is not available for this file type. Use the file name above to replace it with a PDF or image for inline preview.</div>}<div className="flex justify-end"><button onClick={closeViewer} className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl text-xs">Done</button></div></div></div>}
    </div>
  );
}
