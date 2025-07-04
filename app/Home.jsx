import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';

const deliveries = [
  { id: '1', orderId: 'ORD12345', address: '123 Main St, City, Country' },
  { id: '2', orderId: 'ORD67890', address: '456 Elm St, City, Country' },
];

export default function DashboardScreen() {
      const router = useRouter();
    
  const renderItem = ({ item }) => (
    <View style={styles.deliveryCard}>
      <Text style={styles.orderId}>Order ID: {item.orderId}</Text>
      <Text style={styles.address}>Address: {item.address}</Text>
      <Link
        href={{
          pathname: '/route',
          params: { delivery: JSON.stringify(item) },
        }}
        asChild
      >
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Start Delivery</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Dashboard</Text>
      <FlatList
        data={deliveries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false} // Disable scrolling since it's inside a ScrollView
      />
    
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
  navItem: {
    color: 'white',
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
  }
});
