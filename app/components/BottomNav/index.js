// components/BottomNav.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';

export default function BottomNav({ active = 'dashboard' }) {
  const router = useRouter();

  return (
    <View style={styles.bottomNavigation}>
      <TouchableOpacity style={styles.navItem} onPress={() => router.push('./Home')}>
        <Icon name="home" size={24} color="#4B2C20" />
        <Text style={styles.navText}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, active === 'route' && styles.activeNavItem]}
        onPress={() => router.push('./route')}
      >
        <Icon name="map" size={24} color="#4B2C20" />
        <Text style={[styles.navText, active === 'route' && styles.activeNavText]}>Routes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, active === 'profile' && styles.activeNavItem]}
        onPress={() => router.push('./Profile')}
      >
        <Icon name="user" size={24} color="#4B2C20" />
        <Text style={[styles.navText, active === 'profile' && styles.activeNavText]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activeNavItem: {
    transform: [{ scale: 1.05 }],
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeNavText: {
    color: '#4B2C20',
    fontWeight: '600',
  },
});
