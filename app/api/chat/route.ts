import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Función para inicializar el cliente de Gemini
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'tu_gemini_api_key_aqui' || apiKey === 'tu_api_key_aqui') {
    throw new Error('GEMINI_API_KEY no está configurada correctamente');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Guía de usuario de annalogica
const USER_GUIDE = `
# Guía de Usuario de annalogica

## ¿Qué es annalogica?
annalogica es una aplicación de transcripción de audio y video que utiliza IA para convertir archivos multimedia en texto.

## Características principales:
- Transcripción automática de archivos de audio y video
- Soporte para múltiples idiomas
- Exportación de transcripciones en diferentes formatos
- Interfaz intuitiva y fácil de usar
- Procesamiento rápido y preciso

## Cómo usar annalogica:

### 1. Subir archivos
- Haz clic en el botón "Subir archivo" o arrastra y suelta tu archivo de audio/video
- Formatos soportados: MP3, MP4, WAV, M4A, WEBM, y más
- Tamaño máximo: 200MB por archivo

### 2. Configurar la transcripción
- Selecciona el idioma del audio
- Elige las opciones de formato deseadas
- Opcionalmente, añade información de contexto para mejorar la precisión

### 3. Iniciar transcripción
- Haz clic en "Transcribir"
- El proceso puede tomar unos minutos dependiendo de la duración del archivo
- Puedes ver el progreso en tiempo real

### 4. Revisar y editar
- Una vez completada, revisa la transcripción
- Puedes editar el texto directamente si es necesario
- Usa los controles de reproducción para sincronizar audio y texto

### 5. Exportar
- Descarga tu transcripción en el formato deseado (TXT, DOCX, SRT, etc.)
- Comparte o guarda para uso posterior

## Preguntas frecuentes:

### ¿Qué idiomas están soportados?
annalogica soporta más de 50 idiomas, incluyendo español, inglés, francés, alemán, italiano, portugués, y muchos más.

### ¿Cuánto tiempo tarda la transcripción?
El tiempo de procesamiento depende de la duración del archivo. Generalmente, un archivo de 1 hora se transcribe en 5-10 minutos.

### ¿Los archivos son seguros?
Sí, todos los archivos se procesan de forma segura y se eliminan automáticamente después de 24 horas.

### ¿Puedo transcribir archivos con múltiples hablantes?
Sí, annalogica puede identificar diferentes hablantes en una conversación.

## Solución de problemas:

### El archivo no se carga
- Verifica que el formato sea compatible
- Asegúrate de que el archivo no supere los 200MB
- Intenta con una conexión a internet más estable

### La transcripción tiene errores
- Asegúrate de haber seleccionado el idioma correcto
- Verifica que la calidad del audio sea buena (sin mucho ruido de fondo)
- Proporciona contexto adicional si es un tema técnico o especializado

### La aplicación es lenta
- Verifica tu conexión a internet
- Intenta cerrar otras pestañas del navegador
- Si el problema persiste, contacta con soporte

## Contacto y soporte:
Para más ayuda, visita https://www.annalogica.eu/soporte o envía un email a soporte@annalogica.eu
`;

export async function POST(request: NextRequest) {
  try {
    // Verificar que la feature esté habilitada
    if (process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT !== 'true') {
      return NextResponse.json(
        { error: 'Asistente de IA no habilitado' },
        { status: 403 }
      );
    }

    // Verificar que la API key esté configurada
    if (!process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === 'tu_gemini_api_key_aqui' ||
        process.env.GEMINI_API_KEY === 'tu_api_key_aqui') {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY no configurada correctamente',
          message: 'Por favor, configura tu API key de Gemini en las variables de entorno. Obtén una gratis en: https://aistudio.google.com/app/apikey'
        },
        { status: 500 }
      );
    }

    const { message, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensaje inválido' },
        { status: 400 }
      );
    }

    // Inicializar cliente y crear el modelo con el contexto de la guía de usuario
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: `Eres un asistente virtual amigable y útil para annalogica, una aplicación de transcripción de audio y video.

Tu función es ayudar a los usuarios a:
- Entender cómo usar la aplicación
- Resolver problemas comunes
- Responder preguntas sobre las características
- Proporcionar guía paso a paso cuando sea necesario

Usa la siguiente guía de usuario como base de conocimiento:

${USER_GUIDE}

Instrucciones importantes:
- Sé breve, claro y directo
- Usa un tono amigable y profesional
- Si no sabes algo, admítelo y sugiere contactar con soporte
- Estructura tus respuestas con listas y secciones cuando sea apropiado
- Responde en el mismo idioma en que te pregunten (principalmente español)
- Si el usuario pregunta algo fuera del ámbito de annalogica, redirige amablemente a los temas de la aplicación`
    });

    // Convertir el historial al formato de Gemini
    const geminiHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Iniciar chat con historial
    const chat = model.startChat({
      history: geminiHistory
    });

    // Enviar mensaje y obtener respuesta
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({
      message: text,
      role: 'assistant'
    });

  } catch (error: any) {
    console.error('Error en chat API:', error);

    // Mensajes de error más específicos
    let errorMessage = 'Error procesando solicitud';

    if (error.message?.includes('API key')) {
      errorMessage = 'API key de Gemini inválida. Por favor, verifica tu configuración.';
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      errorMessage = 'Límite de uso de API alcanzado. Intenta de nuevo más tarde.';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = 'Error de conexión con el servicio de IA. Verifica tu conexión a internet.';
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        message: errorMessage,
        details: error.message
      },
      { status: 500 }
    );
  }
}
