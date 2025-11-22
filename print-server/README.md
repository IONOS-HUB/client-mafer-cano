# 🖨️ Servidor de Impresión Térmica

Este servidor local maneja la comunicación con la impresora térmica USB para imprimir facturas.

## 📋 Requisitos Previos

1. **Impresora térmica conectada por USB**
2. **Node.js instalado** (versión 14 o superior)
3. **Drivers de la impresora instalados**

## 🚀 Instalación

1. Navega a la carpeta del servidor de impresión:
```bash
cd print-server
```

2. Instala las dependencias:
```bash
npm install
```

## ▶️ Iniciar el Servidor

```bash
npm start
```

El servidor se iniciará en `http://localhost:3001`

## 🔧 Configuración

### Identificar tu impresora

Si la impresora no se detecta automáticamente, puedes listar los dispositivos USB:

```javascript
const USB = require('escpos-usb');
const devices = USB.findPrinter();
console.log(devices);
```

### Configurar datos del negocio

Edita el archivo `.env` en la raíz del proyecto y agrega:

```env
NEXT_PUBLIC_BUSINESS_NAME=MAFER CANO
NEXT_PUBLIC_BUSINESS_RUC=1003573167001
NEXT_PUBLIC_BUSINESS_ADDRESS=Av. Camilo Ponce y Av. Ricardo Sánchez
NEXT_PUBLIC_BUSINESS_PHONE=0998007892
```

## 📝 Formato de Factura

La factura impresa incluye:

- ✅ Encabezado con datos del negocio
- ✅ Número de factura
- ✅ Fecha y hora
- ✅ Datos del cliente (si aplica)
- ✅ Lista de productos/servicios
- ✅ Subtotal, IVA y Total
- ✅ Método de pago
- ✅ Mensaje de agradecimiento

## 🐛 Solución de Problemas

### La impresora no se detecta

1. Verifica que esté conectada y encendida
2. Instala los drivers del fabricante
3. En Windows, puede requerir permisos de administrador

### Error de permisos en Linux

```bash
sudo chmod 666 /dev/usb/lp0
```

O agregar tu usuario al grupo `lp`:
```bash
sudo usermod -a -G lp $USER
```

### La impresora imprime caracteres extraños

- Verifica el encoding en `server.js` (línea: `printer.encode('cp850')`)
- Prueba con otros encodings: `'cp437'`, `'iso88591'`, `'utf8'`

## 🔄 Mantener el servidor corriendo

### Opción 1: PM2 (Recomendado para producción)

```bash
npm install -g pm2
pm2 start server.js --name print-server
pm2 save
pm2 startup
```

### Opción 2: Ejecutar en segundo plano (Windows)

Crea un archivo `start-print-server.bat`:
```batch
@echo off
start /B node server.js
```

## 📡 API Endpoints

### GET /status
Verifica si el servidor está corriendo
```bash
curl http://localhost:3001/status
```

### POST /print
Envía un trabajo de impresión
```bash
curl -X POST http://localhost:3001/print \
  -H "Content-Type: application/json" \
  -d '{"invoiceNumber":"12345",...}'
```

## 🔐 Seguridad

⚠️ **IMPORTANTE**: Este servidor solo debe correr en la red local. NO exponerlo a internet.

## 📞 Soporte

Si tienes problemas, verifica:
1. Que el servidor esté corriendo (`npm start`)
2. Que la impresora esté conectada
3. Los logs en la consola del servidor
4. Los mensajes de error en el navegador (consola de desarrollador)
