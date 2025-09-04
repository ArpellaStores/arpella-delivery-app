import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {baseUrl} from '../constants/const.js'
// TODO: set your backend base URL
const BASE_URL = baseUrl;

export default function DashboardScreen() {

  const router = useRouter();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState(null);

  // Defensive selector for auth slice (adjust if your slice uses different keys)
  const auth = useSelector((state) => state.auth || {});
  const userPhone =
    auth?.user?.phone ||
    auth?.user?.phoneNumber ||
    auth?.phoneNumber ||
    auth?.phone ||
    auth?.user?.msisdn ||
    null;
  const userName = auth?.user?.username || auth?.user?.name || auth?.username || null;

  useEffect(() => {
    const fetchDeliveries = async () => {
      if (!userPhone) {
        console.warn('DashboardScreen: user phone not found in state.auth. Update selector if needed.');
        return;
      }

      setLoading(true);
      try {
        const resp = await axios.get(`${BASE_URL}/deliverytracking/${userPhone}`);
        // expecting an array: [{ orderId, username, deliveryAgent }, ...]
        const data = Array.isArray(resp.data) ? resp.data : resp.data?.data ?? [];
        setDeliveries(data);
      } catch (error) {
        console.error('Failed to fetch deliveries:', error);
        Alert.alert('Error', 'Failed to load deliveries.');
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

    setLoadingOrderId(item.orderId);
    try {
      const resp = await axios.get(`${BASE_URL}/order/${item.orderId}`);
      const order = resp.data;

      if (!order?.latitude || !order?.longitude) {
        Alert.alert('Error', 'Order did not return coordinates.');
        setLoadingOrderId(null);
        return;
      }

      // push to route with order and destination as params
      router.push({
        pathname: '/route',
        params: {
          destination: JSON.stringify({ latitude: order.latitude, longitude: order.longitude }),
          order: JSON.stringify(order),
          // optionally pass driver info from auth
          driver: JSON.stringify({ phone: userPhone, name: userName }),
        },
      });
    } catch (error) {
      console.error('Failed to fetch order:', error);
      Alert.alert('Error', 'Failed to fetch order details.');
    } finally {
      setLoadingOrderId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.deliveryCard}>
      <Text style={styles.orderId}>Order ID: {item.orderId}</Text>
      {/* show delivery owner number (username from the deliverytracking response) */}
      <Text style={styles.address}>Delivery Owner: {item.username}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => handleStartDelivery(item)}
        disabled={loadingOrderId === item.orderId}
      >
        {loadingOrderId === item.orderId ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Start Delivery</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Dashboard</Text>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} />
      ) : (
        <FlatList
          data={deliveries}
          renderItem={renderItem}
          keyExtractor={(item) => item.orderId ?? item.id ?? Math.random().toString()}
          scrollEnabled={false}
        />
      )}

      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Home')}>
          <Icon name="home" size={24} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./route')}>
          <Icon name="ticket" size={24} color="black" />
          <Text>my tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Profile')}>
          <Icon name="user" size={24} color="black" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#FFF8E1',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  deliveryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#4B2C20',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  bottomNav: {
    padding: 16,
    backgroundColor: '#4B2C20',
    alignItems: 'center',
    marginTop: 20,
    borderRadius: 8,
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 50,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#FFF8E1',
  },
  navItem: {
    alignItems: 'center',
  },
});
