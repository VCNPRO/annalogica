# 🤖 Configuración Rápida del Asistente de IA

## Paso 1: Obtener API Key de Gemini

1. Abre este enlace en tu navegador: https://aistudio.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Haz clic en el botón **"Create API Key"**
4. Copia la API key que se genera (algo como: `AIzaSyD...`)

## Paso 2: Configurar la API Key

Abre el archivo `.env.local` y reemplaza `tu_api_key_aqui` con tu API key real:

```bash
# AI Assistant
NEXT_PUBLIC_ENABLE_AI_ASSISTANT=true
GEMINI_API_KEY=AIzaSyD_tu_api_key_real_aqui
```

## Paso 3: Iniciar el servidor

```bash
npm run dev
```

## Paso 4: Probar el asistente

1. Abre http://localhost:3000 en tu navegador
2. Verás un botón flotante azul con un icono de mensaje en la esquina inferior derecha
3. Haz clic para abrir el chat
4. Prueba preguntas como:
   - "¿Cómo funciona annalogica?"
   - "¿Qué formatos de archivo puedo subir?"
   - "¿Cómo transcribo un archivo de audio?"
   - "¿Cuánto tiempo tarda la transcripción?"

## 🎉 ¡Listo!

El asistente ya está funcionando. Si quieres personalizarlo o tienes problemas, consulta `AI-ASSISTANT-README.md`.

---

## 🚫 Para desactivarlo temporalmente

En `.env.local`:
```bash
NEXT_PUBLIC_ENABLE_AI_ASSISTANT=false
```

Y reinicia el servidor.
