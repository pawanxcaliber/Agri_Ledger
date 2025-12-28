import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Core Screens
import HomeScreen from './screens/HomeScreen';
import WeatherScreen from './screens/WeatherScreen';
import LoginScreen from './screens/LoginScreen';

// Worker Management
import WorkerManagementScreen from './screens/WorkerManagementScreen';
import WorkerListScreen from './screens/WorkerListScreen';
import WorkerDataScreen from './screens/WorkerDataScreen';

// Payment & Custom Management
import PaymentScreen from './screens/PaymentScreen';
import PaymentVisualizationScreen from './screens/PaymentVisualizationScreen';

import { ThemeProvider, useTheme } from './context/ThemeContext';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { colors, dark } = useTheme();

  const MyTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={MyTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          animationDuration: 50, // Even faster
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Weather" component={WeatherScreen} />

        {/* Worker Management */}
        <Stack.Screen name="WorkerManagement" component={WorkerManagementScreen} />
        <Stack.Screen name="WorkerList" component={WorkerListScreen} />
        <Stack.Screen name="WorkerData" component={WorkerDataScreen} />

        {/* Payment & Settings */}
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="PaymentVisualization" component={PaymentVisualizationScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}