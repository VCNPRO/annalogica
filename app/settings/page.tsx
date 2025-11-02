'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun, Globe, Settings as SettingsIcon, Download, Clock, Info, BookOpen, LogOut, Mail, Phone, MapPin } from 'lucide-react';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import { useNotification } from '@/hooks/useNotification';
import { Toast } from '@/components/Toast';

export default function Settings() {
  const router = useRouter();
  const { notification, showNotification } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<{
    plan: string;
    filesUsed: number;
    filesTotal: number;
    resetDate: Date | null;
    daysUntilReset: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('es');
  const [downloadDirHandle, setDownloadDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [defaultOptions, setDefaultOptions] = useState({
    summaryType: 'detailed' as 'short' | 'detailed',
    autoGeneratePDF: true,
    autoGenerateSRT: true,
    organizeInFolders: true,
    downloadFormat: 'txt' as 'txt' | 'pdf' | 'both'
  });

  useEffect(() => {
    loadUserData();
  }, [router]);

  // Aplicar tema al cargar
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const isDark = savedTheme === 'dark';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const loadUserData = async () => {
    try {
      // Verify auth with cookies
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      setUser(data.user);

      // Load saved settings
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
      const savedLang = localStorage.getItem('language') || 'es';
      const savedOptions = localStorage.getItem('defaultOptions');

      setDarkMode(savedTheme === 'dark');
      setLanguage(savedLang);
      if (savedOptions) setDefaultOptions(JSON.parse(savedOptions));

      // Load subscription data
      try {
        const subResponse = await fetch('/api/subscription/status', {
          credentials: 'include'
        });

        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscriptionData({
            plan: subData.plan || 'free',
            filesUsed: subData.usage || 0,
            filesTotal: subData.quota || 10,
            resetDate: subData.resetDate ? new Date(subData.resetDate) : null,
            daysUntilReset: subData.stats?.daysUntilReset || 0
          });
        }
      } catch (subError) {
        console.error('Error loading subscription data:', subError);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading user:', error);
      router.push('/login');
    }
  };

  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const saveOptions = () => {
    localStorage.setItem('defaultOptions', JSON.stringify(defaultOptions));
    showNotification('✅ Preferencias guardadas correctamente', 'success');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    localStorage.removeItem('user');
    router.push('/login');
  };

  const [copied, setCopied] = useState(false);
  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user?.id || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showNotification('No se pudo copiar el ID', 'error');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  const bgPrimary = darkMode ? 'bg-black' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-zinc-900' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-zinc-400' : 'text-gray-600';
  const border = darkMode ? 'border-zinc-800' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <Toast notification={notification} />

      {/* Top Banner */}
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
        Modo Producción - Usuario: {user?.email || 'Usuario'}
      </div>

      {/* Top Right Actions */}
      <div className="fixed top-16 right-6 z-40 flex items-center gap-2">
        <button
          onClick={() => router.push('/guia')}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
          title="Guía de usuario"
        >
          <BookOpen className={`h-4 w-4 ${textSecondary}`} />
        </button>
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
        >
          {darkMode ? <Sun className="h-4 w-4 text-zinc-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
        </button>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 ${bgSecondary} px-3 py-2 rounded-lg shadow-sm ${border} border`}
          title="Cerrar sesión"
        >
          <LogOut className={`h-4 w-4 ${textSecondary}`} />
        </button>
      </div>

      {/* Main Content */}
      <div className="pt-20 px-6 pb-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-orange-500" />
              <h1 className="font-orbitron text-3xl text-orange-500 font-bold">ajustes</h1>
            </div>
            <button
              onClick={() => router.push('/')}
              className={`${bgSecondary} ${border} border px-4 py-2 rounded-lg text-orange-500 hover:text-orange-600 text-sm font-medium transition-colors inline-flex items-center gap-2`}
            >
              ← Volver al Dashboard
            </button>
          </div>
          <p className={`${textSecondary} text-sm`}>Personaliza tu experiencia con annalogica</p>
        </div>

        {/* Subscription Banner */}
        {subscriptionData && (
          <div className="mb-8">
            <SubscriptionBanner
              plan={subscriptionData.plan}
              filesUsed={subscriptionData.filesUsed}
              filesTotal={subscriptionData.filesTotal}
              resetDate={subscriptionData.resetDate}
              daysUntilReset={subscriptionData.daysUntilReset}
            />
          </div>
        )}

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Apariencia e Idioma - Juntos y más pequeños */}
          <div className={`${bgSecondary} rounded-lg ${border} border p-4`}>
            <div className="flex items-center gap-2 mb-3">
              {darkMode ? <Moon className="h-4 w-4 text-orange-500" /> : <Sun className="h-4 w-4 text-orange-500" />}
              <h2 className={`text-sm font-semibold ${textPrimary}`}>Apariencia e Idioma</h2>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setDarkMode(false); localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); }}
                  className={`p-2 rounded-lg border-2 transition-all ${!darkMode ? 'border-orange-500 bg-orange-50' : 'border-gray-300 dark:border-zinc-700'}`}
                >
                  <Sun className={`mx-auto h-4 w-4 mb-1 ${!darkMode ? 'text-orange-500' : textSecondary}`} />
                  <p className={`text-xs ${!darkMode ? 'text-orange-600 font-medium' : textSecondary}`}>Claro</p>
                </button>

                <button
                  onClick={() => { setDarkMode(true); localStorage.setItem('theme', 'dark'); document.documentElement.classList.add('dark'); }}
                  className={`p-2 rounded-lg border-2 transition-all ${darkMode ? 'border-orange-500 bg-zinc-800' : 'border-gray-300'}`}
                >
                  <Moon className={`mx-auto h-4 w-4 mb-1 ${darkMode ? 'text-orange-500' : textSecondary}`} />
                  <p className={`text-xs ${darkMode ? 'text-orange-400 font-medium' : textSecondary}`}>Oscuro</p>
                </button>
              </div>

              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className={`w-full p-2 border ${border} rounded-lg ${bgSecondary} ${textPrimary} text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
              >
                <option value="es">🇪🇸 Español</option>
                <option value="ca">🇪🇸 Català</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
          </div>

          {/* ID de Cliente - Más pequeño y con ID corto */}
          <div className={`${bgSecondary} rounded-lg ${border} border p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-500" />
              <h2 className={`text-sm font-semibold ${textPrimary}`}>ID de Cliente</h2>
            </div>

            <div className={`${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}>
              <p className={`text-xs mb-2 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                Usa este ID para soporte técnico
              </p>
              <div className="flex items-center gap-2">
                <code className={`flex-1 px-3 py-2 ${darkMode ? 'bg-black' : 'bg-white'} border ${border} rounded text-xs font-mono ${textPrimary}`}>
                  {user?.id ? user.id.slice(-8).toUpperCase() : '...'}
                </code>
                <button
                  onClick={copyUserId}
                  className={`px-3 py-2 rounded transition-colors flex items-center gap-1 ${
                    copied
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                  } text-white text-xs`}
                  title="Copiar ID completo"
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>OK</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Opciones de Descarga - Simplificado */}
          <div className={`${bgSecondary} rounded-lg ${border} border p-4 lg:col-span-2`}>
            <div className="flex items-center gap-2 mb-4">
              <Download className="h-4 w-4 text-orange-500" />
              <h2 className={`text-sm font-semibold ${textPrimary}`}>Opciones de Descarga</h2>
            </div>

            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3 rounded-lg border ${border} cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors`}>
                <input
                  type="checkbox"
                  checked={defaultOptions.organizeInFolders}
                  onChange={(e) => setDefaultOptions({...defaultOptions, organizeInFolders: e.target.checked})}
                  className="mt-1 w-4 h-4 text-orange-500 accent-orange-500"
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${textPrimary}`}>Organizar en carpetas</span>
                  <p className={`text-xs ${textSecondary} mt-1`}>Crea una carpeta por archivo con todos los resultados</p>
                </div>
              </label>

              <div className={`p-3 rounded-lg border ${border}`}>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Carpeta de destino</label>
                <p className={`text-xs ${textSecondary} mb-3`}>Los archivos se descargarán en la carpeta que elijas en tu equipo local. Esta preferencia se guardará para futuras descargas.</p>
                <button
                  onClick={async () => {
                    try {
                      // @ts-ignore - File System Access API
                      const dirHandle = await window.showDirectoryPicker();
                      setDownloadDirHandle(dirHandle);
                      showNotification('✅ Carpeta seleccionada correctamente', 'success');
                    } catch (err) {
                      if ((err as Error).name !== 'AbortError') {
                        showNotification('❌ No se pudo seleccionar la carpeta', 'error');
                      }
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  📁 Elegir carpeta de descargas
                </button>
              </div>
            </div>

            <button
              onClick={saveOptions}
              className="mt-4 w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              💾 Guardar Preferencias
            </button>
          </div>

          {/* Sección de Contacto */}
          <div id="contacto" className={`${bgSecondary} rounded-lg ${border} border p-4 lg:col-span-2`}>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-orange-500" />
              <h2 className={`text-sm font-semibold ${textPrimary}`}>Contacto</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Formulario de Contacto */}
              <div>
                <h3 className={`text-xs font-semibold ${textPrimary} mb-3`}>Envíanos un mensaje</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const nombre = formData.get('nombre') as string;
                  const email = formData.get('email') as string;
                  const asunto = formData.get('asunto') as string;
                  const mensaje = formData.get('mensaje') as string;

                  // Construir mailto link con los datos del formulario
                  const mailtoLink = `mailto:soporte@annalogica.eu?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(`Nombre: ${nombre}\nEmail: ${email}\n\nMensaje:\n${mensaje}`)}`;
                  window.location.href = mailtoLink;

                  showNotification('✅ Abriendo tu cliente de email...', 'success');
                }} className="space-y-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      required
                      className={`w-full p-2 border ${border} rounded ${bgSecondary} ${textPrimary} text-xs focus:ring-2 focus:ring-orange-500`}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>Email</label>
                    <input
                      type="email"
                      name="email"
                      required
                      className={`w-full p-2 border ${border} rounded ${bgSecondary} ${textPrimary} text-xs focus:ring-2 focus:ring-orange-500`}
                      placeholder="tu@email.com"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>Asunto</label>
                    <input
                      type="text"
                      name="asunto"
                      required
                      className={`w-full p-2 border ${border} rounded ${bgSecondary} ${textPrimary} text-xs focus:ring-2 focus:ring-orange-500`}
                      placeholder="¿En qué podemos ayudarte?"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textPrimary}`}>Mensaje</label>
                    <textarea
                      name="mensaje"
                      required
                      rows={4}
                      className={`w-full p-2 border ${border} rounded ${bgSecondary} ${textPrimary} text-xs focus:ring-2 focus:ring-orange-500`}
                      placeholder="Cuéntanos más..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded text-xs font-medium transition-colors"
                  >
                    📧 Enviar mensaje
                  </button>
                </form>
              </div>

              {/* Datos de Contacto */}
              <div>
                <h3 className={`text-xs font-semibold ${textPrimary} mb-3`}>Información de contacto</h3>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg border ${border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-orange-500" />
                      <span className={`text-xs font-semibold ${textPrimary}`}>Email</span>
                    </div>
                    <div className="space-y-1 pl-6">
                      <a href="mailto:soporte@annalogica.eu" className={`block text-xs ${textSecondary} hover:text-orange-500`}>
                        📧 soporte@annalogica.eu
                      </a>
                      <p className={`text-[10px] ${textSecondary}`}>Para consultas técnicas y soporte</p>
                    </div>
                    <div className="space-y-1 pl-6 mt-2">
                      <a href="mailto:ventas@annalogica.eu" className={`block text-xs ${textSecondary} hover:text-orange-500`}>
                        💼 ventas@annalogica.eu
                      </a>
                      <p className={`text-[10px] ${textSecondary}`}>Para consultas comerciales y ventas</p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border ${border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      <span className={`text-xs font-semibold ${textPrimary}`}>Dirección</span>
                    </div>
                    <div className="pl-6">
                      <p className={`text-xs ${textSecondary}`}>videoconversion digital lab, S.L.</p>
                      <p className={`text-xs ${textSecondary}`}>Barcelona, España</p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border ${border} ${darkMode ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className={`text-xs font-semibold ${textPrimary}`}>Horario de atención</span>
                    </div>
                    <div className="pl-6">
                      <p className={`text-xs ${textSecondary}`}>Lunes a Viernes: 9:00 - 18:00 (CET)</p>
                      <p className={`text-xs ${textSecondary}`}>Fin de semana: Cerrado</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Política de Retención */}
          <div className={`${bgSecondary} rounded-lg ${border} border p-6 lg:col-span-2`}>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-blue-500" />
              <h2 className={`text-lg font-semibold ${textPrimary}`}>Política de Retención de Archivos</h2>
            </div>

            <div className={`${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg p-5`}>
              <div className="space-y-4 text-sm">
                <p className={`font-medium ${darkMode ? 'text-blue-100' : 'text-blue-900'}`}>
                  Los archivos procesados se almacenan temporalmente en nuestros servidores por un máximo de <strong className={darkMode ? 'text-blue-400' : 'text-blue-600'}>30 días</strong>.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className={`font-semibold mb-2 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>✅ Archivos guardados (30 días):</p>
                    <ul className={`list-disc list-inside pl-2 space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      <li>Transcripciones (TXT)</li>
                      <li>Subtítulos (SRT y VTT)</li>
                      <li>Resúmenes (TXT)</li>
                      <li>Tags y metadatos</li>
                    </ul>
                  </div>

                  <div>
                    <p className={`font-semibold mb-2 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>❌ NO se guardan:</p>
                    <ul className={`list-disc list-inside pl-2 space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      <li>Archivos de audio/video originales</li>
                      <li className="text-xs italic">(Se eliminan tras el procesamiento)</li>
                    </ul>
                  </div>
                </div>

                <div className={`${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-300'} border rounded-lg p-4 mt-4`}>
                  <div className="flex gap-3">
                    <span className={`text-lg ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>⚠️</span>
                    <div>
                      <p className={`font-semibold text-sm mb-1 ${darkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>Importante</p>
                      <p className={`text-xs ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                        Descarga todos tus archivos procesados antes de que se cumplan los 30 días.
                        Pasado ese plazo, los archivos se eliminarán <strong>automáticamente y de forma permanente</strong> de nuestros servidores.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Esta política garantiza la privacidad de tus datos y el cumplimiento con regulaciones de protección de datos (GDPR/LOPD).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-zinc-500">
            annalogica by videoconversion digital lab, S.L.
          </p>
          <p className="text-xs text-zinc-500">
            From Barcelona with love
          </p>
        </div>
      </div>
    </div>
  );
}
