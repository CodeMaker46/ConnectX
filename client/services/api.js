// API service for ConnectX app
import axios from 'axios';

// Base URL for API requests
const API_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// User API calls
export const userAPI = {
  register: (userData) => api.post('/users', userData),
  login: (credentials) => api.post('/users/login', credentials),
  getProfile: (userId) => api.get(`/users/${userId}`),
  updateProfile: (userId, userData) => api.put(`/users/${userId}`, userData)
};

// Group API calls
export const groupAPI = {
  create: (groupData) => api.post('/groups', groupData),
  getByCode: (code) => api.get(`/groups/${code}`),
  join: (joinData) => api.post('/groups/join', joinData),
  getMembers: (groupId) => api.get(`/groups/members/${groupId}`),
  delete: (groupId, userId) => api.delete(`/groups/${groupId}`, { data: { userId } })
};

// Venue API calls
export const venueAPI = {
  getAll: () => api.get('/venues'),
  getById: (venueId) => api.get(`/venues/${venueId}`),
  getMap: (venueId) => api.get(`/venues/${venueId}/map`)
};

export default {
  userAPI,
  groupAPI,
  venueAPI
};