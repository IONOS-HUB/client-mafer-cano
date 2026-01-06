# Guía Rápida de Configuración SRI

## Paso 1: Colocar el Certificado

Coloque su archivo `.p12` en la carpeta `config/`:

```
config/
  └── tu-certificado.p12
```

## Paso 2: Crear archivo .env.local

Cree un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
# ============================================
# CONFIGURACIÓN SUPABASE (ya existente)
# ============================================
PUBLIC_SUPABASE_URL=tu_url_supabase
PUBLIC_SUPABASE_ANON=tu_key_supabase

# ============================================
# CONFIGURACIÓN SRI - FACTURACIÓN ELECTRÓNICA
# ============================================

# Información de la Empresa (Públicas)
NEXT_PUBLIC_SRI_RUC=1003573167001
PUBLIC_SRI_RAZON_SOCIAL=MAFER CANO
PUBLIC_SRI_NOMBRE_COMERCIAL=MAFER CANO
PUBLIC_SRI_DIRECCION_MATRIZ=Av. Camilo Ponce y Av. Ricardo Sánchez
PUBLIC_SRI_ESTABLECIMIENTO=001
PUBLIC_SRI_PUNTO_EMISION=001
PUBLIC_SRI_AMBIENTE=1
# Ambiente: "1" = Pruebas, "2" = Producción

# Certificado de Firma Electrónica (Privadas - solo servidor)
# Opción A: Archivo local (recomendado para desarrollo)
SRI_P12_PATH=config/tu-certificado.p12
SRI_P12_PASSWORD=tu_contraseña_del_certificado

# Opción B: URL pública (para producción)
# SRI_P12_URL=https://tu-servidor.com/certificado.p12
# SRI_P12_PASSWORD=tu_contraseña_del_certificado

# Endpoints del SRI (Opcionales - usa pruebas por defecto)
# SRI_RECEPTION_URL=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
# SRI_AUTHORIZATION_URL=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
```

## Paso 3: Reemplazar los valores

Reemplace los siguientes valores con su información real:

1. **NEXT_PUBLIC_SRI_RUC**: Su RUC
2. **PUBLIC_SRI_RAZON_SOCIAL**: Razón social de su empresa
3. **PUBLIC_SRI_DIRECCION_MATRIZ**: Dirección matriz de su empresa
4. **PUBLIC_SRI_ESTABLECIMIENTO**: Número de establecimiento (ej: "001")
5. **PUBLIC_SRI_PUNTO_EMISION**: Punto de emisión (ej: "001")
6. **SRI_P12_PATH**: Nombre de su archivo .p12 en la carpeta config/
7. **SRI_P12_PASSWORD**: Contraseña de su certificado .p12

## Paso 4: Ejecutar migración de base de datos

Ejecute la migración para agregar los campos necesarios:

```sql
-- Ejecutar: database/migrations/add_sri_invoice_fields.sql
```

O ejecute manualmente en su base de datos:

```sql
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS sri_access_key text,
ADD COLUMN IF NOT EXISTS sri_authorization_number text,
ADD COLUMN IF NOT EXISTS sri_status text DEFAULT 'pending' CHECK (sri_status IN ('pending', 'sent', 'authorized', 'rejected', 'error')),
ADD COLUMN IF NOT EXISTS sri_error_message text,
ADD COLUMN IF NOT EXISTS sri_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sri_authorized_at timestamp with time zone;
```

## Paso 5: Reiniciar el servidor

Después de configurar las variables de entorno, reinicie el servidor de desarrollo:

```bash
npm run dev
```

## Verificación

Para verificar que todo está configurado correctamente:

1. Realice una venta de prueba
2. Revise la consola del servidor para ver los logs del proceso SRI
3. Verifique en la base de datos que los campos `sri_status`, `sri_access_key`, etc. se hayan actualizado

## Notas Importantes

- ✅ El archivo `.env.local` NO debe subirse a Git (ya está en .gitignore)
- ✅ El certificado `.p12` NO debe subirse a Git (ya está en .gitignore)
- ✅ Use ambiente de pruebas (`PUBLIC_SRI_AMBIENTE=1`) hasta que todo funcione correctamente
- ✅ Asegúrese de tener activado el ambiente de pruebas en su cuenta del SRI

## Solución de Problemas

### Error: "Configuración del SRI incompleta"
- Verifique que todas las variables estén en `.env.local`
- Verifique que el nombre del archivo en `SRI_P12_PATH` coincida con el archivo en `config/`
- Reinicie el servidor después de cambiar las variables

### Error: "No se puede leer el archivo .p12"
- Verifique que el archivo existe en la ruta especificada
- Verifique que la ruta en `SRI_P12_PATH` sea correcta (relativa a la raíz del proyecto)
- Verifique los permisos del archivo

### Error: "Contraseña incorrecta"
- Verifique que `SRI_P12_PASSWORD` sea la contraseña correcta del certificado
- Asegúrese de que no haya espacios extra en la contraseña

