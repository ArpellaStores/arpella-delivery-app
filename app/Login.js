// app/screens/Login.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from 'react-native-toast-notifications';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import logo from '../assets/images/logo.jpeg';
import { loginUser } from '../redux/slices/authSlice';

const CREDENTIALS_KEY = 'arpella_credentials_v1';

export default function Login() {
  const router = useRouter();
  const toast = useToast();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [manualLoginPressed, setManualLoginPressed] = useState(false);

  // Redux state with safe fallbacks
  const authState = useSelector((state) => state.auth) || {};
  const { isLoading = false, error, user, isAuthenticated } = authState;

  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  // Allowed roles logic
  const isAllowedRole = useCallback((role) => {
    if (!role) return false;
    const allowedRoles = ['Admin', 'admin', 'Delivery', 'delivery', 'delivery guy'];
    return allowedRoles.some(allowedRole => allowedRole.toLowerCase() === role.toLowerCase());
  }, []);

  // --- SecureStore helpers ---
  const saveCredentials = async ({ phone, pass, remember }) => {
    try {
      const payload = {
        phone: String(phone || ''),
        pass: String(pass || ''),
        remember: !!remember,
        savedAt: Date.now(),
      };
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(payload));
      console.info('[Login] SecureStore: credentials saved ->', {
        phone: payload.phone ? `${payload.phone.slice(0, 6)}****` : null,
        remember: payload.remember,
      });
      return true;
    } catch (e) {
      console.error('[Login] SecureStore save failed:', e);
      return false;
    }
  };

  const loadCredentials = async () => {
    try {
      const txt = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      if (!txt) {
        console.info('[Login] SecureStore: no saved credentials');
        return null;
      }
      const parsed = JSON.parse(txt);
      console.info('[Login] SecureStore: loaded credentials ->', {
        phone: parsed.phone ? `${parsed.phone.slice(0, 6)}****` : null,
        remember: parsed.remember,
        savedAt: parsed.savedAt,
      });
      return parsed;
    } catch (e) {
      console.error('[Login] SecureStore load failed:', e);
      return null;
    }
  };

  const clearCredentials = async () => {
    try {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      console.info('[Login] SecureStore: credentials cleared');
      return true;
    } catch (e) {
      console.error('[Login] SecureStore clear failed:', e);
      return false;
    }
  };
  // --- end SecureStore helpers ---

  // utils
  const normalizePhone = (raw) => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('254')) return digits;
    if (digits.startsWith('0')) return '254' + digits.replace(/^0+/, '');
    return '254' + digits;
  };

  // Get error message helper
  const getErrorMessage = (error) => {
    if (!error) return 'Login failed. Please try again.';

    let message = '';

    if (typeof error === 'string') {
      message = error;
    } else if (error.message) {
      message = error.message;
    } else if (error.data && typeof error.data === 'string') {
      message = error.data;
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    } else {
      message = 'Login failed. Please try again.';
    }

    if (message.includes('Request failed with status code 400')) {
      return 'Invalid phone number or password. Please check your credentials.';
    } else if (message.includes('Request failed with status code 401')) {
      return 'Invalid phone number or password. Please check your credentials.';
    } else if (message.includes('Request failed with status code 404')) {
      return 'Account not found. Please check your phone number.';
    } else if (message.includes('Request failed with status code 500')) {
      return 'Server error. Please try again later.';
    } else if (message.includes('Network Error')) {
      return 'Network error. Please check your internet connection.';
    } else if (message.toLowerCase().includes('timeout')) {
      return 'Connection timeout. Please try again.';
    }

    return message;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const creds = await loadCredentials();
        if (!mounted || !creds) return;

        if (creds.remember && creds.phone) {
          const normalized = normalizePhone(creds.phone);
          setValue('phone', normalized);
          setRememberMe(true);
        }
        if (creds.remember && creds.pass) {
          setValue('password', creds.pass);
        }
      } catch (e) {
        console.error('Error loading credentials on mount:', e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [setValue]);

  // Auto-login: attempts a single auto-login if credentials exist and rememberMe is true
  useEffect(() => {
    let mounted = true;
    let timer = null;

    const performAutoLogin = async () => {
      if (!mounted) return;
      if (autoLoginAttempted || isAuthenticated || manualLoginPressed) {
        console.info('[Login] Auto-login skipped (already attempted or user authenticated or manual login in progress)');
        return;
      }

      setAutoLoginAttempted(true);

      try {
        const creds = await loadCredentials();
        if (!creds || !creds.remember || !creds.phone || !creds.pass) {
          console.info('[Login] No usable saved credentials (remember flag, phone or pass missing)');
          return;
        }

        const normalized = normalizePhone(creds.phone);
        setValue('phone', normalized);
        setValue('password', creds.pass);
        setRememberMe(true);

        setIsSubmitting(true);
        const loginData = {
          phoneNumber: normalized,
          password: creds.pass,
        };

        const result = await dispatch(loginUser(loginData));
        if (loginUser.fulfilled.match(result)) {
          const userData = result.payload;
          if (userData && userData.role && isAllowedRole(userData.role)) {
            toast.show(`Welcome back, ${userData.firstName || 'User'}!`, {
              type: 'success',
              duration: 3500,
              placement: 'top',
              offsetTop: 50,
            });
            router.replace('./Home');
          } else {
            toast.show('Access denied. Only Admin and Delivery personnel are allowed.', {
              type: 'danger',
              duration: 4000,
              placement: 'top',
              offsetTop: 50,
            });
            await clearCredentials();
            setRememberMe(false);
          }
        } else {
          const errorMessage = getErrorMessage(result.payload || result.error);
          toast.show(errorMessage, { type: 'danger', placement: 'top', offsetTop: 50 });
          await clearCredentials();
          setRememberMe(false);
        }
      } catch (e) {
        console.error('Auto-login error:', e);
        toast.show('Auto-login encountered an issue. Please login manually.', { type: 'warning', duration: 2000 });
      } finally {
        setIsSubmitting(false);
      }
    };

    timer = setTimeout(performAutoLogin, 200);
    return () => {
      if (timer) clearTimeout(timer);
      mounted = false;
    };
  }, [
    autoLoginAttempted,
    isAuthenticated,
    manualLoginPressed,
    dispatch,
    router,
    setValue,
    toast,
    isAllowedRole,
  ]);

  // Navigate on successful authentication (manual path)
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace('./Home');
    }
  }, [isAuthenticated, user, router]);

  // Handle login errors from Redux when user manually tried to login
  useEffect(() => {
    if (error && manualLoginPressed) {
      toast.show(getErrorMessage(error), {
        type: 'danger',
        duration: 3000,
        placement: 'top',
        offsetTop: 50,
      });
    }
  }, [error, toast, manualLoginPressed]);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const isButtonDisabled = isSubmitting || isLoading;

  // Manual submit handler (user pressed Login)
  const onSubmit = async (data) => {
    if (isSubmitting) return;
    setManualLoginPressed(true);
    setIsSubmitting(true);

    try {
      const normalizedPhone = normalizePhone(data.phone);

      const loginData = {
        phoneNumber: normalizedPhone,
        password: data.password,
      };

      console.log('Dispatching login with data:', { phone: normalizedPhone });

      const result = await dispatch(loginUser(loginData));
      console.log('Login result:', result);

      if (loginUser.fulfilled.match(result)) {
        // Success
        const userData = result.payload;
        console.log('User data:', userData);

        if (userData && userData.role && isAllowedRole(userData.role)) {
          toast.show(`Welcome back, ${userData.firstName || 'User'}!`, {
            type: 'success',
            duration: 3500,
            placement: 'top',
            offsetTop: 50,
          });

          if (rememberMe) {
            await saveCredentials({ phone: normalizedPhone, pass: data.password, remember: true });
          } else {
            await clearCredentials();
          }

          router.replace('./Home');
        } else {
          toast.show('Access denied. Only Admin and Delivery personnel are allowed.', {
            type: 'danger',
            duration: 4000,
            placement: 'top',
            offsetTop: 50,
          });
          // make sure credentials aren't stored for disallowed user
          await clearCredentials();
          setRememberMe(false);
        }
      } else {
        // Rejected
        console.log('Login was rejected:', result.payload || result.error);
        const errorMessage = getErrorMessage(result.payload || result.error);
        toast.show(errorMessage, {
          type: 'danger',
          duration: 3000,
          placement: 'top',
          offsetTop: 50,
        });
      }
    } catch (err) {
      console.log('Catch block error:', err);
      const errorMessage = getErrorMessage(err);
      toast.show(errorMessage, { type: 'danger', duration: 3000, placement: 'top', offsetTop: 50 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Welcome Back to</Text>
          <Text style={styles.brandName}>Arpella</Text>
        </View>

        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image source={logo} style={styles.logo} />
          </View>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Login to Your Account</Text>
          <Text style={styles.formSubtitle}>Enter your credentials to continue</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <Controller
              control={control}
              name="phone"
              rules={{
                required: 'Phone number is required',
                pattern: {
                  value: /^254[0-9]{9}$/,
                  message: 'Phone number must start with 254 and have 9 digits after',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#8B7355" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="254XXXXXXXXX"
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={(txt) => onChange(normalizePhone(txt))}
                    value={value}
                    placeholderTextColor="#A0A0A0"
                    editable={!isButtonDisabled}
                  />
                </View>
              )}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#8B7355" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    secureTextEntry={!showPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="#A0A0A0"
                    editable={!isButtonDisabled}
                  />
                  <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon} disabled={isButtonDisabled}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#8B7355" />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
          </View>

          <TouchableOpacity style={styles.rememberMeContainer} onPress={() => setRememberMe((v) => !v)} disabled={isButtonDisabled}>
            <Ionicons name={rememberMe ? 'checkbox' : 'square-outline'} size={24} color={isButtonDisabled ? '#ccc' : '#4B2C20'} />
            <Text style={[styles.rememberMeText, isButtonDisabled && styles.disabledText]}>Remember Me</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, isButtonDisabled && styles.buttonDisabled]} onPress={handleSubmit(onSubmit)} disabled={isButtonDisabled}>
            {isButtonDisabled ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={[styles.buttonText, { marginLeft: 10 }]}>{isSubmitting ? 'Signing In...' : 'Loading...'}</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Login</Text>
                <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.roleInfoContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#8B7355" />
            <Text style={styles.roleInfoText}>Only Admin and Delivery personnel can access this app</Text>
          </View>
        </View>

        {isButtonDisabled && (
          <View style={styles.backdrop}>
            <View style={styles.backdropLoadingContainer}>
              <ActivityIndicator size="large" color="#4B2C20" />
              <Text style={styles.backdropLoadingText}>Logging you in...</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8E1' },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#FFF8E1',
    minHeight: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    fontSize: 22,
    color: '#5D4037',
    fontWeight: '400',
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4B2C20',
    marginTop: 5,
    letterSpacing: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4B2C20',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  logo: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#4B2C20',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#4B2C20',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#8B7355',
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4037',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 6,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4B2C20',
    fontWeight: '500',
  },
  disabledText: {
    color: '#ccc',
  },
  button: {
    backgroundColor: '#4B2C20',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 6,
    elevation: 2,
    shadowColor: '#4B2C20',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#8B7355',
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  roleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 10,
  },
  roleInfoText: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
    marginLeft: 6,
    lineHeight: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdropLoadingContainer: {
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  backdropLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#4B2C20',
  },
});
