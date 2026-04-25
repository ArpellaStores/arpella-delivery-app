// services/Auth.js
import axios from 'axios';
import { baseUrl } from '../constants/const'; // adjust path if baseUrl is elsewhere

/**
 * Simple login API call using axios only
 * credentials = { phoneNumber, passwordHash }
 */
export const loginUserApi = async ({ phoneNumber, password }) => {
  try {
    const payload = {
      userName: phoneNumber, // your backend expects userName
      password,
    };

    const response = await axios.post(`${baseUrl}/login`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Some APIs return arrays, normalize
    return Array.isArray(response.data) ? response.data[0] : response.data;
  } catch (error) {
    console.error('[loginUserApi] error:', error?.response?.data || error.message);
    throw error;
  }
};

export default loginUserApi;
