'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Globe } from 'lucide-react';
import Link from 'next/link';

export default function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState('es');
  const [defaultOptions, setDefaultOptions] = useState({
    summaryType: 'detailed' as 'short' | 'detailed',
    autoGeneratePDF: true,
    autoGenerateSRT: true
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    const savedLang = localStorage.getItem('language') || 'es';
    const savedOptions = localStorage.getItem('defaultOptions');
    
    setTheme(savedTheme);
    setLanguage(savedLang);
    if (savedOptions) setDefaultOptions(JSON.parse(savedOptions));
    
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const saveOptions = () => {
    localStorage.setItem('defaultOptions', JSON.stringify(defaultOptions));
    alert('Preferencias guardadas');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <Link href="/" className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2 block">
            anna logica
          </Link>
          <p className="text-gray-600 dark:text-gray-300">Configuración</p>
        </header>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center">
              {theme === 'light' ? <Sun className="mr-3 h-6 w-6" /> : <Moon className="mr-3 h-6 w-6" />}
              Tema
            </h2>
            
            <div className="flex gap-4">
              <button onClick={toggleTheme} className={`flex-1 p-4 rounded-lg border-2 ${theme === 'light' ? 'border-orange-500' : 'border-gray-300'}`}>
                <Sun className="mx-auto h-8 w-8 mb-2" />
                <p>Claro</p>
              </button>
              
              <button onClick={toggleTheme} className={`flex-1 p-4 rounded-lg border-2 ${theme === 'dark' ? 'border-orange-500' : 'border-gray-300'}`}>
                <Moon className="mx-auto h-8 w-8 mb-2" />
                <p>Oscuro</p>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center">
              <Globe className="mr-3 h-6 w-6" />
              Idioma
            </h2>
            
            <select value={language} onChange={(e) => changeLanguage(e.target.value)} className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white">
              <option value="es">Español</option>
              <option value="ca">Català</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Opciones</h2>
            
            <div className="space-y-4">
              <select value={defaultOptions.summaryType} onChange={(e) => setDefaultOptions({...defaultOptions, summaryType: e.target.value as any})} className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white">
                <option value="short">Resumen Corto</option>
                <option value="detailed">Resumen Detallado</option>
              </select>

              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={defaultOptions.autoGeneratePDF} onChange={(e) => setDefaultOptions({...defaultOptions, autoGeneratePDF: e.target.checked})} className="w-4 h-4" />
                <span className="dark:text-white">Generar PDF automáticamente</span>
              </label>

              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={defaultOptions.autoGenerateSRT} onChange={(e) => setDefaultOptions({...defaultOptions, autoGenerateSRT: e.target.checked})} className="w-4 h-4" />
                <span className="dark:text-white">Generar SRT automáticamente</span>
              </label>
            </div>

            <button onClick={saveOptions} className="mt-6 w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700">
              Guardar
            </button>
          </div>

          <Link href="/" className="block text-center text-orange-600 hover:underline">← Volver</Link>
        </div>
      </div>
    </div>
  );
}
