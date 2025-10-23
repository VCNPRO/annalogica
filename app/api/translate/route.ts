import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';
import OpenAI from 'openai';

// Inicialización segura de OpenAI
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRequestAuth(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { jobId, targetLanguage } = await request.json();

    if (!jobId || !targetLanguage) {
      return NextResponse.json(
        { error: 'Faltan parámetros: jobId y targetLanguage son requeridos' },
        { status: 400 }
      );
    }

    // Get the job details
    const job = await TranscriptionJobDB.findById(jobId);

    if (!job || job.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Trabajo no encontrado o no autorizado' },
        { status: 404 }
      );
    }

    // Get the transcription text
    if (!job.txt_url) {
      return NextResponse.json(
        { error: 'Este archivo no tiene transcripción disponible' },
        { status: 400 }
      );
    }

    // Fetch the transcription text from the blob
    const txtResponse = await fetch(job.txt_url);
    if (!txtResponse.ok) {
      throw new Error('Error al obtener la transcripción');
    }
    const originalText = await txtResponse.text();

    // Verificar que OpenAI esté configurado
    if (!openai) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Usar GPT-4o para traducir el texto
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un traductor profesional. Traduce el texto de manera precisa y natural, manteniendo el tono y contexto original. Proporciona SOLO la traducción, sin comentarios adicionales."
        },
        {
          role: "user",
          content: `Traduce el siguiente texto a ${getLanguageName(targetLanguage)}:\n\n${originalText}`
        }
      ],
      temperature: 0.3, // Más determinístico para traducciones
    });

    const translatedText = completion.choices[0].message.content || '';

    return NextResponse.json({
      success: true,
      translatedText,
      targetLanguage
    });

  } catch (error) {
    console.error('Error translating transcription:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al traducir' },
      { status: 500 }
    );
  }
}

// Helper function to get language name
function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'ca': 'Catalan',
    'eu': 'Basque',
    'gl': 'Galician',
    'pt': 'Portuguese',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'ru': 'Russian'
  };
  return languages[code] || code;
}
