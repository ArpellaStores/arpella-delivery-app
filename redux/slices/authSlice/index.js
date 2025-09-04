import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { baseUrl } from '../../../constants/const';
import { loginUserApi, registerUserApi } from '../../../services/Auth';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('=== REDUX THUNK DEBUG ===');
      console.log('Credentials received in thunk:', credentials);
      
      const response = await loginUserApi(credentials);
      console.log('API response received in thunk:', response);
      
      return response;
    } catch (error) {
      console.log('=== REDUX THUNK ERROR ===');
      console.log('Error in thunk:', error);
      console.log('Error message:', error.message);
      
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await registerUserApi(userData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const editUser = createAsyncThunk(
  'auth/editUser',
  async ({ phoneNumber, payload }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${baseUrl}/user-details/${phoneNumber}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      // Clear any stored user data
      try {
        // In React Native, you might be using AsyncStorage instead of localStorage
        // If using AsyncStorage, uncomment the next line and import AsyncStorage
        // AsyncStorage.removeItem('user');
      } catch (error) {
        console.log('Error clearing stored user data:', error);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    loadUserFromStorage: (state) => {
      try {
        // In React Native, you might be using AsyncStorage instead of localStorage
        // If using AsyncStorage, you'll need to handle this differently as it's async
        // This is just a placeholder for localStorage equivalent
        const stored = null; // localStorage.getItem('user');
        if (stored) {
          state.user = JSON.parse(atob(stored));
          state.isAuthenticated = true;
        }
      } catch (error) {
        console.log('Error loading user from storage:', error);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        console.log('Login pending...');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        console.log('Login fulfilled with payload:', action.payload);
        state.isLoading = false;
        state.isAuthenticated = true;
        state.error = null;
        
        // Create user object from response
        state.user = {
          firstName: action.payload.firstName,
          lastName: action.payload.lastName,
          phone: action.payload.phoneNumber,
          email: action.payload.email,
          role: action.payload.role,
          passwordHash: action.payload.passwordHash || '',
          // Add any other fields your API returns
        };
        
        console.log('User set in state:', state.user);
      })
      .addCase(loginUser.rejected, (state, action) => {
        console.log('Login rejected with payload:', action.payload);
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload || 'Login failed';
      })

      // Register cases
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.error = null;
        state.user = {
          firstName: action.payload.firstName,
          lastName: action.payload.lastName,
          phone: action.payload.phoneNumber,
          email: action.payload.email,
          role: action.payload.role,
          passwordHash: action.payload.passwordHash || '',
        };
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload || 'Registration failed';
      })

      // Edit user cases
      .addCase(editUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.user = {
          ...state.user,
          email: action.payload.email,
          passwordHash: action.payload.passwordHash,
          phone: action.payload.phoneNumber,
          firstName: action.payload.firstName,
          lastName: action.payload.lastName,
        };
      })
      .addCase(editUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Profile update failed';
      });
  },
});

export const { logout, clearError, loadUserFromStorage } = authSlice.actions;
export default authSlice.reducer;