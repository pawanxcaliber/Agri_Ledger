import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import WeatherScreen from './screens/WeatherScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerShown: false, // We are using our custom header in HomeScreen
          contentStyle: { backgroundColor: '#fff' }
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Weather" component={WeatherScreen} />
        {/* We will add Payment and Weather screens here later */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}