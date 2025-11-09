import axios from 'axios';

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000', // Make sure this matches your server URL
});

// Add a request interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;