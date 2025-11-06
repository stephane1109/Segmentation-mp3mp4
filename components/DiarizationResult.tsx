
import React from 'react';
import { DiarizationEntry } from '../types';
import { ExportIcon, MusicIcon } from './icons';

interface DiarizationResultProps {
  result: DiarizationEntry[];
  fileName: string;
  speakerCount: number;
  useStarFormat: boolean;
  speakerImages?: { [key: string]: string };
}

const speakerColors: { [key: string]: string } = {
  'Locuteur A': 'bg-blue-900/50 border-blue-700',
  '*Locuteur_A': 'bg-blue-900/50 border-blue-700',
  'Locuteur B': 'bg-purple-900/50 border-purple-700',
  '*Locuteur_B': 'bg-purple-900/50 border-purple-700',
  'Locuteur C': 'bg-green-900/50 border-green-700',
  '*Locuteur_C': 'bg-green-900/50 border-green-700',
  'Locuteur D': 'bg-indigo-900/50 border-indigo-700',
  '*Locuteur_D': 'bg-indigo-900/50 border-indigo-700',
};

const defaultColor = 'bg-gray-700/50 border-gray-600';

const DiarizationResult: React.FC<DiarizationResultProps> = ({ result, fileName, speakerCount, useStarFormat, speakerImages = {} }) => {
  const getBaseSpeaker = (speaker: string) => {
    return useStarFormat ? speaker.replace(/^\*/, '').replace(/_/g, ' ') : speaker;
  };

  const getSpeakerColor = (speaker: string) => {
    const baseSpeaker = getBaseSpeaker(speaker);
    return speakerColors[baseSpeaker] || defaultColor;
  };

  const handleExport = () => {
    const header = `Résultat de la Segmentation pour : ${fileName}\n`;
    const stats = `Nombre de locuteurs détectés : ${speakerCount}\n\n`;
    const content = result
      .map(entry => {
        const prefix = useStarFormat ? '\n' : '';
        return `${prefix}[${entry.timestamp}] ${entry.speaker}:\n${entry.text}`;
      })
      .join('\n');
    
    const fullText = header + stats + content;

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeFileName = fileName.replace(/\.[^/.]+$/, "");
    link.download = `${safeFileName}-segmentation.txt`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-900/50 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div>
            <h2 className="text-lg font-bold text-white">Résultat de la Segmentation</h2>
            <p className="text-sm text-gray-400 truncate max-w-xs sm:max-w-md md:max-w-full">Source : {fileName} | <span className="font-semibold">{speakerCount} locuteur(s) détecté(s)</span></p>
        </div>
        <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 transition-colors duration-300"
            aria-label="Exporter le résultat au format texte"
        >
            <ExportIcon className="w-5 h-5" />
            Exporter
        </button>
      </div>
      <div className="p-4 md:p-6 space-y-4 h-[60vh] overflow-y-auto">
        {result.map((entry, index) => {
          const speakerImage = speakerImages[entry.speaker] || speakerImages[getBaseSpeaker(entry.speaker)];
          return (
            <div key={index} className={`flex items-start gap-3 sm:gap-4 ${useStarFormat ? 'mt-3' : ''}`}>
               <div className="flex-shrink-0 w-24 text-right font-mono text-sm text-gray-400 pt-2">
                  [{entry.timestamp}]
              </div>
              <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {speakerImage ? (
                      <img src={`data:image/jpeg;base64,${speakerImage}`} alt={entry.speaker} className="w-full h-full object-cover" />
                    ) : (
                      <MusicIcon className="w-5 h-5 text-gray-400"/>
                    )}
                  </div>
              </div>
              <div className={`relative w-full p-3 rounded-lg border ${getSpeakerColor(entry.speaker)}`}>
                 <div className="font-semibold text-white mb-1">{getBaseSpeaker(entry.speaker)}</div>
                <p className="text-gray-300 whitespace-pre-wrap">{entry.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiarizationResult;
