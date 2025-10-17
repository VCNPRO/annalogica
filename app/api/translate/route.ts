import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth';
import { TranscriptionJobDB } from '@/lib/db';

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

    // Use AssemblyAI LeMUR for translation (similar to how we do summaries)
    const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!assemblyApiKey) {
      throw new Error('ASSEMBLYAI_API_KEY not configured');
    }

    // Use LeMUR to translate the text
    const lemurResponse = await fetch('https://api.assemblyai.com/lemur/v3/generate/task', {
      method: 'POST',
      headers: {
        'Authorization': assemblyApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: `Translate the following text to ${getLanguageName(targetLanguage)}. Provide only the translation, without any additional commentary:\n\n${originalText}`,
        context: 'This is a transcription that needs to be translated accurately.',
        final_model: 'claude-3-5-sonnet'
      })
    });

    if (!lemurResponse.ok) {
      const errorData = await lemurResponse.json();
      console.error('LeMUR translation error:', errorData);
      throw new Error('Error al traducir con AssemblyAI LeMUR');
    }

    const lemurData = await lemurResponse.json();
    const translatedText = lemurData.response;

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
