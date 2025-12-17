import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';

// Updated to the green from your image
const THEME_COLOR = '#497d59'; 

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />
      
      {/* Header Area */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Agri Ledger</Text>
        <Text style={styles.subHeaderText}>Farm Management System</Text>
      </View>

      {/* Buttons Area */}
      <View style={styles.content}>
        
        {/* Payment Button */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => console.log('Navigate to Payment')}
        >
          <Text style={styles.cardTitle}>Payment</Text>
          <Text style={styles.cardSubtitle}>Manage transactions</Text>
        </TouchableOpacity>

        {/* Weather Button */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('Weather')}
        >
          <Text style={styles.cardTitle}>Weather</Text>
          <Text style={styles.cardSubtitle}>Check forecast</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: THEME_COLOR,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4, // Adds a slight shadow to the header
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#e8f5e9', // Lighter shade of green/white
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
    // Removed justifyContent: 'center' to stop them from being in the middle
    paddingTop: 40, // This pushes them down slightly from the header, but keeps them "above"
    gap: 20, 
  },
  card: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 6,
    borderLeftColor: THEME_COLOR, // Green accent on the card
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  }
});