'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Download, Home } from 'lucide-react';

export default function GuiaUsuario() {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['quick-start']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleDownloadPDF = () => {
    // Usar la función de impresión del navegador
    // El usuario puede elegir "Guardar como PDF" en el diálogo de impresión
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <h1 className="font-orbitron text-2xl font-bold text-orange-500">
                  annalogica
                </h1>
                <p className="text-sm text-gray-600">
                  Guía de Usuario
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                <Home className="h-4 w-4" />
                Ir al Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Guía Completa de Usuario
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Aprende a utilizar annalogica para transcribir, analizar y gestionar tus contenidos de audio y vídeo con inteligencia artificial.
          </p>
        </div>

        {/* Quick Start Section */}
        <Section
          id="quick-start"
          title="🚀 Quick Start - Primeros Pasos"
          expanded={expandedSections.has('quick-start')}
          onToggle={() => toggleSection('quick-start')}
        >
          <div className="space-y-6">
            <Step number={1} title="Registro y Acceso">
              <p className="text-gray-700 mb-3">
                Accede a <a href="https://annalogica.eu" className="text-orange-500 hover:underline">annalogica.eu</a> y crea tu cuenta:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Introduce tu email y contraseña</li>
                <li>Verifica tu cuenta por email</li>
                <li>Inicia sesión en el dashboard</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Consejo:</strong> Comienza con el plan gratuito para probar la plataforma (30 minutos de transcripción)
                </p>
              </div>
            </Step>

            <Step number={2} title="Cargar tu Primer Archivo">
              <p className="text-gray-700 mb-3">
                Desde el dashboard principal:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Arrastra y suelta tu archivo de audio/vídeo en la zona de carga</li>
                <li>O haz clic en "Selecciona archivos de tu equipo"</li>
                <li>Espera a que se complete la subida (verás una barra de progreso)</li>
              </ol>
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ <strong>Formatos soportados:</strong> MP3, MP4, WAV, M4A, FLAC, OGG, WebM, MOV, AVI
                </p>
              </div>
            </Step>

            <Step number={3} title="Seleccionar Acciones">
              <p className="text-gray-700 mb-3">
                Selecciona tu archivo cargado y elige qué quieres hacer:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>📝 Transcribir:</strong> Convierte audio a texto (obligatorio)</li>
                <li><strong>🎙️ Oradores:</strong> Identifica y analiza quién habla</li>
                <li><strong>📋 Resumen:</strong> Genera resumen automático con IA</li>
                <li><strong>📄 Subtítulos:</strong> Crea archivos SRT/VTT para vídeo</li>
                <li><strong>🏷️ Etiquetas:</strong> Extrae categorías y temas principales</li>
              </ul>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  ⚡ <strong>Importante:</strong> Solo pagas por lo que seleccionas. Elige solo las acciones que necesites.
                </p>
              </div>
            </Step>

            <Step number={4} title="Procesar y Descargar">
              <p className="text-gray-700 mb-3">
                Una vez seleccionadas las acciones:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Haz clic en "🚀 Procesar Archivos"</li>
                <li>Espera mientras se procesa (1-3 minutos típicamente)</li>
                <li>Verás el progreso en tiempo real con estimación de tiempo</li>
                <li>Cuando esté completado, descarga los resultados</li>
              </ol>
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  📦 <strong>Descarga organizada:</strong> Elige carpeta de destino para guardar todos los archivos automáticamente
                </p>
              </div>
            </Step>
          </div>
        </Section>

        {/* Introducción Section */}
        <Section
          id="intro"
          title="📖 Introducción a annalogica"
          expanded={expandedSections.has('intro')}
          onToggle={() => toggleSection('intro')}
        >
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>annalogica</strong> es una plataforma profesional de transcripción y análisis de contenidos de audio y vídeo
              impulsada por inteligencia artificial. Diseñada para empresas, instituciones públicas, medios de comunicación y
              profesionales que necesitan convertir y analizar grandes volúmenes de contenido multimedia.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">¿Qué hace annalogica?</h3>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Transcripción automática multiidioma</strong> con 95%+ de precisión</li>
              <li><strong>Identificación de oradores</strong> con análisis estadístico completo</li>
              <li><strong>Generación de resúmenes inteligentes</strong> usando IA avanzada (Claude)</li>
              <li><strong>Subtítulos profesionales</strong> en formatos SRT y VTT</li>
              <li><strong>Extracción automática de tags</strong> y categorías temáticas</li>
              <li><strong>Gestión centralizada</strong> de todos tus archivos procesados</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">¿Para quién es annalogica?</h3>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">🏢 Empresas</h4>
                <p className="text-sm text-blue-800">
                  Transcribe reuniones, llamadas comerciales, entrevistas y formaciones internas.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">🏛️ Instituciones</h4>
                <p className="text-sm text-purple-800">
                  Documenta plenos, sesiones parlamentarias, conferencias y actos oficiales.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">📰 Medios</h4>
                <p className="text-sm text-green-800">
                  Transcribe podcasts, entrevistas, programas de radio y contenido multimedia.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Ventajas Clave</h3>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="flex gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Rapidez</h4>
                  <p className="text-sm text-gray-600">Procesa 1 hora de audio en ~3 minutos</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">🎯</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Precisión</h4>
                  <p className="text-sm text-gray-600">95%+ de exactitud en transcripciones</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">🌍</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Multiidioma</h4>
                  <p className="text-sm text-gray-600">Español, Català, Euskera, Galego, Português, English, Français, Deutsch, Italiano</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">🔒</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Seguridad</h4>
                  <p className="text-sm text-gray-600">Tus datos protegidos con cifrado de extremo a extremo</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">💰</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Pago por uso</h4>
                  <p className="text-sm text-gray-600">Solo pagas por lo que procesas, sin compromisos</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">📊</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Análisis avanzado</h4>
                  <p className="text-sm text-gray-600">Identifica oradores, extrae insights y estadísticas</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Funcionalidades Detalladas */}
        <Section
          id="funcionalidades"
          title="⚙️ Funcionalidades Detalladas"
          expanded={expandedSections.has('funcionalidades')}
          onToggle={() => toggleSection('funcionalidades')}
        >
          <div className="space-y-8">

            <Feature
              icon="📝"
              title="Transcripción Multiidioma"
              description="Convierte audio y vídeo a texto con alta precisión"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Características:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
                <li>Detección automática de idioma o selección manual</li>
                <li>Soporte para 9 idiomas (ES, CA, EU, GL, PT, EN, FR, DE, IT)</li>
                <li>Precisión del 95%+ en condiciones óptimas</li>
                <li>Manejo de audio con ruido de fondo y múltiples hablantes</li>
                <li>Exportación en formato TXT limpio y estructurado</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mb-2">Casos de uso:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Actas de reuniones empresariales</li>
                <li>Entrevistas periodísticas</li>
                <li>Sesiones parlamentarias</li>
                <li>Clases y formaciones</li>
                <li>Podcasts y programas de radio</li>
              </ul>
            </Feature>

            <Feature
              icon="🎙️"
              title="Identificación de Oradores"
              description="Detecta quién habla, cuándo y cuánto tiempo"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Qué incluye:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
                <li><strong>Diarización automática:</strong> Separa automáticamente los diferentes hablantes</li>
                <li><strong>Identificación inteligente:</strong> Extrae nombres y cargos si se mencionan en el audio</li>
                <li><strong>Estadísticas por orador:</strong> Número de intervenciones, palabras pronunciadas, tiempo total</li>
                <li><strong>Porcentaje de participación:</strong> Quién habló más y cuánto</li>
                <li><strong>Línea de tiempo detallada:</strong> Registro cronológico de todas las intervenciones</li>
              </ul>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Ejemplo de Reporte:</h4>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
{`1. Speaker A - María García (Directora de Comunicación)
   Intervenciones: 25
   Palabras pronunciadas: 1.234
   Tiempo total: 5:30 (45% del total)
   Promedio por intervención: 0:13

2. Speaker B - Juan Martínez (Gerente de Marketing)
   Intervenciones: 18
   Palabras pronunciadas: 892
   Tiempo total: 4:10 (34% del total)
   Promedio por intervención: 0:14`}
                </pre>
              </div>
            </Feature>

            <Feature
              icon="📋"
              title="Resúmenes Inteligentes"
              description="Genera resúmenes concisos y relevantes con IA"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Características:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
                <li>Resúmenes en 3-4 párrafos capturando lo esencial</li>
                <li>Generados por Claude (Anthropic) - IA de última generación</li>
                <li>Mantiene el contexto y los puntos clave de la conversación</li>
                <li>Respeta el idioma original del contenido</li>
                <li>Ideal para revisión rápida de contenidos largos</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mb-2">Perfecto para:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Ejecutivos que necesitan revisar reuniones sin escuchar todo el audio</li>
                <li>Periodistas que necesitan extraer lo relevante de entrevistas largas</li>
                <li>Investigadores que analizan múltiples fuentes de información</li>
                <li>Equipos que necesitan compartir conclusiones de reuniones</li>
              </ul>
            </Feature>

            <Feature
              icon="📄"
              title="Subtítulos Profesionales"
              description="Crea archivos de subtítulos listos para usar"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Formatos disponibles:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
                <li><strong>SRT (SubRip):</strong> Compatible con la mayoría de reproductores y plataformas</li>
                <li><strong>VTT (WebVTT):</strong> Estándar web, ideal para HTML5 y streaming</li>
                <li>Sincronización precisa al milisegundo</li>
                <li>Incluye etiquetas de hablante [Speaker A], [Speaker B]</li>
                <li>Listos para importar en editores de vídeo (Premiere, Final Cut, DaVinci)</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mb-2">Aplicaciones:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Vídeos corporativos y formaciones</li>
                <li>Contenido para YouTube, Vimeo y redes sociales</li>
                <li>Accesibilidad para personas con discapacidad auditiva</li>
                <li>Cumplimiento de normativas de accesibilidad</li>
              </ul>
            </Feature>

            <Feature
              icon="🏷️"
              title="Etiquetas Automáticas"
              description="Extrae categorías y temas principales"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Qué hace:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
                <li>Identifica 5-7 temas o categorías principales del contenido</li>
                <li>Extracción contextual usando IA (Claude)</li>
                <li>Tags relevantes y descriptivos</li>
                <li>Útil para organización y búsqueda de contenidos</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mb-2">Ejemplo de Tags:</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Marketing Digital</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Estrategia de Contenido</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">Redes Sociales</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">SEO</span>
                <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium">Analytics</span>
              </div>
            </Feature>

          </div>
        </Section>

        {/* Gestión de Archivos */}
        <Section
          id="gestion"
          title="📁 Gestión de Archivos"
          expanded={expandedSections.has('gestion')}
          onToggle={() => toggleSection('gestion')}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Dashboard Principal</h3>
              <p className="text-gray-700 mb-3">
                El dashboard está dividido en dos secciones principales:
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">📁 Archivos Cargados</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    Muestra archivos en proceso de subida y procesamiento:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Estado: Subiendo, Pendiente, Procesando</li>
                    <li>• Progreso en tiempo real</li>
                    <li>• Tiempo estimado restante</li>
                    <li>• Acciones asignadas</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">✅ Archivos Completados</h4>
                  <p className="text-sm text-green-800 mb-2">
                    Archivos listos para descargar:
                  </p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Descarga individual o múltiple</li>
                    <li>• Selección de formato (PDF/TXT)</li>
                    <li>• Organización en carpetas automática</li>
                    <li>• Gestión y eliminación</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Página de Archivos Procesados</h3>
              <p className="text-gray-700 mb-3">
                Accede a todos tus archivos históricos desde el botón "✅ Archivos Procesados":
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Vista completa de todos los trabajos procesados</li>
                <li>Filtros por estado, fecha y tipo</li>
                <li>Información detallada: duración, idioma, acciones realizadas</li>
                <li>Acceso directo a todos los archivos generados</li>
                <li>Descarga masiva con organización por carpetas</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Política de Retención</h3>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-800 mb-2">
                  <strong>⚠️ Importante:</strong> Los archivos procesados se conservan durante <strong>30 días</strong>:
                </p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Transcripciones, resúmenes y subtítulos: 30 días</li>
                  <li>• Reportes de oradores: 30 días</li>
                  <li>• Archivos de audio/vídeo originales: Eliminados tras procesamiento exitoso</li>
                  <li>• Descarga tus archivos importantes antes de que expire el periodo</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Formatos de Descarga</h3>
              <p className="text-gray-700 mb-3">
                Puedes descargar tus resultados en múltiples formatos:
              </p>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="px-3 py-1 bg-gray-200 rounded font-mono text-sm">TXT</div>
                  <div className="flex-1">
                    <p className="text-gray-700">Texto plano, fácil de editar y compartir</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="px-3 py-1 bg-red-200 rounded font-mono text-sm">PDF</div>
                  <div className="flex-1">
                    <p className="text-gray-700">Formato profesional con encabezados y metadatos</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="px-3 py-1 bg-blue-200 rounded font-mono text-sm">SRT</div>
                  <div className="flex-1">
                    <p className="text-gray-700">Subtítulos para reproductores y editores de vídeo</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="px-3 py-1 bg-purple-200 rounded font-mono text-sm">VTT</div>
                  <div className="flex-1">
                    <p className="text-gray-700">Subtítulos para web (HTML5 video)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Planes y Límites */}
        <Section
          id="planes"
          title="💳 Planes y Límites"
          expanded={expandedSections.has('planes')}
          onToggle={() => toggleSection('planes')}
        >
          <div className="space-y-6">
            <p className="text-gray-700">
              annalogica ofrece planes flexibles adaptados a diferentes necesidades. Todos los planes se facturan mensualmente
              y puedes cambiar o cancelar en cualquier momento.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <PlanCard
                name="Gratuito"
                price="0€"
                period="/mes"
                features={[
                  "30 minutos de transcripción",
                  "Todas las funcionalidades",
                  "Multiidioma",
                  "Exportación PDF y TXT"
                ]}
                highlight={false}
              />

              <PlanCard
                name="Profesional"
                price="19€"
                period="/mes"
                features={[
                  "10 horas de transcripción",
                  "Identificación de oradores",
                  "Resúmenes con IA",
                  "Subtítulos SRT/VTT",
                  "Soporte prioritario"
                ]}
                highlight={true}
              />

              <PlanCard
                name="Empresarial"
                price="Personalizado"
                period=""
                features={[
                  "Horas ilimitadas",
                  "API personalizada",
                  "Gestión de equipos",
                  "SLA garantizado",
                  "Soporte 24/7",
                  "Facturación personalizada"
                ]}
                highlight={false}
              />
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">📊 Consulta tu Cuota</h4>
              <p className="text-sm text-blue-800">
                Accede a "⚙️ Ajustes" en el dashboard para ver tu uso mensual, límites y detalles de tu plan actual.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Preguntas Frecuentes sobre Planes</h3>

              <FAQ
                question="¿Qué pasa si supero mi cuota mensual?"
                answer="El sistema te notificará cuando estés cerca del límite. Puedes actualizar a un plan superior en cualquier momento desde los ajustes. No se procesan más archivos una vez alcanzado el límite hasta que actualices el plan o esperes a que se renueve tu cuota mensual."
              />

              <FAQ
                question="¿Puedo cambiar de plan en cualquier momento?"
                answer="Sí, puedes actualizar o reducir tu plan cuando quieras. Los cambios se aplican inmediatamente y la facturación se ajusta de forma prorrateada."
              />

              <FAQ
                question="¿Emiten facturas?"
                answer="Sí, emitimos facturas automáticamente cada mes con todos los datos fiscales. Puedes descargarlas desde tu panel de ajustes."
              />
            </div>
          </div>
        </Section>

        {/* Preguntas Frecuentes */}
        <Section
          id="faq"
          title="❓ Preguntas Frecuentes"
          expanded={expandedSections.has('faq')}
          onToggle={() => toggleSection('faq')}
        >
          <div className="space-y-4">
            <FAQ
              question="¿Qué formatos de archivo son compatibles?"
              answer="annalogica soporta los principales formatos de audio y vídeo: MP3, MP4, WAV, M4A, FLAC, OGG, WebM, MOV, AVI, MKV, entre otros. El tamaño máximo por archivo es de 2GB."
            />

            <FAQ
              question="¿Cuánto tiempo tarda en procesarse un archivo?"
              answer="Típicamente, procesamos archivos a una velocidad de 0.2-0.3x el tiempo real. Por ejemplo, 1 hora de audio se procesa en aproximadamente 2-3 minutos. El tiempo puede variar según la complejidad del audio y las acciones seleccionadas."
            />

            <FAQ
              question="¿Qué tan precisa es la transcripción?"
              answer="Nuestra precisión es del 95%+ en condiciones óptimas (audio claro, sin ruido de fondo, hablantes claros). La precisión puede ser menor con audio de baja calidad, múltiples hablantes simultáneos o ruido ambiental excesivo."
            />

            <FAQ
              question="¿Puedo editar las transcripciones?"
              answer="Las transcripciones se descargan en formato TXT que puedes editar con cualquier editor de texto. También puedes exportar a PDF para un formato más profesional."
            />

            <FAQ
              question="¿Cómo funciona la identificación de oradores?"
              answer="Usamos dos tecnologías: (1) Diarización automática que separa diferentes voces, y (2) IA (Claude) que analiza el contenido para extraer nombres y cargos mencionados en la conversación. Por ejemplo, si alguien dice 'Soy María García, directora de...', el sistema extrae esa información."
            />

            <FAQ
              question="¿Qué idiomas están soportados?"
              answer="Soportamos 9 idiomas: Español (ES), Català (CA), Euskera (EU), Galego (GL), Português (PT), English (EN), Français (FR), Deutsch (DE) e Italiano (IT). También ofrecemos detección automática de idioma."
            />

            <FAQ
              question="¿Mis datos están seguros?"
              answer="Sí. Utilizamos cifrado de extremo a extremo, servidores seguros en Europa (GDPR compliant) y eliminamos los archivos de audio originales tras el procesamiento. Los resultados se conservan 30 días y luego se eliminan automáticamente."
            />

            <FAQ
              question="¿Puedo procesar múltiples archivos a la vez?"
              answer="Sí, puedes cargar y procesar hasta 50 archivos simultáneamente. Cada archivo puede tener sus propias acciones seleccionadas."
            />

            <FAQ
              question="¿Qué métodos de pago aceptan?"
              answer="Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, American Express). Los pagos son procesados de forma segura por Stripe."
            />

            <FAQ
              question="¿Ofrecen API para integración?"
              answer="Sí, en los planes empresariales ofrecemos API REST completa para integrar annalogica en tus sistemas. Contacta con ventas para más información."
            />
          </div>
        </Section>

        {/* Solución de Problemas */}
        <Section
          id="troubleshooting"
          title="🔧 Solución de Problemas"
          expanded={expandedSections.has('troubleshooting')}
          onToggle={() => toggleSection('troubleshooting')}
        >
          <div className="space-y-6">

            <Problem
              title="El archivo no se carga correctamente"
              solutions={[
                "Verifica que el formato del archivo sea compatible (MP3, MP4, WAV, etc.)",
                "Comprueba que el tamaño del archivo no supere los 2GB",
                "Asegúrate de tener una conexión a internet estable",
                "Intenta con otro navegador (Chrome, Firefox, Edge recomendados)",
                "Limpia la caché de tu navegador"
              ]}
            />

            <Problem
              title="La transcripción tiene muchos errores"
              solutions={[
                "Verifica la calidad del audio original (debe ser claro, sin excesivo ruido)",
                "Asegúrate de haber seleccionado el idioma correcto",
                "Si hay múltiples hablantes, utiliza la función de identificación de oradores",
                "Considera mejorar la calidad del audio antes de subirlo",
                "Para audio técnico o con jerga específica, la precisión puede ser menor"
              ]}
            />

            <Problem
              title="El procesamiento se queda atascado"
              solutions={[
                "Espera unos minutos - archivos grandes pueden tardar más",
                "Refresca la página para ver el estado actualizado",
                "Si persiste más de 10 minutos, usa el botón 'Reiniciar' del archivo",
                "Contacta con soporte si el problema continúa"
              ]}
            />

            <Problem
              title="No puedo descargar los archivos"
              solutions={[
                "Asegúrate de haber seleccionado una carpeta de descarga (botón '📁 Carpeta Descarga')",
                "Verifica que tu navegador permite descargas múltiples",
                "Comprueba que tienes espacio suficiente en el disco",
                "Intenta descargar archivos individuales en lugar de todos a la vez",
                "Prueba con otro navegador"
              ]}
            />

            <Problem
              title="He alcanzado mi límite de cuota"
              solutions={[
                "Ve a '⚙️ Ajustes' para ver tu uso actual",
                "Actualiza a un plan superior desde la página de Precios",
                "Tu cuota se renueva automáticamente cada mes",
                "Contacta con ventas para planes personalizados si necesitas más capacidad"
              ]}
            />

          </div>
        </Section>

        {/* Soporte */}
        <Section
          id="soporte"
          title="📞 Soporte y Contacto"
          expanded={expandedSections.has('soporte')}
          onToggle={() => toggleSection('soporte')}
        >
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="text-lg font-semibold text-orange-900 mb-3">📧 Email de Soporte</h3>
                <p className="text-orange-800 mb-3">
                  Para consultas técnicas y soporte general:
                </p>
                <a
                  href="mailto:support@annalogica.eu"
                  className="text-orange-600 hover:text-orange-700 font-semibold text-lg"
                >
                  support@annalogica.eu
                </a>
                <p className="text-sm text-orange-700 mt-2">
                  Tiempo de respuesta: 24-48 horas
                </p>
              </div>

              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">💼 Ventas y Empresarial</h3>
                <p className="text-blue-800 mb-3">
                  Para consultas comerciales y planes empresariales:
                </p>
                <a
                  href="mailto:infopreus@annalogica.eu"
                  className="text-blue-600 hover:text-blue-700 font-semibold text-lg"
                >
                  infopreus@annalogica.eu
                </a>
                <p className="text-sm text-blue-700 mt-2">
                  Atención personalizada para empresas
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🌐 Recursos Adicionales</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• <a href="/pricing" className="text-orange-500 hover:underline">Ver Planes y Precios</a></li>
                <li>• <a href="/privacy" className="text-orange-500 hover:underline">Política de Privacidad</a></li>
                <li>• <a href="/terms" className="text-orange-500 hover:underline">Términos de Servicio</a></li>
                <li>• <strong>Dashboard:</strong> <a href="/" className="text-orange-500 hover:underline">https://annalogica.eu</a></li>
              </ul>
            </div>

            <div className="p-6 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Antes de Contactar con Soporte</h3>
              <p className="text-green-800 mb-3">Para ayudarte más rápido, ten preparada esta información:</p>
              <ul className="space-y-1 text-green-800 text-sm">
                <li>• Tu email de registro</li>
                <li>• Descripción detallada del problema</li>
                <li>• Pasos para reproducir el error</li>
                <li>• Capturas de pantalla si es posible</li>
                <li>• Navegador y sistema operativo que utilizas</li>
              </ul>
            </div>
          </div>
        </Section>

      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">© 2025 annalogica. Todos los derechos reservados.</p>
            <p className="text-sm">Transcripción profesional con inteligencia artificial</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
interface SectionProps {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ id, title, expanded, onToggle, children }: SectionProps) {
  return (
    <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {expanded && (
        <div className="px-6 py-6 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface FeatureProps {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Feature({ icon, title, description, children }: FeatureProps) {
  return (
    <div className="border-l-4 border-orange-500 pl-6">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
}

function PlanCard({ name, price, period, features, highlight }: PlanCardProps) {
  return (
    <div className={`p-6 rounded-lg border-2 ${highlight ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <h4 className="text-xl font-bold text-gray-900 mb-2">{name}</h4>
      <div className="mb-4">
        <span className="text-3xl font-bold text-gray-900">{price}</span>
        <span className="text-gray-600">{period}</span>
      </div>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface FAQProps {
  question: string;
  answer: string;
}

function FAQ({ question, answer }: FAQProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-2">{question}</h4>
      <p className="text-gray-700 text-sm">{answer}</p>
    </div>
  );
}

interface ProblemProps {
  title: string;
  solutions: string[];
}

function Problem({ title, solutions }: ProblemProps) {
  return (
    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
      <h4 className="font-semibold text-red-900 mb-3">❌ {title}</h4>
      <p className="text-sm text-red-800 mb-2"><strong>Soluciones:</strong></p>
      <ul className="space-y-1">
        {solutions.map((solution, index) => (
          <li key={index} className="text-sm text-red-800 flex items-start gap-2">
            <span>•</span>
            <span>{solution}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
