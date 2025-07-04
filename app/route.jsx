import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import { toast } from 'react-native-toast-notifications';
import axios from 'axios';

const MapScreen = () => {
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState({
    latitude: -1.2921,
    longitude: 36.8219,
  });
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const GOOGLE_MAPS_API_KEY = 'AIzaSyD-YPpUWHXNzvQjjXjqj7mvO2Idi72jREc'; 

  useEffect(() => {
    const getLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location.coords);
      } else {
        setErrorMsg('Permission to access location was denied');
      }
    };
    getLocation();
  }, []);

  const fetchRoute = async () => {
    if (currentLocation) {
      const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;

      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
        );

        if (response.data.routes.length > 0) {
          const routeData = response.data.routes[0].legs[0];
          setRoute(routeData.steps);
          setDistance(routeData.distance.text);
          setDuration(routeData.duration.text);
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    }
  };

  useEffect(() => {
    fetchRoute();
  }, [currentLocation, destination]);

  // Convert distance to meters
  const isCloseToDestination = () => {
    if (distance) {
      const meters = parseFloat(distance.replace(/[^\d.]/g, '')) * (distance.includes('km') ? 1000 : 1);
      return meters < 10;
    }
    return false;
  };

  const sendOTP = async () => {
    try {
      await axios.post('https://your-backend.com/send-otp', { customerPhone: '0123456789' });
      toast.show('OTP sent to customer!', { type: 'success' });
    } catch (error) {
      toast.show('Failed to send OTP', { type: 'error' });
    }
  };

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
          showsUserLocation={true}
        >
          <Marker coordinate={currentLocation} title="Your Location" pinColor="blue" />
          <Marker coordinate={destination} title="Destination" />
          {route && (
            <Polyline
              coordinates={route.map(step => ({
                latitude: step.end_location.lat,
                longitude: step.end_location.lng,
              }))}
              strokeColor="#000"
              strokeWidth={3}
            />
          )}
        </MapView>
      ) : (
        <Text>Loading Location...</Text>
      )}

      <View style={styles.details}>
        <Text style={styles.detailText}>Remaining Distance: {distance}</Text>
        <Text style={styles.detailText}>Estimated Time: {duration}</Text>
      </View>

      {isCloseToDestination() && (
        <TouchableOpacity style={styles.deliveredButton} onPress={sendOTP}>
          <Text style={styles.deliveredButtonText}>Delivered</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.reloadButton} onPress={fetchRoute}>
        <Text style={styles.reloadButtonText}>Reload Route</Text>
      </TouchableOpacity>

      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Home')}>
          <Icon name="home" size={24} color="black" />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./route')}>
          <Icon name="ticket" size={24} color="black" />
          <Text>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Profile')}>
          <Icon name="user" size={24} color="black" />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
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
  navItem: {
    alignItems: 'center',
  },
});

export default MapScreen;
