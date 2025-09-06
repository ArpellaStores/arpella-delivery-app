// redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginUserApi } from '../../../services/Auth';

// Async thunk for logging in
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await loginUserApi(credentials);
      console.log('API Response:', response); // Debug log

      // Handle different response structures
      const userData = response.data || response;

      // Validate that we have the required user data
      if (!userData || !userData.role) {
        throw new Error('Invalid response format from server');
      }

      return userData;
    } catch (error) {
      console.error('Login API Error:', error); // Debug log

      let errorMessage = 'Login failed. Please check your credentials.';

      // Extract error message from different possible structures
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data && typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

// Auth slice
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
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    register: (state, action) => {
      const { FirstName, phone } = action.payload;
      state.isAuthenticated = true;
      state.user = {
        FirstName: FirstName,
        phone: phone,
      };
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        // The payload should contain the user data directly
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload || 'Login failed';
      });
  },
});

export const { logout, register, clearError } = authSlice.actions;
export default authSlice.reducer;
