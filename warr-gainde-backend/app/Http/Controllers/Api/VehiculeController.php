<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicule;
use Illuminate\Http\Request;

class VehiculeController extends Controller
{
    /**
     * Affiche la liste des véhicules du chauffeur connecté.
     */
    public function index(Request $request)
    {
        // On ne récupère que les véhicules du user authentifié
        $vehicules = Vehicule::where('conducteur_id', $request->user()->id)->get();

        return response()->json([
            'success' => true,
            'data' => $vehicules
        ], 200);
    }

    /**
     * Enregistrer un nouveau véhicule.
     */
    public function store(Request $request)
    {
        // 1. Validation stricte
        $validatedData = $request->validate([
            'marque_modele' => 'required|string|max:255',
            // L'immatriculation doit être unique dans la table vehicules
            'immatriculation' => 'required|string|unique:vehicules,immatriculation',
            'nombre_places_max' => 'required|integer|min:1|max:9', // Ex: un 7-places ou minicar
            'climatisation' => 'boolean',
            'couleur' => 'nullable|string',
            'annee_fabrication' => 'nullable|integer|min:1990|max:' . date('Y'),
        ]);

        // 2. On lie le véhicule au chauffeur connecté
        $validatedData['conducteur_id'] = $request->user()->id;
        $validatedData['climatisation'] = $request->boolean('climatisation');

        // 3. Création
        $vehicule = Vehicule::create($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Votre véhicule a été enregistré avec succès.',
            'data' => $vehicule
        ], 201);
    }

    /**
     * Afficher les détails d'un véhicule (si on en est le propriétaire).
     */
    public function show(Request $request, $id)
    {
        $vehicule = Vehicule::findOrFail($id);

        // Sécurité : On vérifie que le véhicule appartient bien à celui qui le demande
        if ($vehicule->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $vehicule
        ], 200);
    }

    /**
     * Modifier un véhicule existant.
     */
    public function update(Request $request, $id)
    {
        $vehicule = Vehicule::findOrFail($id);

        if ($vehicule->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $validatedData = $request->validate([
            'marque_modele' => 'sometimes|required|string|max:255',
            // L'immatriculation doit être unique, SAUF pour ce véhicule précis (on ignore son propre ID)
            'immatriculation' => 'sometimes|required|string|unique:vehicules,immatriculation,' . $vehicule->id,
            'nombre_places_max' => 'sometimes|required|integer|min:1|max:9',
            'climatisation' => 'boolean',
            'couleur' => 'nullable|string',
        ]);

        $vehicule->update($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Véhicule mis à jour avec succès.',
            'data' => $vehicule
        ], 200);
    }

    /**
     * Supprimer un véhicule (Soft Delete).
     */
    public function destroy(Request $request, $id)
    {
        $vehicule = Vehicule::findOrFail($id);

        if ($vehicule->conducteur_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        // Grâce au SoftDelete de ton modèle, ça ne l'efface pas vraiment de la BDD, ça remplit juste la colonne deleted_at
        $vehicule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Véhicule supprimé de votre flotte.'
        ], 200);
    }
}