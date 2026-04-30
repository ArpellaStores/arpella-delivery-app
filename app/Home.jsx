// app/screens/DashboardScreen.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { baseUrl } from '../constants/const.js';
import BottomNav from './components/BottomNav/index.js';

const BASE_URL = baseUrl;

export default function DashboardScreen() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState(null);

  const auth = useSelector((state) => state.auth || {});
  const user = auth?.user ?? null;

  // Extract phone and name robustly from different user shapes
  const actualUser = user?.user || user;
  const userPhone = (actualUser && typeof actualUser === 'object' && (actualUser.phoneNumber || actualUser.userName || actualUser.phone)) || null;
  const userName =
    (actualUser && typeof actualUser === 'object' &&
      (actualUser.firstName || actualUser.userName || `${actualUser.firstName ?? ''} ${actualUser.lastName ?? ''}`.trim())) ||
    'Unknown';
  const token = user?.token || user?.Token || auth?.token;

  useEffect(() => {
    const fetchDeliveries = async () => {
      if (!userPhone) {

        Alert.alert('Error', 'User phone number not found. Please login again.');
        return;
      }

      setLoading(true);
      const url = `${BASE_URL}/delivery-orders/${userPhone}`;
      // console.log(`[Home.jsx] Fetching deliveries...\nURL: ${url}\nToken: ${token ? token.substring(0, 20) + '...' : 'NONE'}`);
      
      try {
        const resp = await axios.get(url, {
          timeout: 10000,
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'authorization': `Bearer ${token}` } : {})
          },
          validateStatus: (status) => true, // handle statuses explicitly
        });

        if (resp.status === 404) {
          setDeliveries([]);
          return;
        }

        // If non-2xx (and not 404) -> throw to be handled below
        if (resp.status < 200 || resp.status >= 300) {
          const err = new Error(`Unexpected response status: ${resp.status}`);
          err.response = resp;
          throw err;
        }

        // Normalize response payload to an array
        let data = [];
        if (Array.isArray(resp.data)) data = resp.data;
        else if (Array.isArray(resp.data?.data)) data = resp.data.data;
        else if (Array.isArray(resp.data?.deliveries)) data = resp.data.deliveries;
        else if (resp.data && typeof resp.data === 'object' && Object.keys(resp.data).length === 0) data = [];
        else if (resp.data == null) data = [];
        else if (resp.data && typeof resp.data === 'object') {
          // If single object returned, coerce to array
          data = [resp.data];
        } else {
          data = [];
        }

        // Filter out delivered items
        const filteredData = data.filter((item) => item?.status !== 'Delivered');

        // Ensure stable unique ids for rendering
        const processedData = filteredData.map((item, index) => ({
          ...item,
          uniqueId: item?.orderId ? `${item.orderId}` : item?._id ? `${item._id}` : `unknown_${index}`,
        }));

        setDeliveries(processedData);
      } catch (error) {
        // If server returned 404 in catch, treat as empty (silent)
        if (error?.response?.status === 404) {
          setDeliveries([]);
        } else {

          if (error.code === 'ECONNABORTED') {
            Alert.alert('Error', 'Request timed out. Check your internet connection.');
          } else if (error.response) {
            const message = error.response.data?.message || `Server error: ${error.response.status}`;
            Alert.alert('Error', message);
          } else if (error.request) {
            Alert.alert('Error', 'Network error. Please check your connection.');
          } else {
            Alert.alert('Error', 'Failed to load deliveries.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, [userPhone]);

  const handleStartDelivery = async (item) => {
    if (!item?.orderId) {
      Alert.alert('Error', 'Order ID missing.');
      return;
    }

    setLoading(true);
    setLoadingOrderId(item.orderId);
    try {
      if (item.status !== 'Delivering') {
        await axios.put(`${BASE_URL}/deliverytracking/${item.orderId}/status?status=Delivering`, null, {
          timeout: 10000,
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'authorization': `Bearer ${token}` } : {})
          },
        });
      }

      const resp = await axios.get(`${BASE_URL}/order/${item.orderId}`, {
        timeout: 10000,
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'authorization': `Bearer ${token}` } : {})
        },
      });

      const order = resp.data;
      const latitude = Number(order?.latitude);
      const longitude = Number(order?.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        Alert.alert('Error', 'Order coordinates are missing or invalid.');
        return;
      }

      router.push({
        pathname: '/route',
        params: {
          destination: JSON.stringify({ latitude, longitude }),
          order: JSON.stringify(order),
          driver: JSON.stringify({
            phone: userPhone,
            name: userName,
            firstName: user?.firstName,
            lastName: user?.lastName,
            email: user?.email,
          }),
          resumed: item.status === 'Delivering',
        },
      });
    } catch (error) {

      if (error.code === 'ECONNABORTED') {
        Alert.alert('Error', 'Request timed out. Please try again.');
      } else if (error.response) {
        const message = error.response.data?.message || `Error: ${error.response.status}`;
        Alert.alert('Error', message);
      } else if (error.request) {
        Alert.alert('Error', 'Network error. Please check your connection.');
      } else {
        Alert.alert('Error', 'Failed to start delivery.');
      }
    } finally {
      setLoading(false);
      setLoadingOrderId(null);
    }
  };

  const handleContinueDelivery = async (item) => {
    if (!item?.orderId) {
      Alert.alert('Error', 'Order ID missing.');
      return;
    }

    setLoadingOrderId(item.orderId);
    try {
      const resp = await axios.get(`${BASE_URL}/order/${item.orderId}`, {
        timeout: 10000,
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'authorization': `Bearer ${token}` } : {})
        },
      });

      const order = resp.data;
      const latitude = Number(order?.latitude);
      const longitude = Number(order?.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        Alert.alert('Error', 'Order coordinates are missing or invalid.');
        return;
      }

      router.push({
        pathname: '/route',
        params: {
          destination: JSON.stringify({ latitude, longitude }),
          order: JSON.stringify(order),
          driver: JSON.stringify({
            phone: userPhone,
            name: userName,
            firstName: user?.firstName,
            lastName: user?.lastName,
            email: user?.email,
          }),
          resumed: true,
        },
      });
    } catch (error) {

      Alert.alert('Error', 'Failed to fetch order details.');
    } finally {
      setLoadingOrderId(null);
    }
  };

  const renderDeliveryItem = ({ item }) => {
    const assignedToUser =
      (item.deliveryAgent && String(item.deliveryAgent) === String(userPhone)) ||
      (item.assignedTo && String(item.assignedTo) === String(userPhone)) ||
      (item.driverPhone && String(item.driverPhone) === String(userPhone));

    const isDelivering = item.status === 'Delivering';

    return (
      <View style={styles.deliveryCard}>
        <Text style={styles.orderId}>Order ID: {item.orderId ?? 'N/A'}</Text>
        <Text style={styles.customerInfo}>Customer: {item.username ?? item.userName ?? 'Unknown'}</Text>
        {item.deliveryAgent && <Text style={styles.agentInfo}>Agent: {item.deliveryAgent}</Text>}

        {isDelivering && assignedToUser ? (
          <TouchableOpacity
            style={[styles.continueButton, loadingOrderId === item.orderId && styles.buttonDisabled]}
            onPress={() => handleContinueDelivery(item)}
            disabled={loadingOrderId === item.orderId}
          >
            {loadingOrderId === item.orderId ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="white" size="small" />
                <Text style={[styles.buttonText, { marginLeft: 8 }]}>Loading...</Text>
              </View>
            ) : (
              <Text style={styles.continueButtonText}>Continue Delivery</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, loadingOrderId === item.orderId && styles.buttonDisabled]}
            onPress={() => handleStartDelivery(item)}
            disabled={loadingOrderId === item.orderId}
          >
            {loadingOrderId === item.orderId ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="white" size="small" />
                <Text style={[styles.buttonText, { marginLeft: 8 }]}>Loading...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Start Delivery</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="truck" size={50} color="#ccc" />
      <Text style={styles.emptyText}>No deliveries assigned</Text>
      <Text style={styles.emptySubText}>New deliveries will appear here</Text>
    </View>
  );

  // Header that used to be inside ScrollView
  const ListHeader = () => (
    <View>
      <Text style={styles.header}>Dashboard</Text>

      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
        <Text style={styles.phoneText}>Phone: {userPhone ?? 'N/A'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Your Deliveries</Text>
    </View>
  );

  if (!auth?.isAuthenticated) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Please login to view dashboard</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#4B2C20" />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
        </View>
      ) : (
        <FlatList
          data={deliveries}
          renderItem={renderDeliveryItem}
          keyExtractor={(item) => item?.uniqueId ?? `${item?.orderId ?? item?._id ?? Math.random()}`}
          ListEmptyComponent={renderEmptyComponent}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={deliveries.length === 0 ? styles.flatListEmptyContainer : styles.flatListContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BottomNav active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  flatListContent: { padding: 16, paddingBottom: 100 },
  flatListEmptyContainer: { flexGrow: 1, padding: 16, justifyContent: 'center', paddingBottom: 100 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#FFF8E1' },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#FFF8E1' },
  header: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, color: '#4B2C20' },
  welcomeCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: { fontSize: 18, fontWeight: '600', color: '#4B2C20', marginBottom: 4 },
  phoneText: { fontSize: 14, color: '#666' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#4B2C20', marginBottom: 16 },
  deliveryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#4B2C20', marginBottom: 8 },
  customerInfo: { fontSize: 14, color: '#666', marginBottom: 4 },
  agentInfo: { fontSize: 14, color: '#666', marginBottom: 12 },
  button: { backgroundColor: '#4B2C20', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  buttonDisabled: { backgroundColor: '#8B7355' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 8 },
  errorText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  continueButton: {
    backgroundColor: '#FFA726',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  continueButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  bottomNavigation: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 70, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: 10 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  activeNavItem: { transform: [{ scale: 1.05 }] },
  navText: { fontSize: 12, color: '#666', marginTop: 4 },
  activeNavText: { color: '#4B2C20', fontWeight: '600' },
});
