import { useState } from 'react';

const API_URL = 'https://wri2uro216.execute-api.eu-west-1.amazonaws.com/prod';

export function useFileProcessing() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File, options: any) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Debes iniciar sesión para subir archivos');
      }

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filename: file.name })
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || 'Error al obtener URL de subida');
      }

      const { uploadUrl, fields } = await uploadResponse.json();

      // Usar FormData para POST con campos
      const formData = new FormData();
      Object.keys(fields).forEach(key => {
        formData.append(key, fields[key]);
      });
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress((e.loaded / e.total) * 100);
        }
      });

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error('Error al subir archivo'));
          }
        });
        
        xhr.addEventListener('error', () => reject(new Error('Error de red')));
        xhr.open('POST', uploadUrl);
        xhr.send(formData);
      });

      console.log('Archivo subido correctamente');

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, progress, error, processFile };
}
