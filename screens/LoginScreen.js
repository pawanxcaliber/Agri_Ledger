import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }) {
    const { colors } = useTheme();
    const [mode, setMode] = useState('LOADING'); // LOADING, SET, CONFIRM, ENTER
    const [pin, setPin] = useState([]);
    const [tempPin, setTempPin] = useState([]); // For confirmation step
    const [errorMsg, setErrorMsg] = useState('');

    // Animation for error
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        checkPinStatus();
    }, []);

    const checkPinStatus = async () => {
        const storedPin = await AsyncStorage.getItem('USER_PIN');
        if (storedPin) {
            setMode('ENTER');
        } else {
            setMode('SET');
        }
    };

    const handlePress = (num) => {
        if (pin.length < 4) {
            const newPin = [...pin, num];
            setPin(newPin);
            setErrorMsg('');
            if (newPin.length === 4) {
                // Auto submit on 4th digit
                setTimeout(() => submitPin(newPin), 100);
            }
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setErrorMsg('');
    };

    const submitPin = async (enteredPin) => {
        const pinStr = enteredPin.join('');

        if (mode === 'SET') {
            setTempPin(enteredPin);
            setPin([]);
            setMode('CONFIRM');
        }
        else if (mode === 'CONFIRM') {
            if (pinStr === tempPin.join('')) {
                await AsyncStorage.setItem('USER_PIN', pinStr);
                Alert.alert("Success", "Password Set Successfully!");
                navigation.replace('Home');
            } else {
                triggerShake("PINs do not match. Try again.");
                setPin([]);
                setTempPin([]);
                setMode('SET');
            }
        }
        else if (mode === 'ENTER') {
            const storedPin = await AsyncStorage.getItem('USER_PIN');
            if (pinStr === storedPin) {
                navigation.replace('Home');
            } else {
                triggerShake("Incorrect PIN");
                setPin([]);
            }
        }
    };

    const triggerShake = (msg) => {
        setErrorMsg(msg);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
        ]).start();
    };

    const getTitle = () => {
        switch (mode) {
            case 'SET': return "Create a PIN";
            case 'CONFIRM': return "Confirm your PIN";
            case 'ENTER': return "Enter PIN";
            default: return "Loading...";
        }
    };

    if (mode === 'LOADING') return <View style={[styles.container, { backgroundColor: colors.background }]} />;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
            <View style={styles.content}>
                <Ionicons name="lock-closed-outline" size={60} color={colors.primary} style={{ marginBottom: 20 }} />
                <Text style={[styles.title, { color: colors.text }]}>{getTitle()}</Text>

                {mode === 'SET' && <Text style={[styles.subtitle, { color: colors.subText }]}>Set a 4-digit password for security</Text>}

                <View style={styles.pinDisplay}>
                    {[0, 1, 2, 3].map(i => (
                        <View key={i} style={[
                            styles.dot,
                            {
                                backgroundColor: i < pin.length ? colors.primary : 'transparent',
                                borderColor: colors.primary,
                                borderWidth: 1
                            }
                        ]} />
                    ))}
                </View>

                <Animated.Text style={[styles.errorText, { transform: [{ translateX: shakeAnim }] }]}>
                    {errorMsg}
                </Animated.Text>

                <View style={styles.keypad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <TouchableOpacity key={num} style={[styles.key, { backgroundColor: colors.card }]} onPress={() => handlePress(num)}>
                            <Text style={[styles.keyText, { color: colors.text }]}>{num}</Text>
                        </TouchableOpacity>
                    ))}
                    <View style={[styles.key, { backgroundColor: 'transparent', elevation: 0 }]} />
                    <TouchableOpacity style={[styles.key, { backgroundColor: colors.card }]} onPress={() => handlePress(0)}>
                        <Text style={[styles.keyText, { color: colors.text }]}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.key, { backgroundColor: colors.card }]} onPress={handleDelete}>
                        <Ionicons name="backspace-outline" size={28} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7f6', justifyContent: 'center' },
    content: { alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    pinDisplay: { flexDirection: 'row', gap: 20, marginBottom: 30 },
    dot: { width: 16, height: 16, borderRadius: 8 },
    errorText: { color: 'red', height: 20, marginBottom: 20, fontWeight: 'bold' },
    keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'center', gap: 20 },
    key: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    keyText: { fontSize: 24, fontWeight: 'bold', color: '#333' }
});
