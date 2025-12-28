import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  TextInput, Alert, StatusBar, Modal
} from 'react-native';
import { initDB, getCollection, setCollection } from '../services/Database';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

export default function WorkerListScreen({ navigation }) {
  const { colors, dark } = useTheme();
  const THEME_COLOR = colors.primary;
  const [workers, setWorkers] = useState([]);
  const [newName, setNewName] = useState('');

  // Edit Mode State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditingName, setCurrentEditingName] = useState(''); // The name being edited
  const [tempEditedName, setTempEditedName] = useState(''); // The new text input

  // Multi-select State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState([]);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      await initDB();
      const stored = await getCollection('workers');
      setWorkers(stored);
    } catch (e) { console.error(e); }
  };

  // --- ADD WORKER ---
  const addWorker = async () => {
    if (!newName.trim()) return;
    if (workers.includes(newName.trim())) {
      Alert.alert("Error", "Worker already exists!");
      return;
    }
    const updated = [...workers, newName.trim()];
    setWorkers(updated);
    await setCollection('workers', updated);
    setNewName('');
  };

  // --- DELETE WORKER ---
  const deleteWorker = async (name) => {
    Alert.alert("Delete Worker", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: 'destructive', onPress: async () => {
          const updated = workers.filter(w => w !== name);
          setWorkers(updated);
          await setCollection('workers', updated);
        }
      }
    ]);
  };

  // --- EDIT WORKER ---
  const openEditModal = (name) => {
    setCurrentEditingName(name);
    setTempEditedName(name);
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!tempEditedName.trim() || tempEditedName === currentEditingName) {
      setEditModalVisible(false);
      return;
    }

    // 1. Update the Worker List
    const updatedWorkers = workers.map(w => w === currentEditingName ? tempEditedName.trim() : w);
    setWorkers(updatedWorkers);
    await setCollection('workers', updatedWorkers);

    // 2. Update all past Attendance Logs for this worker
    try {
      const logs = await getCollection('attendance');
      if (logs) {
        const updatedLogs = logs.map(log => {
          if (log.workerName === currentEditingName) {
            return { ...log, workerName: tempEditedName.trim() };
          }
          return log;
        });
        await setCollection('attendance', updatedLogs);
      }
    } catch (e) {
      console.log("Error updating logs: ", e);
    }

    setEditModalVisible(false);
    Alert.alert("Success", "Name updated in list and past records.");
  };

  // --- MULTI SELECT ---
  const toggleSelection = (name) => {
    if (selectedForDelete.includes(name)) {
      setSelectedForDelete(selectedForDelete.filter(w => w !== name));
    } else {
      setSelectedForDelete([...selectedForDelete, name]);
    }
  };

  const deleteSelected = async () => {
    const updated = workers.filter(w => !selectedForDelete.includes(w));
    setWorkers(updated);
    await setCollection('workers', updated);
    setSelectedForDelete([]);
    setIsMultiSelectMode(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Workers</Text>
        <TouchableOpacity onPress={() => setIsMultiSelectMode(!isMultiSelectMode)}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            {isMultiSelectMode ? "Cancel" : "Select"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Enter Worker Name"
          placeholderTextColor={colors.subText}
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={addWorker}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={workers}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.item, { backgroundColor: colors.card },
              isMultiSelectMode && selectedForDelete.includes(item) && [styles.selectedItem, { borderColor: colors.primary }]
            ]}
            onPress={() => isMultiSelectMode ? toggleSelection(item) : null}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="person" size={20} color={colors.subText} />
              <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
            </View>

            {isMultiSelectMode ? (
              <Ionicons
                name={selectedForDelete.includes(item) ? "checkbox" : "square-outline"}
                size={24} color={THEME_COLOR}
              />
            ) : (
              <View style={styles.actionButtons}>
                {/* Edit Button */}
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                  <Ionicons name="pencil" size={20} color={THEME_COLOR} />
                </TouchableOpacity>
                {/* Delete Button */}
                <TouchableOpacity onPress={() => deleteWorker(item)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={20} color="red" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {isMultiSelectMode && selectedForDelete.length > 0 && (
        <TouchableOpacity style={styles.deleteFloatingBtn} onPress={deleteSelected}>
          <Text style={styles.deleteBtnText}>Delete ({selectedForDelete.length})</Text>
        </TouchableOpacity>
      )}

      {/* EDIT MODAL */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Worker Name</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              value={tempEditedName}
              onChangeText={setTempEditedName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.subText }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
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
    backgroundColor: '#497d59', padding: 20, paddingTop: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 4
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', padding: 20, gap: 10, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 10, fontSize: 16,
    borderWidth: 1, borderColor: '#ddd'
  },
  addBtn: { backgroundColor: '#497d59', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  item: {
    backgroundColor: '#fff', padding: 20, marginHorizontal: 20, marginBottom: 10,
    borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 2
  },
  selectedItem: { backgroundColor: '#dcedc8', borderColor: '#497d59', borderWidth: 1 },
  itemText: { fontSize: 16, color: '#333' },
  actionButtons: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 5 },
  deleteFloatingBtn: {
    position: 'absolute', bottom: 30, alignSelf: 'center',
    backgroundColor: 'red', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, elevation: 5
  },
  deleteBtnText: { color: '#fff', fontWeight: 'bold' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  modalInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 10 },
  saveBtn: { backgroundColor: '#497d59', padding: 10, paddingHorizontal: 20, borderRadius: 8 }
});