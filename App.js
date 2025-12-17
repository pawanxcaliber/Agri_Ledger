import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import WeatherScreen from './screens/WeatherScreen';
// Import the new screens
import WorkerManagementScreen from './screens/WorkerManagementScreen';
import WorkerListScreen from './screens/WorkerListScreen';
import WorkerDataScreen from './screens/WorkerDataScreen';

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
        {/* New Routes */}
        <Stack.Screen name="WorkerManagement" component={WorkerManagementScreen} />
        <Stack.Screen name="WorkerList" component={WorkerListScreen} />
        <Stack.Screen name="WorkerData" component={WorkerDataScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}