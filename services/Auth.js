// services/Auth.js
import axios from 'axios';
import { baseUrl } from '../constants/const.js';

export const loginUserApi = async (credentials) => {
  try {
    console.log('=== LOGIN API DEBUG ===');
    console.log('Received credentials:', credentials);
    
    // Convert the credentials to match server expectations
    const requestData = {
      userName: credentials.username,        
      PasswordHash: credentials.password,    
    };
    
    console.log('Sending to server:', requestData);
    console.log('API URL:', `${baseUrl}/login`);

    const response = await axios.post(
      `${baseUrl}/login`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    console.log('=== RESPONSE DEBUG ===');
    console.log('Status:', response.status);
    console.log('Response data:', response.data);
    console.log('Response data type:', typeof response.data);
    console.log('Is array?', Array.isArray(response.data));

    if (response.status === 200) {
      // Check if response.data exists and has data
      if (!response.data) {
        console.log('ERROR: No data in response');
        throw new Error('No data received from server');
      }

      // Check if it's an array with at least one item
      if (Array.isArray(response.data)) {
        if (response.data.length === 0) {
          console.log('ERROR: Empty array response - Invalid credentials');
          throw new Error('Invalid phone number or password');
        }
        console.log('Returning first item from array:', response.data[0]);
        return response.data[0];
      } else {
        // If it's not an array, return the data directly
        console.log('Returning direct response data:', response.data);
        return response.data;
      }
    }

    console.log('ERROR: Unexpected status code:', response.status);
    throw new Error(`Server error: ${response.status}`);

  } catch (error) {
    console.log('=== ERROR DEBUG ===');
    console.log('Error object:', error);
    console.log('Error response:', error.response);
    console.log('Error response status:', error.response?.status);
    console.log('Error response data:', error.response?.data);
    console.log('Error message:', error.message);

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 401 || status === 403) {
        throw new Error('Invalid phone number or password');
      } else if (status === 404) {
        throw new Error('Login service not found');
      } else if (status === 500) {
        throw new Error('Server error. Please try again later');
      } else {
        const errorMessage = errorData || `Server error: ${status}`;
        throw new Error(errorMessage);
      }
    } else if (error.request) {
      // Network error - no response received
      console.log('Network error - no response received');
      throw new Error('Network error. Please check your internet connection');
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      throw new Error('Request timeout. Please try again');
    } else {
      // Other error
      console.log('Other error:', error.message);
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
};

export const registerUserApi = async (userData) => {
  console.log('Register user data:', userData);
  try {
    const response = await axios.post(
      `${baseUrl}/register`, 
      userData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    console.log('Register response:', response);
    
    if (response.status === 200 || response.status === 201) {
      return Array.isArray(response.data) ? response.data[0] : response.data;
    }
    
    throw new Error('Registration failed');

  } catch (error) {
    console.log('Register error:', error);

    if (error.response) {
      const errorMessage = Array.isArray(error.response?.data) 
        ? error.response.data[0]?.message 
        : error.response?.data?.message || error.response?.data || 'Registration failed'; 
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error('Network error. Please check your connection');
    } else {
      throw new Error(error.message || 'Registration failed');
    }
  }
};