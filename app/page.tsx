'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, Trash2, Sun, Moon, HelpCircle } from 'lucide-react';

// API local - Replicate backend

type FileStatus = 'uploading' | 'processing' | 'completed' | 'error';

interface UploadedFile {
  id: string;
  name: string;
  uploadProgress: number;
  processProgress: number;
  status: FileStatus;
  date: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processedFiles, setProcessedFiles] = useState<any[]>([]);
  const [selectedUploadedFiles, setSelectedUploadedFiles] = useState<string[]>([]);
  const [selectedProcessedFiles, setSelectedProcessedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('es');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [summaryType, setSummaryType] = useState<'short' | 'detailed'>('detailed');
  const [speakerHints, setSpeakerHints] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    setLoading(false);
    loadProcessedFiles();
  }, [router]);

  const loadProcessedFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcessedFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileId = Date.now().toString();
    const newFile: UploadedFile = {
      id: fileId,
      name: file.name,
      uploadProgress: 0,
      processProgress: 0,
      status: 'uploading',
      date: new Date().toISOString()
    };
    
    setUploadedFiles(prev => [...prev, newFile]);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Sesión expirada');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const xhr = new XMLHttpRequest();
      
      // Progreso de subida
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, uploadProgress: progress } : f
          ));
        }
      });
      
      // Enviar a Replicate API
      const result = await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Error al procesar'));
          }
        });
        
        xhr.addEventListener('error', () => reject(new Error('Error de conexión')));
        xhr.open('POST', '/api/process');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
      
      // Cambiar a procesando
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'processing', uploadProgress: 100 } : f
      ));
      
      // Simular progreso de procesamiento (el backend ya terminó pero mostramos progreso visual)
      let processProgress = 0;
      const processInterval = setInterval(() => {
        processProgress += 20;
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, processProgress: Math.min(processProgress, 100) } : f
        ));
        
        if (processProgress >= 100) {
          clearInterval(processInterval);
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, status: 'completed', processProgress: 100 } : f
          ));
          loadProcessedFiles();
        }
      }, 300);
      
    } catch (err: any) {
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error' } : f
      ));
      setError(err.message);
    }
  };
