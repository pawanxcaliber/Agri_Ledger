import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, TextInput,
    ScrollView, Modal, FlatList, Alert, Image, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, RecordingPresets, Audio } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

const THEME_COLOR = '#497d59';

export default function PaymentScreen({ navigation }) {
    const isFocused = useIsFocused();
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('Expense');
    const [category, setCategory] = useState('Seeds');
    const [typeList, setTypeList] = useState(['Income', 'Expense']);
    const [categoryList, setCategoryList] = useState(['Seeds', 'Fertilizer', 'Labor', 'Equipment']);
    const [image, setImage] = useState(null);
    const [audioUri, setAudioUri] = useState(null);

    // Modal States
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false); // New History Modal State
    const [history, setHistory] = useState([]);

    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    useEffect(() => {
        if (isFocused) {
            loadSettings();
            loadHistory(); // Load history when screen is focused
        }
    }, [isFocused]);

    const loadSettings = async () => {
        try {
            const storedTypes = await AsyncStorage.getItem('paymentTypes');
            const storedCats = await AsyncStorage.getItem('paymentCategories');
            if (storedTypes) setTypeList(JSON.parse(storedTypes));
            if (storedCats) setCategoryList(JSON.parse(storedCats));
        } catch (e) { console.error(e); }
    };

    const loadHistory = async () => {
        try {
            const stored = await AsyncStorage.getItem('payments');
            if (stored) setHistory(JSON.parse(stored));
        } catch (e) { console.error(e); }
    };

    const deleteTransaction = async (id) => {
        Alert.alert("Delete", "Remove this transaction?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: 'destructive', onPress: async () => {
                    const updated = history.filter(item => item.id !== id);
                    setHistory(updated);
                    await AsyncStorage.setItem('payments', JSON.stringify(updated));
                }
            }
        ]);
    };

    const handleToggleRecording = async () => {
        if (audioRecorder.isRecording) {
            await audioRecorder.stop();
            setAudioUri(audioRecorder.uri);
        } else {
            const { status } = await Audio.requestPermissionsAsync();
            if (status === 'granted') {
                audioRecorder.prepare();
                audioRecorder.record();
            }
        }
    };

    const handleSubmit = async () => {
        if (!amount || isNaN(parseFloat(amount))) return Alert.alert("Error", "Enter valid amount");

        const paymentData = {
            id: Date.now().toString(),
            amount: parseFloat(amount),
            type, category, image, audioUri,
            date: new Date().toISOString(),
        };

        try {
            const existingData = await AsyncStorage.getItem('payments');
            const payments = existingData ? JSON.parse(existingData) : [];
            payments.unshift(paymentData);
            await AsyncStorage.setItem('payments', JSON.stringify(payments));

            Alert.alert("Success", "Saved!");
            setAmount('');
            setImage(null);
            setAudioUri(null);
            loadHistory(); // Refresh history list after saving
        } catch (e) { Alert.alert("Error", "Save failed"); }
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Payments</Text>

                <View style={styles.headerIcons}>
                    {/* New History Popup Button */}
                    <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
                        <Ionicons name="time-outline" size={26} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('PaymentVisualization')}>
                        <Ionicons name="stats-chart" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('TypeManagement')}>
                        <Ionicons name="options-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.form}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" value={amount} onChangeText={setAmount} />

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

                    <TouchableOpacity style={[styles.mediaBtn, audioRecorder.isRecording && { backgroundColor: '#ffebee' }]} onPress={handleToggleRecording}>
                        <Ionicons name={audioRecorder.isRecording ? "stop-circle" : "mic"} size={24} color={audioRecorder.isRecording ? "red" : THEME_COLOR} />
                        <Text style={styles.mediaText}>{audioRecorder.isRecording ? "Stop" : "Voice"}</Text>
                    </TouchableOpacity>
                </View>

                {image && <Image source={{ uri: image }} style={styles.previewImage} />}
                {audioUri && <Text style={styles.audioNote}>✅ Voice note attached</Text>}

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Text style={styles.submitText}>Save Transaction</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* --- TRANSACTION HISTORY POPUP MODAL --- */}
            <Modal visible={showHistoryModal} transparent animationType="slide">
                <View style={styles.fullModalOverlay}>
                    <View style={styles.historyContainer}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.historyTitle}>Transaction History</Text>
                            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                                <Ionicons name="close-circle" size={30} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={history}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.historyItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.histCat}>{item.category} ({item.type})</Text>
                                        <Text style={styles.histDate}>{new Date(item.date).toLocaleString()}</Text>
                                    </View>
                                    <Text style={[styles.histAmt, { color: item.type === 'Income' ? 'green' : THEME_COLOR }]}>₹{item.amount}</Text>
                                    <TouchableOpacity onPress={() => deleteTransaction(item.id)} style={{ marginLeft: 15 }}>
                                        <Ionicons name="trash-outline" size={22} color="red" />
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
                        />
                    </View>
                </View>
            </Modal>

            {/* Dropdown Selection Modals */}
            <Modal visible={showTypeModal} transparent animationType="fade">
                <View style={styles.modalOverlay}><View style={styles.modalContent}>
                    <FlatList data={typeList} renderItem={({ item }) => (
                        <TouchableOpacity style={styles.modalSelect} onPress={() => { setType(item); setShowTypeModal(false); }}>
                            <Text style={styles.modalSelectText}>{item}</Text>
                        </TouchableOpacity>
                    )} /><TouchableOpacity onPress={() => setShowTypeModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                </View></View>
            </Modal>

            <Modal visible={showCatModal} transparent animationType="fade">
                <View style={styles.modalOverlay}><View style={styles.modalContent}>
                    <FlatList data={categoryList} renderItem={({ item }) => (
                        <TouchableOpacity style={styles.modalSelect} onPress={() => { setCategory(item); setShowCatModal(false); }}>
                            <Text style={styles.modalSelectText}>{item}</Text>
                        </TouchableOpacity>
                    )} /><TouchableOpacity onPress={() => setShowCatModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                </View></View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f3' },
    header: { backgroundColor: THEME_COLOR, padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerIcons: { flexDirection: 'row', gap: 15 },
    form: { padding: 20 },
    label: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 15, fontWeight: 'bold' },
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
    row: { flexDirection: 'row' },
    dropdown: { backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ddd' },
    mediaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    mediaBtn: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
    mediaText: { fontSize: 12, marginTop: 5 },
    previewImage: { width: '100%', height: 200, borderRadius: 10, marginTop: 15 },
    audioNote: { color: THEME_COLOR, marginTop: 10, fontWeight: 'bold', textAlign: 'center' },
    submitBtn: { backgroundColor: THEME_COLOR, padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 30 },
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

    // Selection Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 },
    modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 15 },
    modalSelect: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalSelectText: { textAlign: 'center', fontSize: 16 },
    cancelText: { color: 'red', textAlign: 'center', marginTop: 15, fontWeight: 'bold' }
});