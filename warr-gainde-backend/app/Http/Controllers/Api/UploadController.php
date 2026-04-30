<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    /**
     * 1. Uploader/Modifier la photo de profil de l'utilisateur connecté
     */
    public function uploadPhotoProfil(Request $request)
    {
        // On vérifie que c'est bien une image, de type connu, et pas trop lourde (max 2 Mo)
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $user = $request->user();

        // Si l'utilisateur avait déjà une photo, on supprime l'ancienne pour ne pas saturer le serveur
        if ($user->photo_profil) {
            // On extrait le chemin relatif depuis l'URL complète
            $oldPath = str_replace(asset('storage/'), '', $user->photo_profil);
            Storage::disk('public')->delete($oldPath);
        }

        // On sauvegarde la nouvelle image dans le dossier 'storage/app/public/profils'
        $path = $request->file('photo')->store('profils', 'public');

        // On génère l'URL complète (ex: http://127.0.0.1:8000/storage/profils/image.jpg)
        $url = asset('storage/' . $path);

        // On met à jour la base de données
        $user->update(['photo_profil' => $url]);

        return response()->json([
            'success' => true,
            'message' => 'Photo de profil mise à jour avec succès.',
            'photo_url' => $url
        ], 200);
    }

    /**
     * 2. Uploader/Modifier la photo d'un véhicule
     */
    public function uploadPhotoVehicule(Request $request, $id)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $vehicule = Vehicule::findOrFail($id);

        // Sécurité : Seul le propriétaire du véhicule peut changer sa photo
        if ($vehicule->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        if ($vehicule->photo_vehicule) {
            $oldPath = str_replace(asset('storage/'), '', $vehicule->photo_vehicule);
            Storage::disk('public')->delete($oldPath);
        }

        $path = $request->file('photo')->store('vehicules', 'public');
        $url = asset('storage/' . $path);

        $vehicule->update(['photo_vehicule' => $url]);

        return response()->json([
            'success' => true,
            'message' => 'Photo du véhicule mise à jour.',
            'photo_url' => $url
        ], 200);
    }
}