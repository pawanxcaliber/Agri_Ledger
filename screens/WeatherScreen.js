import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, StatusBar, FlatList, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

export default function WeatherScreen({ navigation }) {
  const { colors, dark } = useTheme();
  const THEME_COLOR = colors.primary;
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('future');

  const typingTimeout = useRef(null);

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

  const handleTextChange = (text) => {
    setCity(text);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    typingTimeout.current = setTimeout(async () => {
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${text}&count=5&language=en&format=json`;
        const response = await fetch(geoUrl);
        const data = await response.json();
        if (data.results) {
          setSuggestions(data.results);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.log("Autocomplete error:", err);
      }
    }, 500);
  };

  const selectSuggestion = (item) => {
    setCity(`${item.name}, ${item.country}`);
    setSuggestions([]);
    Keyboard.dismiss();
    fetchWeather(item);
  };

  const fetchWeather = async (locationData = null) => {
    setLoading(true);
    setError(null);
    setWeather(null);
    setSuggestions([]);

    try {
      let latitude, longitude, name, country;

      if (locationData && locationData.latitude) {
        latitude = locationData.latitude;
        longitude = locationData.longitude;
        name = locationData.name;
        country = locationData.country;
      } else {
        if (!city) return;
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        if (!geoData.results || geoData.results.length === 0) throw new Error("City not found");
        latitude = geoData.results[0].latitude;
        longitude = geoData.results[0].longitude;
        name = geoData.results[0].name;
        country = geoData.results[0].country;
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,weather_code,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean&past_days=7&forecast_days=7&timezone=auto`;
      const response = await fetch(weatherUrl);
      const data = await response.json();

      const currentHourIndex = new Date().getHours() + (7 * 24);
      const next24Hours = data.hourly.time
        .slice(currentHourIndex, currentHourIndex + 24)
        .map((time, index) => ({
          time,
          temp: Math.round(data.hourly.temperature_2m[currentHourIndex + index]),
          code: data.hourly.weather_code[currentHourIndex + index],
          humidity: data.hourly.relative_humidity_2m[currentHourIndex + index]
        }));

      const todayString = new Date().toISOString().split('T')[0];
      const todayIndex = data.daily.time.findIndex(t => t === todayString);

      const pastDaily = data.daily.time.slice(0, todayIndex).map((time, i) => ({
        date: time,
        max: Math.round(data.daily.temperature_2m_max[i]),
        min: Math.round(data.daily.temperature_2m_min[i]),
        code: data.daily.weather_code[i],
        humidity: Math.round(data.daily.relative_humidity_2m_mean[i])
      })).reverse();

      const futureDaily = data.daily.time.slice(todayIndex).map((time, i) => ({
        date: time,
        max: Math.round(data.daily.temperature_2m_max[todayIndex + i]),
        min: Math.round(data.daily.temperature_2m_min[todayIndex + i]),
        code: data.daily.weather_code[todayIndex + i],
        humidity: Math.round(data.daily.relative_humidity_2m_mean[todayIndex + i])
      }));

      setWeather({
        name, country,
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: THEME_COLOR }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Weather Forecast</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.searchBlock}>
          <View style={[styles.inputWrapper, { backgroundColor: dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)' }]}>
            <TextInput
              style={[styles.input, { color: '#fff' }]}
              placeholder="Search City (e.g. Pune)..."
              placeholderTextColor="#eee"
              value={city}
              onChangeText={handleTextChange}
              onSubmitEditing={() => fetchWeather(null)}
            />
            <TouchableOpacity onPress={() => fetchWeather(null)}>
              <Ionicons name="search" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={suggestions}
                keyExtractor={(item, index) => index.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => selectSuggestion(item)}
                  >
                    <Ionicons name="location-outline" size={20} color={colors.subText} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={[styles.suggestionText, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.suggestionSubText, { color: colors.subText }]}>{item.admin1 ? `${item.admin1}, ` : ''}{item.country}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {loading && <ActivityIndicator size="large" color={THEME_COLOR} style={{ marginTop: 50 }} />}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {weather && !loading && (
          <>
            <View style={[styles.currentCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.cityName, { color: colors.text }]}>{`${weather.name}, ${weather.country}`}</Text>
              <Text style={[styles.dateText, { color: colors.subText }]}>{new Date().toDateString()}</Text>
              <View style={styles.tempContainer}>
                <Ionicons name={getWeatherIcon(weather.current.code)} size={60} color={colors.primary} />
                <Text style={[styles.tempText, { color: colors.text }]}>{`${weather.current.temp}°`}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={[styles.stat, { color: colors.subText }]}>{`💧 ${weather.current.humidity}%`}</Text>
                <Text style={[styles.stat, { color: colors.subText }]}>{`💨 ${weather.current.wind} km/h`}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hourly Forecast (24h)</Text>
            <FlatList
              horizontal
              data={weather.hourly}
              keyExtractor={(item) => item.time}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourlyList}
              renderItem={({ item }) => (
                <View style={[styles.hourlyItem, { backgroundColor: colors.card }]}>
                  <Text style={[styles.hourTime, { color: colors.subText }]}>{formatTime(item.time)}</Text>
                  <Ionicons name={getWeatherIcon(item.code)} size={24} color={THEME_COLOR} />
                  <Text style={[styles.hourTemp, { color: colors.text }]}>{`${item.temp}°`}</Text>
                  <View style={styles.hourlyHumidity}>
                    <Ionicons name="water" size={10} color={colors.subText} />
                    <Text style={[styles.hourHumidityText, { color: colors.subText }]}>{`${item.humidity}%`}</Text>
                  </View>
                </View>
              )}
            />

            <View style={[styles.tabContainer, { backgroundColor: dark ? '#333' : '#e0e0e0' }]}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'future' && { backgroundColor: colors.card }]}
                onPress={() => setActiveTab('future')}
              >
                <Text style={[styles.tabText, { color: colors.subText }, activeTab === 'future' && { color: colors.primary }]}>Next 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'past' && { backgroundColor: colors.card }]}
                onPress={() => setActiveTab('past')}
              >
                <Text style={[styles.tabText, { color: colors.subText }, activeTab === 'past' && { color: colors.primary }]}>Past 7 Days</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dailyList}>
              {(activeTab === 'future' ? weather.dailyFuture : weather.dailyPast).map((day, index) => (
                <View key={index} style={[styles.dailyItem, { backgroundColor: colors.card }]}>
                  <Text style={[styles.dayName, { color: colors.text }]}>{formatDate(day.date)}</Text>
                  <View style={styles.dayIconRow}>
                    <Ionicons name={getWeatherIcon(day.code)} size={20} color={colors.text} />
                  </View>
                  <View style={styles.dailyHumidity}>
                    <Ionicons name="water-outline" size={14} color={colors.subText} />
                    <Text style={[styles.dailyHumidityText, { color: colors.subText }]}>{`${day.humidity}%`}</Text>
                  </View>
                  <Text style={[styles.dayTemp, { color: colors.text }]}>{`${day.max}° / ${day.min}°`}</Text>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchBlock: {
    position: 'relative',
    zIndex: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: { color: '#fff', fontSize: 16, flex: 1, marginRight: 10 },
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    maxHeight: 200,
    zIndex: 100,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  suggestionSubText: { fontSize: 12, color: '#888' },
  scrollContent: { paddingBottom: 30, zIndex: 1 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  currentCard: {
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 10, color: '#333' },
  hourlyList: { paddingHorizontal: 20, paddingBottom: 10 },
  hourlyItem: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
    width: 80,
    elevation: 2,
  },
  hourTime: { fontSize: 10, color: '#666', marginBottom: 5 },
  hourTemp: { fontWeight: 'bold', marginVertical: 3 },
  hourlyHumidity: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  hourHumidityText: { fontSize: 10, color: '#666', marginLeft: 2 },
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
  activeTabText: { fontWeight: 'bold' },
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
  dayIconRow: { flexDirection: 'row', alignItems: 'center', width: 40 },
  dailyHumidity: { flexDirection: 'row', alignItems: 'center', width: 60, justifyContent: 'center' },
  dailyHumidityText: { fontSize: 12, color: '#666', marginLeft: 4 },
  dayTemp: { fontWeight: 'bold', color: '#333', textAlign: 'right', width: 80 },
});