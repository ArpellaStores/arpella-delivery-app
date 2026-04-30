import React, { useEffect } from 'react'
import { SafeAreaView, StyleSheet, View, ActivityIndicator, StatusBar, Text } from 'react-native'
import { Slot, useRouter } from 'expo-router'
import { Provider, useSelector } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import store, { persistor } from '../redux/store'
import { ToastProvider } from 'react-native-toast-notifications'
import * as ScreenOrientation from 'expo-screen-orientation'

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

const loadingFallback = (
  <SafeAreaView style={styles.fullScreen}>
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#FF9800" />
      <Text style={{ marginTop: 10, color: '#FFF' }}>Loading...</Text>
    </View>
  </SafeAreaView>
)

function AppContent() {
  const router = useRouter()
  const isAuthenticated = useSelector(s => s.auth.isAuthenticated)
  const reduxLoading = useSelector(s => s.auth.loading)

  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {})
  }, [])

  useEffect(() => {
    router.replace(isAuthenticated ? '/Home' : '/Login')
  }, [isAuthenticated])

  return (
    <SafeAreaView style={styles.fullScreen}>
      <StatusBar barStyle="dark-content" />
      {reduxLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
        </View>
      )}
      <Slot />
    </SafeAreaView>
  )
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={loadingFallback} persistor={persistor}>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </PersistGate>
    </Provider>
  )
}