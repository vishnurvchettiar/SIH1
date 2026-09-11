const DB_NAME = 'SchemeReadyDocumentStore';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open document storage.'));
  });
}

export async function saveDocument(userId, docId, file) {
  const db = await openDb();
  const record = {
    key: `${userId}:${docId}`,
    userId,
    docId,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    updatedAt: new Date().toISOString(),
    blob: file
  };

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Unable to save document.'));
    tx.onabort = () => reject(tx.error || new Error('Document save was aborted.'));
  });

  db.close();
  return record;
}

export async function listDocuments(userId) {
  const db = await openDb();
  const records = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).index('userId').getAll(userId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Unable to read saved documents.'));
  });
  db.close();
  return records;
}

export async function deleteUserDocuments(userId) {
  const db = await openDb();
  const records = await listDocumentsFromDb(db, userId);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    records.forEach((record) => store.delete(record.key));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Unable to clear saved documents.'));
    tx.onabort = () => reject(tx.error || new Error('Document cleanup was aborted.'));
  });
  db.close();
}

function listDocumentsFromDb(db, userId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).index('userId').getAll(userId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Unable to read saved documents.'));
  });
}

export function createObjectUrl(record) {
  if (!record?.blob) return null;
  return URL.createObjectURL(record.blob);
}

export function revokeObjectUrl(url) {
  if (url) URL.revokeObjectURL(url);
}
