import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const THEME_COLOR = '#497d59'; 

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerText}>Agri Ledger</Text>
        <Text style={styles.subHeaderText}>Farm Management System</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Payment Button */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => console.log('Navigate to Payment')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="wallet-outline" size={32} color={THEME_COLOR} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Payment</Text>
            <Text style={styles.cardSubtitle}>Manage transactions</Text>
          </View>
        </TouchableOpacity>

        {/* Weather Button */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('Weather')}
        >
          <View style={styles.iconContainer}>
             <Ionicons name="cloud-outline" size={32} color={THEME_COLOR} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Weather</Text>
            <Text style={styles.cardSubtitle}>Check forecast</Text>
          </View>
        </TouchableOpacity>

        {/* Worker Management Button (NEW) */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('WorkerManagement')}
        >
          <View style={styles.iconContainer}>
             <Ionicons name="people-outline" size={32} color={THEME_COLOR} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Worker Mgmt</Text>
            <Text style={styles.cardSubtitle}>Attendance & Staff</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: THEME_COLOR,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  headerText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subHeaderText: { fontSize: 16, color: '#e8f5e9', marginTop: 5 },
  content: { padding: 20, paddingTop: 40, gap: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    flexDirection: 'row', 
    alignItems: 'center',
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 6,
    borderLeftColor: THEME_COLOR,
  },
  iconContainer: { marginRight: 20 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardSubtitle: { fontSize: 14, color: '#666' }
});