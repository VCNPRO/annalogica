import http from 'k6/http';
import { check, sleep } from 'k6';

// --- CONFIGURACIÓN DE LA PRUEBA ---
export const options = {
  // Define las fases de la prueba de carga
  stages: [
    { duration: '30s', target: 10 }, // Rampa de 0 a 10 usuarios virtuales en 30s
    { duration: '1m', target: 10 },  // Mantiene 10 usuarios durante 1 minuto
    { duration: '10s', target: 0 },  // Rampa de bajada a 0 usuarios
  ],
};

// --- EL CÓDIGO QUE EJECUTA CADA USUARIO VIRTUAL ---
export default function () {
  const API_URL = 'https://TU_URL_DE_PREVIEW.vercel.app/api/start-job'; // ¡CAMBIA ESTO!

  // Datos de ejemplo que tu API esperaría
  const payload = JSON.stringify({
    audioUrl: 'https://URL_DE_UN_AUDIO_DE_PRUEBA.mp3', // Usa un archivo de audio real alojado en algún sitio
    filename: `test-audio-${__VU}-${__ITER}.mp3`,
    actions: ['Transcribir', 'Resumir', 'Oradores', 'Subtítulos'],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': 'Bearer TU_TOKEN_DE_AUTENTICACION', // Si tu API está protegida
    },
  };

  // Llama a tu API
  const res = http.post(API_URL, payload, params);

  // Comprueba que la respuesta es correcta (código 200 OK)
  check(res, { 'status was 200': (r) => r.status == 200 });

  sleep(1); // Espera 1 segundo antes de la siguiente iteración
}

