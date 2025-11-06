import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Dimensions, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import { toast } from 'react-native-toast-notifications';
import axios from 'axios'; 
import { useSelector } from 'react-redux';
import { baseUrl } from '../constants/const';
import BottomNav from './components/BottomNav';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD-YPpUWHXNzvQjjXjqj7mvO2Idi72jREc';
const BASE_URL = baseUrl;

const MapScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState({
    latitude: -1.2921,
    longitude: 36.8219,
  });
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // auth (if you need driver details)
  const auth = useSelector((state) => state.auth || {});
  const driverPhone =
    auth?.user?.phone ||
    auth?.user?.phoneNumber ||
    auth?.phoneNumber ||
    auth?.phone ||
    auth?.user?.msisdn ||
    null;

  useEffect(() => {
    console.log('MapScreen params:', params);
    
    // read params passed from DashboardScreen
    if (params?.destination) {
      try {
        const dest = JSON.parse(params.destination);
        console.log('Parsed destination:', dest);
        if (dest?.latitude && dest?.longitude && 
            typeof dest.latitude === 'number' && 
            typeof dest.longitude === 'number') {
          setDestination(dest);
        } else {
          console.warn('Invalid destination coordinates');
        }
      } catch (e) {
        console.error('Error parsing destination param:', e);
        Alert.alert('Error', 'Invalid destination data received.');
      }
    }

    if (params?.order) {
      try {
        const ord = JSON.parse(params.order);
        console.log('Parsed order:', ord);
        setOrder(ord);
      } catch (e) {
        console.error('Error parsing order param:', e);
        Alert.alert('Error', 'Invalid order data received.');
      }
    }

    if (params?.driver) {
      try {
        const driverData = JSON.parse(params.driver);
        console.log('Parsed driver:', driverData);
        setDriver(driverData);
      } catch (e) {
        console.error('Error parsing driver param:', e);
      }
    }
  }, [params?.destination, params?.order, params?.driver]);

  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          
          if (location?.coords?.latitude && location?.coords?.longitude) {
            setCurrentLocation(location.coords);
            console.log('Current location set:', location.coords);
          } else {
            setErrorMsg('Unable to get valid location coordinates');
          }
        } else {
          setErrorMsg('Permission to access location was denied');
          Alert.alert('Permission Required', 'Please enable location permissions to use this feature.');
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Error getting location');
        Alert.alert('Error', 'Failed to get your current location.');
      }
    };
    getLocation();
  }, []);

  const fetchRoute = useCallback(async () => {
    if (!currentLocation || routeLoading) {
      console.log('No current location available for route calculation or already loading');
      return;
    }
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key missing.');
      Alert.alert('Configuration Error', 'Google Maps API key is missing.');
      return;
    }

    setRouteLoading(true);
    const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
    const dest = `${destination.latitude},${destination.longitude}`;

    console.log('Fetching route from:', origin, 'to:', dest);

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`,
        { timeout: 10000 }
      );

      console.log('Google Maps API response status:', response.data.status);

      if (response.data.status === 'OK' && response.data.routes?.length > 0) {
        const routeData = response.data.routes[0];
        
        if (routeData.legs && routeData.legs.length > 0) {
          const leg = routeData.legs[0];
          
          let routeCoordinates = [];
          if (routeData.overview_polyline?.points) {
            routeCoordinates = leg.steps?.map((step) => ({
              latitude: step.end_location?.lat,
              longitude: step.end_location?.lng,
            })).filter(coord => coord.latitude && coord.longitude) || [];
          }

          setRoute(routeCoordinates);
          setDistance(leg.distance?.text || 'Unknown');
          setDuration(leg.duration?.text || 'Unknown');
          
          console.log('Route data set successfully');
        } else {
          console.warn('No legs found in route');
          Alert.alert('Route Error', 'Unable to calculate route legs.');
        }
      } else {
        console.warn('No route found or API error:', response.data.status, response.data.error_message);
        Alert.alert('Route Error', response.data.error_message || 'No route found between locations.');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      if (error.code === 'ECONNABORTED') {
        Alert.alert('Timeout', 'Route calculation timed out. Please try again.');
      } else if (error.response) {
        Alert.alert('API Error', `Google Maps API error: ${error.response.status}`);
      } else if (error.request) {
        Alert.alert('Network Error', 'Please check your internet connection.');
      } else {
        Alert.alert('Error', 'Failed to calculate route.');
      }
    } finally {
      setRouteLoading(false);
    }
  }, [currentLocation, destination.latitude, destination.longitude, routeLoading]);

  useEffect(() => {
    if (currentLocation && destination && !route && !routeLoading) {
      fetchRoute();
    }
  }, [currentLocation, destination.latitude, destination.longitude]);

  const isCloseToDestination = useCallback(() => {
    if (!distance) return false;
    
    try {
      const numericMatch = distance.match(/[\d.]+/);
      const numeric = numericMatch ? parseFloat(numericMatch[0]) : 0;
      const meters = distance.toLowerCase().includes('km') ? numeric * 1000 : numeric;
      return meters < 50;
    } catch (error) {
      console.error('Error parsing distance:', error);
      return false;
    }
  }, [distance]);

  const getCustomerPhone = useCallback(() => {
    if (!order) return null;
    return (
      order.userId ||
      order.phone ||
      order.phoneNumber ||
      order.customerPhone ||
      order.msisdn ||
      order?.customer?.phone ||
      order?.user?.phone ||
      order?.recipientPhone ||
      null
    );
  }, [order]);

  const sendOTP = async () => {
    try {
      const customerPhone = getCustomerPhone();
      if (!customerPhone) {
        Alert.alert('Missing Phone', 'Customer phone number not found on the order.');
        return;
      }
      setSendingOtp(true);
      const phoneParam = encodeURIComponent(String(customerPhone));
      await axios.get(`https://api.arpellastore.com/send-otp?username=${phoneParam}`);
      setOtpModalVisible(true);
    } catch (error) {
      Alert.alert('OTP Error', 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtpAndComplete = async () => {
    try {
      const customerPhone = getCustomerPhone();
      if (!customerPhone) {
        Alert.alert('Missing Phone', 'Customer phone number not found on the order.');
        return;
      }
      if (!otpCode || otpCode.trim().length !== 6) {
        Alert.alert('Invalid Code', 'Please enter the 6-digit OTP.');
        return;
      }
      setVerifyingOtp(true);
      const phoneParam = encodeURIComponent(String(customerPhone));
      const otpParam = encodeURIComponent(String(otpCode.trim()));
      
      // Verify OTP
      await axios.post(`https://api.arpellastore.com/verify-otp?username=${phoneParam}&otp=${otpParam}`);
      
      // Update order status
      if (order?.orderid) {
        await axios.put(`https://api.arpellastore.com/deliverytracking/${order.orderid}/status?status=Delivered`);
      }
      
      // Close modal and reset
      setOtpModalVisible(false);
      setOtpCode('');
      
      // Show success message
      Alert.alert(
        'Success', 
        'Order marked as delivered.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Home using replace to prevent going back
              router.replace('/Home');
            }
          }
        ]
      );
      
    } catch (error) {
      Alert.alert('Verification Failed', 'OTP verification failed. Please check the code and try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    setCurrentLocation(null);
    setRoute(null);
    setDistance(null);
    setDuration(null);
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }).then((location) => {
          if (location?.coords?.latitude && location?.coords?.longitude) {
            setCurrentLocation(location.coords);
          } else {
            setErrorMsg('Unable to get valid location coordinates');
          }
        }).catch(() => {
          setErrorMsg('Error getting location');
        });
      }
    });
  }, []);

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Package Tracking</Text>

      {currentLocation ? (
        <MapView
          style={styles.map}
          region={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          <Marker 
            coordinate={currentLocation} 
            title="Your Location" 
            pinColor="blue"
            identifier="current"
          />
          <Marker 
            coordinate={destination} 
            title="Destination"
            pinColor="red"
            identifier="destination"
          />
          {route && route.length > 0 && (
            <Polyline
              coordinates={route}
              strokeColor="#4285F4"
              strokeWidth={4}
              lineDashPattern={[1]}
            />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Location...</Text>
        </View>
      )}

      <View style={styles.details}>
        <Text style={styles.detailText}>
          Remaining Distance: {routeLoading ? 'Calculating...' : (distance || 'Calculating...')}
        </Text>
        <Text style={styles.detailText}>
          Estimated Time: {routeLoading ? 'Calculating...' : (duration || 'Calculating...')}
        </Text>
      
        {order?.userId && (
          <Text style={styles.detailText}>Customer: {order.userId}</Text>
        )}
      </View>

      {isCloseToDestination() && (
        <TouchableOpacity style={styles.deliveredButton} onPress={sendOTP} disabled={sendingOtp}>
          {sendingOtp ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deliveredButtonText}>Mark as Delivered</Text>
          )}
        </TouchableOpacity>
      )}

      <Modal
        transparent
        animationType="slide"
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter 6-digit OTP</Text>
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, ''))}
              placeholder="******"
              placeholderTextColor="#999"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => { 
                  setOtpModalVisible(false); 
                  setOtpCode(''); 
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.verifyButton} 
                onPress={verifyOtpAndComplete} 
                disabled={verifyingOtp}
              >
                {verifyingOtp ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.reloadButton} onPress={fetchRoute}>
        <Text style={styles.reloadButtonText}>Reload Route</Text>
      </TouchableOpacity>
      <BottomNav active="route" />
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#FFF8E1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  map: {
    width: '100%',
    height: Dimensions.get('window').height * 0.55,
  },
  details: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  detailText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 1,
  },
  reloadButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  deliveredButton: {
    marginTop: 20,
    backgroundColor: '#E53935',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  deliveredButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#9E9E9E',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  verifyButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  navItem: {
    alignItems: 'center',
  },
  loadingContainer: {
    height: Dimensions.get('window').height * 0.55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#E53935',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default MapScreen;