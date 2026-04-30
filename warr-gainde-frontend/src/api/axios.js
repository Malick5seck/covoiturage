import axios from 'axios';

// 1. On crée une instance configurée pour pointer vers ton Laravel
const api = axios.create({
  baseURL: 'http://localhost:8000/api', // L'URL de ton back-end
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// 2. Intercepteur : Le "Garde du corps"
// Avant CHAQUE requête envoyée au back-end, il regarde si on a un Token Sanctum.
// Si oui, il l'attache automatiquement comme un badge VIP !
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // On récupère le token sauvegardé
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;