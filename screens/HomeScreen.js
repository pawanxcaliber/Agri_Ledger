import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Modal, Alert, Animated, ActivityIndicator, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exportFullBackup, importFullBackup } from '../services/Database';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

export default function HomeScreen({ navigation }) {
  const { colors, updatePrimaryColor, toggleDarkMode, dark } = useTheme();
  // Helper for consistent theme usage (renaming to avoid massive refactor right now)
  const THEME_COLOR = colors.primary;

  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For showing spinner during zip/unzip
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdStage, setPwdStage] = useState('OLD'); // OLD, NEW
  const [pwdInput, setPwdInput] = useState('');
  const [showThemeModal, setShowThemeModal] = useState(false);
  // Theme Slider State
  const [hue, setHue] = useState(145); // Default approx Green
  const [sat, setSat] = useState(50);
  const [lightness, setLightness] = useState(40);

  const updateColorFromHSL = (h, s, l) => {
    const hDecimal = h / 360;
    const sDecimal = s / 100;
    const lDecimal = l / 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = lDecimal;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = lDecimal < 0.5 ? lDecimal * (1 + sDecimal) : lDecimal + sDecimal - lDecimal * sDecimal;
      const p = 2 * lDecimal - q;
      r = hue2rgb(p, q, hDecimal + 1 / 3);
      g = hue2rgb(p, q, hDecimal);
      b = hue2rgb(p, q, hDecimal - 1 / 3);
    }
    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    updatePrimaryColor(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
  };

  const handlePasswordSubmit = async () => {
    if (pwdInput.length !== 4) {
      Alert.alert("Error", "Password must be 4 digits");
      return;
    }

    if (pwdStage === 'OLD') {
      const stored = await AsyncStorage.getItem('USER_PIN');
      if (pwdInput === stored) {
        setPwdStage('NEW');
        setPwdInput('');
      } else {
        Alert.alert("Error", "Incorrect Password");
        setPwdInput('');
      }
    } else {
      // Set NEW
      await AsyncStorage.setItem('USER_PIN', pwdInput);
      Alert.alert("Success", "Password Changed Successfully");
      setShowPasswordModal(false);
      setPwdInput('');
      setPwdStage('OLD');
    }
  };

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header with Menu */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
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
          <Text style={[styles.greetingText, { color: colors.text }]}>Welcome Back!</Text>
          <Text style={[styles.dateText, { color: colors.subText }]}>{new Date().toDateString()}</Text>
        </View>

        {/* Dashboard Cards */}
        <View style={styles.grid}>
          <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('Payment')}>
            <View style={[styles.iconCircle, { backgroundColor: dark ? '#333' : '#e8f5e9' }]}>
              <Ionicons name="wallet-outline" size={32} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Payments</Text>
              <Text style={[styles.cardDesc, { color: colors.subText }]}>Track Income & Expenses</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.subText} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('Weather')}>
            <View style={[styles.iconCircle, { backgroundColor: dark ? '#333' : '#e3f2fd' }]}>
              <Ionicons name="cloud-outline" size={32} color="#1976d2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Weather</Text>
              <Text style={[styles.cardDesc, { color: colors.subText }]}>Forecast & Updates</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.subText} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('WorkerManagement')}>
            <View style={[styles.iconCircle, { backgroundColor: dark ? '#333' : '#fff3e0' }]}>
              <Ionicons name="people-outline" size={32} color="#f57c00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Workers</Text>
              <Text style={[styles.cardDesc, { color: colors.subText }]}>Manage Attendance</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.subText} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* SIDE MENU MODAL */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.menuOverlay}>

          {/* Side Panel - Now First (Left) */}
          <Animated.View style={[styles.sidePanel, { transform: [{ translateX: slideAnim }], backgroundColor: colors.background }]}>
            <View style={[styles.menuHeader, { backgroundColor: colors.primary }]}>
              <Ionicons name="person-circle" size={80} color="#fff" />
              <Text style={styles.menuUser}>User Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.menuItemsContent} style={styles.menuItems}>
              <Text style={styles.menuSectionLabel}>Data Management</Text>

              <TouchableOpacity style={styles.menuItem} onPress={handleExport}>
                <Ionicons name="share-social-outline" size={24} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Export / Backup Data</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleImport}>
                <Ionicons name="download-outline" size={24} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Import / Restore Data</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={[styles.menuSectionLabel, { color: colors.subText }]}>Appearance</Text>

              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowThemeModal(true); }}>
                <Ionicons name="color-palette-outline" size={24} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Theme Settings</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={[styles.menuSectionLabel, { color: colors.subText }]}>Cloud Sync</Text>
              <TouchableOpacity style={styles.menuItem} onPress={handleDriveBind}>
                <Ionicons name="logo-google" size={24} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Bind to Google Drive</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={[styles.menuSectionLabel, { color: colors.subText }]}>Security</Text>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setShowPasswordModal(true); }}>
                <Ionicons name="lock-closed-outline" size={24} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Change Password</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={[styles.closeMenuBtn, { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }]} onPress={closeMenu}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>Close Menu</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Close on tapping outside - Now Second (Right) */}
          <TouchableOpacity style={{ flex: 1 }} onPress={closeMenu} />
        </View>
      </Modal>

      {/* THEME SETTINGS MODAL */}
      <Modal visible={showThemeModal} transparent animationType="fade" onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.centeredOverlay}>
          <View style={{ backgroundColor: colors.card, width: '90%', padding: 25, borderRadius: 20, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>Customize Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Dark Mode Toggle */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="moon-outline" size={24} color={colors.text} />
                <Text style={{ marginLeft: 10, fontSize: 16, color: colors.text }}>Dark Mode</Text>
              </View>
              <Switch value={dark} onValueChange={toggleDarkMode} trackColor={{ true: colors.primary }} />
            </View>

            {/* Custom Color Picker */}
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 15 }}>Accent Color</Text>

            {/* Live Preview */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: dark ? '#333' : '#f5f5f5', padding: 10, borderRadius: 10 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, marginRight: 15, borderWidth: 2, borderColor: '#fff', elevation: 3 }} />
              <View>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Live Preview</Text>
                <Text style={{ color: colors.subText, fontSize: 12 }}>{colors.primary.toUpperCase()}</Text>
              </View>
            </View>

            {/* Sliders */}
            <View style={{ gap: 15 }}>
              {/* Hue */}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ color: colors.subText, fontSize: 12 }}>Hue (Color)</Text>
                  <Text style={{ color: colors.subText, fontSize: 12 }}>{Math.round(hue)}°</Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0} maximumValue={360}
                  value={hue}
                  onValueChange={(val) => {
                    setHue(val);
                    updateColorFromHSL(val, sat, lightness);
                  }}
                  minimumTrackTintColor={`hsl(${hue}, 100%, 50%)`}
                  maximumTrackTintColor="#ccc"
                  thumbTintColor={`hsl(${hue}, 100%, 50%)`}
                />
              </View>

              {/* Saturation */}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ color: colors.subText, fontSize: 12 }}>Saturation (Intensity)</Text>
                  <Text style={{ color: colors.subText, fontSize: 12 }}>{Math.round(sat)}%</Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0} maximumValue={100}
                  value={sat}
                  onValueChange={(val) => {
                    setSat(val);
                    updateColorFromHSL(hue, val, lightness);
                  }}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor="#ccc"
                  thumbTintColor={colors.primary}
                />
              </View>

              {/* Lightness */}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ color: colors.subText, fontSize: 12 }}>Lightness (Brightness)</Text>
                  <Text style={{ color: colors.subText, fontSize: 12 }}>{Math.round(lightness)}%</Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0} maximumValue={100}
                  value={lightness}
                  onValueChange={(val) => {
                    setLightness(val);
                    updateColorFromHSL(hue, sat, val);
                  }}
                  minimumTrackTintColor="#888"
                  maximumTrackTintColor="#ccc"
                  thumbTintColor="#888"
                />
              </View>
            </View>

          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.centeredOverlay}>
          <View style={{ backgroundColor: colors.card, width: '80%', padding: 25, borderRadius: 20, alignItems: 'center', elevation: 5 }}>
            <Ionicons name="key-outline" size={40} color={colors.primary} style={{ marginBottom: 15 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: colors.text }}>
              {pwdStage === 'OLD' ? 'Enter Current Password' : 'Enter New Password'}
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                width: '100%',
                padding: 15,
                borderRadius: 12,
                fontSize: 18,
                textAlign: 'center',
                marginBottom: 25,
                color: colors.text,
                backgroundColor: dark ? '#333' : '#f9f9f9'
              }}
              placeholder="4-digit PIN"
              placeholderTextColor={colors.subText}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={pwdInput}
              onChangeText={setPwdInput}
            />

            <View style={{ flexDirection: 'row', gap: 15, width: '100%' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  alignItems: 'center',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border
                }}
                onPress={() => { setShowPasswordModal(false); setPwdInput(''); setPwdStage('OLD'); }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  padding: 12,
                  borderRadius: 12,
                  flex: 1,
                  alignItems: 'center',
                  elevation: 2
                }}
                onPress={handlePasswordSubmit}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {pwdStage === 'OLD' ? 'Next' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
  header: { backgroundColor: '#497d59', padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4 },
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
  centeredOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sidePanel: { width: '75%', height: '100%', elevation: 10 },
  menuHeader: { backgroundColor: '#497d59', padding: 30, paddingTop: 60, alignItems: 'center' },
  menuUser: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  menuItems: { flex: 1 },
  menuItemsContent: { padding: 20, paddingBottom: 40 },
  menuSectionLabel: { color: '#888', fontWeight: 'bold', marginTop: 15, marginBottom: 10, fontSize: 12, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15 },
  menuItemText: { fontSize: 16, color: '#333', fontWeight: '500' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingVertical: 12, justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  closeMenuBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, gap: 10 },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingBox: { backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center', elevation: 5 }
});