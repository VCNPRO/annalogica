# Generación del PDF de la Guía de Usuario

## Opción 1: Usando Pandoc (Recomendado)

### Instalación de Pandoc
```bash
# Windows (con Chocolatey)
choco install pandoc

# macOS
brew install pandoc

# O descarga desde: https://pandoc.org/installing.html
```

### Generar PDF
```bash
cd public/docs

pandoc guia-usuario-annalogica.md \
  -o guia-usuario-annalogica.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=2.5cm \
  -V fontsize=11pt \
  -V documentclass=article \
  -V papersize=a4 \
  --toc \
  --toc-depth=2 \
  -V colorlinks=true \
  -V linkcolor=blue \
  -V urlcolor=blue
```

## Opción 2: Usar servicio online

1. Abre https://www.markdowntopdf.com/
2. Copia el contenido de `guia-usuario-annalogica.md`
3. Pégalo y genera el PDF
4. Descarga como `guia-usuario-annalogica.pdf`
5. Guárdalo en `public/docs/`

## Opción 3: Usar VS Code + Extensión

1. Instala la extensión "Markdown PDF" en VS Code
2. Abre `guia-usuario-annalogica.md`
3. Presiona `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac)
4. Escribe "Markdown PDF: Export (pdf)"
5. El PDF se generará automáticamente

## Personalización del PDF

Si quieres un PDF más profesional con el logo de Annalogica:

1. Descarga o crea el logo de Annalogica (logo.png)
2. Guárdalo en `public/docs/`
3. Usa este comando con Pandoc:

```bash
pandoc guia-usuario-annalogica.md \
  -o guia-usuario-annalogica.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=2.5cm \
  -V fontsize=11pt \
  -V mainfont="Arial" \
  --toc \
  --toc-depth=2 \
  -V colorlinks=true \
  -V linkcolor=orange \
  -V urlcolor=orange \
  --highlight-style=tango
```

## Verificación

Una vez generado el PDF, verifica que:
- ✓ El PDF está en `public/docs/guia-usuario-annalogica.pdf`
- ✓ El contenido es legible y bien formateado
- ✓ Los enlaces internos funcionan
- ✓ El tamaño del archivo es razonable (< 5MB)

El PDF estará disponible en: https://annalogica.vercel.app/docs/guia-usuario-annalogica.pdf
