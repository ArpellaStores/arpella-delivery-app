import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from 'react-native-toast-notifications';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import logo from '../assets/images/logo.jpeg';
import { loginUser } from '../redux/slices/authSlice';

const Login = () => {
  const router = useRouter();
  const toast = useToast();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redux state with safe fallbacks
  const authState = useSelector((state) => state.auth) || {};
  const { isLoading = false, error, user } = authState;
  
  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  // Check if user role is allowed
  const isAllowedRole = (role) => {
    const allowedRoles = ['Admin', 'admin', 'Delivery', 'delivery', 'delivery guy'];
    return allowedRoles.some(allowedRole => 
      allowedRole.toLowerCase() === role.toLowerCase()
    );
  };

  const onSubmit = async (data) => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      // Send credentials in the format that matches your web app
      const loginData = {
        username: data.phone,    // lowercase 'username' - will be converted to userName in API
        password: data.password, // lowercase 'password' - will be converted to PasswordHash in API
      };

      console.log('Dispatching login with data:', loginData);
      const result = await dispatch(loginUser(loginData));
      console.log('Login result:', result);
      
      // Check if the action was fulfilled (successful)
      if (loginUser.fulfilled.match(result)) {
        // Access the user data from result.payload
        const userData = result.payload;
        console.log('User data:', userData);
        
        if (userData && userData.role && isAllowedRole(userData.role)) {
          toast.show(`Welcome back, ${userData.firstName}!`, { 
            type: 'success', 
            duration: 3500,
            placement: "top", 
            offsetTop: 50 
          });
          router.push('./Home');
        } else {
          toast.show('Access denied. Only Admin and Delivery personnel are allowed.', { 
            type: 'danger', 
            duration: 4000,
            placement: "top",
            offsetTop: 50
          });
        }
      } else {
        // Login was rejected - error will be handled by Redux slice
        console.log('Login was rejected:', result.payload);
      }
    } catch (err) {
      console.log('Catch block error:', err);
      const errorMessage = typeof err === 'string' ? err : 'Login failed. Please check your credentials.';
      toast.show(errorMessage, { 
        type: 'danger', 
        duration: 3000,
        placement: "top",
        offsetTop: 50
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear form on component mount
  useEffect(() => {
    reset();
  }, [reset]);

  // Handle login errors from Redux
  useEffect(() => {
    if (error) {
      toast.show(error, { 
        type: 'danger', 
        duration: 3000,
        placement: "top",
        offsetTop: 50
      });
    }
  }, [error, toast]);

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const isButtonDisabled = isSubmitting || isLoading;

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
                <Ionicons 
                  name="call-outline" 
                  size={20} 
                  color="#8B7355" 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="254XXXXXXXXX"
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={onChange}
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
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters'
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color="#8B7355" 
                  style={styles.inputIcon}
                />
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
                <TouchableOpacity 
                  onPress={togglePasswordVisibility}
                  style={styles.eyeIcon}
                  disabled={isButtonDisabled}
                >
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#8B7355" 
                  />
                </TouchableOpacity>
              </View>
            )}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isButtonDisabled}
        >
          {isButtonDisabled ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" size="small" />
              <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                {isSubmitting ? 'Signing In...' : 'Loading...'}
              </Text>
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
          <Text style={styles.roleInfoText}>
            Only Admin and Delivery personnel can access this app
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#FFF8E1',
    minHeight: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
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
    marginBottom: 30,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4B2C20',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#4B2C20',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4B2C20',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#8B7355',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4037',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 15,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 5,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  button: {
    backgroundColor: '#4B2C20',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#4B2C20',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#8B7355',
    elevation: 1,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  roleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  roleInfoText: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
    marginLeft: 5,
    lineHeight: 16,
  },
});

export default Login;