import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { put } from '@vercel/blob';
import { verifyRequestAuth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const maxDuration = 300; // 5 minutes

/**
 * POST /api/text-to-speech
 *
 * Genera audio narrado a partir de texto usando OpenAI TTS
 */
export async function POST(request: NextRequest) {
  try {
    const auth = verifyRequestAuth(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key no configurada' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      text,
      voice = 'alloy', // alloy, echo, fable, onyx, nova, shimmer
      model = 'tts-1', // tts-1 (rápido) o tts-1-hd (calidad)
      jobId, // ID del job asociado (opcional)
      filename = 'audio-narrado' // Nombre del archivo
    } = body;

    // Validar campos requeridos
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Campo "text" es requerido y debe ser string' },
        { status: 400 }
      );
    }

    // Validar longitud del texto (OpenAI tiene límite de 4096 caracteres por request)
    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'El texto excede el límite de 4096 caracteres. Por favor, divide el texto en partes más pequeñas.' },
        { status: 400 }
      );
    }

    // Validar voz
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validVoices.includes(voice)) {
      return NextResponse.json(
        { error: `Voz inválida. Opciones: ${validVoices.join(', ')}` },
        { status: 400 }
      );
    }

    // Validar modelo
    const validModels = ['tts-1', 'tts-1-hd'];
    if (!validModels.includes(model)) {
      return NextResponse.json(
        { error: `Modelo inválido. Opciones: ${validModels.join(', ')}` },
        { status: 400 }
      );
    }

    console.log('[TTS] Generating audio:', {
      userId: auth.userId,
      textLength: text.length,
      voice,
      model,
      jobId
    });

    // Generar audio con OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: model as 'tts-1' | 'tts-1-hd',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      response_format: 'mp3',
      speed: 1.0 // Velocidad normal (0.25 - 4.0)
    });

    // Convertir respuesta a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log('[TTS] Audio generated:', {
      sizeBytes: buffer.length,
      sizeMB: (buffer.length / 1024 / 1024).toFixed(2)
    });

    // Subir a Vercel Blob
    const timestamp = Date.now();
    const audioFilename = `tts/${timestamp}-${filename}.mp3`;

    const blob = await put(audioFilename, buffer, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: true
    });

    console.log('[TTS] Audio uploaded to Blob:', blob.url);

    // Si hay jobId, actualizar el job con la URL del audio
    if (jobId) {
      try {
        await sql`
          UPDATE transcription_jobs
          SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{ttsUrl}',
            to_jsonb(${blob.url}::text)
          )
          WHERE id = ${jobId}
        `;
        console.log('[TTS] Job updated with TTS URL:', jobId);
      } catch (updateError) {
        console.error('[TTS] Failed to update job (non-fatal):', updateError);
        // No fallar la request si falla la actualización
      }
    }

    // Registrar uso para analytics (caracteres procesados)
    try {
      await sql`
        INSERT INTO ai_usage_log (
          user_id,
          service,
          model,
          input_tokens,
          output_tokens,
          cost_usd,
          metadata
        ) VALUES (
          ${auth.userId},
          'openai-tts',
          ${model},
          ${text.length}, -- Caracteres como "input tokens"
          0, -- TTS no tiene output tokens
          ${calculateTTSCost(text.length, model)},
          ${JSON.stringify({ voice, textLength: text.length, audioSize: buffer.length })}
        )
      `;
    } catch (logError) {
      console.error('[TTS] Failed to log usage (non-fatal):', logError);
    }

    return NextResponse.json({
      success: true,
      audioUrl: blob.url,
      audioSize: buffer.length,
      audioSizeMB: (buffer.length / 1024 / 1024).toFixed(2),
      textLength: text.length,
      voice,
      model
    });

  } catch (error: any) {
    console.error('[TTS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error generando audio' },
      { status: 500 }
    );
  }
}

/**
 * Calcular costo de TTS
 * tts-1: $15 por 1M caracteres
 * tts-1-hd: $30 por 1M caracteres
 */
function calculateTTSCost(characters: number, model: string): number {
  const pricePerMillionChars = model === 'tts-1-hd' ? 30 : 15;
  return (characters / 1_000_000) * pricePerMillionChars;
}
