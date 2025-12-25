import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Core Screens
import HomeScreen from './screens/HomeScreen';
import WeatherScreen from './screens/WeatherScreen';

// Worker Management
import WorkerManagementScreen from './screens/WorkerManagementScreen';
import WorkerListScreen from './screens/WorkerListScreen';
import WorkerDataScreen from './screens/WorkerDataScreen';

// Payment & Custom Management
import PaymentScreen from './screens/PaymentScreen';
import PaymentVisualizationScreen from './screens/PaymentVisualizationScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f0f4f3' }
        }}
      >
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