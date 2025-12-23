import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useIsFocused } from '@react-navigation/native';
import { startOfDay, startOfMonth, startOfYear, isWithinInterval, endOfDay, endOfMonth, endOfYear, parseISO } from 'date-fns';

const THEME_COLOR = '#497d59';
const screenWidth = Dimensions.get('window').width;

export default function PaymentVisualizationScreen({ navigation }) {
    const isFocused = useIsFocused();
    const [allPayments, setAllPayments] = useState([]);
    const [filteredTotal, setFilteredTotal] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [filter, setFilter] = useState('Month');

    useEffect(() => {
        if (isFocused) loadData();
    }, [isFocused, filter]);

    const loadData = async () => {
        try {
            const stored = await AsyncStorage.getItem('payments');
            if (stored) {
                const parsed = JSON.parse(stored);
                setAllPayments(parsed);
                processStats(parsed, filter);
            }
        } catch (e) { console.error(e); }
    };

    const processStats = (data, timeFilter) => {
        const now = new Date();
        let interval;

        // Set the time interval based on filter
        if (timeFilter === 'Day') {
            interval = { start: startOfDay(now), end: endOfDay(now) };
        } else if (timeFilter === 'Month') {
            interval = { start: startOfMonth(now), end: endOfMonth(now) };
        } else {
            interval = { start: startOfYear(now), end: endOfYear(now) };
        }

        let totalExp = 0;
        const catMap = {};

        data.forEach(item => {
            const itemDate = parseISO(item.date);
            // Check if item falls within selected filter period
            if (isWithinInterval(itemDate, interval) && item.type === 'Expense') {
                const amt = parseFloat(item.amount) || 0;
                totalExp += amt;
                catMap[item.category] = (catMap[item.category] || 0) + amt;
            }
        });

        setFilteredTotal(totalExp);

        const greenShades = ['#2d4c36', '#497d59', '#7fb08c', '#b2d8bc', '#d9ede0'];
        const formatted = Object.keys(catMap).map((cat, i) => ({
            name: cat,
            population: catMap[cat],
            color: greenShades[i % greenShades.length],
            legendFontColor: '#444',
            legendFontSize: 12
        }));
        setChartData(formatted);
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Financial Analysis</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.filterRow}>
                    {['Day', 'Month', 'Year'].map(f => (
                        <TouchableOpacity key={f}
                            style={[styles.filterBtn, filter === f && styles.activeFilter]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && { color: '#fff' }]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.chartCard}>
                    <Text style={styles.label}>Total Expenditure ({filter})</Text>
                    <Text style={styles.totalAmt}>₹{filteredTotal.toLocaleString()}</Text>

                    <View style={styles.chartBox}>
                        {chartData.length > 0 ? (
                            <>
                                <PieChart
                                    data={chartData}
                                    width={screenWidth}
                                    height={220}
                                    chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                                    accessor={"population"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    center={[screenWidth / 4, 0]}
                                    hasLegend={false}
                                    absolute
                                />
                                {/* DONUT HOLE */}
                                <View style={styles.donutHole}><Text style={styles.holeText}>{filter}</Text></View>
                            </>
                        ) : <Text style={{ marginTop: 50, color: '#999' }}>No data for this period</Text>}
                    </View>

                    <View style={styles.legendGrid}>
                        {chartData.map((item, i) => (
                            <View key={i} style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: item.color }]} />
                                <Text style={styles.legendText}>{Math.round((item.population / filteredTotal) * 100)}% {item.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                {chartData.map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.dot, { backgroundColor: item.color }]} />
                            <Text style={styles.itemName}>{item.name}</Text>
                        </View>
                        <Text style={styles.itemPrice}>₹{item.population.toLocaleString()}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7f6' },
    header: { backgroundColor: THEME_COLOR, padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 15 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 20 },
    filterRow: { flexDirection: 'row', backgroundColor: '#e0e5e2', borderRadius: 25, padding: 4, marginBottom: 20 },
    filterBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 20 },
    activeFilter: { backgroundColor: THEME_COLOR },
    filterText: { fontWeight: 'bold', color: '#666' },
    chartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 3 },
    label: { color: '#888', fontSize: 12 },
    totalAmt: { fontSize: 32, fontWeight: 'bold', color: THEME_COLOR, marginVertical: 10 },
    chartBox: { width: screenWidth, height: 220, justifyContent: 'center', alignItems: 'center' },
    donutHole: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', left: (screenWidth / 2) - 100 },
    holeText: { fontSize: 10, color: '#ccc', fontWeight: 'bold' },
    legendGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: '#555' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 20 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
    itemName: { marginLeft: 10, fontWeight: '500' },
    itemPrice: { fontWeight: 'bold', color: THEME_COLOR }
});