import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function AddPhoto() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Retrieve user data to know their role for the final redirection
  const user = JSON.parse(localStorage.getItem('user'));

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create a preview URL for the selected image
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Veuillez sélectionner une image.");
      return;
    }

    setLoading(true);
    setError('');

    // FormData is required for file uploads
    const formData = new FormData();
    formData.append('photo', file);

    try {
      // Assuming you have an endpoint for this
      const response = await api.post('/user/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // Token is required to identify the user
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });

      if (response.data.success) {
        // Update local user data with the new photo URL
        const updatedUser = { ...user, photo_profil: response.data.photo_url };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Final redirection based on role
        if (user.role_actuel === 'CHAUFFEUR') {
          navigate('/attente-validation');
        } else {
          window.location.href = '/';
        }
      }
    } catch (err) {
      setError("Erreur lors de l'upload. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (user?.role_actuel === 'CHAUFFEUR') {
      navigate('/attente-validation');
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
        <h2 className="text-2xl font-black text-gainde-dark mb-2">Photo de profil</h2>
        <p className="text-gray-500 mb-8">Ajoutez une photo pour rassurer vos compagnons de route.</p>

        {error && <div className="text-gainde-red mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-8 flex flex-col items-center">
            <label htmlFor="photo-upload" className="cursor-pointer group relative">
              <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group-hover:border-gainde-yellow transition">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-gray-400 group-hover:text-gainde-yellow">📸</span>
                )}
              </div>
              <input 
                id="photo-upload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className={`w-full bg-gainde-yellow text-gainde-dark py-3 rounded-xl font-bold shadow-md transition ${
              (loading || !file) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-500'
            }`}
          >
            {loading ? 'Envoi en cours...' : 'Enregistrer ma photo'}
          </button>
        </form>

        <button 
          onClick={handleSkip}
          className="mt-6 text-gray-400 text-sm font-semibold hover:text-gray-600 transition"
        >
          Passer cette étape (non recommandé)
        </button>
      </div>
    </div>
  );
}

export default AddPhoto;