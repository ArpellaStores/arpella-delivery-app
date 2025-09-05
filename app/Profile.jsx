// app/screens/ProfilePage.jsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import BottomNav from './components/BottomNav';

const ProfilePage = () => {
  const router = useRouter();

  // <-- CHANGED: return slice reference directly (no `|| {}` which creates a new object each call)
  const auth = useSelector((state) => state.auth);
  const user = auth?.user || null;

  // <-- CHANGED: return slice reference directly
  const ordersState = useSelector((state) => state.orders);
  const fulfilledOrdersFromAuth = user?.fulfilledOrders || user?.orders?.fulfilled || user?.orders || null;
  const fulfilledOrdersFromOrdersSlice = ordersState?.fulfilledOrders || ordersState?.list || ordersState?.items || null;

  // Compute displayed user fields with fallbacks
  const profile = useMemo(() => {
    if (!user) return null;

    const firstName = user.firstName || user.FirstName || user.fName || '';
    const lastName = user.lastName || user.last_name || user.sName || '';
    const email = user.email || user.Email || user.userEmail || '';
    const phone = user.phoneNumber || user.phone || user.userName || user.msisdn || '';
    const role = user.role || user.Role || '';
    const hasPassword = !!user.password;

    return {
      firstName,
      lastName,
      email,
      phone,
      role,
      hasPassword,
      raw: user,
    };
  }, [user]);

  // Resolve fulfilled orders with safe defaults (memoized)
  const fulfilledOrders = useMemo(() => {
    if (Array.isArray(fulfilledOrdersFromAuth)) return fulfilledOrdersFromAuth;
    if (Array.isArray(fulfilledOrdersFromOrdersSlice)) return fulfilledOrdersFromOrdersSlice;

    if (Array.isArray(user?.history?.fulfilled)) return user.history.fulfilled;
    if (Array.isArray(user?.completedOrders)) return user.completedOrders;

    return [];
  }, [fulfilledOrdersFromAuth, fulfilledOrdersFromOrdersSlice, user]);

  // Helpers
  const renderFieldLabel = (key) => {
    switch (key) {
      case 'firstName': return 'First Name';
      case 'lastName': return 'Last Name';
      case 'email': return 'Email';
      case 'phone': return 'Phone';
      case 'role': return 'Role';
      case 'password': return 'Password';
      default: return key;
    }
  };

  const handleEditField = (fieldKey) => {
    if (!profile) {
      Alert.alert('Error', 'Profile data not available.');
      return;
    }

    const currentValue = profile[fieldKey] ?? '';
    router.push({
      pathname: '/edit-profile',
      params: {
        field: fieldKey,
        value: currentValue,
      },
    });
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

  // <-- CHANGED: memoize fields array so it's stable across renders
  const fieldsToRender = useMemo(() => ([
    { key: 'firstName', value: profile.firstName },
    { key: 'lastName', value: profile.lastName },
    { key: 'email', value: profile.email },
    { key: 'phone', value: profile.phone },
    { key: 'role', value: profile.role },
    { key: 'password', value: profile.hasPassword ? '••••••••' : 'Not set' },
  ]), [profile]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Personal Details</Text>

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>

      {fieldsToRender.map((field) => (
        <View key={field.key} style={styles.fieldRow}>
          <Text style={styles.label}>{renderFieldLabel(field.key)}:</Text>
          <View style={styles.fieldValue}>
            <Text style={styles.fieldText}>{field.value ?? '—'}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEditField(field.key)}>
              <Icon name="pencil" size={18} color="#4B2C20" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text style={[styles.title, { marginTop: 20 }]}>Orders Fulfilled</Text>

      {fulfilledOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="check-circle" size={36} color="#ccc" />
          <Text style={styles.emptyText}>No fulfilled orders yet</Text>
        </View>
      ) : (
        fulfilledOrders.map((order, idx) => {
          const orderId = order?.orderId || order?.id || order?.orderNumber || `#${idx + 1}`;
          const orderNumber = order?.orderNumber || order?.reference || orderId;
          const status = order?.status || 'fulfilled';

          return (
            <View key={`${orderId}_${idx}`} style={styles.orderRow}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderText}>Order ID: {orderId}</Text>
                <Text style={styles.orderText}>Order Number: {orderNumber}</Text>
              </View>
              <View style={styles.orderActions}>
                {status === 'fulfilled' ? (
                  <Icon name="check-circle" size={24} color="green" />
                ) : (
                  <Icon name="clock-o" size={24} color="#999" />
                )}
              </View>
            </View>
          );
        })
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
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderText: {
    fontSize: 14,
    color: '#444',
  },
  orderActions: {
    marginLeft: 12,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  agentButton: {
    backgroundColor: '#4B2C20',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  agentButtonText: {
    color: '#fff',
    fontWeight: '600',
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
