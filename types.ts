export interface DiarizationEntry {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface DiarizationResponse {
  diarization: DiarizationEntry[];
  speaker_images: { [key: string]: string }; // Dictionnaire d'images de locuteurs encodées en base64
}
