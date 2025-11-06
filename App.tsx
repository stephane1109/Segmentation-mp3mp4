
import React, { useState, useCallback, useMemo } from 'react';
import { DiarizationEntry, DiarizationResponse } from './types';
import { processAudioFile } from './services/geminiService';
import FileUpload from './components/FileUpload';
import Loader from './components/Loader';
import DiarizationResult from './components/DiarizationResult';
import { ResetIcon } from './components/icons';
import ApiKeyInput from './components/ApiKeyInput';

type ProcessingMode = 'file' | 'youtube';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [useStarFormat, setUseStarFormat] = useState<boolean>(true);
  
  const [mode, setMode] = useState<ProcessingMode>('file');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [diarizationResult, setDiarizationResult] = useState<DiarizationEntry[] | null>(null);
  const [speakerImages, setSpeakerImages] = useState<{ [key: string]: string }>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const isApiKeySet = apiKey.trim() !== '';

  const formatResult = useCallback((result: DiarizationEntry[]) => {
    return result.map(entry => ({
      ...entry,
      speaker: useStarFormat 
        ? `*${entry.speaker.replace(/ /g, '_')}` 
        : entry.speaker,
    }));
  }, [useStarFormat]);

  const resetState = () => {
    setFileName('');
    setDiarizationResult(null);
    setSpeakerImages({});
    setIsLoading(false);
    setError(null);
    setLoadingMessage('');
    setYoutubeUrl('');
  };
  
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!isApiKeySet) {
      setError("Veuillez d'abord fournir une clé API Gemini.");
      return;
    }
    resetState();
    setFileName(selectedFile.name);
    setIsLoading(true);
    setLoadingMessage('Analyse audio en cours... (cela peut prendre un moment)');

    try {
      const result = await processAudioFile(selectedFile, apiKey, selectedModel);
      setDiarizationResult(formatResult(result));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [apiKey, isApiKeySet, selectedModel, formatResult]);

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isApiKeySet) {
          setError("Veuillez d'abord fournir une clé API Gemini.");
          return;
      }
      if (!youtubeUrl) {
          setError("Veuillez entrer une URL YouTube valide.");
          return;
      }
      resetState();
      setIsLoading(true);
      setLoadingMessage('Traitement de la vidéo YouTube... Cette opération peut prendre plusieurs minutes.');
      
      try {
          // IMPORTANT: Mettez ici l'URL de votre backend déployé sur Cloud Run
          const backendUrl = 'http://127.0.0.1:8000/process-youtube-url';

          const response = await fetch(backendUrl, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  url: youtubeUrl,
                  api_key: apiKey,
                  model: selectedModel,
              }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || `Erreur du serveur: ${response.statusText}`);
          }

          const data: DiarizationResponse = await response.json();
          setFileName(`Vidéo YouTube : ${youtubeUrl}`);
          setDiarizationResult(formatResult(data.diarization));
          setSpeakerImages(data.speaker_images);

      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';
          setError(errorMessage);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  };
  
  const speakerCount = useMemo(() => {
    if (!diarizationResult) return 0;
    const speakers = new Set(diarizationResult.map(entry => entry.speaker));
    return speakers.size;
  }, [diarizationResult]);
  
  const renderContent = () => {
    if (isLoading) {
      return <Loader message={loadingMessage} />;
    }
    if (error) {
      return (
        <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg w-full max-w-2xl">
          <p className="font-bold">Erreur</p>
          <p className="text-sm break-words">{error}</p>
        </div>
      );
    }
    if (diarizationResult) {
      return <DiarizationResult result={diarizationResult} fileName={fileName} speakerCount={speakerCount} useStarFormat={useStarFormat} speakerImages={speakerImages} />;
    }

    // Main input UI
    return (
      <div className="w-full max-w-2xl">
        <div className="flex justify-center border-b border-gray-700 mb-6">
            <button onClick={() => setMode('file')} className={`px-6 py-3 font-semibold transition-colors duration-200 ${mode === 'file' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>Fichier MP3</button>
            <button onClick={() => setMode('youtube')} className={`px-6 py-3 font-semibold transition-colors duration-200 ${mode === 'youtube' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>URL YouTube</button>
        </div>
        
        {mode === 'file' && <FileUpload onFileSelect={handleFileSelect} isLoading={!isApiKeySet} />}
        
        {mode === 'youtube' && (
          <form onSubmit={handleYoutubeSubmit} className="space-y-4">
              <input 
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="block w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-200"
                  disabled={!isApiKeySet}
              />
              <button 
                  type="submit"
                  disabled={!isApiKeySet}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  Analyser la vidéo
              </button>
              {!isApiKeySet && <p className="text-center text-sm text-yellow-400">Veuillez d'abord fournir une clé API.</p>}
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Segmentation Audio par IA
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          Analysez un fichier MP3 ou une vidéo YouTube pour identifier et transcrire chaque locuteur.
        </p>
      </div>
      
      {!diarizationResult && (
        <div className="w-full max-w-2xl mb-8 p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
          <h2 className="text-xl font-bold mb-4 text-center">Configuration</h2>
          <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Choix du Modèle IA
            </label>
            <fieldset className="space-y-3 rounded-md bg-gray-900 p-4 border border-gray-600">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="flash-model"
                    type="radio"
                    value="gemini-2.5-flash"
                    checked={selectedModel === 'gemini-2.5-flash'}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-500 bg-gray-700"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="flash-model" className="font-bold text-white cursor-pointer">
                    Gemini 2.5 Flash
                  </label>
                  <p className="text-gray-400">Le plus rapide. Idéal pour les sources claires.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="pro-model"
                    type="radio"
                    value="gemini-2.5-pro"
                    checked={selectedModel === 'gemini-2.5-pro'}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-500 bg-gray-700"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="pro-model" className="font-bold text-white cursor-pointer">
                    Gemini 2.5 Pro
                  </label>
                  <p className="text-gray-400">Précision maximale. Traitement plus long.</p>
                </div>
              </div>
            </fieldset>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <input
              type="checkbox"
              id="star-format"
              checked={useStarFormat}
              onChange={(e) => setUseStarFormat(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-gray-700"
            />
            <label htmlFor="star-format" className="ml-2 block text-sm text-gray-300">
              Formater le nom du locuteur (ex: *Locuteur_A)
            </label>
          </div>
        </div>
      )}

      <main className="w-full max-w-4xl flex-grow flex items-center justify-center">
        {renderContent()}
      </main>

      {(diarizationResult || error) && !isLoading && (
        <footer className="mt-8">
          <button
            onClick={resetState}
            className="flex items-center gap-2 px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors duration-300"
          >
            <ResetIcon className="w-5 h-5" />
            Analyser une autre source
          </button>
        </footer>
      )}
    </div>
  );
};

export default App;
