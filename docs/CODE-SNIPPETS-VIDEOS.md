# 💻 Code Snippets - Solución Videos Grandes

Código listo para copiar y pegar.

---

## 1. Instalación

```bash
# Instalar FFmpeg.wasm
npm install @ffmpeg/ffmpeg @ffmpeg/util

# TypeScript types
npm install --save-dev @types/node
```

---

## 2. Constantes

```typescript
// constants/video-processing.ts

export const VIDEO_PROCESSING = {
  MAX_VIDEO_SIZE_MB: 200,
  MAX_VIDEO_SIZE_BYTES: 200 * 1024 * 1024,
  AUDIO_SIZE_RATIO: 0.04, // Audio = ~4% del video
  RECOMMENDED_AUDIO_BITRATE: '128k',
  AUDIO_FORMATS: ['m4a', 'mp3', 'aac'] as const,
} as const;

export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo'
] as const;
```

---

## 3. Utility Functions

```typescript
// lib/utils/video.ts

export function isLargeVideo(file: File): boolean {
  return (
    file.type.startsWith('video/') &&
    file.size > 200 * 1024 * 1024
  );
}

export function estimateAudioSize(videoSize: number): number {
  return Math.round(videoSize * 0.04); // Audio = 4% del video
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function replaceExtension(filename: string, newExt: string): string {
  return filename.replace(/\.[^.]+$/, `.${newExt}`);
}
```

---

## 4. Types

```typescript
// types/video-extraction.ts

export interface VideoInfo {
  file: File;
  name: string;
  size: number;
  sizeGB: number;
  estimatedAudioSize: number;
  estimatedAudioSizeMB: number;
}

export type ExtractionMethod = 'auto' | 'manual' | 'already_extracted';

export type ExtractionStatus =
  | 'idle'
  | 'loading'
  | 'processing'
  | 'complete'
  | 'error';

export interface ExtractionProgress {
  status: ExtractionStatus;
  progress: number; // 0-100
  message?: string;
  error?: string;
}
```

---

## 5. Analytics Tracking

```typescript
// lib/analytics/video-extraction.ts

interface VideoExtractionEvent {
  action:
    | 'video_detected'
    | 'option_selected'
    | 'extraction_started'
    | 'extraction_completed'
    | 'extraction_failed'
    | 'guide_opened'
    | 'upload_completed';
  method?: ExtractionMethod;
  videoSize?: number;
  audioSize?: number;
  duration?: number;
  error?: string;
  browser?: string;
}

export function trackVideoExtraction(event: VideoExtractionEvent) {
  console.log('[Analytics] Video Extraction:', event);

  // Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.action, {
      event_category: 'video_extraction',
      event_label: event.method,
      value: event.videoSize,
      custom_dimension_1: event.browser,
    });
  }

  // Tu backend analytics
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'video_extraction',
      ...event,
      timestamp: new Date().toISOString(),
    }),
  }).catch(console.error);
}
```

---

## 6. Hooks Útiles

```typescript
// hooks/useFFmpeg.ts

import { useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    if (isLoaded || isLoading) return;

    setIsLoading(true);
    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const extractAudio = async (
    videoFile: File,
    options: {
      bitrate?: string;
      format?: 'mp3' | 'm4a' | 'aac';
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<File> => {
    const { bitrate = '128k', format = 'm4a', onProgress } = options;

    if (!ffmpegRef.current || !isLoaded) {
      await load();
    }

    const ffmpeg = ffmpegRef.current!;

    // Progress tracking
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    // Write input file
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

    // Extract audio
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vn',
      '-acodec', format === 'mp3' ? 'libmp3lame' : 'aac',
      '-b:a', bitrate,
      '-f', format,
      `output.${format}`
    ]);

    // Read output
    const data = await ffmpeg.readFile(`output.${format}`);
    const blob = new Blob([data], { type: `audio/${format}` });
    const fileName = videoFile.name.replace(/\.[^.]+$/, `.${format}`);

    return new File([blob], fileName, { type: `audio/${format}` });
  };

  const terminate = () => {
    if (ffmpegRef.current) {
      ffmpegRef.current.terminate();
      ffmpegRef.current = null;
      setIsLoaded(false);
    }
  };

  return {
    isLoaded,
    isLoading,
    load,
    extractAudio,
    terminate,
  };
}
```

```typescript
// hooks/useVideoDetection.ts

import { useState, useCallback } from 'react';
import { isLargeVideo, estimateAudioSize } from '@/lib/utils/video';
import type { VideoInfo } from '@/types/video-extraction';

export function useVideoDetection() {
  const [detectedVideo, setDetectedVideo] = useState<VideoInfo | null>(null);

  const checkFile = useCallback((file: File): VideoInfo | null => {
    if (!isLargeVideo(file)) return null;

    const videoInfo: VideoInfo = {
      file,
      name: file.name,
      size: file.size,
      sizeGB: parseFloat((file.size / 1024 / 1024 / 1024).toFixed(2)),
      estimatedAudioSize: estimateAudioSize(file.size),
      estimatedAudioSizeMB: Math.round(estimateAudioSize(file.size) / 1024 / 1024),
    };

    setDetectedVideo(videoInfo);
    return videoInfo;
  }, []);

  const reset = useCallback(() => {
    setDetectedVideo(null);
  }, []);

  return {
    detectedVideo,
    checkFile,
    reset,
  };
}
```

---

## 7. API Endpoint (opcional)

```typescript
// app/api/analytics/video-extraction/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Guardar evento en BD para analytics
    await sql`
      INSERT INTO video_extraction_events (
        action,
        method,
        video_size,
        audio_size,
        duration_seconds,
        error_message,
        browser,
        user_agent,
        created_at
      ) VALUES (
        ${data.action},
        ${data.method},
        ${data.videoSize},
        ${data.audioSize},
        ${data.duration},
        ${data.error},
        ${data.browser},
        ${request.headers.get('user-agent')},
        NOW()
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking video extraction:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

---

## 8. Database Schema (opcional)

```sql
-- migrations/add_video_extraction_events.sql

CREATE TABLE IF NOT EXISTS video_extraction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  method VARCHAR(30),
  video_size BIGINT,
  audio_size BIGINT,
  duration_seconds INTEGER,
  error_message TEXT,
  browser VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_extraction_events_action ON video_extraction_events(action);
CREATE INDEX idx_video_extraction_events_created_at ON video_extraction_events(created_at DESC);
CREATE INDEX idx_video_extraction_events_user_id ON video_extraction_events(user_id);

-- Vista para analytics
CREATE OR REPLACE VIEW video_extraction_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE action = 'video_detected') as videos_detected,
  COUNT(*) FILTER (WHERE action = 'option_selected' AND method = 'auto') as auto_selected,
  COUNT(*) FILTER (WHERE action = 'option_selected' AND method = 'manual') as manual_selected,
  COUNT(*) FILTER (WHERE action = 'extraction_completed') as successful_extractions,
  COUNT(*) FILTER (WHERE action = 'extraction_failed') as failed_extractions,
  AVG(duration_seconds) FILTER (WHERE action = 'extraction_completed') as avg_extraction_duration,
  SUM(video_size - audio_size) FILTER (WHERE action = 'upload_completed') as bandwidth_saved_bytes
FROM video_extraction_events
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 9. Configuración Tailwind (para componentes)

```javascript
// tailwind.config.js - Añadir utilities

module.exports = {
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'progress': 'progress 1s ease-in-out',
      },
      keyframes: {
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}
```

---

## 10. Componente de Badge Reutilizable

```typescript
// components/ui/Badge.tsx

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium';

  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
}
```

---

## 11. Ejemplo de Test

```typescript
// __tests__/video-extraction.test.ts

import { describe, it, expect, vi } from 'vitest';
import { isLargeVideo, estimateAudioSize, formatFileSize } from '@/lib/utils/video';

describe('Video Utils', () => {
  it('should detect large videos', () => {
    const smallVideo = new File([''], 'small.mp4', {
      type: 'video/mp4',
    });
    Object.defineProperty(smallVideo, 'size', { value: 100 * 1024 * 1024 }); // 100 MB

    const largeVideo = new File([''], 'large.mp4', {
      type: 'video/mp4',
    });
    Object.defineProperty(largeVideo, 'size', { value: 500 * 1024 * 1024 }); // 500 MB

    expect(isLargeVideo(smallVideo)).toBe(false);
    expect(isLargeVideo(largeVideo)).toBe(true);
  });

  it('should estimate audio size correctly', () => {
    const videoSize = 1024 * 1024 * 1024; // 1 GB
    const audioSize = estimateAudioSize(videoSize);

    // Audio should be ~4% of video
    expect(audioSize).toBeCloseTo(videoSize * 0.04, -5);
  });

  it('should format file sizes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.00 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
  });
});
```

---

## 12. Variables de Entorno

```bash
# .env.local

# Analytics (opcional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
ANALYTICS_ENABLED=true

# Feature flags
NEXT_PUBLIC_ENABLE_AUTO_EXTRACTION=true
NEXT_PUBLIC_MAX_VIDEO_SIZE_MB=200

# FFmpeg CDN (por si quieres self-host)
NEXT_PUBLIC_FFMPEG_CORE_URL=https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd
```

---

## 13. Package.json Scripts

```json
{
  "scripts": {
    "test:video": "vitest run __tests__/video-extraction.test.ts",
    "analyze:bundle": "ANALYZE=true next build",
    "check:ffmpeg": "node scripts/check-ffmpeg-support.js"
  }
}
```

---

## 14. Script de Verificación

```javascript
// scripts/check-ffmpeg-support.js

const https = require('https');

const FFMPEG_CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js';

console.log('Verificando disponibilidad de FFmpeg.wasm...\n');

https.get(FFMPEG_CORE_URL, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ FFmpeg.wasm CDN accesible');
    console.log(`   URL: ${FFMPEG_CORE_URL}`);
    console.log(`   Status: ${res.statusCode}`);
  } else {
    console.log('❌ Error accediendo FFmpeg.wasm CDN');
    console.log(`   Status: ${res.statusCode}`);
  }
}).on('error', (error) => {
  console.log('❌ Error de red:', error.message);
});
```

---

## 15. Configuración VSCode (recomendada)

```json
// .vscode/settings.json

{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

**Todos los snippets listos para usar** ✅

Copia y pega según necesites durante la implementación.
