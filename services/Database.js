import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
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
        await FileSystem.copyAsync({ from: sourceUri, to: newPath });
        return 'media/' + filename; // Return relative path
    } catch (e) {
        console.error("Media Save Error:", e);
        return null; // Fail gracefully
    }
};

export const getMediaUri = (relativePath) => {
    if (!relativePath) return null;
    return FileSystem.documentDirectory + relativePath;
};

// Export/Import
export const exportDB = async () => {
    // For now, just share the JSON file. 
    // Future: Zip db.json + media folder
    if (!(await Sharing.isAvailableAsync())) {
        alert("Sharing is not available on this device");
        return;
    }
    await Sharing.shareAsync(DB_FILE);
};

export const importDB = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true
        });

        if (result.canceled) return false;

        const { uri } = result.assets[0];
        const content = await FileSystem.readAsStringAsync(uri);

        // Basic Validation
        const parsed = JSON.parse(content);
        if (!parsed.payment_types || !parsed.payments) {
            alert("Invalid Database File");
            return false;
        }

        // Overwrite DB
        await FileSystem.writeAsStringAsync(DB_FILE, content);
        return true;
    } catch (e) {
        console.error("Import Error:", e);
        alert("Failed to import database");
        return false;
    }
};
