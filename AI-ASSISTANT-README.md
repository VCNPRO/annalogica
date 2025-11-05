# Asistente de IA - annalogica

## 📋 Descripción

El asistente de IA es un chatbot integrado que ayuda a los usuarios a entender cómo usar annalogica, resolver problemas comunes y responder preguntas sobre las características de la aplicación.

## 🎯 Características

- ✅ **Chatbot flotante** con interfaz intuitiva
- ✅ **Conocimiento completo** de la guía de usuario de annalogica
- ✅ **Respuestas en tiempo real** usando Google Gemini 2.0 Flash
- ✅ **Soporte markdown** para respuestas formateadas
- ✅ **Historial de conversación** mantenido durante la sesión
- ✅ **Modo minimizable** para no interferir con el uso de la app
- ✅ **Fácil de activar/desactivar** mediante feature flag

## 🚀 Configuración

### 1. Obtener API Key de Gemini

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key"
4. Copia la API key generada

### 2. Configurar Variables de Entorno

Edita el archivo `.env.local` y añade:

```bash
# AI Assistant
NEXT_PUBLIC_ENABLE_AI_ASSISTANT=true
GEMINI_API_KEY=tu_api_key_real_aqui
```

**Variables:**
- `NEXT_PUBLIC_ENABLE_AI_ASSISTANT`: Feature flag (true/false)
- `GEMINI_API_KEY`: API key de Google Gemini (servidor-side, segura)

### 3. Reiniciar el servidor

```bash
npm run dev
```

## 📁 Estructura de Archivos

```
annalogica/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts           # API Route para Gemini
│   └── layout.tsx                 # Integración del ChatWidget
├── components/
│   └── AIAssistant/
│       ├── ChatWidget.tsx         # Componente principal
│       ├── ChatMessage.tsx        # Display de mensajes
│       ├── ChatInput.tsx          # Input del usuario
│       └── index.ts               # Exports
└── .env.local                     # Variables de entorno
```

## 🔧 Cómo Funciona

### Flujo de Datos

1. Usuario escribe mensaje → `ChatInput`
2. `ChatWidget` envía request a `/api/chat`
3. API Route llama a Google Gemini con:
   - Mensaje del usuario
   - Historial de conversación
   - Context de guía de usuario
4. Gemini genera respuesta
5. Respuesta se muestra en `ChatMessage`

### Seguridad

- ✅ **API Key en servidor**: Nunca expuesta al cliente
- ✅ **Feature flag**: Fácil activar/desactivar
- ✅ **Validación de entrada**: Sanitización de mensajes
- ✅ **Rate limiting**: Implementable si es necesario

## 🎨 Personalización

### Cambiar el contexto/conocimiento

Edita el archivo `app/api/chat/route.ts`:

```typescript
const USER_GUIDE = `
  # Tu guía de usuario personalizada aquí
  ...
`;
```

### Cambiar el modelo de IA

En `app/api/chat/route.ts`:

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp', // Cambia aquí
  systemInstruction: `...`
});
```

Modelos disponibles:
- `gemini-2.0-flash-exp` - Rápido y económico (recomendado)
- `gemini-2.5-pro` - Más potente, más caro
- `gemini-1.5-pro` - Balance calidad/precio

### Cambiar colores

Edita `components/AIAssistant/ChatWidget.tsx`:

```typescript
// Cambiar color del botón flotante
className="... bg-blue-600 hover:bg-blue-700 ..."

// Cambiar color del header
className="bg-blue-600 ..."
```

## 🚫 Cómo Desactivar

### Opción 1: Desactivar sin eliminar código

En `.env.local`:
```bash
NEXT_PUBLIC_ENABLE_AI_ASSISTANT=false
```

### Opción 2: Eliminar completamente

1. Eliminar carpeta `components/AIAssistant/`
2. Eliminar archivo `app/api/chat/route.ts`
3. Eliminar import y uso en `app/layout.tsx`:
   ```typescript
   // Eliminar estas líneas:
   import { ChatWidget } from '@/components/AIAssistant';
   const showAIAssistant = process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT === 'true';
   {showAIAssistant && <ChatWidget />}
   ```
4. Desinstalar dependencias (opcional):
   ```bash
   npm uninstall @google/generative-ai react-markdown
   ```
5. Eliminar variables de entorno en `.env.local`

## 📊 Costos

Google Gemini 2.0 Flash es **gratuito** hasta ciertos límites:
- 15 RPM (requests por minuto)
- 1 millón tokens por día
- 10 millones tokens por mes

Para un chatbot de soporte, esto es más que suficiente para la mayoría de casos de uso.

Más info: [Google AI Pricing](https://ai.google.dev/pricing)

## 🐛 Troubleshooting

### El chatbot no aparece

1. Verifica que `NEXT_PUBLIC_ENABLE_AI_ASSISTANT=true`
2. Reinicia el servidor (`npm run dev`)
3. Limpia caché del navegador

### Error "GEMINI_API_KEY no configurada"

1. Verifica que añadiste `GEMINI_API_KEY` a `.env.local`
2. Asegúrate de que la API key sea válida
3. Reinicia el servidor

### Las respuestas son lentas

- Gemini Flash es rápido, pero depende de:
  - Conexión a internet
  - Longitud del historial de conversación
  - Carga de la API de Google

### Error en producción (Vercel)

1. Ve a Vercel Dashboard → tu proyecto → Settings → Environment Variables
2. Añade:
   - `NEXT_PUBLIC_ENABLE_AI_ASSISTANT` = `true`
   - `GEMINI_API_KEY` = `tu_api_key`
3. Redeploy el proyecto

## 📝 Mejoras Futuras

Posibles mejoras que puedes implementar:

- [ ] Añadir sugerencias de preguntas frecuentes
- [ ] Implementar búsqueda semántica en documentación
- [ ] Añadir función de feedback (👍/👎)
- [ ] Integrar con sistema de tickets/soporte
- [ ] Añadir analytics para mejorar respuestas
- [ ] Implementar rate limiting
- [ ] Añadir modo dark/light
- [ ] Soporte multiidioma

## 📞 Soporte

Si tienes problemas con la integración del asistente de IA, contacta con el equipo de desarrollo o abre un issue en el repositorio.

---

**Versión:** 1.0.0
**Última actualización:** 2025-01-05
**Desarrollado para:** annalogica
