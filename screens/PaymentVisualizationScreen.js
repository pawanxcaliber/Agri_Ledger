import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Dimensions, ScrollView, Modal } from 'react-native';
import { getCollection, initDB } from '../services/Database';
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

    // Drill-down State
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [selectedType, setSelectedType] = useState('');
    const [categoryChartData, setCategoryChartData] = useState([]);
    const [selectedTypeTotal, setSelectedTypeTotal] = useState(0);

    // Filters
    const [timeFilter, setTimeFilter] = useState('Month'); // Day, Month, Year

    useEffect(() => {
        if (isFocused) loadData();
    }, [isFocused, timeFilter]);

    const loadData = async () => {
        try {
            await initDB();
            const stored = await getCollection('payments');
            setAllPayments(stored);
            processStats(stored);
        } catch (e) { console.error(e); }
    };

    const processStats = (data) => {
        const now = new Date();
        let interval;

        if (timeFilter === 'Day') {
            interval = { start: startOfDay(now), end: endOfDay(now) };
        } else if (timeFilter === 'Month') {
            interval = { start: startOfMonth(now), end: endOfMonth(now) };
        } else {
            interval = { start: startOfYear(now), end: endOfYear(now) };
        }

        let total = 0;
        const catMap = {};

        data.forEach(item => {
            const itemDate = parseISO(item.date);
            // Filter by Date Only
            if (isWithinInterval(itemDate, interval)) {
                const amt = parseFloat(item.amount) || 0;
                total += amt;
                // Group by TYPE now
                catMap[item.type] = (catMap[item.type] || 0) + amt;
            }
        });

        setFilteredTotal(total);

        // Dynamic Colors (Random/Hashed for variety)
        const generateColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const colors = Object.keys(catMap).map(() => generateColor());

        const formatted = Object.keys(catMap).map((cat, i) => ({
            name: cat,
            population: catMap[cat],
            color: colors[i % colors.length],
            legendFontColor: '#444',
            legendFontSize: 12
        }));

        // Sort by amount desc
        formatted.sort((a, b) => b.population - a.population);

        setChartData(formatted);
    };

    const handleTypeSelect = (type) => {
        setSelectedType(type);
        const now = new Date();
        let interval;

        if (timeFilter === 'Day') {
            interval = { start: startOfDay(now), end: endOfDay(now) };
        } else if (timeFilter === 'Month') {
            interval = { start: startOfMonth(now), end: endOfMonth(now) };
        } else {
            interval = { start: startOfYear(now), end: endOfYear(now) };
        }

        let total = 0;
        const catMap = {};

        allPayments.forEach(item => {
            const itemDate = parseISO(item.date);
            if (isWithinInterval(itemDate, interval) && item.type === type) {
                const amt = parseFloat(item.amount) || 0;
                total += amt;
                catMap[item.category] = (catMap[item.category] || 0) + amt;
            }
        });

        setSelectedTypeTotal(total);

        const generateColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const colors = Object.keys(catMap).map(() => generateColor());

        const formatted = Object.keys(catMap).map((cat, i) => ({
            name: cat,
            population: catMap[cat],
            color: colors[i % colors.length],
            legendFontColor: '#444',
            legendFontSize: 12
        }));

        formatted.sort((a, b) => b.population - a.population);
        setCategoryChartData(formatted);
        setCategoryModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Financial Analysis</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Time Filters */}
                <View style={styles.filterRow}>
                    {['Day', 'Month', 'Year'].map(f => (
                        <TouchableOpacity key={f}
                            style={[styles.filterBtn, timeFilter === f && styles.activeFilter]}
                            onPress={() => setTimeFilter(f)}
                        >
                            <Text style={[styles.filterText, timeFilter === f && { color: '#fff' }]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Removed Type Toggle UI */}

                <View style={styles.chartCard}>
                    <Text style={styles.label}>Total Flow ({timeFilter})</Text>
                    <Text style={[styles.totalAmt, { color: THEME_COLOR }]}>
                        ₹{filteredTotal.toLocaleString()}
                    </Text>

                    <View style={styles.chartBox}>
                        {chartData.length > 0 ? (
                            chartData.length === 1 ? (
                                <View style={{
                                    width: 200,
                                    height: 200,
                                    borderRadius: 100,
                                    backgroundColor: chartData[0].color,
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }} />
                            ) : (
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
                            )
                        ) : <Text style={{ marginTop: 50, color: '#999' }}>No data found</Text>}
                    </View>

                    <View style={styles.legendGrid}>
                        {chartData.map((item, i) => (
                            <View key={i} style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: item.color }]} />
                                <Text style={styles.legendText}>
                                    {Math.round((item.population / filteredTotal) * 100)}% {item.name}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Breakdown</Text>
                {chartData.map((item, i) => (
                    <TouchableOpacity key={i} style={styles.itemRow} onPress={() => handleTypeSelect(item.name)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.dot, { backgroundColor: item.color }]} />
                            <Text style={styles.itemName}>{item.name}</Text>
                        </View>
                        <Text style={[styles.itemPrice, { color: '#333' }]}>
                            ₹{item.population.toLocaleString()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Modal visible={categoryModalVisible} transparent animationType="slide">
                <View style={styles.fullModalOverlay}>
                    <View style={styles.historyContainer}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.historyTitle}>{selectedType} Breakdown</Text>
                            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                                <Ionicons name="close-circle" size={30} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.chartCard}>
                                <Text style={styles.label}>Total {selectedType} ({timeFilter})</Text>
                                <Text style={[styles.totalAmt, { color: THEME_COLOR }]}>
                                    ₹{selectedTypeTotal.toLocaleString()}
                                </Text>

                                <View style={styles.chartBox}>
                                    {categoryChartData.length > 0 ? (
                                        categoryChartData.length === 1 ? (
                                            <View style={{
                                                width: 200,
                                                height: 200,
                                                borderRadius: 100,
                                                backgroundColor: categoryChartData[0].color,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }} />
                                        ) : (
                                            <PieChart
                                                data={categoryChartData}
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
                                        )
                                    ) : <Text style={{ marginTop: 50, color: '#999' }}>No data found</Text>}
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>Categories</Text>
                            {categoryChartData.map((item, i) => (
                                <View key={i} style={styles.itemRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                                        <Text style={styles.itemName}>{item.name}</Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.itemPrice, { color: '#333', textAlign: 'right' }]}>
                                            ₹{item.population.toLocaleString()}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#888', textAlign: 'right' }}>
                                            {Math.round((item.population / selectedTypeTotal) * 100)}%
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            <View style={{ height: 50 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7f6' },
    header: { backgroundColor: THEME_COLOR, padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 15 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 20 },

    // Filters
    filterRow: { flexDirection: 'row', backgroundColor: '#e0e5e2', borderRadius: 25, padding: 4, marginBottom: 15 },
    filterBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 20 },
    activeFilter: { backgroundColor: THEME_COLOR },
    filterText: { fontWeight: 'bold', color: '#666' },

    // Type Toggle
    typeRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 15 },
    typeBtn: { paddingVertical: 8, paddingHorizontal: 25, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
    activeExpense: { backgroundColor: '#e57373', borderColor: '#e57373' },
    activeIncome: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
    typeText: { fontWeight: 'bold', color: '#666' },

    chartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 3 },
    label: { color: '#888', fontSize: 12 },
    totalAmt: { fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
    chartBox: { width: screenWidth, height: 220, justifyContent: 'center', alignItems: 'center' },
    // donutHole removed
    legendGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: '#555' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 20 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
    itemName: { marginLeft: 10, fontWeight: '500' },
    itemPrice: { fontWeight: 'bold' },

    // Modal Styles (copied from PaymentScreen for consistency)
    fullModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    historyContainer: { backgroundColor: '#fff', height: '80%', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    historyTitle: { fontSize: 20, fontWeight: 'bold', color: THEME_COLOR },
});