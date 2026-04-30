import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// Importation des pages réelles
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Recherche from './pages/Recherche';
import Publier from './pages/Publier';
import Dashboard from './pages/Dashboard';
import AddPhoto from './components/AddPhoto';

// Composant temporaire pour la page d'attente des chauffeurs
const AttenteValidation = () => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
    <div className="text-6xl mb-6">⏳</div>
    <h1 className="text-3xl font-black text-gainde-dark mb-4">Profil en cours de vérification</h1>
    <p className="text-gray-600 max-w-md">
      Merci de votre confiance ! Nos administrateurs vérifient votre numéro de permis. 
      Vous recevrez un accès complet dès que votre compte sera validé.
    </p>
    <button 
      onClick={() => window.location.href = '/'}
      className="mt-8 text-gainde-yellow font-bold hover:underline"
    >
      Retourner à l'accueil
    </button>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      {/* La Navbar reste visible sur toutes les pages */}
      <Navbar />
      
      {/* Conteneur principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          {/* Route d'accueil unique pointant vers le vrai Home */}
          <Route path="/" element={<Home />} />
          
          {/* Authentification */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Fonctionnalités de l'application */}
          <Route path="/recherche" element={<Recherche />} />
          <Route path="/publier" element={<Publier />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Page spécifique pour la validation des chauffeurs */}
          <Route path="/attente-validation" element={<AttenteValidation />} />

          {/* Redirection automatique si la route n'existe pas */}
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/ajouter-photo" element={<AddPhoto/>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;