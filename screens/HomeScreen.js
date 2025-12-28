import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Modal, Alert, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exportFullBackup, importFullBackup } from '../services/Database';
import * as Updates from 'expo-updates';

const THEME_COLOR = '#497d59';
const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

export default function HomeScreen({ navigation }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For showing spinner during zip/unzip
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const handleExport = async () => {
    setIsLoading(true);
    // Give UI a moment to render spinner
    setTimeout(async () => {
      await exportFullBackup();
      setIsLoading(false);
      closeMenu();
    }, 100);
  };

  const handleImport = async () => {
    Alert.alert("Import Backup", "This will MERGE the backup with your current data. Duplicates will be skipped and existing entries preserved. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Import", onPress: async () => {
          setIsLoading(true);
          // Give UI a moment
          setTimeout(async () => {
            const success = await importFullBackup();
            setIsLoading(false);
            if (success) {
              Alert.alert("Success", "Backup merged successfully. The app will now reload.", [
                { text: "OK", onPress: async () => { await Updates.reloadAsync(); } }
              ]);
            } else {
              // Alert already handled in Database.js usually, but safety check
            }
            closeMenu();
          }, 100);
        }
      }
    ]);
  };

  const handleDriveBind = () => {
    Alert.alert("Bind to Drive", "Link your Google Drive to sync data automatically.\n\n(Feature Coming Soon)", [
      { text: "OK" }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Custom Header with Menu */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu}>
          <Ionicons name="menu" size={32} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Agri Ledger</Text>
          <Text style={styles.subHeaderTitle}>Farm Management</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Greeting */}
        <View style={styles.greetingBox}>
          <Text style={styles.greetingText}>Welcome Back!</Text>
          <Text style={styles.dateText}>{new Date().toDateString()}</Text>
        </View>

        {/* Dashboard Cards */}
        <View style={styles.grid}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Payment')}>
            <View style={[styles.iconCircle, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="wallet-outline" size={32} color={THEME_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Payments</Text>
              <Text style={styles.cardDesc}>Track Income & Expenses</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Weather')}>
            <View style={[styles.iconCircle, { backgroundColor: '#e3f2fd' }]}>
              <Ionicons name="cloud-outline" size={32} color="#1976d2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Weather</Text>
              <Text style={styles.cardDesc}>Forecast & Updates</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('WorkerManagement')}>
            <View style={[styles.iconCircle, { backgroundColor: '#fff3e0' }]}>
              <Ionicons name="people-outline" size={32} color="#f57c00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Workers</Text>
              <Text style={styles.cardDesc}>Manage Attendance</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* SIDE MENU MODAL */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.menuOverlay}>

          {/* Side Panel - Now First (Left) */}
          <Animated.View style={[styles.sidePanel, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.menuHeader}>
              <Ionicons name="person-circle" size={80} color="#fff" />
              <Text style={styles.menuUser}>User Profile</Text>
            </View>

            <ScrollView style={styles.menuItems}>
              <Text style={styles.menuSectionLabel}>Data Management</Text>

              <TouchableOpacity style={styles.menuItem} onPress={handleExport}>
                <Ionicons name="share-social-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>Export / Backup Data</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleImport}>
                <Ionicons name="download-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>Import / Restore Data</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={styles.menuSectionLabel}>Cloud Sync</Text>
              <TouchableOpacity style={styles.menuItem} onPress={handleDriveBind}>
                <Ionicons name="logo-google" size={24} color="#333" />
                <Text style={styles.menuItemText}>Bind to Google Drive</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.closeMenuBtn} onPress={closeMenu}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close Menu</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Close on tapping outside - Now Second (Right) */}
          <TouchableOpacity style={{ flex: 1 }} onPress={closeMenu} />
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME_COLOR} />
            <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Processing Backup...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: THEME_COLOR, padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subHeaderTitle: { fontSize: 14, color: '#e8f5e9', textAlign: 'center' },
  content: { padding: 20 },
  greetingBox: { marginBottom: 25 },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 14, color: '#666', marginTop: 5 },
  grid: { gap: 15 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardDesc: { fontSize: 12, color: '#888' },

  // Side Menu Styles
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  sidePanel: { width: '75%', backgroundColor: '#fff', height: '100%', elevation: 10 },
  menuHeader: { backgroundColor: THEME_COLOR, padding: 30, paddingTop: 60, alignItems: 'center' },
  menuUser: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  menuItems: { flex: 1, padding: 20 },
  menuSectionLabel: { color: '#888', fontWeight: 'bold', marginTop: 15, marginBottom: 10, fontSize: 12, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15 },
  menuItemText: { fontSize: 16, color: '#333', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  closeMenuBtn: { backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, gap: 10 },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingBox: { backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center', elevation: 5 }
});