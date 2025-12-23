import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    FlatList, Alert, StatusBar, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const THEME_COLOR = '#497d59';

export default function CategoryManagementScreen({ navigation }) {
    const [categories, setCategories] = useState(['Seeds', 'Fertilizer', 'Labor', 'Equipment']);
    const [newCat, setNewCat] = useState('');

    // Edit States
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentOldName, setCurrentOldName] = useState('');
    const [editNameText, setEditNameText] = useState('');

    useEffect(() => { loadCategories(); }, []);

    const loadCategories = async () => {
        try {
            const stored = await AsyncStorage.getItem('paymentCategories');
            if (stored) setCategories(JSON.parse(stored));
        } catch (e) { console.error(e); }
    };

    const addCategory = async () => {
        if (!newCat.trim()) return;
        if (categories.includes(newCat.trim())) {
            Alert.alert("Error", "Category already exists");
            return;
        }
        const updated = [...categories, newCat.trim()];
        setCategories(updated);
        await AsyncStorage.setItem('paymentCategories', JSON.stringify(updated));
        setNewCat('');
    };

    const deleteCategory = async (item) => {
        Alert.alert("Delete", `Remove "${item}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: 'destructive', onPress: async () => {
                    const updated = categories.filter(c => c !== item);
                    setCategories(updated);
                    await AsyncStorage.setItem('paymentCategories', JSON.stringify(updated));
                }
            }
        ]);
    };

    const openEdit = (item) => {
        setCurrentOldName(item);
        setEditNameText(item);
        setEditModalVisible(true);
    };

    const saveEdit = async () => {
        if (!editNameText.trim()) return;
        const updated = categories.map(c => c === currentOldName ? editNameText.trim() : c);
        setCategories(updated);
        await AsyncStorage.setItem('paymentCategories', JSON.stringify(updated));
        setEditModalVisible(false);
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Categories</Text>
            </View>

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="New Category (e.g. Pesticides)"
                    value={newCat}
                    onChangeText={setNewCat}
                />
                <TouchableOpacity style={styles.addBtn} onPress={addCategory}>
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={categories}
                keyExtractor={(item) => item}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                    <View style={styles.listItem}>
                        <Text style={styles.itemText}>{item}</Text>
                        <View style={styles.actionRow}>
                            <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                                <Ionicons name="pencil" size={20} color={THEME_COLOR} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteCategory(item)} style={styles.iconBtn}>
                                <Ionicons name="trash-outline" size={20} color="red" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            {/* Edit Modal */}
            <Modal visible={editModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Category</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editNameText}
                            onChangeText={setEditNameText}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelBtn}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={saveEdit} style={styles.saveBtn}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f3' },
    header: {
        backgroundColor: THEME_COLOR,
        padding: 20, paddingTop: 50,
        flexDirection: 'row', alignItems: 'center', gap: 15
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    inputRow: { flexDirection: 'row', padding: 20, gap: 10 },
    input: {
        flex: 1, backgroundColor: '#fff', padding: 12,
        borderRadius: 8, borderWidth: 1, borderColor: '#ddd'
    },
    addBtn: {
        backgroundColor: THEME_COLOR, padding: 10,
        borderRadius: 8, justifyContent: 'center'
    },
    listItem: {
        flexDirection: 'row', justifyContent: 'space-between',
        backgroundColor: '#fff', padding: 15,
        marginHorizontal: 20, marginBottom: 10,
        borderRadius: 10, elevation: 2, alignItems: 'center'
    },
    itemText: { fontSize: 16, color: '#333', fontWeight: '500' },
    actionRow: { flexDirection: 'row', gap: 15 },
    iconBtn: { padding: 5 },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', padding: 30
    },
    modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    modalInput: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
        padding: 10, fontSize: 16, marginBottom: 20
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
    cancelBtn: { padding: 10 },
    saveBtn: {
        backgroundColor: THEME_COLOR, padding: 10,
        paddingHorizontal: 20, borderRadius: 8
    }
});