import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, TextInput,
    ScrollView, Modal, FlatList, Alert, Image, StatusBar, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Print from 'expo-print';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    initDB, getCollection, setCollection, addToCollection,
    removeFromCollection, saveMedia, getMediaUri, exportDB
} from '../services/Database';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { isSameDay, isSameMonth, isSameYear, parseISO, format, startOfDay, endOfDay } from 'date-fns';

const THEME_COLOR = '#497d59';

export default function PaymentScreen({ navigation }) {
    const isFocused = useIsFocused();
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('Expense');
    const [category, setCategory] = useState('Seeds');

    // Dynamic lists defaults
    const [typeList, setTypeList] = useState(['Income', 'Expense']);
    const [categoryList, setCategoryList] = useState(['Seeds', 'Fertilizer', 'Labor', 'Equipment']);

    const [image, setImage] = useState(null);
    const [audioUri, setAudioUri] = useState(null);

    // Modal States
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);

    // Inline Management Inputs
    const [newTypeInput, setNewTypeInput] = useState('');
    const [newCatInput, setNewCatInput] = useState('');

    // History States
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyFilter, setHistoryFilter] = useState('Day'); // Day, Month, Year

    // Edit Mode States
    const [editingType, setEditingType] = useState(null);
    const [tempTypeInput, setTempTypeInput] = useState('');

    const [editingCat, setEditingCat] = useState(null);
    const [tempCatInput, setTempCatInput] = useState('');

    // Details Modal State
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);

    // Player State
    const [sound, setSound] = useState();
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(1); // avoid /0
    const [isSeeking, setIsSeeking] = useState(false);

    // Removed useAudioRecorder hook

    useEffect(() => {
        if (isFocused) {
            initDB().then(() => {
                loadSettings();
                loadHistory();
            });
        }
    }, [isFocused]);

    const loadSettings = async () => {
        try {
            const storedTypes = await getCollection('payment_types');
            const storedCats = await getCollection('payment_categories');
            if (storedTypes.length > 0) setTypeList(storedTypes);
            if (storedCats.length > 0) setCategoryList(storedCats);
        } catch (e) { console.error(e); }
    };

    const saveSettings = async (key, data) => {
        try {
            await setCollection(key, data);
        } catch (e) { console.error(e); }
    };

    // --- Inline Management ---
    const addType = () => {
        if (!newTypeInput.trim()) return;
        if (typeList.includes(newTypeInput.trim())) return Alert.alert("Error", "Type already exists");
        const updated = [...typeList, newTypeInput.trim()];
        setTypeList(updated);
        saveSettings('payment_types', updated);
        setNewTypeInput('');
    };

    const deleteType = (item) => {
        Alert.alert("Delete", `Delete type "${item}"?`, [
            { text: "Cancel" },
            {
                text: "Delete", style: 'destructive', onPress: () => {
                    const updated = typeList.filter(t => t !== item);
                    setTypeList(updated);
                    saveSettings('payment_types', updated);
                    if (type === item) setType(updated[0]);
                }
            }
        ]);
    };

    const startEditType = (item) => {
        setEditingType(item);
        setTempTypeInput(item);
    };

    const saveEditedType = (originalItem) => {
        const newValue = tempTypeInput.trim();
        if (!newValue) return Alert.alert("Error", "Name cannot be empty");
        if (newValue !== originalItem && typeList.includes(newValue)) {
            return Alert.alert("Error", "Type already exists");
        }

        const updatedList = typeList.map(t => t === originalItem ? newValue : t);
        setTypeList(updatedList);
        saveSettings('payment_types', updatedList);

        // Update selected if needed
        if (type === originalItem) setType(newValue);

        setEditingType(null);
    };

    const addCategory = () => {
        if (!newCatInput.trim()) return;
        if (categoryList.includes(newCatInput.trim())) return Alert.alert("Error", "Category already exists");
        const updated = [...categoryList, newCatInput.trim()];
        setCategoryList(updated);
        saveSettings('payment_categories', updated);
        setNewCatInput('');
    };

    const deleteCategory = (item) => {
        Alert.alert("Delete", `Delete category "${item}"?`, [
            { text: "Cancel" },
            {
                text: "Delete", style: 'destructive', onPress: () => {
                    const updated = categoryList.filter(c => c !== item);
                    setCategoryList(updated);
                    saveSettings('payment_categories', updated);
                    if (category === item) setCategory(updated[0]);
                }
            }
        ]);
    };

    const startEditCategory = (item) => {
        setEditingCat(item);
        setTempCatInput(item);
    };

    const saveEditedCategory = (originalItem) => {
        const newValue = tempCatInput.trim();
        if (!newValue) return Alert.alert("Error", "Name cannot be empty");
        if (newValue !== originalItem && categoryList.includes(newValue)) {
            return Alert.alert("Error", "Category already exists");
        }

        const updatedList = categoryList.map(c => c === originalItem ? newValue : c);
        setCategoryList(updatedList);
        saveSettings('payment_categories', updatedList);

        // Update selected if needed
        if (category === originalItem) setCategory(newValue);

        setEditingCat(null);
    };

    // --- Transaction Logic ---
    const loadHistory = async () => {
        try {
            const stored = await getCollection('payments');
            setHistory(stored);
        } catch (e) { console.error(e); }
    };

    const deleteTransaction = async (id) => {
        Alert.alert("Delete", "Remove this transaction?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: 'destructive', onPress: async () => {
                    const updated = await removeFromCollection('payments', 'id', id);
                    setHistory(updated);
                }
            }
        ]);
    };

    // --- Audio Logic (using expo-av) ---
    const [recording, setRecording] = useState();

    // --- Print Logic ---
    const [printModalVisible, setPrintModalVisible] = useState(false);
    const [printStartDate, setPrintStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); // 1st of month
    const [printEndDate, setPrintEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const handlePrint = async () => {
        try {
            // Filter transactions
            const filtered = history.filter(t => {
                const tDate = parseISO(t.date);
                return tDate >= startOfDay(printStartDate) && tDate <= endOfDay(printEndDate);
            });

            if (filtered.length === 0) {
                Alert.alert("No Data", "No transactions found in selected range.");
                return;
            }

            // Generate HTML
            let rows = filtered.map(t => `
                <tr>
                    <td>${format(new Date(t.date), 'dd/MM/yyyy')}</td>
                    <td>${t.category}</td>
                    <td>${t.type}</td>
                    <td style="text-align: right; color: ${t.type === 'Income' ? 'green' : 'red'}">${t.amount}</td>
                </tr>
            `).join('');

            const html = `
                <html>
                    <head>
                        <style>
                            body { font-family: sans-serif; padding: 20px; }
                            h1 { text-align: center; color: ${THEME_COLOR}; marginBottom: 10px; }
                            p { text-align: center; color: #666; marginBottom: 20px; }
                            table { width: 100%; border-collapse: collapse; }
                            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                            th { background-color: ${THEME_COLOR}; color: white; }
                            tr:nth-child(even) { background-color: #f9f9f9; }
                        </style>
                    </head>
                    <body>
                        <h1>Transaction Report</h1>
                        <p>${format(printStartDate, 'dd MMM yyyy')} — ${format(printEndDate, 'dd MMM yyyy')}</p>
                        <table>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Type</th>
                                <th>Amount (₹)</th>
                            </tr>
                            ${rows}
                        </table>
                    </body>
                </html>
            `;

            await Print.printAsync({ html });
            setPrintModalVisible(false);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not print");
        }
    };

    const loadSound = async (pathOrUri) => {
        try {
            if (sound) await sound.unloadAsync();

            // Check if it's already a full URI (file://, content://, etc) or a relative path or absolute path
            const uri = (pathOrUri.startsWith('file:') || pathOrUri.startsWith('content:') || pathOrUri.startsWith('http') || pathOrUri.startsWith('/'))
                ? pathOrUri
                : getMediaUri(pathOrUri);

            const { sound: newSound, status } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: false }
            );

            setSound(newSound);
            setDuration(status.durationMillis || 1);
            setPosition(0);
            setIsPlaying(false);

            newSound.setOnPlaybackStatusUpdate(status => {
                if (status.isLoaded) {
                    setDuration(status.durationMillis || 1);
                    if (!isSeeking) setPosition(status.positionMillis);
                    setIsPlaying(status.isPlaying);
                    if (status.didJustFinish) {
                        setIsPlaying(false);
                        setPosition(0);
                    }
                }
            });
        } catch (error) {
            console.log('Error loading sound', error);
            Alert.alert("Error", "Could not load audio");
        }
    };

    const togglePlayback = async () => {
        if (!sound) return;
        if (isPlaying) {
            await sound.pauseAsync();
        } else {
            if (position >= duration) await sound.replayAsync();
            else await sound.playAsync();
        }
    };

    const handleSeek = async (value) => {
        if (sound) await sound.setPositionAsync(value);
        setPosition(value);
        setIsSeeking(false);
    };

    useEffect(() => {
        return sound
            ? () => { sound.unloadAsync(); }
            : undefined;
    }, [sound]);

    // Reset player on modal close
    useEffect(() => {
        if (!detailsModalVisible && sound) {
            sound.stopAsync();
            setIsPlaying(false);
        }
    }, [detailsModalVisible]);

    const handleToggleRecording = async () => {
        try {
            if (recording) {
                // Stop Recording
                await recording.stopAndUnloadAsync();
                const uri = recording.getURI();
                setAudioUri(uri);
                setRecording(undefined);
                // Auto-load for preview
                await loadSound(uri);
            } else {
                // Start Recording
                const { status } = await Audio.requestPermissionsAsync();
                if (status !== 'granted') return Alert.alert("Permission", "Audio permission required");

                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

                const { recording: newRecording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(newRecording);
            }
        } catch (err) {
            console.error('Failed to start/stop recording', err);
            Alert.alert("Error", "Could not record audio");
        }
    };

    const handleSubmit = async () => {
        if (!amount || isNaN(parseFloat(amount))) return Alert.alert("Error", "Enter valid amount");

        // Save Media
        const savedImage = await saveMedia(image);
        const savedAudio = await saveMedia(audioUri);

        const paymentData = {
            id: Date.now().toString(),
            amount: parseFloat(amount),
            type, category,
            image: savedImage, // relative path
            audioUri: savedAudio, // relative path
            date: new Date().toISOString(),
        };

        try {
            await addToCollection('payments', paymentData);

            Alert.alert("Success", "Saved!");
            setAmount('');
            setImage(null);
            setAudioUri(null);
            loadHistory();
        } catch (e) { Alert.alert("Error", "Save failed"); }
    };

    // --- History Filtering ---
    const getFilteredHistory = () => {
        const now = new Date();
        return history.filter(item => {
            const itemDate = parseISO(item.date);
            if (historyFilter === 'Day') return isSameDay(itemDate, now);
            if (historyFilter === 'Month') return isSameMonth(itemDate, now);
            if (historyFilter === 'Year') return isSameYear(itemDate, now);
            return true;
        });
    };

    const onChangeStartDate = (event, selectedDate) => {
        setShowStartPicker(Platform.OS === 'ios');
        if (selectedDate) setPrintStartDate(selectedDate);
    };

    const onChangeEndDate = (event, selectedDate) => {
        setShowEndPicker(Platform.OS === 'ios');
        if (selectedDate) setPrintEndDate(selectedDate);
    };

    useFocusEffect(
        useCallback(() => {
            // This will run when the screen comes into focus.
            // You can put any refresh logic here if needed.
            // For now, we just ensure the history is loaded.
            loadHistory();
        }, [])
    );

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payments</Text>

                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
                        <Ionicons name="time-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('PaymentVisualization')}>
                        <Ionicons name="stats-chart" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPrintModalVisible(true)}>
                        <Ionicons name="print-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.form}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0.00"
                    value={amount}
                    onChangeText={setAmount}
                />

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Type</Text>
                        <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeModal(true)}>
                            <Text>{type}</Text>
                            <Ionicons name="chevron-down" size={18} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.label}>Category</Text>
                        <TouchableOpacity style={styles.dropdown} onPress={() => setShowCatModal(true)}>
                            <Text>{category}</Text>
                            <Ionicons name="chevron-down" size={18} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.label}>Proof / Attachments</Text>
                <View style={styles.mediaRow}>
                    <TouchableOpacity style={styles.mediaBtn} onPress={async () => {
                        let res = await ImagePicker.launchCameraAsync({ quality: 0.5 });
                        if (!res.canceled) setImage(res.assets[0].uri);
                    }}><Ionicons name="camera" size={24} color={THEME_COLOR} /><Text style={styles.mediaText}>Camera</Text></TouchableOpacity>

                    <TouchableOpacity style={styles.mediaBtn} onPress={async () => {
                        let res = await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
                        if (!res.canceled) setImage(res.assets[0].uri);
                    }}><Ionicons name="image" size={24} color={THEME_COLOR} /><Text style={styles.mediaText}>Gallery</Text></TouchableOpacity>

                    <TouchableOpacity style={[styles.mediaBtn, recording && { backgroundColor: '#ffebee' }]} onPress={handleToggleRecording}>
                        <Ionicons name={recording ? "stop-circle" : "mic"} size={24} color={recording ? "red" : THEME_COLOR} />
                        <Text style={styles.mediaText}>{recording ? "Stop" : "Voice"}</Text>
                    </TouchableOpacity>
                </View>



                {/* Previews */}
                <View style={{ gap: 10, marginTop: 15 }}>
                    {image && (
                        <View>
                            <Image source={{ uri: image }} style={styles.previewImage} />
                            <TouchableOpacity style={styles.deleteBadge} onPress={() => setImage(null)}>
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {audioUri && (
                        <View style={styles.audioPreviewCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Ionicons name="mic-circle" size={32} color={THEME_COLOR} />
                                    <Text style={{ color: '#333', fontWeight: 'bold' }}>Voice Note Recorded</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setAudioUri(null); setSound(null); }}>
                                    <Ionicons name="trash-outline" size={24} color="red" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.playerCard}>
                                <TouchableOpacity onPress={togglePlayback}>
                                    <Ionicons
                                        name={isPlaying ? "pause-circle" : "play-circle"}
                                        size={45}
                                        color={THEME_COLOR}
                                    />
                                </TouchableOpacity>

                                <View style={{ flex: 1, marginHorizontal: 10 }}>
                                    <Slider
                                        style={{ width: '100%', height: 40 }}
                                        minimumValue={0}
                                        maximumValue={duration}
                                        value={position}
                                        onSlidingStart={() => setIsSeeking(true)}
                                        onSlidingComplete={handleSeek}
                                        minimumTrackTintColor={THEME_COLOR}
                                        maximumTrackTintColor="#ccc"
                                        thumbTintColor={THEME_COLOR}
                                    />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.timeText}>{formatTime(position)}</Text>
                                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Text style={styles.submitText}>Save Transaction</Text>
                </TouchableOpacity>
            </ScrollView >

            {/* --- TRANSACTION HISTORY MODAL --- */}
            < Modal visible={showHistoryModal} transparent animationType="slide" >
                <View style={styles.fullModalOverlay}>
                    <View style={styles.historyContainer}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.historyTitle}>Transaction History</Text>
                            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                                <Ionicons name="close-circle" size={30} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Filter Tabs */}
                        <View style={styles.filterRow}>
                            {['Day', 'Month', 'Year'].map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.filterTab, historyFilter === f && styles.activeFilterTab]}
                                    onPress={() => setHistoryFilter(f)}
                                >
                                    <Text style={[styles.filterText, historyFilter === f && { color: '#fff' }]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <FlatList
                            data={getFilteredHistory()}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.historyItem}
                                    onPress={() => {
                                        setSelectedTransaction(item);
                                        // Load sound immediately if exists
                                        if (item.audioUri) loadSound(item.audioUri);
                                        setDetailsModalVisible(true);
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.histCat}>{item.category} ({item.type})</Text>
                                        <Text style={styles.histDate}>{format(parseISO(item.date), 'MMM dd, yyyy HH:mm')}</Text>
                                    </View>
                                    <Text style={[styles.histAmt, { color: THEME_COLOR }]}>₹{item.amount}</Text>
                                    <TouchableOpacity onPress={() => deleteTransaction(item.id)} style={{ marginLeft: 15, padding: 5 }}>
                                        <Ionicons name="trash-outline" size={22} color="red" />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyText}>No transactions for this {historyFilter.toLowerCase()}.</Text>}
                        />
                    </View>
                </View>
            </Modal >

            {/* --- TYPE MANAGEMENT MODAL --- */}
            < Modal visible={showTypeModal} transparent animationType="fade" >
                <View style={styles.modalOverlay}><View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Type</Text>
                    <View style={styles.manageRow}>
                        <TextInput style={styles.manageInput} placeholder="New Type..." value={newTypeInput} onChangeText={setNewTypeInput} />
                        <TouchableOpacity style={styles.addBtn} onPress={addType}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
                    </View>
                    <FlatList data={typeList} renderItem={({ item }) => {
                        const isEditing = editingType === item;
                        return (
                            <View style={styles.itemRow}>
                                {isEditing ? (
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <TextInput
                                            style={[styles.manageInput, { marginRight: 10 }]}
                                            value={tempTypeInput}
                                            onChangeText={setTempTypeInput}
                                            autoFocus
                                        />
                                        <TouchableOpacity onPress={() => saveEditedType(item)} style={{ padding: 8 }}>
                                            <Ionicons name="checkmark-circle" size={24} color={THEME_COLOR} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setEditingType(null)} style={{ padding: 8 }}>
                                            <Ionicons name="close-circle" size={24} color="red" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <TouchableOpacity style={styles.modalSelect} onPress={() => { setType(item); setShowTypeModal(false); }}>
                                            <Text style={styles.modalSelectText}>{item}</Text>
                                        </TouchableOpacity>

                                        {/* Action Buttons */}
                                        <View style={{ flexDirection: 'row' }}>
                                            <TouchableOpacity onPress={() => startEditType(item)} style={{ padding: 10 }}>
                                                <Ionicons name="pencil" size={20} color={THEME_COLOR} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => deleteType(item)} style={{ padding: 10 }}>
                                                <Ionicons name="trash-outline" size={20} color="red" />
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        )
                    }} />
                    <TouchableOpacity onPress={() => setShowTypeModal(false)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
                </View></View>
            </Modal >

            {/* --- CATEGORY MANAGEMENT MODAL --- */}
            < Modal visible={showCatModal} transparent animationType="fade" >
                <View style={styles.modalOverlay}><View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Category</Text>
                    <View style={styles.manageRow}>
                        <TextInput style={styles.manageInput} placeholder="New Category..." value={newCatInput} onChangeText={setNewCatInput} />
                        <TouchableOpacity style={styles.addBtn} onPress={addCategory}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
                    </View>
                    <FlatList data={categoryList} renderItem={({ item }) => {
                        const isEditing = editingCat === item;
                        return (
                            <View style={styles.itemRow}>
                                {isEditing ? (
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <TextInput
                                            style={[styles.manageInput, { marginRight: 10 }]}
                                            value={tempCatInput}
                                            onChangeText={setTempCatInput}
                                            autoFocus
                                        />
                                        <TouchableOpacity onPress={() => saveEditedCategory(item)} style={{ padding: 8 }}>
                                            <Ionicons name="checkmark-circle" size={24} color={THEME_COLOR} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setEditingCat(null)} style={{ padding: 8 }}>
                                            <Ionicons name="close-circle" size={24} color="red" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <TouchableOpacity style={styles.modalSelect} onPress={() => { setCategory(item); setShowCatModal(false); }}>
                                            <Text style={styles.modalSelectText}>{item}</Text>
                                        </TouchableOpacity>
                                        <View style={{ flexDirection: 'row' }}>
                                            <TouchableOpacity onPress={() => startEditCategory(item)} style={{ padding: 10 }}>
                                                <Ionicons name="pencil" size={20} color={THEME_COLOR} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => deleteCategory(item)} style={{ padding: 10 }}>
                                                <Ionicons name="trash-outline" size={20} color="red" />
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        )
                    }} />
                    <TouchableOpacity onPress={() => setShowCatModal(false)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
                </View></View>
            </Modal >

            {/* --- DETAILS MODAL --- */}
            < Modal visible={detailsModalVisible} transparent animationType="slide" >
                <View style={styles.fullModalOverlay}>
                    <View style={styles.historyContainer}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.historyTitle}>Transaction Details</Text>
                            <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                                <Ionicons name="close-circle" size={30} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {selectedTransaction && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.detailLabel}>Amount</Text>
                                <Text style={styles.detailAmount}>₹{selectedTransaction.amount}</Text>

                                <View style={styles.detailRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>Type</Text>
                                        <Text style={styles.detailValue}>{selectedTransaction.type}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>Category</Text>
                                        <Text style={styles.detailValue}>{selectedTransaction.category}</Text>
                                    </View>
                                </View>

                                <Text style={styles.detailLabel}>Date</Text>
                                <Text style={styles.detailValue}>{format(parseISO(selectedTransaction.date), 'MMMM dd, yyyy HH:mm')}</Text>

                                {selectedTransaction.image && (
                                    <View style={{ marginTop: 20 }}>
                                        <Text style={styles.detailLabel}>Attachment</Text>
                                        <Image
                                            source={{ uri: getMediaUri(selectedTransaction.image) }}
                                            style={styles.detailImage}
                                            resizeMode="cover"
                                        />
                                    </View>
                                )}

                                {selectedTransaction.audioUri && (
                                    <View style={{ marginTop: 20 }}>
                                        <Text style={styles.detailLabel}>Voice Note</Text>

                                        <View style={styles.playerCard}>
                                            <TouchableOpacity onPress={togglePlayback}>
                                                <Ionicons
                                                    name={isPlaying ? "pause-circle" : "play-circle"}
                                                    size={50}
                                                    color={THEME_COLOR}
                                                />
                                            </TouchableOpacity>

                                            <View style={{ flex: 1, marginHorizontal: 10 }}>
                                                <Slider
                                                    style={{ width: '100%', height: 40 }}
                                                    minimumValue={0}
                                                    maximumValue={duration}
                                                    value={position}
                                                    onSlidingStart={() => setIsSeeking(true)}
                                                    onSlidingComplete={handleSeek}
                                                    minimumTrackTintColor={THEME_COLOR}
                                                    maximumTrackTintColor="#ccc"
                                                    thumbTintColor={THEME_COLOR}
                                                />
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                                                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                )}
                                <View style={{ height: 50 }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal >
            {/* Print Selection Modal */}
            <Modal visible={printModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={styles.modalTitle}>Print Report</Text>
                            <TouchableOpacity onPress={() => setPrintModalVisible(false)} style={{ padding: 5 }}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity style={[styles.inputBox, { marginBottom: 15 }]} onPress={() => setShowStartPicker(true)}>
                            <Text style={styles.inputText}>{format(printStartDate, 'dd/MM/yyyy')}</Text>
                            <Ionicons name="calendar-outline" size={20} color={THEME_COLOR} />
                        </TouchableOpacity>
                        {showStartPicker && (
                            <DateTimePicker
                                value={printStartDate}
                                mode="date"
                                display="default"
                                onChange={onChangeStartDate}
                            />
                        )}

                        <Text style={styles.label}>End Date</Text>
                        <TouchableOpacity style={[styles.inputBox, { marginBottom: 25 }]} onPress={() => setShowEndPicker(true)}>
                            <Text style={styles.inputText}>{format(printEndDate, 'dd/MM/yyyy')}</Text>
                            <Ionicons name="calendar-outline" size={20} color={THEME_COLOR} />
                        </TouchableOpacity>
                        {showEndPicker && (
                            <DateTimePicker
                                value={printEndDate}
                                mode="date"
                                display="default"
                                onChange={onChangeEndDate}
                            />
                        )}

                        <TouchableOpacity style={styles.printModalBtn} onPress={handlePrint}>
                            <Ionicons name="print" size={20} color="#fff" style={{ marginRight: 10 }} />
                            <Text style={styles.submitText}>Print Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f3' },
    header: { backgroundColor: THEME_COLOR, padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerIcons: { flexDirection: 'row', gap: 15 },
    form: { padding: 20 },
    label: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 15, fontWeight: 'bold' },
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
    inputBox: {
        backgroundColor: '#fff', padding: 15, borderRadius: 10,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: '#ddd'
    },
    inputText: { fontSize: 16, color: '#333' },
    row: { flexDirection: 'row' },
    dropdown: { backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ddd' },
    mediaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    mediaBtn: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
    mediaText: { fontSize: 12, marginTop: 5 },
    previewImage: { width: '100%', height: 200, borderRadius: 10, marginTop: 15 },
    audioNote: { color: THEME_COLOR, marginTop: 10, fontWeight: 'bold', textAlign: 'center' },
    submitBtn: { backgroundColor: THEME_COLOR, padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 30 },
    printModalBtn: { backgroundColor: THEME_COLOR, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 15, flexDirection: 'row', justifyContent: 'center' },
    submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    // History Modal Styles
    fullModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    historyContainer: { backgroundColor: '#fff', height: '80%', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    historyTitle: { fontSize: 20, fontWeight: 'bold', color: THEME_COLOR },
    historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 10 },
    histCat: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    histDate: { fontSize: 12, color: '#888' },
    histAmt: { fontSize: 16, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#aaa' },

    // Filter Styles
    filterRow: { flexDirection: 'row', backgroundColor: '#eee', borderRadius: 20, padding: 4, marginBottom: 15 },
    filterTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 16 },
    activeFilterTab: { backgroundColor: THEME_COLOR },
    filterText: { fontWeight: 'bold', color: '#666', fontSize: 13 },

    // Selection Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 },
    modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '60%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: THEME_COLOR, marginBottom: 15, textAlign: 'center' },
    modalSelect: { flex: 1, paddingVertical: 15 },
    modalSelectText: { fontSize: 16, color: '#333' },
    cancelText: { color: 'red', textAlign: 'center', marginTop: 15, fontWeight: 'bold', padding: 10 },

    // Inline Management Styles
    manageRow: { flexDirection: 'row', marginBottom: 15, gap: 10 },
    manageInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, backgroundColor: '#f9f9f9' },
    addBtn: { backgroundColor: THEME_COLOR, padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    itemRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },

    // Details Styles
    detailLabel: { fontSize: 13, color: '#888', marginTop: 15, fontWeight: 'bold' },
    detailAmount: { fontSize: 36, fontWeight: 'bold', color: THEME_COLOR, marginBottom: 10 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
    detailValue: { fontSize: 18, color: '#333', fontWeight: '500' },
    detailImage: { width: '100%', height: 300, borderRadius: 15, marginTop: 10, backgroundColor: '#eee' },

    // Player
    playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 15, marginTop: 10 },
    timeText: { fontSize: 12, color: '#888' },

    // Previews
    deleteBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 5 },
    audioPreviewCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginTop: 10 }
});