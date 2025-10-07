@echo off
echo ============================================
echo  DESPLIEGUE AUTOMATIZADO DE ANNALOGICA
echo ============================================
echo.

REM Verificar autenticacion
echo [1/5] Verificando autenticacion con Vercel...
vercel whoami
if errorlevel 1 (
    echo ERROR: No estas autenticado. Ejecuta: vercel login
    pause
    exit /b 1
)
echo OK - Autenticado correctamente
echo.

REM Desplegar proyecto
echo [2/5] Desplegando proyecto a produccion...
vercel --prod --yes
if errorlevel 1 (
    echo ERROR: Fallo el despliegue
    pause
    exit /b 1
)
echo OK - Proyecto desplegado
echo.

REM Configurar variables de entorno
echo [3/5] Configurando variables de entorno...

echo Configurando BLOB_READ_WRITE_TOKEN...
echo vercel_blob_rw_W4eOcqrUcsLt0r7R_X2hj3wZXwABmPvRQigrYdfIvmFtAws | vercel env add BLOB_READ_WRITE_TOKEN production

echo Configurando REPLICATE_API_TOKEN...
echo r8_0WaidvCkAvjeymsLgR5G1ssKBwTMWzp2Cg0i2 | vercel env add REPLICATE_API_TOKEN production

echo Configurando CLAUDE_API_KEY...
echo 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 | vercel env add CLAUDE_API_KEY production

echo Configurando JWT_SECRET...
echo 48e3adbd0de095d25b833c23daea48c25780f02c191e2a98dad7f7ae2c5f02ab4291fd78332f7b3e306d2676ee0bf21586058ea00293c23125efde6c191852be | vercel env add JWT_SECRET production

echo OK - Variables configuradas
echo.

REM Re-desplegar con las variables
echo [4/5] Re-desplegando con variables de entorno...
vercel --prod --yes
echo OK - Re-despliegue completado
echo.

REM Verificar despliegue
echo [5/5] Verificando despliegue...
vercel ls
echo.

echo ============================================
echo  DESPLIEGUE COMPLETADO EXITOSAMENTE
echo ============================================
echo.
echo Tu aplicacion esta disponible en:
vercel ls --limit 1
echo.
pause
