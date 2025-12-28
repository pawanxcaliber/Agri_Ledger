import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [primaryColor, setPrimaryColor] = useState('#497d59'); // Default Green
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTheme();
    }, []);

    useEffect(() => {
        const updateNavBar = async () => {
            if (Platform.OS === 'android') {
                const style = isDarkMode ? 'light' : 'dark';
                await NavigationBar.setButtonStyleAsync(style);
            }
            // Set root view background to prevent white flash
            const bg = isDarkMode ? '#121212' : '#f8f9fa';
            await SystemUI.setBackgroundColorAsync(bg);
        };
        updateNavBar();
    }, [isDarkMode]);

    const loadTheme = async () => {
        try {
            const storedColor = await AsyncStorage.getItem('THEME_COLOR');
            const storedMode = await AsyncStorage.getItem('THEME_MODE');

            if (storedColor) setPrimaryColor(storedColor);

            if (storedMode !== null) {
                setIsDarkMode(storedMode === 'dark');
            } else {
                // Default to system preference if not set
                // const colorScheme = Appearance.getColorScheme();
                // setIsDarkMode(colorScheme === 'dark');
            }
        } catch (e) {
            console.error("Failed to load theme", e);
        } finally {
            setIsLoading(false);
        }
    };

    const updatePrimaryColor = async (color) => {
        setPrimaryColor(color);
        await AsyncStorage.setItem('THEME_COLOR', color);
    };

    const toggleDarkMode = async (value) => {
        setIsDarkMode(value);
        await AsyncStorage.setItem('THEME_MODE', value ? 'dark' : 'light');
    };

    // HSL Helper for generating palette if needed, but for now we just toggle global colors
    const theme = useMemo(() => {
        const bg = isDarkMode ? '#121212' : '#f8f9fa';
        const card = isDarkMode ? '#1e1e1e' : '#ffffff';
        const text = isDarkMode ? '#e0e0e0' : '#333333';
        const subText = isDarkMode ? '#aaaaaa' : '#666666';
        const border = isDarkMode ? '#333333' : '#e0e0e0';

        return {
            dark: isDarkMode,
            colors: {
                primary: primaryColor,
                background: bg,
                card: card,
                text: text,
                subText: subText,
                border: border,
                // Helper for light backgrounds on dark items or vice versa
                onPrimary: '#ffffff',
                surface: isDarkMode ? '#2c2c2c' : '#f0f4f3'
            },
            updatePrimaryColor,
            toggleDarkMode
        };
    }, [primaryColor, isDarkMode]);

    if (isLoading) return null; // Or a splash screen

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};
