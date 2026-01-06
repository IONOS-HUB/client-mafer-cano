# Configuración de Facturación Electrónica SRI

Este documento explica cómo configurar el sistema de facturación electrónica del SRI de Ecuador.

## Requisitos Previos

1. **Certificado de Firma Electrónica (.p12)**
   - Debe obtener un certificado de firma electrónica de una entidad certificadora autorizada en Ecuador (Security Data, Banco Central, etc.)
   - El archivo debe estar en formato .p12
   - Debe conocer la contraseña del certificado

2. **Cuenta en el SRI**
   - Debe tener activado el ambiente de pruebas o producción en su cuenta del SRI
   - Debe tener configurado su RUC, establecimiento y punto de emisión

## Variables de Entorno

Cree un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

### Información de la Empresa (Públicas - usadas en el cliente)

```env
# Información de la empresa para facturación electrónica
NEXT_PUBLIC_SRI_RUC=1003573167001
PUBLIC_SRI_RAZON_SOCIAL=MAFER CANO
PUBLIC_SRI_NOMBRE_COMERCIAL=MAFER CANO
PUBLIC_SRI_DIRECCION_MATRIZ=Av. Camilo Ponce y Av. Ricardo Sánchez
PUBLIC_SRI_ESTABLECIMIENTO=001
PUBLIC_SRI_PUNTO_EMISION=001
PUBLIC_SRI_AMBIENTE=1
```

**Nota sobre el ambiente:**
- `1` = Ambiente de Pruebas (CELCER)
- `2` = Ambiente de Producción (CEL)

### Firma Electrónica (Privadas - solo servidor)

Tiene dos opciones para configurar el certificado:

**Opción 1: Archivo local (Recomendado para desarrollo)**
```env
# Ruta al archivo .p12 (relativa a la raíz del proyecto o absoluta)
SRI_P12_PATH=config/certificate.p12
# O ruta absoluta:
# SRI_P12_PATH=/ruta/absoluta/al/certificado.p12

# Contraseña del archivo .p12
SRI_P12_PASSWORD=tu_contraseña_del_certificado
```

**Opción 2: URL pública**
```env
# URL del archivo .p12 (debe ser accesible desde el servidor)
SRI_P12_URL=https://example.com/path/to/your-certificate.p12

# Contraseña del archivo .p12
SRI_P12_PASSWORD=tu_contraseña_del_certificado
```

**Recomendaciones:**
- Para desarrollo local: Use `SRI_P12_PATH` y coloque el certificado en la carpeta `config/`
- Para producción: Use `SRI_P12_URL` con un servidor seguro, o `SRI_P12_PATH` con una ruta absoluta segura
- **NUNCA** suba el archivo .p12 o su contraseña al repositorio Git

### Endpoints del SRI (Opcionales)

Si no se especifican, se usan los endpoints de prueba por defecto:

```env
# Ambiente de Pruebas (por defecto)
SRI_RECEPTION_URL=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
SRI_AUTHORIZATION_URL=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl

# Ambiente de Producción
# SRI_RECEPTION_URL=https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
# SRI_AUTHORIZATION_URL=https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
```

## Migración de Base de Datos

Ejecute la migración para agregar los campos necesarios:

```sql
-- Ejecutar el archivo: database/migrations/add_sri_invoice_fields.sql
```

O ejecute manualmente:

```sql
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS sri_access_key text,
ADD COLUMN IF NOT EXISTS sri_authorization_number text,
ADD COLUMN IF NOT EXISTS sri_status text DEFAULT 'pending' CHECK (sri_status IN ('pending', 'sent', 'authorized', 'rejected', 'error')),
ADD COLUMN IF NOT EXISTS sri_error_message text,
ADD COLUMN IF NOT EXISTS sri_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sri_authorized_at timestamp with time zone;
```

## Funcionamiento

Una vez configurado, el sistema enviará automáticamente las facturas al SRI cuando se complete una venta:

1. **Creación de Venta**: Se crea la venta en la base de datos con el número de factura
2. **Generación de Factura Electrónica**: Se genera el formato JSON/XML según especificaciones del SRI
3. **Firmado Digital**: Se firma el XML con el certificado .p12
4. **Envío al SRI**: Se envía a la recepción del SRI
5. **Autorización**: Si la recepción es exitosa, se solicita la autorización
6. **Actualización**: Se actualiza el estado en la base de datos

## Estados de Facturación

Los estados posibles son:

- `pending`: Pendiente de envío
- `sent`: Enviada al SRI (recepción exitosa)
- `authorized`: Autorizada por el SRI
- `rejected`: Rechazada por el SRI
- `error`: Error en el proceso

## Verificación

Para verificar que la configuración está correcta:

1. Verifique que todas las variables de entorno estén configuradas
2. Realice una venta de prueba
3. Revise los logs del servidor para ver el proceso
4. Verifique en la base de datos los campos `sri_status`, `sri_access_key`, etc.

## Solución de Problemas

### Error: "Configuración del SRI incompleta"
- Verifique que todas las variables requeridas estén en `.env.local`
- Reinicie el servidor después de agregar variables

### Error: "Error al enviar factura al SRI"
- Verifique que el certificado .p12 sea válido y la contraseña correcta
- Verifique que el ambiente esté activado en su cuenta del SRI
- Revise los logs del servidor para más detalles

### Error: "Error en la recepción del SRI"
- Verifique que los datos de la factura sean correctos
- Verifique que el número de factura no esté duplicado
- Revise que el formato de los datos cumpla con las especificaciones del SRI

## Notas Importantes

- **Seguridad**: Nunca suba el archivo .p12 o su contraseña al repositorio
- **Ambiente de Pruebas**: Siempre pruebe primero en el ambiente de pruebas antes de usar producción
- **Backup**: Mantenga un backup seguro de su certificado .p12
- **Vigencia**: Los certificados tienen fecha de vencimiento, renueve antes de que expire

## Referencias

- [open-factura](https://github.com/miguelangarano/open-factura) - Librería utilizada
- [SRI Ecuador](https://www.sri.gob.ec/) - Servicio de Rentas Internas
- [Ficha Técnica SRI](https://www.sri.gob.ec/web/guest/documentos-tecnicos) - Especificaciones técnicas



