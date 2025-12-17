import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, ScrollView, StatusBar, FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const THEME_COLOR = '#497d59';

export default function WeatherScreen() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('future'); // 'future' or 'past'

  const getWeatherIcon = (code) => {
    if (code === 0) return 'sunny';
    if (code >= 1 && code <= 3) return 'partly-sunny';
    if (code >= 45 && code <= 48) return 'cloudy';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 95) return 'thunderstorm';
    return 'cloud';
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const fetchWeather = async () => {
    if (!city) return;
    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      // 1. Get Coordinates
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`;
      const geoResponse = await fetch(geoUrl);
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) throw new Error("City not found");

      const { latitude, longitude, name, country } = geoData.results[0];

      // 2. Get Comprehensive Weather (Past 7 days + Future 7 days + Hourly)
      // We ask for past_days=7 and forecast_days=7
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&past_days=7&forecast_days=7&timezone=auto`;
      
      const response = await fetch(weatherUrl);
      const data = await response.json();

      // Process Hourly Data (Next 24 hours only)
      const currentHourIndex = new Date().getHours() + (7 * 24); // Offset for past 7 days
      const next24Hours = data.hourly.time
        .slice(currentHourIndex, currentHourIndex + 24)
        .map((time, index) => ({
          time,
          temp: Math.round(data.hourly.temperature_2m[currentHourIndex + index]),
          code: data.hourly.weather_code[currentHourIndex + index]
        }));

      // Process Daily Data
      // The API returns one big array. We split it based on today's date.
      const todayString = new Date().toISOString().split('T')[0];
      const todayIndex = data.daily.time.findIndex(t => t === todayString);

      const pastDaily = data.daily.time.slice(0, todayIndex).map((time, i) => ({
        date: time,
        max: Math.round(data.daily.temperature_2m_max[i]),
        min: Math.round(data.daily.temperature_2m_min[i]),
        code: data.daily.weather_code[i]
      })).reverse(); // Show most recent past day first

      const futureDaily = data.daily.time.slice(todayIndex).map((time, i) => ({
        date: time,
        max: Math.round(data.daily.temperature_2m_max[todayIndex + i]),
        min: Math.round(data.daily.temperature_2m_min[todayIndex + i]),
        code: data.daily.weather_code[todayIndex + i]
      }));

      setWeather({
        name,
        country,
        current: {
          temp: Math.round(data.current.temperature_2m),
          code: data.current.weather_code,
          wind: data.current.wind_speed_10m,
          humidity: data.current.relative_humidity_2m,
        },
        hourly: next24Hours,
        dailyFuture: futureDaily,
        dailyPast: pastDaily
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="Search City..."
            placeholderTextColor="#ddd"
            value={city}
            onChangeText={setCity}
            onSubmitEditing={fetchWeather}
          />
          <TouchableOpacity onPress={fetchWeather}>
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && <ActivityIndicator size="large" color={THEME_COLOR} style={{marginTop: 50}} />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {weather && !loading && (
          <>
            {/* Current Weather Big Card */}
            <View style={styles.currentCard}>
              <Text style={styles.cityName}>{weather.name}, {weather.country}</Text>
              <Text style={styles.dateText}>{new Date().toDateString()}</Text>
              <View style={styles.tempContainer}>
                <Ionicons name={getWeatherIcon(weather.current.code)} size={60} color="#fff" />
                <Text style={styles.tempText}>{weather.current.temp}°</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.stat}>💧 {weather.current.humidity}%</Text>
                <Text style={styles.stat}>💨 {weather.current.wind} km/h</Text>
              </View>
            </View>

            {/* Hourly Forecast (Horizontal Scroll) */}
            <Text style={styles.sectionTitle}>Hourly Forecast (24h)</Text>
            <FlatList
              horizontal
              data={weather.hourly}
              keyExtractor={(item) => item.time}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourlyList}
              renderItem={({ item }) => (
                <View style={styles.hourlyItem}>
                  <Text style={styles.hourTime}>{formatTime(item.time)}</Text>
                  <Ionicons name={getWeatherIcon(item.code)} size={24} color={THEME_COLOR} />
                  <Text style={styles.hourTemp}>{item.temp}°</Text>
                </View>
              )}
            />

            {/* 7-Day Toggle (Past vs Future) */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'future' && styles.activeTab]} 
                onPress={() => setActiveTab('future')}
              >
                <Text style={[styles.tabText, activeTab === 'future' && styles.activeTabText]}>Next 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'past' && styles.activeTab]} 
                onPress={() => setActiveTab('past')}
              >
                <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>Past 7 Days</Text>
              </TouchableOpacity>
            </View>

            {/* Daily List */}
            <View style={styles.dailyList}>
              {(activeTab === 'future' ? weather.dailyFuture : weather.dailyPast).map((day, index) => (
                <View key={index} style={styles.dailyItem}>
                  <Text style={styles.dayName}>{formatDate(day.date)}</Text>
                  <View style={styles.dayIconRow}>
                     <Ionicons name={getWeatherIcon(day.code)} size={20} color="#555" />
                     <Text style={styles.dayCondition}> {day.code > 2 ? 'Cloudy/Rain' : 'Sunny'} </Text>
                  </View>
                  <Text style={styles.dayTemp}>{day.max}° / {day.min}°</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f3' },
  header: {
    backgroundColor: THEME_COLOR,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: { color: '#fff', fontSize: 16, flex: 1, marginRight: 10 },
  scrollContent: { paddingBottom: 30 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  
  // Current Weather Card
  currentCard: {
    backgroundColor: THEME_COLOR,
    margin: 20,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
  },
  cityName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  dateText: { color: '#e0e0e0', marginBottom: 10 },
  tempContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tempText: { fontSize: 50, fontWeight: 'bold', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 15 },
  stat: { color: '#fff', fontSize: 14 },

  // Hourly Section
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 10, color: '#333' },
  hourlyList: { paddingHorizontal: 20, paddingBottom: 10 },
  hourlyItem: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
    width: 70,
    elevation: 2,
  },
  hourTime: { fontSize: 10, color: '#666', marginBottom: 5 },
  hourTemp: { fontWeight: 'bold', marginTop: 5 },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { color: '#666', fontWeight: '600' },
  activeTabText: { color: THEME_COLOR },

  // Daily List
  dailyList: { marginHorizontal: 20 },
  dailyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 1,
  },
  dayName: { fontSize: 16, fontWeight: '600', width: 80 },
  dayIconRow: { flexDirection: 'row', alignItems: 'center' },
  dayCondition: { fontSize: 12, color: '#666' },
  dayTemp: { fontWeight: 'bold', color: '#333' },
});