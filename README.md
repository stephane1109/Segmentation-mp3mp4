---
title: Segmentation Audio par IA
emoji: 🎬
colorFrom: blue
colorTo: purple
sdk: static
pinned: false
---

# Segmentation Audio par IA avec Gemini

Cette application web full-stack effectue une segmentation des locuteurs sur des fichiers audio, en prenant en charge à la fois les **fichiers MP3 locaux** et les **vidéos YouTube**.

## Fonctionnalités

-   **Double Mode d'Analyse** :
    1.  **Fichier MP3** : Traitement 100% côté client, directement dans le navigateur.
    2.  **URL YouTube** : Un backend Python télécharge l'audio, extrait une miniature, et identifie visuellement chaque locuteur.
-   **Identification Visuelle** : Pour les vidéos YouTube, l'IA associe un visage à chaque voix.
-   **Choix du Modèle** : Sélectionnez `Gemini 2.5 Flash` pour la rapidité ou `Gemini 2.5 Pro` pour une précision accrue.
-   **Export Facile** : Téléchargez la transcription complète au format `.txt`.

## Comment l'exécuter localement

Cette application se compose de deux parties : un frontend (React) et un backend (Python/FastAPI).

### Étape 1 : Obtenir une clé API

1.  Rendez-vous sur [Google AI Studio](https://aistudio.google.com/app/apikey) pour obtenir une clé API Gemini.

### Étape 2 : Lancer le Backend (pour la fonctionnalité YouTube)

1.  **Naviguez vers le dossier `server`** :
    ```bash
    cd server
    ```
2.  **Installez les dépendances Python** :
    ```bash
    pip install -r ../requirements.txt 
    ```
    *Note : Vous pourriez avoir besoin d'installer `ffmpeg` sur votre système pour que `pydub` fonctionne. Consultez la documentation de `pydub` pour les instructions spécifiques à votre système d'exploitation.*

3.  **Lancez le serveur FastAPI** :
    ```bash
    uvicorn main:app --reload
    ```
    Le backend sera maintenant accessible à l'adresse `http://127.0.0.1:8000`.

### Étape 3 : Lancer le Frontend

1.  Ouvrez le fichier `index.html` à la racine du projet dans un navigateur web moderne (Chrome, Firefox, etc.).

### Étape 4 : Utiliser l'application

1.  **Collez votre clé API** dans le champ prévu à cet effet.
2.  **Choisissez un mode** : "Fichier MP3" ou "URL YouTube".
3.  **Fournissez le fichier ou l'URL** et lancez l'analyse.
4.  **Patientez** pendant le traitement.
5.  **Consultez et exportez** le résultat.
