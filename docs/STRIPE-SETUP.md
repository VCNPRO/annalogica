# 🚀 Guía de Configuración de Stripe para Annalogica

**Fecha:** 11 de Octubre, 2025
**Estado:** ✅ Implementación completa - Requiere configuración

Esta guía te llevará paso a paso por la configuración de Stripe en tu aplicación Annalogica.

---

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Paso 1: Ejecutar migración de base de datos](#paso-1-ejecutar-migración-de-base-de-datos)
3. [Paso 2: Crear cuenta de Stripe](#paso-2-crear-cuenta-de-stripe)
4. [Paso 3: Crear productos y precios en Stripe](#paso-3-crear-productos-y-precios-en-stripe)
5. [Paso 4: Configurar variables de entorno](#paso-4-configurar-variables-de-entorno)
6. [Paso 5: Configurar webhook](#paso-5-configurar-webhook)
7. [Paso 6: Activar Customer Portal](#paso-6-activar-customer-portal)
8. [Paso 7: Testing en modo test](#paso-7-testing-en-modo-test)
9. [Paso 8: Activar modo producción](#paso-8-activar-modo-producción)
10. [Troubleshooting](#troubleshooting)

---

## Pre-requisitos

✅ Código de Stripe ya implementado (completado)
✅ Cuenta de Stripe (crear en Paso 2)
✅ Acceso al dashboard de Neon Database
✅ Acceso al dashboard de Vercel

---

## Paso 1: Ejecutar migración de base de datos

### 1.1 Abrir Neon Dashboard

```
URL: https://console.neon.tech/app/projects/lucky-surf-17443478
```

### 1.2 Ir a SQL Editor

1. Click en "SQL Editor" en el menú lateral
2. Selecciona la base de datos: **annalogica_01**
3. Copia y pega el contenido del archivo: `lib/db-migration-stripe.sql`

### 1.3 Ejecutar migración

```sql
-- El archivo contiene:
-- ✅ Añadir columnas de Stripe a tabla users
-- ✅ Crear tabla payment_history
-- ✅ Crear tabla promo_codes
-- ✅ Crear tabla promo_code_usage
-- ✅ Crear índices para performance
-- ✅ Crear función reset_monthly_quotas()
```

4. Click en "Run" para ejecutar
5. Verifica que se ejecutó correctamente (sin errores en rojo)

### 1.4 Verificar migración

Ejecuta esta query para verificar:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
  'stripe_customer_id',
  'stripe_subscription_id',
  'subscription_status',
  'subscription_plan',
  'monthly_quota',
  'monthly_usage'
)
ORDER BY column_name;
```

Deberías ver 6 columnas en los resultados.

---

## Paso 2: Crear cuenta de Stripe

### 2.1 Registro

1. Ve a: https://dashboard.stripe.com/register
2. Completa el formulario con tus datos:
   - Email empresarial
   - Nombre de la empresa: **videoconversion digital lab, S.L.**
   - País: **España**
3. Verifica tu email

### 2.2 Completar perfil empresarial

1. En Dashboard → Settings → Business settings
2. Añade:
   - **CIF/NIF:** [Tu CIF]
   - **Dirección fiscal:** [Tu dirección en Barcelona]
   - **Teléfono de contacto**
   - **Website:** https://annalogica.eu

### 2.3 Añadir cuenta bancaria

1. En Dashboard → Settings → Bank accounts and scheduling
2. Click "Add bank account"
3. Ingresa tus datos bancarios (IBAN español)
4. Stripe hará 2 micro-depósitos para verificar (1-2 días hábiles)
5. Verifica los montos cuando lleguen

> **Nota:** Hasta que verifiques la cuenta bancaria, los fondos quedarán en balance pendiente.

---

## Paso 3: Crear productos y precios en Stripe

### 3.1 Crear producto "Básico"

1. En Dashboard → Products → Click "+ Add product"
2. **Name:** Básico
3. **Description:** Para usuarios individuales y pequeños proyectos
4. **Pricing:**
   - Model: **Recurring**
   - Price: **€49**
   - Billing period: **Monthly**
5. **Currency:** EUR
6. Click "Save product"
7. **IMPORTANTE:** Copia el **Price ID** (empieza con `price_...`)

### 3.2 Crear producto "Pro"

1. Click "+ Add product"
2. **Name:** Pro
3. **Description:** Para profesionales y pequeñas empresas
4. **Pricing:**
   - Model: **Recurring**
   - Price: **€99**
   - Billing period: **Monthly**
5. **Currency:** EUR
6. Click "Save product"
7. **IMPORTANTE:** Copia el **Price ID**

### 3.3 Crear producto "Business"

1. Click "+ Add product"
2. **Name:** Business
3. **Description:** Para equipos y empresas medianas
4. **Pricing:**
   - Model: **Recurring**
   - Price: **€249**
   - Billing period: **Monthly**
5. **Currency:** EUR
6. Click "Save product"
7. **IMPORTANTE:** Copia el **Price ID**

### 3.4 Crear producto "Universidad"

1. Click "+ Add product"
2. **Name:** Universidad
3. **Description:** Para instituciones educativas
4. **Pricing:**
   - Model: **Recurring**
   - Price: **€999**
   - Billing period: **Monthly**
5. **Currency:** EUR
6. Click "Save product"
7. **IMPORTANTE:** Copia el **Price ID**

### 3.5 Crear producto "Medios"

1. Click "+ Add product"
2. **Name:** Medios
3. **Description:** Para emisoras de radio/TV y productoras
4. **Pricing:**
   - Model: **Recurring**
   - Price: **€2999**
   - Billing period: **Monthly**
5. **Currency:** EUR
6. Click "Save product"
7. **IMPORTANTE:** Copia el **Price ID**

### 3.6 Tabla de Price IDs

Crea una tabla como esta para guardar tus Price IDs:

| Plan | Price | Price ID (Test) | Price ID (Production) |
|------|-------|-----------------|----------------------|
| Básico | €49/mes | price_xxx... | price_xxx... |
| Pro | €99/mes | price_xxx... | price_xxx... |
| Business | €249/mes | price_xxx... | price_xxx... |
| Universidad | €999/mes | price_xxx... | price_xxx... |
| Medios | €2999/mes | price_xxx... | price_xxx... |

> **Importante:** Tendrás que crear los productos DOS VECES:
> - Una vez en **Test mode** (para pruebas)
> - Una vez en **Live mode** (para producción)

---

## Paso 4: Configurar variables de entorno

### 4.1 Obtener API Keys de Stripe

#### Test Mode (para desarrollo):

1. En Dashboard, asegúrate de estar en **Test mode** (switch arriba a la derecha)
2. Ve a: Developers → API keys
3. Copia:
   - **Publishable key:** (empieza con `pk_test_...`)
   - **Secret key:** Click "Reveal" y copia (empieza con `sk_test_...`)

#### Live Mode (para producción):

1. Cambia a **Live mode**
2. Ve a: Developers → API keys
3. Copia:
   - **Publishable key:** (empieza con `pk_live_...`)
   - **Secret key:** Click "Reveal" y copia (empieza con `sk_live_...`)

### 4.2 Añadir variables en Vercel

1. Ve a: https://vercel.com/solammedia-9886s-projects/annalogica
2. Click en "Settings" → "Environment Variables"

#### Para Development (Testing):

Añade estas variables con scope **Development**:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=[dejar en blanco por ahora]

STRIPE_PRICE_BASICO=price_xxxxxxxxxx  # Test Price ID
STRIPE_PRICE_PRO=price_xxxxxxxxxx     # Test Price ID
STRIPE_PRICE_BUSINESS=price_xxxxxxxxxx # Test Price ID
STRIPE_PRICE_UNIVERSIDAD=price_xxxxxxxxxx # Test Price ID
STRIPE_PRICE_MEDIOS=price_xxxxxxxxxx  # Test Price ID
```

#### Para Production (después de testing):

Añade estas variables con scope **Production**:

```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=[configurar en Paso 5]

STRIPE_PRICE_BASICO=price_xxxxxxxxxx  # Live Price ID
STRIPE_PRICE_PRO=price_xxxxxxxxxx     # Live Price ID
STRIPE_PRICE_BUSINESS=price_xxxxxxxxxx # Live Price ID
STRIPE_PRICE_UNIVERSIDAD=price_xxxxxxxxxx # Live Price ID
STRIPE_PRICE_MEDIOS=price_xxxxxxxxxx  # Live Price ID
```

3. Click "Save" en cada variable

### 4.3 Añadir NEXT_PUBLIC_BASE_URL

```bash
NEXT_PUBLIC_BASE_URL=https://annalogica.eu
```

---

## Paso 5: Configurar webhook

Los webhooks son CRÍTICOS para que Stripe notifique a tu app de pagos, cancelaciones, etc.

### 5.1 Crear endpoint de webhook

1. En Stripe Dashboard → Developers → Webhooks
2. Click "+ Add endpoint"
3. **Endpoint URL:**
   ```
   https://annalogica.eu/api/stripe/webhook
   ```
4. **Events to listen:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.created`
   - `customer.updated`

5. Click "Add endpoint"

### 5.2 Obtener Webhook Secret

1. Click en el webhook que acabas de crear
2. En la sección "Signing secret", click "Reveal"
3. Copia el secret (empieza con `whsec_...`)

### 5.3 Añadir Webhook Secret a Vercel

1. Ve a Vercel → Settings → Environment Variables
2. Edita la variable `STRIPE_WEBHOOK_SECRET`
3. Pega el valor: `whsec_xxxxxxxxxx`
4. Scope: **Production** (o ambos si vas a probar)
5. Save

### 5.4 Redeploy de Vercel

```bash
git commit --allow-empty -m "Update webhook secret"
git push origin main
```

O desde Vercel Dashboard → Deployments → Click "Redeploy"

---

## Paso 6: Activar Customer Portal

El Customer Portal permite a los usuarios gestionar sus suscripciones.

### 6.1 Configurar portal

1. En Stripe Dashboard → Settings → Customer portal
2. Click "Activate portal"
3. **Configuración recomendada:**

**Customization:**
- **Business name:** Annalogica
- **Color:** #f97316 (naranja)
- **Logo:** [Subir logo si tienes]

**Features:**
- ✅ **Update payment method** (Enable)
- ✅ **Cancel subscriptions** (Enable)
  - Cancel options: "At period end" and "Immediately"
- ✅ **Update subscriptions** (Enable)
  - Allow switching between plans
  - Proration: Standard prorated charges
- ✅ **Invoice history** (Enable)

**Terms of service:**
- URL: `https://annalogica.eu/terms` (crear página si no existe)

**Privacy policy:**
- URL: `https://annalogica.eu/privacy` (crear página si no existe)

4. Click "Save changes"

---

## Paso 7: Testing en modo test

### 7.1 Tarjetas de prueba

Usa estas tarjetas en **Test mode**:

**Pago exitoso:**
```
Número: 4242 4242 4242 4242
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

**Pago rechazado:**
```
Número: 4000 0000 0000 0002
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

**Requiere autenticación (3D Secure):**
```
Número: 4000 0025 0000 3155
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

### 7.2 Flujo de testing completo

1. **Registro de usuario:**
   ```
   - Ve a https://annalogica.eu/register
   - Crea una cuenta de prueba
   ```

2. **Ver planes:**
   ```
   - Ve a https://annalogica.eu/pricing
   - Verifica que se muestran todos los planes correctamente
   ```

3. **Seleccionar plan:**
   ```
   - Click en "Seleccionar Plan" del plan "Básico"
   - Deberías ser redirigido a Stripe Checkout
   ```

4. **Completar pago de prueba:**
   ```
   - Email: test@example.com
   - Card: 4242 4242 4242 4242
   - Fecha: 12/34
   - CVC: 123
   - Dirección: Cualquier dirección de prueba
   - Click "Pay"
   ```

5. **Verificar redirección exitosa:**
   ```
   - Deberías ver /checkout/success
   - Esperar 5 segundos y ser redirigido al dashboard
   ```

6. **Verificar actualización en base de datos:**
   ```sql
   SELECT
     id,
     email,
     subscription_plan,
     subscription_status,
     monthly_quota,
     stripe_customer_id,
     stripe_subscription_id
   FROM users
   WHERE email = 'test@example.com';
   ```

   Deberías ver:
   - `subscription_plan`: "basico"
   - `subscription_status`: "active"
   - `monthly_quota`: 100
   - `stripe_customer_id`: "cus_..."
   - `stripe_subscription_id`: "sub_..."

7. **Verificar en Settings:**
   ```
   - Ve a https://annalogica.eu/settings
   - Deberías ver tu plan "Básico" activo
   - Barra de uso 0/100
   - Botón "Gestionar Suscripción"
   ```

8. **Probar Customer Portal:**
   ```
   - Click en "Gestionar Suscripción"
   - Deberías abrir el Stripe Customer Portal
   - Prueba actualizar método de pago
   - Prueba cancelar suscripción
   ```

9. **Verificar webhook logs:**
   ```
   - Ve a Stripe Dashboard → Developers → Webhooks
   - Click en tu webhook
   - Tab "Recent events"
   - Deberías ver todos los eventos procesados correctamente (200 OK)
   ```

### 7.3 Testing de cancelación

1. Desde Customer Portal, cancela la suscripción
2. Verifica que en Settings aparezca el aviso de cancelación
3. Verifica en base de datos:
   ```sql
   SELECT
     subscription_status,
     subscription_cancel_at_period_end
   FROM users
   WHERE email = 'test@example.com';
   ```

   Deberías ver:
   - `subscription_cancel_at_period_end`: true

---

## Paso 8: Activar modo producción

Una vez que TODO el testing esté OK:

### 8.1 Crear productos en Live Mode

1. En Stripe Dashboard, cambia a **Live mode**
2. Repite el [Paso 3](#paso-3-crear-productos-y-precios-en-stripe) completo
3. Guarda los nuevos Price IDs (empiezan con `price_live_...`)

### 8.2 Actualizar variables de producción

1. En Vercel → Settings → Environment Variables
2. **Edita** (no borres, edita) estas variables con scope **Production**:
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx
   STRIPE_PRICE_BASICO=price_live_xxxxxxxxxx
   STRIPE_PRICE_PRO=price_live_xxxxxxxxxx
   STRIPE_PRICE_BUSINESS=price_live_xxxxxxxxxx
   STRIPE_PRICE_UNIVERSIDAD=price_live_xxxxxxxxxx
   STRIPE_PRICE_MEDIOS=price_live_xxxxxxxxxx
   ```

### 8.3 Crear webhook en Live Mode

1. En Stripe Dashboard (Live mode) → Developers → Webhooks
2. Repite el [Paso 5.1](#51-crear-endpoint-de-webhook)
3. Copia el nuevo Webhook Secret (Live)
4. Actualiza `STRIPE_WEBHOOK_SECRET` en Vercel (Production)

### 8.4 Verificar cuenta bancaria

Asegúrate de haber:
- ✅ Verificado tu cuenta bancaria con los micro-depósitos
- ✅ Completado toda la información empresarial en Stripe
- ✅ Aceptado los términos de servicio de Stripe

### 8.5 Activar Stripe Tax (opcional pero recomendado)

1. En Stripe Dashboard → Settings → Tax
2. Click "Enable Stripe Tax"
3. Configura:
   - **Tax registration:** España (automático si tu cuenta es española)
   - **Products subject to tax:** All products
4. Cost: 0.5% sobre transacciones
5. Benefit: Cálculo automático de IVA para todos los países

### 8.6 Deploy final

```bash
git commit --allow-empty -m "Activate Stripe production mode"
git push origin main
```

### 8.7 Primer pago real de prueba (con tu tarjeta)

1. Crea una cuenta con tu email personal
2. Selecciona el plan más barato (Básico - €49)
3. Completa el pago con tu tarjeta real
4. Verifica todo el flujo
5. **IMPORTANTE:** Cancela inmediatamente desde Customer Portal si no quieres mantenerlo

---

## Troubleshooting

### ❌ Error: "No autorizado" en checkout

**Causa:** Token JWT inválido o expirado
**Solución:**
```bash
# Logout y login de nuevo
# O verifica en DevTools → Application → Cookies
# Debe existir cookie "token"
```

### ❌ Error: "Plan no disponible temporalmente"

**Causa:** `stripePriceId` no configurado en variables de entorno
**Solución:**
```bash
# Verifica que TODAS las variables STRIPE_PRICE_* estén configuradas
# En Vercel → Settings → Environment Variables
```

### ❌ Webhook signature verification failed

**Causa:** `STRIPE_WEBHOOK_SECRET` incorrecto
**Solución:**
```bash
# 1. Ve a Stripe → Developers → Webhooks
# 2. Click en tu webhook
# 3. "Signing secret" → Click "Reveal"
# 4. Copia el valor completo (whsec_...)
# 5. Actualiza en Vercel Environment Variables
# 6. Redeploy
```

### ❌ La suscripción no se actualiza en la base de datos

**Causa:** Webhook no está recibiendo eventos
**Solución:**
```bash
# 1. Verifica que el webhook está configurado en Stripe
# 2. URL correcta: https://annalogica.eu/api/stripe/webhook
# 3. Ve a Stripe → Webhooks → Tu webhook → "Recent events"
# 4. Busca errores (status diferente de 200)
# 5. Click en un evento para ver detalles del error
```

### ❌ Error 500 en /api/stripe/checkout

**Causa:** Error al crear customer o session
**Solución:**
```bash
# 1. Ve a Vercel → Deployments → Latest → Runtime Logs
# 2. Busca errores con [STRIPE] o [ERROR]
# 3. Verifica que STRIPE_SECRET_KEY sea correcto
# 4. Verifica que el Price ID exista en tu cuenta Stripe
```

### ❌ Portal no muestra opciones de cancelación

**Causa:** Customer Portal no configurado correctamente
**Solución:**
```bash
# Ve a Stripe → Settings → Customer portal
# Asegúrate de que "Cancel subscriptions" esté Enable
# Save changes
```

### 🔍 Debugging general

**Logs de Vercel:**
```
https://vercel.com/solammedia-9886s-projects/annalogica/logs
```

**Logs de Stripe:**
```
https://dashboard.stripe.com/logs
```

**Webhooks events:**
```
https://dashboard.stripe.com/webhooks
```

**Database queries (Neon):**
```sql
-- Ver todos los usuarios con suscripciones
SELECT
  id,
  email,
  subscription_plan,
  subscription_status,
  monthly_quota,
  monthly_usage,
  stripe_customer_id
FROM users
WHERE stripe_customer_id IS NOT NULL;

-- Ver historial de pagos
SELECT
  u.email,
  ph.amount,
  ph.currency,
  ph.status,
  ph.plan,
  ph.payment_date
FROM payment_history ph
JOIN users u ON ph.user_id = u.id
ORDER BY ph.payment_date DESC
LIMIT 10;
```

---

## ✅ Checklist final

Antes de considerar Stripe como "en producción", verifica:

### Base de datos:
- [ ] Migración ejecutada correctamente
- [ ] Todas las tablas creadas (users, payment_history, promo_codes, promo_code_usage)
- [ ] Índices creados

### Stripe Dashboard:
- [ ] Cuenta creada y verificada
- [ ] Cuenta bancaria añadida y verificada
- [ ] Productos creados en Test mode (5 planes)
- [ ] Productos creados en Live mode (5 planes)
- [ ] Webhook configurado en Test mode
- [ ] Webhook configurado en Live mode
- [ ] Customer Portal activado y configurado
- [ ] Stripe Tax activado (opcional)

### Vercel:
- [ ] Todas las variables de entorno configuradas (Development)
- [ ] Todas las variables de entorno configuradas (Production)
- [ ] STRIPE_SECRET_KEY (test y live)
- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test y live)
- [ ] STRIPE_WEBHOOK_SECRET (test y live)
- [ ] Los 5 STRIPE_PRICE_* (test y live)
- [ ] NEXT_PUBLIC_BASE_URL

### Testing:
- [ ] Registro de usuario funciona
- [ ] Página de pricing muestra todos los planes
- [ ] Checkout se abre correctamente
- [ ] Pago de prueba se completa
- [ ] Webhook recibe eventos (200 OK en Stripe logs)
- [ ] Base de datos se actualiza correctamente
- [ ] Settings muestra plan activo
- [ ] Customer Portal se abre
- [ ] Cancelación funciona correctamente

### Producción:
- [ ] Primer pago real completado
- [ ] Todo funciona en modo live
- [ ] Facturas se generan automáticamente
- [ ] Emails de Stripe se envían correctamente

---

## 📊 Próximos pasos

Una vez Stripe esté funcionando:

1. **Implementar protección de cuotas:**
   - Verificar `monthly_usage` antes de procesar archivos
   - Bloquear upload si `monthly_usage >= monthly_quota`
   - Mostrar mensaje sugiriendo upgrade

2. **Implementar códigos promocionales:**
   - Página de admin para crear códigos
   - Endpoint para validar códigos
   - Aplicar descuentos en checkout

3. **Implementar dashboard de administración:**
   - Ver todos los usuarios y sus suscripciones
   - Ver ingresos mensuales
   - Ver métricas de conversión
   - Exportar datos a CSV

4. **Emails transaccionales:**
   - Bienvenida tras registro
   - Confirmación de pago
   - Aviso de cancelación
   - Aviso cuando cuota se agote
   - Recordatorio de pago fallido

5. **Analytics:**
   - Integrar Google Analytics 4
   - Tracking de conversiones
   - Funnel de checkout
   - MRR (Monthly Recurring Revenue)
   - Churn rate

---

## 📞 Soporte

**Email:** soporte@annalogica.eu

**Stripe Documentation:**
- Subscriptions: https://stripe.com/docs/billing/subscriptions/overview
- Webhooks: https://stripe.com/docs/webhooks
- Testing: https://stripe.com/docs/testing

**Documentación interna:**
- `docs/STRIPE-GUIDE.md` - Explicación completa de Stripe
- `docs/PRICING-STRATEGY.md` - Estrategia de precios y ventas
- `docs/USER-MANAGEMENT.md` - Gestión de usuarios y cuotas

---

**Última actualización:** 11 de Octubre, 2025
**Autor:** Claude Code (Anthropic)
**Versión:** 1.0.0
