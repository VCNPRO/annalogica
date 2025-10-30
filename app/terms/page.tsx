export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 shadow-xl">
        <h1 className="text-4xl font-bold mb-8">Términos y Condiciones de Servicio</h1>

        <p className="text-sm text-slate-400 mb-8">
          Última actualización: 30 de Octubre de 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Aceptación de los Términos</h2>
          <p className="text-slate-300">
            Al acceder y utilizar Annalogica (&quot;el Servicio&quot;), aceptas estar sujeto a estos
            Términos y Condiciones. Si no estás de acuerdo, no utilices el Servicio.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Descripción del Servicio</h2>
          <p className="text-slate-300 mb-4">
            Annalogica proporciona servicios de:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li>Transcripción automática de archivos de audio y video mediante IA</li>
            <li>Generación de resúmenes de transcripciones</li>
            <li>Almacenamiento y gestión de archivos y transcripciones</li>
            <li>Descarga de transcripciones en formatos TXT, SRT y PDF</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Registro y Cuenta</h2>
          <p className="text-slate-300 mb-4">
            Para utilizar el Servicio, debes:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li>Tener al menos 16 años de edad</li>
            <li>Proporcionar información precisa y actualizada</li>
            <li>Mantener la seguridad de tu contraseña</li>
            <li>Notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta</li>
          </ul>
          <p className="text-slate-300 mt-4">
            Eres responsable de todas las actividades que ocurran bajo tu cuenta.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Límites de Uso</h2>
          <p className="text-slate-300 mb-4">
            El Servicio implementa los siguientes límites para garantizar un uso justo:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li><strong>Tamaño de archivos:</strong> Máximo 500 MB para audio, 2 GB para video</li>
            <li><strong>Formatos permitidos:</strong> MP3, WAV, OGG, M4A, MP4, WEBM, MOV</li>
            <li><strong>Subidas:</strong> Máximo 10 archivos por hora</li>
            <li><strong>Transcripciones:</strong> Máximo 5 procesadas por hora</li>
            <li><strong>Intentos de login:</strong> Máximo 5 cada 5 minutos</li>
          </ul>
          <p className="text-slate-300 mt-4">
            Nos reservamos el derecho de modificar estos límites con previo aviso.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Contenido del Usuario</h2>
          <p className="text-slate-300 mb-4">
            Tú conservas todos los derechos sobre el contenido que subes. Al usar el Servicio:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li>Garantizas que tienes derecho a subir y procesar el contenido</li>
            <li>No subirás contenido ilegal, difamatorio, o que infrinja derechos de terceros</li>
            <li>Nos otorgas una licencia limitada para procesar tus archivos y generar transcripciones</li>
            <li>Puedes eliminar tu contenido en cualquier momento desde tu cuenta</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Contenido Prohibido</h2>
          <p className="text-slate-300 mb-4">
            Está estrictamente prohibido subir contenido que:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li>Sea ilegal o promueva actividades ilegales</li>
            <li>Contenga virus, malware o código malicioso</li>
            <li>Infrinja derechos de autor, marcas registradas u otros derechos de propiedad intelectual</li>
            <li>Sea difamatorio, acosador, obsceno o pornográfico</li>
            <li>Viole la privacidad de terceros</li>
            <li>Contenga información confidencial sin autorización</li>
          </ul>
          <p className="text-slate-300 mt-4">
            Nos reservamos el derecho de eliminar cualquier contenido que viole estos términos
            y suspender o cancelar cuentas que incumplan repetidamente.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Precisión de las Transcripciones</h2>
          <p className="text-slate-300">
            Las transcripciones son generadas automáticamente mediante IA. Si bien nos esforzamos
            por proporcionar resultados precisos, no garantizamos una exactitud del 100%. Los
            resúmenes son generados por IA y deben ser revisados antes de su uso crítico.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Privacidad y Seguridad</h2>
          <p className="text-slate-300">
            El procesamiento de tus datos personales se rige por nuestra{' '}
            <a href="/privacy" className="text-blue-400 hover:underline">Política de Privacidad</a>.
            Implementamos medidas de seguridad pero no podemos garantizar seguridad absoluta.
            Eres responsable de mantener la confidencialidad de tus credenciales.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Propiedad Intelectual</h2>
          <p className="text-slate-300">
            El Servicio, su diseño, código, marcas y contenido están protegidos por derechos
            de autor y otras leyes de propiedad intelectual. No puedes copiar, modificar,
            distribuir o crear trabajos derivados sin nuestro permiso expreso.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Disponibilidad del Servicio</h2>
          <p className="text-slate-300">
            Nos esforzamos por mantener el Servicio disponible 24/7, pero no garantizamos
            disponibilidad ininterrumpida. Podemos realizar mantenimientos programados,
            actualizaciones o interrupciones temporales. No seremos responsables por
            pérdidas resultantes de la indisponibilidad del Servicio.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Tarifas y Pagos</h2>
          <p className="text-slate-300">
            Actualmente, Annalogica ofrece un servicio en fase beta. En el futuro,
            podemos introducir planes de pago. Los usuarios actuales serán notificados
            con 30 días de antelación sobre cualquier cambio de precios.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Cancelación y Terminación</h2>
          <p className="text-slate-300 mb-4">
            Puedes cancelar tu cuenta en cualquier momento desde la configuración. Nosotros
            podemos suspender o terminar tu cuenta si:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
            <li>Violas estos Términos</li>
            <li>Usas el Servicio de manera fraudulenta o abusiva</li>
            <li>No cumples con los límites de uso</li>
            <li>Es requerido por ley</li>
          </ul>
          <p className="text-slate-300 mt-4">
            Tras la cancelación, tus datos serán eliminados conforme a nuestra Política de Privacidad.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Limitación de Responsabilidad</h2>
          <p className="text-slate-300">
            EN LA MEDIDA PERMITIDA POR LA LEY, ANNALOGICA NO SERÁ RESPONSABLE POR DAÑOS
            INDIRECTOS, INCIDENTALES, ESPECIALES O CONSECUENTES DERIVADOS DEL USO O
            IMPOSIBILIDAD DE USO DEL SERVICIO.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Indemnización</h2>
          <p className="text-slate-300">
            Aceptas indemnizar y mantener indemne a Annalogica de cualquier reclamación,
            daño, obligación, pérdida, responsabilidad, costo o deuda derivados de tu
            violación de estos Términos o uso del Servicio.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">15. Modificaciones</h2>
          <p className="text-slate-300">
            Nos reservamos el derecho de modificar estos Términos en cualquier momento.
            Los cambios significativos serán notificados por email o mediante aviso en
            la plataforma con al menos 7 días de antelación.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">16. Ley Aplicable y Jurisdicción</h2>
          <p className="text-slate-300">
            Estos Términos se regirán por las leyes de España y la Unión Europea. Cualquier
            disputa será resuelta en los tribunales de [Tu ciudad], España.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">17. Contacto</h2>
          <div className="text-slate-300 space-y-2">
            <p>Para preguntas sobre estos Términos:</p>
            <p><strong>Empresa:</strong> videoconversion digital lab, S.L.</p>
            <p><strong>Sitio web:</strong> <a href="https://annalogica.eu" className="text-blue-400 hover:underline">annalogica.eu</a></p>
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
            Al utilizar Annalogica, confirmas que has leído, entendido y aceptado estos
            Términos y Condiciones.
          </p>
        </div>
      </div>
    </div>
  );
}
