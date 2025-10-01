const API_BASE_URL = 'https://wri2uro216.execute-api.eu-west-1.amazonaws.com/prod';

export interface UploadResponse {
  uploadUrl: string;
  key: string;
  fileName: string;
  message: string;
}

export interface ProcessingOptions {
  summary?: boolean;
  summaryType?: 'short' | 'detailed';
  tags?: boolean;
  speakers?: boolean;
  outputFormat?: 'txt' | 'pdf' | 'srt';
}

export class AnnaLogicaAPI {
  async getUploadUrl(fileName: string, fileType: string, options: ProcessingOptions = {}): Promise<UploadResponse> {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, fileType, options })
    });
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);
    return await response.json();
  }
  
  async uploadFile(uploadUrl: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Configurar timeout más largo para archivos grandes
      xhr.timeout = 300000; // 5 minutos
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress((e.loaded / e.total) * 100);
          }
        });
      }
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        }
      });
      
      xhr.addEventListener('error', (e) => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout - archivo demasiado grande o conexión lenta'));
      });
      
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      
      // No usar chunked encoding, enviar el archivo completo
      xhr.send(file);
    });
  }
  
  async processFile(file: File, options: ProcessingOptions, onProgress?: (percent: number) => void) {
    const { uploadUrl, key, fileName } = await this.getUploadUrl(file.name, file.type, options);
    await this.uploadFile(uploadUrl, file, onProgress);
    return { key, fileName };
  }

  async listFiles(prefix = 'outputs/') {
    const response = await fetch(`${API_BASE_URL}/files?prefix=${prefix}`);
    if (!response.ok) throw new Error('Error listando archivos');
    return await response.json();
  }

  async getDownloadUrl(key: string) {
    const response = await fetch(`${API_BASE_URL}/files?download=true&key=${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error('Error obteniendo descarga');
    return await response.json();
  }
}

export default new AnnaLogicaAPI();
