'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, HelpCircle, LogOut } from 'lucide-react';
import QuotaExceededModal from '@/components/QuotaExceededModal';
import FileUploadZone from '@/components/FileUploadZone';
import ActionsPanel from '@/components/ActionsPanel';
import FileListTable from '@/components/FileListTable';
import CompletedFilesTable from '@/components/CompletedFilesTable';
import {
  useAuth,
  useSubscription,
  useFileUpload,
  useJobPolling,
  useFileProcessing,
  useTimer,
} from '@/hooks';
import type { UploadedFile } from '@/types/file';

export default function Dashboard() {
  const router = useRouter();

  // Auth & Subscription
  const { user, loading: authLoading, logout } = useAuth();
  const { subscription, refresh: refreshSubscription } = useSubscription(!!user);

  // File Management
  const {
    files: uploadedFiles,
    uploading,
    error: uploadError,
    uploadFiles,
    removeFile,
    clearFiles,
    updateFile,
  } = useFileUpload();

  const {
    selectedFileIds,
    selectFile,
    selectAll,
    deselectAll,
    applyAction,
    processFiles,
  } = useFileProcessing();

  // Job Polling
  useJobPolling({
    files: uploadedFiles,
    onUpdate: updateFile,
    enabled: uploadedFiles.some(f => f.status === 'processing' || f.status === 'pending')
  });

  // Timer for elapsed time display
  const hasProcessingFiles = uploadedFiles.some(
    f => f.status === 'processing' && f.processingStartTime
  );
  useTimer({ enabled: hasProcessingFiles });

  // UI State
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('es');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [summaryType, setSummaryType] = useState<'short' | 'detailed'>('detailed');
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'pdf'>('txt');
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleApplyActionClick = (actionName: string) => {
    const updatedFiles = applyAction(uploadedFiles, actionName);
    // Update all files at once
    updatedFiles.forEach(file => {
      if (selectedFileIds.has(file.id)) {
        updateFile(file.id, { actions: file.actions });
      }
    });
  };

  const handleProcessClick = async () => {
    try {
      setProcessingError(null);
      const result = await processFiles(uploadedFiles, updateFile);

      if (result.processed > 0) {
        alert(`✅ ${result.processed} archivo(s) enviado(s) a procesamiento!`);
      } else {
        alert('⚠️ No se procesó ningún archivo.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar';

      if (errorMessage.includes('límite') || errorMessage.includes('QUOTA')) {
        setShowQuotaModal(true);
      }

      setProcessingError(errorMessage);
    }
  };

  const handleReset = () => {
    if (uploadedFiles.some(f => f.status === 'processing' || f.status === 'pending')) {
      if (confirm('Hay archivos procesándose. ¿Reiniciar de todos modos?')) {
        clearFiles();
        deselectAll();
        setProcessingError(null);
      }
    } else if (uploadedFiles.length > 0) {
      clearFiles();
      deselectAll();
      setProcessingError(null);
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    if (!file.jobId) {
      alert('No se puede descargar: archivo sin jobId');
      return;
    }

    try {
      const url = `/api/download?jobId=${file.jobId}&format=${downloadFormat}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.[^/.]+$/, '')}.${downloadFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('Error al descargar el archivo');
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  const selectedFiles = uploadedFiles.filter(file => selectedFileIds.has(file.id));
  const canTranscribe = selectedFiles.some(file => file.fileType === 'audio' || file.fileType === 'video');

  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      {/* Top Banner */}
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
        Pre-producción Beta-tester - Usuario: {user?.name || user?.email || 'Usuario'}
      </div>

      {/* Top Right Actions */}
      <div className="fixed top-16 right-6 z-40 flex items-center gap-2">
        <button
          onClick={() => alert('Guía de usuario próximamente')}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
        >
          <HelpCircle className={`h-4 w-4 ${textSecondary}`} />
        </button>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
        >
          {darkMode ? <Sun className="h-4 w-4 text-zinc-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
        </button>
        <button
          onClick={() => router.push('/settings')}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
        >
          <span className={`text-sm ${textSecondary}`}>Ajustes</span>
          <span>⚙️</span>
        </button>
        <button
          onClick={logout}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
        >
          <LogOut className={`h-4 w-4 ${textSecondary}`} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex pt-10" style={{ height: '100vh' }}>
        {/* Left Sidebar */}
        <div
          className={`${bgSecondary} ${border} border-r p-6 flex flex-col`}
          style={{ width: '33.333%', minWidth: '33.333%', maxWidth: '33.333%', height: '100%' }}
        >
          {/* Header */}
          <div className="flex flex-col mb-6">
            <div className="flex items-baseline gap-x-3">
              <h1 className="font-orbitron text-[36px] text-orange-500 font-bold">annalogica</h1>
              <span className="text-white">trabajando para</span>
            </div>
            {user && (
              <p className={`${textPrimary} -mt-1 ml-1`}>{user.name || user.email}</p>
            )}
          </div>

          {/* File Upload Zone */}
          <FileUploadZone
            darkMode={darkMode}
            uploading={uploading}
            uploadError={uploadError}
            processingError={processingError}
            onFileChange={handleFileChange}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          />

          {/* Actions Panel */}
          <ActionsPanel
            darkMode={darkMode}
            language={language}
            targetLanguage={targetLanguage}
            summaryType={summaryType}
            canTranscribe={canTranscribe}
            onLanguageChange={setLanguage}
            onTargetLanguageChange={setTargetLanguage}
            onSummaryTypeChange={setSummaryType}
            onApplyAction={handleApplyActionClick}
            onProcessClick={handleProcessClick}
          />

          {/* Footer */}
          <div className="mt-auto pt-6 text-center">
            <p className="text-xs text-zinc-500">annalogica by videoconversion digital lab, S.L.</p>
            <p className="text-xs text-zinc-500">From Barcelona with love</p>
          </div>
        </div>

        {/* Right Content - File Tables */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col" style={{ height: '100%' }}>
          <div className="mb-6" style={{ height: '28px' }}></div>

          {/* Pending/Processing Files Table */}
          <FileListTable
            files={uploadedFiles}
            selectedFileIds={selectedFileIds}
            darkMode={darkMode}
            onSelectFile={selectFile}
            onSelectAll={() => selectAll(uploadedFiles)}
            onDeselectAll={deselectAll}
            onRemoveFile={removeFile}
          />

          {/* Completed Files Table */}
          <CompletedFilesTable
            files={uploadedFiles}
            darkMode={darkMode}
            downloadFormat={downloadFormat}
            onDownloadFormatChange={setDownloadFormat}
            onDownload={handleDownload}
            onRemoveFile={removeFile}
          />
        </div>
      </div>

      {/* Quota Exceeded Modal */}
      {subscription && (
        <QuotaExceededModal
          isOpen={showQuotaModal}
          onClose={async () => {
            setShowQuotaModal(false);
            await refreshSubscription();
          }}
          type="files"
          used={subscription.filesUsed}
          total={subscription.filesTotal}
          resetDate={subscription.resetDate}
          currentPlan={subscription.plan}
        />
      )}
    </div>
  );
}
