'use client';

interface ActionsPanelProps {
  darkMode: boolean;
  language: string;
  targetLanguage: string;
  summaryType: 'short' | 'detailed';
  canTranscribe: boolean;
  onLanguageChange: (language: string) => void;
  onTargetLanguageChange: (language: string) => void;
  onSummaryTypeChange: (type: 'short' | 'detailed') => void;
  onApplyAction: (actionName: string) => void;
  onProcessClick: () => void;
}

export default function ActionsPanel({
  darkMode,
  language,
  targetLanguage,
  summaryType,
  canTranscribe,
  onLanguageChange,
  onTargetLanguageChange,
  onSummaryTypeChange,
  onApplyAction,
  onProcessClick,
}: ActionsPanelProps) {
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-orange-500 text-sm">🤖</span>
        <h2 className={`text-sm font-medium ${textPrimary}`}>Acciones IA</h2>
      </div>
      <p className={`text-xs ${textSecondary} mb-3`}>Selecciona archivos y aplica una acción de IA.</p>

      <div className="space-y-3">
        {/* Language Selection */}
        <div>
          <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Idioma del Contenido</label>
          <select
            className={`w-full p-2 border ${border} ${bgSecondary} ${textPrimary} rounded-md text-xs focus:ring-2 focus:ring-orange-500`}
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            <option value="auto">Detección automática</option>
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="ca">Català</option>
          </select>
        </div>

        {/* Transcribe + Process */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onApplyAction('Transcribir')}
            className={`p-2 ${canTranscribe ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed'} text-white rounded-lg text-xs font-medium transition-colors`}
            disabled={!canTranscribe}
          >
            📝 Transcribir
          </button>
          <button
            onClick={onProcessClick}
            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            🚀 Procesar Archivos
          </button>
        </div>

        {/* Summarize */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onApplyAction('Resumir')}
            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            📋 Resumir
          </button>
          <div className="flex items-center justify-around gap-1 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                className="accent-orange-500 scale-75"
                name="summary"
                checked={summaryType === 'short'}
                onChange={() => onSummaryTypeChange('short')}
              />
              <span className={textSecondary}>Corto</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                className="accent-orange-500 scale-75"
                name="summary"
                checked={summaryType === 'detailed'}
                onChange={() => onSummaryTypeChange('detailed')}
              />
              <span className={textSecondary}>Detallado</span>
            </label>
          </div>
        </div>

        {/* SRT and VTT */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onApplyAction('SRT')}
            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            📄 Generar SRT
          </button>
          <button
            onClick={() => onApplyAction('VTT')}
            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            📄 Generar VTT
          </button>
        </div>

        {/* Speakers and Tags */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onApplyAction('Oradores')}
            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            🎙️ Detectar Oradores
          </button>
          <button
            onClick={() => onApplyAction('Aplicar Tags')}
            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            🏷️ Aplicar Tags
          </button>
        </div>

        {/* Translate */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onApplyAction('Traducir')}
            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            🌐 Traducir
          </button>
          <select
            className={`p-2 border ${border} ${bgSecondary} ${textPrimary} rounded-md text-xs focus:ring-2 focus:ring-orange-500`}
            value={targetLanguage}
            onChange={(e) => onTargetLanguageChange(e.target.value)}
          >
            <option value="en">Inglés</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="ca">Català</option>
          </select>
        </div>
      </div>
    </div>
  );
}
