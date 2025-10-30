export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 shadow-xl">
        <h1 className="text-4xl font-bold mb-8">Política de Privacidad</h1>

        <p className="text-sm text-slate-400 mb-8">
          Última actualización: 30 de Octubre de 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Información que Recopilamos</h2>
          <p className="text-slate-300 mb-4">
            En Annalogica (&quot;nosotros&quot;, &quot;nuestro&quot;), recopilamos la siguiente información:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><strong>Información de cuenta:</strong> Email y contraseña encriptada</li>
            <li><strong>Archivos subidos:</strong> Archivos de audio y video que subes para transcripción</li>
            <li><strong>Transcripciones:</strong> Texto generado a partir de tus archivos</li>
            <li><strong>Resúmenes:</strong> Resúmenes generados mediante IA de tus transcripciones</li>
            <li><strong>Información técnica:</strong> Dirección IP, navegador, sistema operativo (para seguridad y rate limiting)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Cómo Usamos tu Información</h2>
          <p className="text-slate-300 mb-4">
            Utilizamos tu información para:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li>Proporcionar servicios de transcripción y resumen</li>
            <li>Almacenar y gestionar tus archivos y transcripciones</li>
            <li>Autenticar tu cuenta y protegerla</li>
            <li>Prevenir abuso y fraude (rate limiting)</li>
            <li>Mejorar nuestros servicios</li>
            <li>Cumplir con obligaciones legales</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Servicios de Terceros</h2>
          <p className="text-slate-300 mb-4">
            Utilizamos los siguientes servicios externos que pueden procesar tus datos:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><strong>Vercel:</strong> Hosting, base de datos (Neon Postgres) y almacenamiento (Blob Storage)</li>
            <li><strong>Replicate:</strong> Procesamiento de transcripción con modelo Whisper de OpenAI</li>
            <li><strong>Anthropic Claude:</strong> Generación de resúmenes mediante IA</li>
            <li><strong>Upstash Redis:</strong> Control de límites de uso (rate limiting)</li>
          </ul>
          <p className="text-slate-300 mt-4">
            Todos estos servicios cumplen con GDPR y tienen sus propias políticas de privacidad.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Tus Derechos (GDPR)</h2>
          <p className="text-slate-300 mb-4">
            Como residente de la UE, tienes derecho a:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><strong>Acceso:</strong> Solicitar una copia de tus datos personales</li>
            <li><strong>Rectificación:</strong> Corregir datos incorrectos o incompletos</li>
            <li><strong>Eliminación:</strong> Solicitar la eliminación de tus datos (&quot;derecho al olvido&quot;)</li>
            <li><strong>Portabilidad:</strong> Obtener tus datos en formato legible por máquina</li>
            <li><strong>Oposición:</strong> Oponerte al procesamiento de tus datos</li>
            <li><strong>Restricción:</strong> Limitar cómo usamos tus datos</li>
          </ul>
          <p className="text-slate-300 mt-4">
            Para ejercer estos derechos, contacta: <a href="mailto:privacy@annalogica.eu" className="text-blue-400 hover:underline">privacy@annalogica.eu</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Retención de Datos</h2>
          <p className="text-slate-300">
            Conservamos tus datos mientras mantengas tu cuenta activa. Si eliminas tu cuenta,
            todos tus archivos, transcripciones y datos personales serán eliminados permanentemente
            en un plazo de 30 días.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Seguridad</h2>
          <p className="text-slate-300">
            Implementamos medidas de seguridad técnicas y organizativas:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mt-4">
            <li>Contraseñas encriptadas con bcrypt (12 rounds)</li>
            <li>Autenticación JWT con tokens seguros</li>
            <li>Conexiones HTTPS/TLS obligatorias</li>
            <li>Rate limiting contra ataques de fuerza bruta</li>
            <li>Validación de tipos y tamaños de archivos</li>
            <li>Base de datos con acceso restringido</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
          <p className="text-slate-300">
            Utilizamos cookies y localStorage únicamente para:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mt-4">
            <li>Mantener tu sesión activa (JWT token)</li>
            <li>Recordar tus preferencias (modo oscuro, idioma)</li>
          </ul>
          <p className="text-slate-300 mt-4">
            No utilizamos cookies de terceros para publicidad o tracking.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Menores de Edad</h2>
          <p className="text-slate-300">
            Annalogica no está dirigido a menores de 16 años. Si descubrimos que hemos recopilado
            datos de un menor sin consentimiento parental, eliminaremos esos datos inmediatamente.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Cambios a esta Política</h2>
          <p className="text-slate-300">
            Podemos actualizar esta política ocasionalmente. Te notificaremos cambios significativos
            por email o mediante un aviso en la plataforma.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Contacto</h2>
          <p className="text-slate-300">
            Para cualquier pregunta sobre esta política o el tratamiento de tus datos:
          </p>
          <div className="text-slate-300 mt-4 space-y-2">
            <p><strong>Empresa:</strong> videoconversion digital lab, S.L.</p>
            <p><strong>Emails de contacto:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><a href="mailto:support@annalogica.eu" className="text-blue-400 hover:underline">support@annalogica.eu</a> - Soporte técnico</li>
              <li><a href="mailto:admin@annalogica.eu" className="text-blue-400 hover:underline">admin@annalogica.eu</a> - Administración</li>
              <li><a href="mailto:infopreus@annalogica.eu" className="text-blue-400 hover:underline">infopreus@annalogica.eu</a> - Información y precios</li>
            </ul>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            Esta política cumple con el Reglamento General de Protección de Datos (GDPR) de la UE
            y la Ley Orgánica de Protección de Datos (LOPD) de España.
          </p>
        </div>
      </div>
    </div>
  );
}
