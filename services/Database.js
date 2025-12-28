import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';
import { Updates } from 'expo'; // For reloading if needed, though state update is better

const DB_FILE = FileSystem.documentDirectory + 'db.json';
const MEDIA_DIR = FileSystem.documentDirectory + 'media/';

const DEFAULT_DB = {
    meta: { version: 1, created_at: new Date().toISOString() },
    payment_types: ['General'],
    payment_categories: ['Seeds', 'Fertilizer', 'Labor', 'Equipment'],
    payments: [],
    workers: [],
    attendance: []
};

// Initialize DB and Media Directory
export const initDB = async () => {
    try {
        const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
        }

        const fileInfo = await FileSystem.getInfoAsync(DB_FILE);
        if (!fileInfo.exists) {
            await FileSystem.writeAsStringAsync(DB_FILE, JSON.stringify(DEFAULT_DB));
        }
    } catch (error) {
        console.error("DB Init Error:", error);
    }
};

// Low-level Load/Save
const loadDB = async () => {
    try {
        const content = await FileSystem.readAsStringAsync(DB_FILE);
        return JSON.parse(content);
    } catch (e) {
        console.error("Load Error:", e);
        return DEFAULT_DB;
    }
};

const saveDB = async (data) => {
    try {
        await FileSystem.writeAsStringAsync(DB_FILE, JSON.stringify(data));
    } catch (e) {
        console.error("Save Error:", e);
    }
};

// Generic Collection Helpers
export const getCollection = async (collectionName) => {
    const db = await loadDB();
    return db[collectionName] || [];
};

export const setCollection = async (collectionName, newData) => {
    const db = await loadDB();
    db[collectionName] = newData;
    await saveDB(db);
};

export const addToCollection = async (collectionName, item) => {
    const db = await loadDB();
    if (!db[collectionName]) db[collectionName] = [];
    // Add to beginning (Desc order typically)
    db[collectionName].unshift(item);
    await saveDB(db);
    return db[collectionName];
};

export const updateInCollection = async (collectionName, idField, idValue, updates) => {
    const db = await loadDB();
    if (!db[collectionName]) return [];

    db[collectionName] = db[collectionName].map(item =>
        item[idField] === idValue ? { ...item, ...updates } : item
    );
    await saveDB(db);
    return db[collectionName];
};

export const removeFromCollection = async (collectionName, idField, idValue) => {
    const db = await loadDB();
    if (!db[collectionName]) return [];

    db[collectionName] = db[collectionName].filter(item => item[idField] !== idValue);
    await saveDB(db);
    return db[collectionName];
};

// Media Management
// Media Management
export const saveMedia = async (uri) => {
    if (!uri) return null;
    try {
        // Ensure URI has file:// prefix on Android if it's an absolute path
        let sourceUri = uri;
        if (!sourceUri.startsWith('file://') && !sourceUri.startsWith('content://') && !sourceUri.startsWith('http')) {
            // Basic check for absolute path
            if (sourceUri.startsWith('/')) {
                sourceUri = 'file://' + sourceUri;
            }
        }

        const info = await FileSystem.getInfoAsync(sourceUri);
        if (!info.exists) {
            console.warn("Media source file not found:", sourceUri);
            return null;
        }

        const filename = sourceUri.split('/').pop();
        const newPath = MEDIA_DIR + filename;

        // CHECK: If source and destination are the same, just return the relative path
        // This handles the "Edit" case where we re-save existing media
        // Normalize paths for comparison (remove file:// prefix for consistency check if needed, but usually URI includes it)
        if (sourceUri === newPath || sourceUri === 'file://' + newPath) {
            return 'media/' + filename;
        }

        await FileSystem.copyAsync({ from: sourceUri, to: newPath });
        return 'media/' + filename; // Return relative path
    } catch (e) {
        // If error is "same file", ignore it and return success
        if (e.message.includes("are the same")) {
            const filename = uri.split('/').pop();
            return 'media/' + filename;
        }
        console.error("Media Save Error:", e);
        return null; // Fail gracefully
    }
};

export const getMediaUri = (relativePath) => {
    if (!relativePath) return null;
    return FileSystem.documentDirectory + relativePath;
};

// Export/Import
// Export/Import with Media (ZIP)
export const exportFullBackup = async () => {
    try {
        if (!(await Sharing.isAvailableAsync())) {
            alert("Sharing is not available");
            return;
        }

        const zip = new JSZip();

        // 1. Add DB JSON
        const dbContent = await FileSystem.readAsStringAsync(DB_FILE);
        zip.file("db.json", dbContent);

        // 2. Add Media Files
        const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
        if (dirInfo.exists && dirInfo.isDirectory) {
            const mediaFolder = zip.folder("media");
            const files = await FileSystem.readDirectoryAsync(MEDIA_DIR);

            for (const file of files) {
                const fileUri = MEDIA_DIR + file;
                const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64
                });
                mediaFolder.file(file, fileContent, { base64: true });
            }
        }

        // 3. Generate Zip
        const zipBase64 = await zip.generateAsync({ type: "base64" });
        const backupUri = FileSystem.cacheDirectory + `AgriLedger_Backup_${new Date().toISOString().split('T')[0]}.zip`;

        await FileSystem.writeAsStringAsync(backupUri, zipBase64, {
            encoding: FileSystem.EncodingType.Base64
        });

        // 4. Share
        await Sharing.shareAsync(backupUri);

    } catch (e) {
        console.error("Export Error:", e);
        alert("Failed to export backup");
    }
};

export const importFullBackup = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/zip', 'application/x-zip-compressed', 'application/json'],
            copyToCacheDirectory: true
        });

        if (result.canceled) return false;
        const { uri, name } = result.assets[0];

        // LEGACY JSON HANDLER (Keep simple overwrite for legacy single file)
        if (name.endsWith('.json')) {
            const content = await FileSystem.readAsStringAsync(uri);
            const parsed = JSON.parse(content);
            if (!parsed.payment_types || !parsed.payments) {
                alert("Invalid Database File");
                return false;
            }
            await FileSystem.writeAsStringAsync(DB_FILE, content);
            return true;
        }

        // ZIP HANDLER - MERGE STRATEGY
        const zipContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64
        });

        const zip = await JSZip.loadAsync(zipContent, { base64: true });

        // 1. Prepare Current DB
        let currentDB = {
            payments: [],
            payment_types: { expenses: [], incomes: [] },
            workers: [],
            worker_logs: []
        };

        const currentInfo = await FileSystem.getInfoAsync(DB_FILE);
        if (currentInfo.exists) {
            const currentContent = await FileSystem.readAsStringAsync(DB_FILE);
            try {
                const parsed = JSON.parse(currentContent);
                currentDB = { ...currentDB, ...parsed };
            } catch (e) {
                console.warn("Current DB corrupt, starting fresh for merge");
            }
        }

        // 2. Load Imported DB
        const dbFile = zip.file("db.json");
        if (!dbFile) {
            alert("Invalid Backup: No db.json found");
            return false;
        }

        const importedText = await dbFile.async("string");
        const importedDB = JSON.parse(importedText);

        if (!importedDB.payment_types) {
            alert("Invalid Database Structure");
            return false;
        }

        // 3. Merge Collections (Prevent Duplicates by ID)
        const mergeCollection = (currentArr, importedArr) => {
            if (!importedArr) return currentArr;
            const currentIds = new Set(currentArr.map(item => item.id));
            const merged = [...currentArr];

            importedArr.forEach(item => {
                if (item.id && !currentIds.has(item.id)) {
                    merged.push(item);
                    currentIds.add(item.id);
                }
            });
            return merged;
        };

        currentDB.payments = mergeCollection(currentDB.payments || [], importedDB.payments || []);
        currentDB.workers = mergeCollection(currentDB.workers || [], importedDB.workers || []);
        currentDB.worker_logs = mergeCollection(currentDB.worker_logs || [], importedDB.worker_logs || []);

        // Merge Payment Types (Unique Strings)
        if (importedDB.payment_types) {
            if (!currentDB.payment_types) currentDB.payment_types = { expenses: [], incomes: [] };

            const mergeStrings = (curr, imp) => [...new Set([...(curr || []), ...(imp || [])])];

            if (importedDB.payment_types.expenses) {
                currentDB.payment_types.expenses = mergeStrings(currentDB.payment_types.expenses, importedDB.payment_types.expenses);
            }
            if (importedDB.payment_types.incomes) {
                currentDB.payment_types.incomes = mergeStrings(currentDB.payment_types.incomes, importedDB.payment_types.incomes);
            }
        }

        // 4. Save Merged DB
        await FileSystem.writeAsStringAsync(DB_FILE, JSON.stringify(currentDB));

        // 5. Merge Media (Preserve Existing)
        await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
        const mediaFolder = zip.folder("media");

        if (mediaFolder) {
            const mediaFiles = [];
            mediaFolder.forEach((relativePath, file) => mediaFiles.push({ path: relativePath, fileObj: file }));

            for (const { path, fileObj } of mediaFiles) {
                if (!fileObj.dir) {
                    const fileName = path.split('/').pop();
                    const targetPath = MEDIA_DIR + fileName;
                    const fileInfo = await FileSystem.getInfoAsync(targetPath);

                    if (!fileInfo.exists) {
                        // Only save if file DOES NOT exist (Preserve local)
                        const content = await fileObj.async("base64");
                        await FileSystem.writeAsStringAsync(targetPath, content, {
                            encoding: FileSystem.EncodingType.Base64
                        });
                    }
                }
            }
        }

        return true;

    } catch (e) {
        console.error("Import Error:", e);
        alert("Failed to import backup: " + e.message);
        return false;
    }
};
