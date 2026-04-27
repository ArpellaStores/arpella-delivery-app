// app/screens/ProfilePage.jsx
import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import BottomNav from './components/BottomNav';
import { logout } from '../redux/slices/authSlice';
import { baseUrl } from '../constants/const.js';

const ProfilePage = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  // State for delivered orders
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // return slice reference directly
  const auth = useSelector((state) => state.auth);
  const user = auth?.user || null;

  // Extract actual user data from potentially nested Redux object
  const actualUser = user?.user || user;

  // Extract user phone/identifier for API calls with null check
  const userPhone = (typeof actualUser === 'object' && actualUser && (actualUser.phoneNumber || actualUser.userName || actualUser.phone)) || null;

  // Compute displayed user fields with fallbacks
  const profile = useMemo(() => {
    if (!actualUser) return null;

    const firstName = actualUser.firstName || actualUser.FirstName || actualUser.fName || '';
    const lastName = actualUser.lastName || actualUser.last_name || actualUser.sName || '';
    const email = actualUser.email || actualUser.Email || actualUser.userEmail || '';
    const phone = actualUser.phoneNumber || actualUser.phone || actualUser.userName || actualUser.msisdn || '';
    let role = actualUser.role || actualUser.Role || '';
    if (Array.isArray(role)) role = role[0];
    const hasPassword = !!actualUser.password;

    return {
      firstName,
      lastName,
      email,
      phone,
      role,
      hasPassword,
      raw: actualUser,
    };
  }, [actualUser]);

  // Fetch delivered orders by the signed-in agent
  useEffect(() => {
    const fetchDeliveredOrders = async () => {
      if (!user || !userPhone) {
        console.warn('ProfilePage: user or phone not found for fetching delivered orders');
        return;
      }

      setLoadingOrders(true);
      try {
        const resp = await axios.get(`${baseUrl}/delivery-orders/${userPhone}`, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        });

        // Normalize response structures (array or wrapped)
        let data = [];
        if (Array.isArray(resp.data)) data = resp.data;
        else if (Array.isArray(resp.data?.data)) data = resp.data.data;
        else if (Array.isArray(resp.data?.deliveries)) data = resp.data.deliveries;
        else if (resp.data && typeof resp.data === 'object' && Object.keys(resp.data).length === 0) data = [];
        else if (resp.data && Array.isArray(resp.data)) data = resp.data;

        // Filter only delivered orders
        const deliveredData = data.filter(item => item.status === 'Delivered');

        // Add unique identifiers to prevent duplicate keys
        const processedData = deliveredData.map((item, index) => ({
          ...item,
          uniqueId: `${item.orderId || 'unknown'}_${index}_${Date.now()}`,
        }));

        setDeliveredOrders(processedData);
      } catch (error) {
        console.error('Failed to fetch delivered orders:', error);
        // Don't show alert for this non-critical error, just log it
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchDeliveredOrders();
  }, [actualUser, userPhone]);

  const renderFieldLabel = (key) => {
    switch (key) {
      case 'firstName': return 'First Name';
      case 'lastName': return 'Last Name';
      case 'email': return 'Email';
      case 'phone': return 'Phone';
      case 'role': return 'Role';
      default: return key;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Dispatch logout action and redirect to Login
            dispatch(logout());
            // Optional: If you use persisted storage, clear it here.
            router.replace('/Login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  // UI guards
  if (!auth?.isAuthenticated || !profile) {
    return (
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <Text style={styles.errorText}>You are not logged in.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>

        <BottomNav active="profile" />
      </ScrollView>
    );
  }

  const fieldsToRender = useMemo(() => ([
    { key: 'firstName', value: profile.firstName },
    { key: 'lastName', value: profile.lastName },
    { key: 'email', value: profile.email },
    { key: 'phone', value: profile.phone },
    { key: 'role', value: profile.role },
  ]), [profile]);

  const renderDeliveredOrderCard = (order, index) => (
    <View key={order.uniqueId || `order_${index}`} style={styles.orderCard}>
      <View style={styles.orderCardContent}>
        <Text style={styles.orderIdText}>Order ID: {order.orderId || 'N/A'}</Text>
        <View style={styles.statusContainer}>
          <Icon name="check-circle" size={16} color="green" />
          <Text style={styles.statusText}>Delivered</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Personal Details</Text>

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>

      {/* Logout - top-right */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Icon name="sign-out" size={18} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {fieldsToRender.map((field) => (
        <View key={field.key} style={styles.fieldRow}>
          <Text style={styles.label}>{renderFieldLabel(field.key)}:</Text>
          <View style={styles.fieldValue}>
            <Text style={styles.fieldText}>{field.value ?? '—'}</Text>
          </View>
        </View>
      ))}

      <Text style={[styles.title, { marginTop: 20 }]}>Delivered Orders</Text>

      {loadingOrders ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4B2C20" />
          <Text style={styles.loadingText}>Loading delivered orders...</Text>
        </View>
      ) : deliveredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="check-circle" size={36} color="#ccc" />
          <Text style={styles.emptyText}>No delivered orders yet</Text>
        </View>
      ) : (
        deliveredOrders.map((order, idx) => renderDeliveredOrderCard(order, idx))
      )}

      <BottomNav active="profile" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 2,
  },
  logoutButton: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B00020',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  container: {
    padding: 16,
    backgroundColor: '#FFF8E1',
    flexGrow: 1,
    paddingBottom: 120,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#333',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldText: {
    fontSize: 16,
    marginRight: 8,
    color: '#444',
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2C20',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: 'green',
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#4B2C20',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  centerContainer: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingBottom: 120,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default ProfilePage;