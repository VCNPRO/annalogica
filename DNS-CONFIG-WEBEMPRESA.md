# 🌐 Configuración DNS para annalogica.eu en Webempresa

## 📋 Registros DNS a Configurar

Entra al panel de Webempresa → **Gestión DNS** → **annalogica.eu**

---

### ✅ Opción Recomendada: Registros A

Agrega los siguientes registros **A** (Address):

| Tipo | Nombre/Host | Valor/Destino | TTL |
|------|-------------|---------------|-----|
| **A** | `@` | `76.76.21.21` | 3600 |
| **A** | `www` | `76.76.21.21` | 3600 |

**Nota:** El `@` representa el dominio raíz (annalogica.eu)

---

### 🔄 Pasos en Webempresa:

1. **Accede a tu panel de Webempresa**
   - URL: https://www.webempresa.com/panel/
   - Login con tus credenciales

2. **Ve a la sección de Dominios**
   - Busca **annalogica.eu**
   - Click en **Gestión DNS** o **Zona DNS**

3. **Edita/Agrega los registros A:**

   **Registro 1:**
   - Tipo: `A`
   - Host/Nombre: `@` (o vacío, o `annalogica.eu`)
   - Apunta a: `76.76.21.21`
   - TTL: `3600` (o el predeterminado)

   **Registro 2:**
   - Tipo: `A`
   - Host/Nombre: `www`
   - Apunta a: `76.76.21.21`
   - TTL: `3600` (o el predeterminado)

4. **Elimina registros conflictivos** (si existen):
   - Elimina cualquier registro A anterior que apunte a otra IP
   - Puedes mantener registros MX (email) si los tienes

5. **Guarda los cambios**

---

### ⏱️ Tiempo de Propagación

- **Mínimo:** 5-15 minutos
- **Normal:** 1-4 horas
- **Máximo:** 24-48 horas

---

### ✅ Verificación

Una vez configurado, espera unos minutos y verifica:

**Opción 1 - Navegador:**
- Ve a: https://annalogica.eu
- Ve a: https://www.annalogica.eu

**Opción 2 - Comando:**
```bash
# Verificar registro A
nslookup annalogica.eu
nslookup www.annalogica.eu

# O con dig (Linux/Mac)
dig annalogica.eu
dig www.annalogica.eu
```

**Opción 3 - Online:**
- https://dnschecker.org/#A/annalogica.eu

---

### 🔒 Certificado SSL

Vercel generará automáticamente un certificado SSL gratuito de Let's Encrypt una vez que los DNS estén configurados y verificados.

---

### 📞 Soporte

Si tienes problemas:
- **Webempresa:** soporte@webempresa.com
- **Vercel Dashboard:** https://vercel.com/solammedia-9886s-projects/annalogica/settings/domains

---

## 🎯 Resultado Final

Una vez completado:
- ✅ **annalogica.eu** → Tu aplicación
- ✅ **www.annalogica.eu** → Tu aplicación
- ✅ HTTPS automático con certificado SSL
- ✅ Redirección automática de www a dominio principal (o viceversa)
