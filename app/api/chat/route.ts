import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Inicializar el cliente de Gemini con la API key del servidor
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Guía de usuario de annalogica - Actualizada con todas las funcionalidades
const USER_GUIDE = `
# Guía de Usuario de annalogica

## ¿Qué es annalogica?
annalogica es una plataforma profesional de transcripción, análisis documental y búsqueda inteligente con IA.
Permite transcribir audio/video, extraer datos de documentos, consultar documentos con lenguaje natural (RAG), y gestionar todo desde un panel centralizado.

## Módulos y Funcionalidades:

### Transcripción de Audio y Video (Módulo: Extracción)
- Transcripción automática con OpenAI Whisper V3, 95%+ de precisión
- 9 idiomas: Español, Català, Euskera, Galego, Português, English, Français, Deutsch, Italiano
- Identificación de oradores (diarización automática)
- Resúmenes inteligentes con IA (GPT-4o-mini)
- Subtítulos profesionales SRT y VTT
- Etiquetas automáticas de contenido
- Formatos: MP3, MP4, WAV, M4A, FLAC, WebM, MOV, AVI

### Pregúntale al Documento (Módulo: RAG)
- Búsqueda semántica RAG (Retrieval-Augmented Generation) sobre documentos
- Sube documentos PDF, DOCX, TXT a carpetas organizadas
- Haz preguntas en lenguaje natural y obtén respuestas basadas en tus documentos
- Las respuestas incluyen fuentes con referencia al documento original
- Puedes ver el PDF original directamente desde los resultados
- Puedes descargar los documentos fuente
- Organiza documentos en carpetas temáticas para búsquedas más precisas

### Carpetas RAG
- Crea carpetas para organizar documentos por tema, proyecto o cliente
- Cada carpeta tiene su propio índice de búsqueda
- Puedes subir múltiples documentos a una carpeta
- Las consultas RAG se limitan a la carpeta seleccionada para mayor precisión
- Gestión completa: crear, renombrar, eliminar carpetas

### Visor PDF
- Visualiza PDFs directamente desde los resultados RAG
- Botones "Ver PDF" y "Descargar" en cada fuente citada
- Visor integrado sin necesidad de software externo
- Compatible con modo oscuro y claro

### Revisión de Documentos (Módulo: Review)
- Panel de revisión para verificar extracciones
- Lista de documentos con estado: pendiente, completado, error
- Filtro por estado y búsqueda por nombre
- Acceso directo al panel de revisión detallado

### Excel Master (Módulo: Excel Master)
- Consolidación de datos extraídos en archivos Excel
- Lista de archivos procesados con búsqueda y ordenación
- Descarga directa en formato XLSX
- Visualización de datos en modal

### Procesamiento en Lote (Módulo: Batch)
- Procesamiento masivo de múltiples documentos simultáneamente
- Hasta 50 archivos en paralelo
- Progreso en tiempo real por archivo

### Plantillas Personalizadas (Módulo: Templates)
- Crear y gestionar plantillas de extracción propias
- Definir campos personalizados para cada tipo de documento

## Sistema de Módulos y Permisos
- Cada funcionalidad es un módulo independiente que se puede contratar
- Los administradores asignan módulos a usuarios
- Módulos disponibles: Extracción (29€/mes), RAG (19€/mes), Revisión (15€/mes), Excel Master (15€/mes), Batch (25€/mes), Plantillas (10€/mes)
- Paquetes sugeridos: Básico (Extracción), Pro (Extracción + RAG + Batch)
- Si no tienes un módulo contratado, el botón aparece deshabilitado con tooltip informativo
- Para contratar módulos, contacta con ventas o tu administrador

## Cómo usar annalogica:

### 1. Subir archivos
- Arrastra y suelta archivos en la zona de carga o haz clic para seleccionar
- Formatos: MP3, MP4, WAV, M4A, FLAC, WebM, PDF, DOCX, TXT
- Tamaño máximo: 2GB por archivo

### 2. Procesar
- Selecciona las acciones deseadas (transcribir, oradores, resumen, subtítulos, tags)
- Haz clic en "Procesar Archivos"
- El progreso se muestra en tiempo real

### 3. Resultados
- Descarga en múltiples formatos: TXT, PDF, SRT, VTT, XLSX
- Organización automática por carpetas
- Archivos disponibles durante 30 días

### 4. RAG - Pregúntale al Documento
- Ve a la sección "Pregúntale al Documento"
- Selecciona o crea una carpeta
- Sube documentos a la carpeta
- Escribe tu pregunta en lenguaje natural
- Obtén respuestas con fuentes citadas
- Haz clic en "Ver PDF" para ver el documento original

## Seguridad
- Cifrado de extremo a extremo
- Servidores en Europa (GDPR compliant)
- Headers de seguridad: X-Frame-Options, HSTS, X-Content-Type-Options
- Rate limiting para prevenir abuso
- Archivos originales eliminados tras procesamiento
- Resultados conservados 30 días
- Backups automáticos diarios
- Permisos y acceso controlado por módulos

## Preguntas frecuentes:

### ¿Qué es RAG?
RAG (Retrieval-Augmented Generation) es una tecnología que permite hacer preguntas en lenguaje natural sobre tus documentos. El sistema busca la información relevante en tus documentos y genera una respuesta precisa basada en el contenido real.

### ¿Cómo creo una carpeta RAG?
Desde la sección "Pregúntale al Documento", haz clic en "Nueva Carpeta", dale un nombre descriptivo, y luego sube documentos a esa carpeta.

### ¿Qué módulos necesito?
Depende de tu uso. Para transcripción básica, el módulo "Extracción" es suficiente. Si necesitas consultar documentos, añade "RAG". Para procesamiento masivo, añade "Batch".

### ¿Puedo ver el PDF original desde los resultados RAG?
Sí, cada fuente citada en las respuestas RAG tiene botones "Ver PDF" y "Descargar" para acceder al documento original.

### ¿Los archivos son seguros?
Sí, usamos cifrado de extremo a extremo, servidores en Europa, y eliminamos archivos originales tras procesamiento. Cumplimos con GDPR.

### ¿Cuánto cuesta?
annalogica ofrece módulos individuales desde 10€/mes. También hay paquetes combinados. Contacta con ventas para planes personalizados.

## Contacto y soporte:
- Soporte técnico: support@annalogica.eu
- Ventas: infopreus@annalogica.eu
- Web: https://annalogica.eu
- Guía de usuario: https://annalogica.eu/guia
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
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no configurada' },
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

    // Crear el modelo con el contexto de la guía de usuario
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: `Eres Laia, la asistente virtual de annalogica — una plataforma profesional de transcripción, análisis documental y búsqueda inteligente con IA.

Tu función es ayudar a los usuarios a:
- Entender cómo usar la aplicación y sus módulos
- Resolver problemas comunes
- Responder preguntas sobre RAG (Pregúntale al Documento), carpetas, módulos, permisos
- Explicar cómo visualizar PDFs desde resultados RAG
- Informar sobre el sistema de módulos y precios
- Proporcionar guía paso a paso cuando sea necesario

Usa la siguiente guía de usuario como base de conocimiento:

${USER_GUIDE}

Instrucciones importantes:
- Sé breve, claro y directo
- Usa un tono amigable y profesional
- Si no sabes algo, admítelo y sugiere contactar con soporte (support@annalogica.eu)
- Estructura tus respuestas con listas y secciones cuando sea apropiado
- Responde en el mismo idioma en que te pregunten (principalmente español)
- Si el usuario pregunta algo fuera del ámbito de annalogica, redirige amablemente a los temas de la aplicación
- Cuando pregunten sobre RAG, carpetas, o búsqueda semántica, explica el flujo completo
- Cuando pregunten sobre módulos o permisos, explica el sistema de módulos y cómo contratarlos
- Cuando pregunten sobre ver PDFs, explica los botones "Ver PDF" y "Descargar" en fuentes RAG`
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
    return NextResponse.json(
      { error: 'Error procesando solicitud', details: error.message },
      { status: 500 }
    );
  }
}
