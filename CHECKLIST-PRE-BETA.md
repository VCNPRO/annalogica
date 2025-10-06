# ✅ CHECKLIST PRE-BETA - Testing Final

## 🧪 Tests que debes hacer AHORA (antes de invitar):

### 1. Test de Registro y Login (5 min)
- [ ] Ve a https://annalogica.eu/login
- [ ] Crea una cuenta nueva con email real
- [ ] Logout
- [ ] Login de nuevo con las mismas credenciales
- [ ] **Verificar:** No da error, entras al dashboard

### 2. Test de Upload (5 min)
- [ ] Sube un archivo de audio pequeño (MP3, <10 MB)
- [ ] **Verificar:** Barra de progreso funciona
- [ ] **Verificar:** No da error "Too many requests" (rate limiting OK)
- [ ] **Verificar:** Archivo aparece en "Archivos en proceso"

### 3. Test de Transcripción (10 min)
- [ ] El archivo anterior debe procesarse automáticamente
- [ ] Espera 1-3 minutos
- [ ] **Verificar:** Aparece en "Archivos procesados"
- [ ] **Verificar:** Puedes descargar TXT, SRT
- [ ] **Verificar:** Si el audio tiene >1 min, aparece resumen

### 4. Test de Dashboard Costes (3 min)
- [ ] Ve a https://annalogica.eu/admin
- [ ] **Verificar:** Ves estadísticas (no está vacío)
- [ ] **Verificar:** "Coste Total" muestra un valor (ej: $0.0245)
- [ ] **Verificar:** "Archivos Subidos" = 1
- [ ] **Verificar:** "Transcripciones" = 1

### 5. Test de Rate Limiting (2 min)
- [ ] Logout
- [ ] Intenta hacer login 6 veces con contraseña INCORRECTA
- [ ] **Verificar:** A la 6ta vez dice "Demasiados intentos"
- [ ] Espera 5 minutos o usa otra IP/navegador para continuar

### 6. Test de Páginas Legales (1 min)
- [ ] Ve a https://annalogica.eu/privacy
- [ ] **Verificar:** Página carga correctamente
- [ ] Ve a https://annalogica.eu/terms
- [ ] **Verificar:** Página carga correctamente
- [ ] **Verificar:** Footer tiene enlaces a Privacy, Terms, Contacto

### 7. Test de Validaciones (5 min)
- [ ] Intenta subir un archivo .ZIP o .PDF
- [ ] **Verificar:** Da error "Tipo de archivo no permitido"
- [ ] Intenta registrarte con email "test" (sin @)
- [ ] **Verificar:** Da error "Email inválido"
- [ ] Intenta registrarte con contraseña "123"
- [ ] **Verificar:** Da error "Mínimo 8 caracteres"

---

## 🔧 Si algo falla:

### Error: "No autorizado" al subir archivo
**Solución:** Verifica que el token JWT no expiró. Haz logout y login de nuevo.

### Error: "Demasiados archivos subidos"
**Solución:** Espera 1 hora o contacta conmigo para resetear rate limit.

### Error: No aparece en dashboard de costes
**Solución:** Refresca la página. Los datos pueden tardar 1-2 segundos en aparecer.

### Error al procesar transcripción
**Solución:** Verifica que:
- `REPLICATE_API_TOKEN` esté configurado en Vercel
- `CLAUDE_API_KEY` esté configurado en Vercel

---

## 🚀 Después del testing exitoso:

### 1. Prepara email de invitación beta
Incluye:
- Link directo: https://annalogica.eu/login
- Instrucciones: "Regístrate con tu email"
- Qué pueden hacer: Subir audio/video, obtener transcripciones + resúmenes
- Límites: 10 archivos/hora, máx 500 MB audio / 2 GB video
- Feedback: "Reporta errores a [tu email]"

### 2. Monitorea el dashboard
- Revisa https://annalogica.eu/admin cada día
- Busca usuarios con costes anormalmente altos
- Verifica que no haya errores en Vercel Logs

### 3. Prepara soporte
- Ten un email listo para soporte: support@annalogica.eu
- O usa el que prefieras para recibir feedback

---

## 📊 Métricas que deberías ver en Dashboard:

**Después de TU testing (1 usuario, 1 archivo):**
- Coste Total: ~$0.024 - $0.056 USD
- Uploads: 1
- Transcripciones: 1
- Resúmenes: 1 (si el audio tiene >1 min)
- Storage: 5-50 MB (dependiendo del archivo)

**Con 10 beta testers activos:**
- Coste Total: ~$2-5 USD/mes
- Usuarios Activos: 10
- Transcripciones: 20-50/mes
- Storage: 200 MB - 2 GB

---

## ⚠️ IMPORTANTE antes de invitar:

### Vercel Environment Variables
Ve a Vercel → Settings → Environment Variables y confirma que TODAS están configuradas:

- [x] `JWT_SECRET`
- [x] `BLOB_READ_WRITE_TOKEN`
- [x] `CLAUDE_API_KEY`
- [x] `REPLICATE_API_TOKEN`
- [x] `POSTGRES_URL` (y otras de Neon)
- [x] `UPSTASH_REDIS_REST_URL`
- [x] `UPSTASH_REDIS_REST_TOKEN`

### Vercel Deployment
- [ ] Ve a Vercel → Deployments
- [ ] **Verificar:** Último deploy es exitoso (verde)
- [ ] **Verificar:** Dominio annalogica.eu apunta al deployment

---

## 🎯 RESULTADO ESPERADO

Si TODOS los tests pasan:
✅ **Listo para beta testing**

Si 1-2 tests fallan:
⚠️ **Arregla y vuelve a testear**

Si 3+ tests fallan:
🚨 **Hay un problema serio, avísame**

---

## 📞 Contacto de emergencia

Si algo crítico falla después de invitar beta testers:
1. Ve a Vercel → Deployments → Redeploy (último commit estable)
2. Contacta conmigo aquí para debugging urgente
3. Envía email a beta testers: "Mantenimiento temporal, volvemos en 1 hora"

---

**Empieza el testing AHORA. Marca cada checkbox cuando lo completes.**
**Tiempo estimado total: ~30 minutos**
