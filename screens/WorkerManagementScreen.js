import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Modal,
  FlatList, Alert, StatusBar, Platform
} from 'react-native';
import { initDB, getCollection, addToCollection } from '../services/Database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { useTheme } from '../context/ThemeContext';

export default function WorkerManagementScreen({ navigation }) {
  const { colors, dark } = useTheme();
  const THEME_COLOR = colors.primary;
  const isFocused = useIsFocused();
  const [workers, setWorkers] = useState([]);

  // Form State
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedTime, setSelectedTime] = useState('Full Day (8h)');
  const [date, setDate] = useState(new Date());

  // Modals Visibility
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const timeOptions = ['Full Day (8h)', 'Half Day (4h)', 'Overtime (+1h)', 'Overtime (+2h)', 'Overtime (+3h)'];

  // Load workers whenever screen comes into focus
  useEffect(() => {
    if (isFocused) {
      initDB().then(() => loadWorkers());
    }
  }, [isFocused]);

  const loadWorkers = async () => {
    try {
      const storedWorkers = await getCollection('workers');
      setWorkers(storedWorkers);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleSubmit = async () => {
    if (!selectedWorker) {
      Alert.alert("Error", "Please select a worker first.");
      return;
    }

    const newRecord = {
      id: Date.now().toString(), // Simple unique ID
      workerName: selectedWorker,
      duration: selectedTime,
      date: date.toISOString(),
      // Later you can add: photoUri: '...', audioUri: '...'
    };

    try {
      await addToCollection('attendance', newRecord);
      Alert.alert("Success", "Attendance recorded successfully!");
    } catch (e) {
      Alert.alert("Error", "Failed to save data.");
    }
  };

  // Helper to render dropdown lists
  const renderDropdownModal = (visible, setVisible, data, onSelect, title) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <FlatList
            data={data}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => { onSelect(item); setVisible(false); }}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center', color: colors.subText }}>No workers found. Please add some first.</Text>}
          />
          <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Worker Management</Text>
      </View>

      <View style={styles.content}>

        {/* Navigation Buttons Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: '#e8f5e9' }]}
            onPress={() => navigation.navigate('WorkerList')}
          >
            <Ionicons name="people" size={20} color={THEME_COLOR} />
            <Text style={[styles.navBtnText, { color: THEME_COLOR }]}>Worker List</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('WorkerData')}
          >
            <Ionicons name="list" size={20} color="#fff" />
            <Text style={[styles.navBtnText, { color: '#fff' }]}>View Data</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.text }]}>Record Attendance</Text>

        {/* 1. Select Worker */}
        <Text style={[styles.label, { color: colors.subText }]}>Select Worker</Text>
        <TouchableOpacity style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowWorkerModal(true)}>
          <Text style={[styles.inputText, { color: selectedWorker ? colors.text : colors.subText }]}>{selectedWorker || "Select a worker..."}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.subText} />
        </TouchableOpacity>

        {/* 2. Select Time */}
        <Text style={[styles.label, { color: colors.subText }]}>Total Time</Text>
        <TouchableOpacity style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowTimeModal(true)}>
          <Text style={[styles.inputText, { color: colors.text }]}>{selectedTime}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.subText} />
        </TouchableOpacity>

        {/* 3. Select Date */}
        <Text style={[styles.label, { color: colors.subText }]}>Date</Text>
        <TouchableOpacity style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
          <Text style={[styles.inputText, { color: colors.text }]}>{date.toDateString()}</Text>
          <Ionicons name="calendar" size={20} color={colors.subText} />
        </TouchableOpacity>

        {/* Date Picker Component */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {/* Submit Button */}
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Submit Attendance</Text>
        </TouchableOpacity>

      </View>

      {/* Render Dropdowns */}
      {renderDropdownModal(showWorkerModal, setShowWorkerModal, workers, setSelectedWorker, "Choose Worker")}
      {renderDropdownModal(showTimeModal, setShowTimeModal, timeOptions, setSelectedTime, "Select Duration")}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f3' },
  header: {
    backgroundColor: '#497d59',
    padding: 20, paddingTop: 50,
    flexDirection: 'row', alignItems: 'center', gap: 15,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    elevation: 4
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },

  navRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  navBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 15, borderRadius: 10, gap: 8, elevation: 2
  },
  navBtnText: { fontWeight: 'bold', fontSize: 16 },

  sectionHeader: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 10 },
  inputBox: {
    backgroundColor: '#fff', padding: 15, borderRadius: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd'
  },
  inputText: { fontSize: 16, color: '#333' },

  submitBtn: {
    backgroundColor: '#497d59', padding: 18, borderRadius: 10,
    alignItems: 'center', marginTop: 40, elevation: 4
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16 },
  closeButton: { marginTop: 15, padding: 15, alignItems: 'center' },
  closeButtonText: { color: 'red', fontWeight: 'bold' }
});