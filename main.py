import os
import base64
import json
from pathlib import Path
import requests
import yt_dlp

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict

import google.generativeai as genai

# Définition des modèles Pydantic pour la validation des données
class YouTubeRequest(BaseModel):
    url: str
    model: str

class DiarizationEntry(BaseModel):
    speaker: str
    timestamp: str
    text: str

class DiarizationResponse(BaseModel):
    diarization: List[DiarizationEntry]
    speaker_images: Dict[str, str] = Field(default_factory=dict)

# Initialisation de l'application FastAPI
app = FastAPI()

# Configuration CORS pour autoriser les requêtes depuis le frontend
# C'est une bonne pratique, surtout en développement.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instruction détaillée pour l'IA, optimisée pour la tâche YouTube
YOUTUBE_PROMPT = """
Analyze the provided audio file and the accompanying video thumbnail image.
Your task is to perform speaker diarization and visually identify each speaker using the thumbnail.

1.  **Analyze the audio**: Transcribe the speech and identify when each person speaks.
2.  **Analyze the image**: Use the thumbnail to visually identify the speakers. If there are multiple people, assign a label (e.g., "Person with red shirt", "Person on the left"). If there's only one person, identify them as the sole speaker.
3.  **Combine the results**: Associate each transcribed text segment with the visually identified speaker.

Your final output must be a single, valid JSON object with two keys:
-   `"diarization"`: An array of objects, where each object has:
    -   `"speaker"`: A string with the speaker's identifier (e.g., "Locuteur A", "Locuteur B").
    -   `"timestamp"`: A string for the start time in "HH:MM:SS" format.
    -   `"text"`: A string containing the transcribed text.
-   `"speaker_images"`: A JSON object where each key is a speaker identifier (e.g., "Locuteur A") and the value is a short, descriptive string of their appearance based *only* on the provided thumbnail (e.g., "man with glasses and a blue tie"). Do not create images, just describe them.

Process the audio and image now.
"""

@app.post("/process-youtube-url", response_model=DiarizationResponse)
async def process_youtube(request: YouTubeRequest):
    """
    Endpoint to process a YouTube URL, perform speaker diarization,
    and return the result with speaker images.
    """
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API_KEY environment variable is not set on the server.")
    
    genai.configure(api_key=api_key)

    temp_dir = Path("/tmp")
    audio_path = temp_dir / "audio.mp3"

    try:
        # 1. Télécharger l'audio et les métadonnées de YouTube avec yt-dlp
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': str(audio_path),
            'quiet': True,
        }
        
        thumbnail_url = None
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=True)
            thumbnail_url = info.get('thumbnail')

        if not audio_path.exists():
            raise HTTPException(status_code=500, detail="Failed to download audio from YouTube.")
        
        # 2. Télécharger et préparer la miniature
        image_part = None
        if thumbnail_url:
            response = requests.get(thumbnail_url)
            if response.status_code == 200:
                image_base64 = base64.b64encode(response.content).decode('utf-8')
                image_part = {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_base64
                    }
                }

        # 3. Préparer le fichier audio pour l'API Gemini
        with open(audio_path, "rb") as f:
            audio_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        audio_part = {
            "inline_data": {
                "mime_type": "audio/mpeg",
                "data": audio_base64,
            },
        }

        # 4. Appeler l'API Gemini avec l'audio, l'image (si disponible) et le prompt
        model = genai.GenerativeModel(model_name=request.model)
        
        contents = [YOUTUBE_PROMPT, audio_part]
        if image_part:
            contents.append(image_part)
        
        response = model.generate_content(
            contents,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )

        # 5. Nettoyer les fichiers temporaires
        if audio_path.exists():
            audio_path.unlink()

        # 6. Parser et valider la réponse
        try:
            result_json = json.loads(response.text)
            # Une astuce pour l'identification visuelle : Gemini ne peut pas "cropper" les visages.
            # Donc, on va utiliser la miniature entière pour chaque locuteur identifié.
            # Le prompt demande une description, mais nous allons simplement renvoyer l'image.
            speaker_images_from_model = result_json.get("speaker_images", {})
            final_speaker_images = {}
            if image_part:
                for speaker in speaker_images_from_model.keys():
                    final_speaker_images[speaker] = image_base64

            return DiarizationResponse(
                diarization=result_json.get("diarization", []),
                speaker_images=final_speaker_images
            )
        except (json.JSONDecodeError, KeyError) as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to parse the JSON response from the AI. Error: {e}. Raw response: {response.text}"
            )

    except Exception as e:
        # Nettoyage en cas d'erreur
        if audio_path.exists():
            audio_path.unlink()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# Commande pour lancer le serveur localement :
# uvicorn server.main:app --reload
