import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    FlatList, Alert, StatusBar, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const THEME_COLOR = '#497d59';

export default function TypeManagementScreen({ navigation }) {
    const [types, setTypes] = useState(['Income', 'Expense']);
    const [newType, setNewType] = useState('');

    // Edit States
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [oldName, setOldName] = useState('');
    const [editText, setEditText] = useState('');

    useEffect(() => { loadTypes(); }, []);

    const loadTypes = async () => {
        try {
            const stored = await AsyncStorage.getItem('paymentTypes');
            if (stored) setTypes(JSON.parse(stored));
        } catch (e) { console.error(e); }
    };

    const addType = async () => {
        if (!newType.trim()) return;
        if (types.includes(newType.trim())) return Alert.alert("Error", "Type already exists");

        const updated = [...types, newType.trim()];
        setTypes(updated);
        await AsyncStorage.setItem('paymentTypes', JSON.stringify(updated));
        setNewType('');
    };

    const deleteType = async (item) => {
        Alert.alert("Delete", `Remove "${item}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: 'destructive', onPress: async () => {
                    const updated = types.filter(t => t !== item);
                    setTypes(updated);
                    await AsyncStorage.setItem('paymentTypes', JSON.stringify(updated));
                }
            }
        ]);
    };

    // --- EDIT LOGIC ---
    const openEdit = (item) => {
        setOldName(item);
        setEditText(item);
        setEditModalVisible(true);
    };

    const saveEdit = async () => {
        if (!editText.trim() || editText === oldName) return setEditModalVisible(false);

        // 1. Update the list
        const updatedTypes = types.map(t => t === oldName ? editText.trim() : t);
        setTypes(updatedTypes);
        await AsyncStorage.setItem('paymentTypes', JSON.stringify(updatedTypes));

        // 2. Update existing payment logs so data isn't broken
        try {
            const storedPayments = await AsyncStorage.getItem('payments');
            if (storedPayments) {
                const payments = JSON.parse(storedPayments);
                const updatedPayments = payments.map(p => p.type === oldName ? { ...p, type: editText.trim() } : p);
                await AsyncStorage.setItem('payments', JSON.stringify(updatedPayments));
            }
        } catch (e) { console.error(e); }

        setEditModalVisible(false);
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Types</Text>
            </View>

            <View style={styles.inputRow}>
                <TextInput style={styles.input} placeholder="Add Type (e.g. Groceries)" value={newType} onChangeText={setNewType} />
                <TouchableOpacity style={styles.addBtn} onPress={addType}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
            </View>

            <FlatList
                data={types}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <View style={styles.listItem}>
                        <Text style={styles.itemText}>{item}</Text>
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity onPress={() => openEdit(item)}><Ionicons name="pencil" size={20} color={THEME_COLOR} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteType(item)}><Ionicons name="trash-outline" size={20} color="red" /></TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            {/* Edit Modal */}
            <Modal visible={editModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Type</Text>
                        <TextInput style={styles.modalInput} value={editText} onChangeText={setEditText} />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}><Text style={{ padding: 10 }}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={saveEdit} style={styles.saveBtn}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f3' },
    header: { backgroundColor: THEME_COLOR, padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 15 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    inputRow: { flexDirection: 'row', padding: 20, gap: 10 },
    input: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
    addBtn: { backgroundColor: THEME_COLOR, padding: 10, borderRadius: 8 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, marginHorizontal: 20, marginBottom: 10, borderRadius: 10, elevation: 2 },
    itemText: { fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
    modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 20 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, alignItems: 'center' },
    saveBtn: { backgroundColor: THEME_COLOR, padding: 10, borderRadius: 8, paddingHorizontal: 20 }
});