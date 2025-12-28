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
            type: ['application/zip', 'application/x-zip-compressed', 'application/json'], // Allow JSON for legacy support
            copyToCacheDirectory: true
        });

        if (result.canceled) return false;
        const { uri, name } = result.assets[0];

        // LEGACY: If JSON, use old method
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

        // ZIP HANDLER
        const zipContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64
        });

        const zip = await JSZip.loadAsync(zipContent, { base64: true });

        // 1. Validate & Restore DB
        const dbFile = zip.file("db.json");
        if (!dbFile) {
            alert("Invalid Backup: No db.json found");
            return false;
        }

        const dbText = await dbFile.async("string");
        const parsed = JSON.parse(dbText);
        // Simple validation
        if (!parsed.payment_types) {
            alert("Invalid Database Structure");
            return false;
        }

        // Write DB
        await FileSystem.writeAsStringAsync(DB_FILE, dbText);

        // 2. Restore Media
        // Wipe current media dir first? Yes, for clean restore.
        await FileSystem.deleteAsync(MEDIA_DIR, { idempotent: true });
        await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });

        const mediaFolder = zip.folder("media");
        if (mediaFolder) {
            const mediaFiles = [];
            mediaFolder.forEach((relativePath, file) => mediaFiles.push(file));

            for (const file of mediaFiles) {
                if (!file.dir) { // Skip directories
                    const fileName = file.name.split('/').pop(); // Handle nested paths if any
                    const fileData = await file.async("base64");
                    await FileSystem.writeAsStringAsync(MEDIA_DIR + fileName, fileData, {
                        encoding: FileSystem.EncodingType.Base64
                    });
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
