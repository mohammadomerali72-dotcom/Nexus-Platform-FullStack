import axios from 'axios';

// This links the React website to your Node.js/XAMPP server
const api = axios.create({
    baseURL: 'http://localhost:5000/api', 
});

// This automatically attaches your Login Token for secure features
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;