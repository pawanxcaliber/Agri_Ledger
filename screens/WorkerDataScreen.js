import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  Modal, StatusBar, ScrollView, Alert
} from 'react-native';
import { initDB, getCollection, setCollection, removeFromCollection } from '../services/Database';
import { Calendar } from 'react-native-calendars';
import * as Print from 'expo-print';
import { Ionicons } from '@expo/vector-icons';

const THEME_COLOR = '#497d59';

export default function WorkerDataScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [uniqueWorkers, setUniqueWorkers] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedDateData, setSelectedDateData] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    try {
      await initDB();
      const stored = await getCollection('attendance');
      setLogs(stored);
      updateUniqueWorkers(stored);
    } catch (e) { console.error(e); }
  };

  const updateUniqueWorkers = (allLogs) => {
    const names = [...new Set(allLogs.map(item => item.workerName))];
    setUniqueWorkers(names);
  };

  // --- DELETE ALL LOGS FOR A SPECIFIC WORKER ---
  const deleteLogsByWorker = async (workerName) => {
    Alert.alert(
      "Clear All Records",
      `Are you sure you want to delete ALL attendance data for ${workerName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedLogs = logs.filter(item => item.workerName !== workerName);
              setLogs(updatedLogs);
              await setCollection('attendance', updatedLogs);
              updateUniqueWorkers(updatedLogs);
              Alert.alert("Deleted", `All records for ${workerName} have been removed.`);
            } catch (e) {
              console.error("Failed to delete worker logs", e);
            }
          }
        }
      ]
    );
  };

  // --- DELETE SINGLE LOG LOGIC ---
  const deleteLog = async (logId) => {
    Alert.alert("Delete Record", "Remove this attendance entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: 'destructive', onPress: async () => {
          const updatedLogs = await removeFromCollection('attendance', 'id', logId);
          setLogs(updatedLogs);
          updateUniqueWorkers(updatedLogs);

          if (selectedDateData) {
            const updatedDateList = selectedDateData.list.filter(item => item.id !== logId);
            if (updatedDateList.length === 0) setSelectedDateData(null);
            else setSelectedDateData({ ...selectedDateData, list: updatedDateList });
          }
        }
      }
    ]);
  };

  const getWorkerMarkedDates = (workerName) => {
    const marks = {};
    logs.filter(l => l.workerName === workerName).forEach(log => {
      const dateKey = log.date.split('T')[0];
      const color = log.duration.includes('Full') ? '#d32f2f' : '#fbc02d';
      marks[dateKey] = { selected: true, selectedColor: color, marked: true };
    });
    return marks;
  };

  const getAllMarkedDates = () => {
    const marks = {};
    logs.forEach(log => {
      const dateKey = log.date.split('T')[0];
      marks[dateKey] = { marked: true, dotColor: THEME_COLOR };
    });
    return marks;
  };

  const printData = async (filterName = null) => {
    let dataToPrint = filterName ? logs.filter(l => l.workerName === filterName) : logs;
    dataToPrint.sort((a, b) => new Date(b.date) - new Date(a.date));

    const html = `
      <html><head><style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: ${THEME_COLOR}; color: white; }
      </style></head><body>
        <h2>Attendance Report ${filterName || '(All)'}</h2>
        <table><tr><th>Date</th><th>Worker</th><th>Time</th></tr>
        ${dataToPrint.map(item => `<tr><td>${new Date(item.date).toLocaleDateString()}</td><td>${item.workerName}</td><td>${item.duration}</td></tr>`).join('')}
      </table></body></html>`;
    await Print.printAsync({ html });
    setShowPrintModal(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Data View</Text>
        </View>
        <TouchableOpacity onPress={() => setShowPrintModal(true)} style={styles.printBtn}>
          <Ionicons name="print" size={20} color={THEME_COLOR} /><Text style={{ color: THEME_COLOR, fontWeight: 'bold', marginLeft: 5 }}>Print</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, viewMode === 'list' && styles.activeTab]} onPress={() => setViewMode('list')}><Text style={[styles.tabText, viewMode === 'list' && styles.activeTabText]}>By Worker</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, viewMode === 'calendar' && styles.activeTab]} onPress={() => setViewMode('calendar')}><Text style={[styles.tabText, viewMode === 'calendar' && styles.activeTabText]}>Full Calendar</Text></TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={uniqueWorkers}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => setSelectedWorker(item)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.cardName}>{item}</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setSelectedWorker(item)}>
                  <Ionicons name="calendar-outline" size={24} color={THEME_COLOR} />
                </TouchableOpacity>
                {/* TRASH BUTTON FOR WORKER RECORDS */}
                <TouchableOpacity onPress={() => deleteLogsByWorker(item)}>
                  <Ionicons name="trash-outline" size={24} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No data available yet.</Text>}
        />
      ) : (
        <Calendar markedDates={getAllMarkedDates()} theme={{ todayTextColor: THEME_COLOR }} onDayPress={(day) => {
          const dayLogs = logs.filter(l => l.date.split('T')[0] === day.dateString);
          setSelectedDateData({ date: day.dateString, list: dayLogs });
        }} />
      )}

      {/* MODAL 1: INDIVIDUAL WORKER CALENDAR */}
      <Modal visible={!!selectedWorker} animationType="slide" transparent>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{selectedWorker}'s Record</Text>
          <Calendar markedDates={getWorkerMarkedDates(selectedWorker)} />
          <TouchableOpacity onPress={() => setSelectedWorker(null)} style={styles.closeBtn}><Text>Close</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* MODAL 2: DAY DETAILS MODAL WITH DELETE */}
      <Modal visible={!!selectedDateData} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{selectedDateData?.date}</Text>
          {selectedDateData?.list.map((log, i) => (
            <View key={i} style={styles.logRow}>
              <View><Text style={{ fontWeight: 'bold' }}>{log.workerName}</Text><Text>{log.duration}</Text></View>
              <TouchableOpacity onPress={() => deleteLog(log.id)}><Ionicons name="trash-outline" size={22} color="red" /></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => setSelectedDateData(null)} style={styles.closeBtn}><Text>Close</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* PRINT MODAL */}
      <Modal visible={showPrintModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Print to Sheet</Text>
          <TouchableOpacity style={styles.opt} onPress={() => printData(null)}><Text>All Workers</Text></TouchableOpacity>
          <ScrollView style={{ maxHeight: 200 }}>{uniqueWorkers.map((n, i) => (
            <TouchableOpacity key={i} style={styles.opt} onPress={() => printData(n)}><Text>{n}</Text></TouchableOpacity>
          ))}</ScrollView>
          <TouchableOpacity onPress={() => setShowPrintModal(false)} style={styles.closeBtn}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f3' },
  header: { backgroundColor: THEME_COLOR, padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  printBtn: { backgroundColor: '#fff', flexDirection: 'row', padding: 8, borderRadius: 20, paddingHorizontal: 15 },
  tabs: { flexDirection: 'row', padding: 10, gap: 10 },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#e0e0e0' },
  activeTab: { backgroundColor: THEME_COLOR },
  tabText: { fontWeight: 'bold', color: '#666' },
  activeTabText: { color: '#fff' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  avatarText: { fontWeight: 'bold', color: THEME_COLOR, fontSize: 18 },
  cardName: { fontSize: 16, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  closeBtn: { backgroundColor: '#eee', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  opt: { padding: 15, backgroundColor: '#f5f5f5', marginBottom: 5, borderRadius: 8 }
});