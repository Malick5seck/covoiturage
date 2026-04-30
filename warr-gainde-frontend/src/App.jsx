import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';


// Les VRAIES pages que tu as créées dans le dossier src/pages/
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Recherche from './pages/Recherche';
import Publier from './pages/Publier';
import Dashboard from './pages/Dashboard';

// Les FAUSSES pages temporaires (en attendant qu'on les code)
const Accueil = () => (
  <div className="flex flex-col items-center justify-center min-h-[80vh]">
    <h1 className="text-5xl font-extrabold text-gainde-dark mb-4">Bienvenue sur Warr Gaïndé</h1>
    <p className="text-lg text-gray-600">Où allez-vous aujourd'hui ?</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      {/* La Navbar reste visible sur toutes les pages */}
      <Navbar />
      
      {/* Le contenu principal qui change selon l'URL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recherche" element={<Recherche />} />
          <Route path="/" element={<Home />} />
          <Route path="/publier" element={<Publier />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;