# 🧪 Annalogica - Suite de Testing

Suite completa de pruebas para Annalogica, incluyendo tests funcionales, stress testing y monitoreo de performance.

## 📋 Tabla de Contenidos

- [Instalación](#instalación)
- [Smoke Tests](#smoke-tests)
- [Tests Funcionales](#tests-funcionales)
- [Stress Testing](#stress-testing)
- [Performance Monitoring](#performance-monitoring)

---

## 🚀 Instalación

### Requisitos previos
- Node.js >= 18.0.0
- npm >= 9.0.0

### Instalar Artillery
```bash
npm install -g artillery
```

---

## ✅ Smoke Tests (30 segundos)

Pruebas rápidas de funcionalidad básica.

```bash
# Producción
node testing/smoke-tests.js prod

# Local
node testing/smoke-tests.js local
```

---

## 🧪 Tests Funcionales

Verificación del fix de idiomas.

```bash
# Producción
node testing/test-language-fix.js prod
```

---

## 💪 Stress Testing

Pruebas de carga con Artillery.

```bash
# Test completo (4 min)
artillery run testing/stress-test.yml

# Test rápido (1 min)
artillery quick --count 10 --num 20 https://annalogica.eu
```

---

## 📊 Performance Monitoring

Monitoreo en tiempo real.

```bash
# Monitor 1 hora
node testing/performance-monitor.js

# Monitor 6 horas
node testing/performance-monitor.js 360
```

---

Ver documentación completa en cada archivo.
