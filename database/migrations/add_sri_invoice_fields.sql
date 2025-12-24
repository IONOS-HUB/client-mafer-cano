-- ============================================
-- CAMPOS PARA FACTURACIÓN ELECTRÓNICA SRI
-- ============================================

-- Agregar campos para el estado de facturación electrónica
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS sri_access_key text,
ADD COLUMN IF NOT EXISTS sri_authorization_number text,
ADD COLUMN IF NOT EXISTS sri_status text DEFAULT 'pending' CHECK (sri_status IN ('pending', 'sent', 'authorized', 'rejected', 'error')),
ADD COLUMN IF NOT EXISTS sri_error_message text,
ADD COLUMN IF NOT EXISTS sri_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sri_authorized_at timestamp with time zone;

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS sales_sri_access_key_idx ON public.sales(sri_access_key);
CREATE INDEX IF NOT EXISTS sales_sri_status_idx ON public.sales(sri_status);
CREATE INDEX IF NOT EXISTS sales_sri_authorization_number_idx ON public.sales(sri_authorization_number);

-- Comentarios para documentación
COMMENT ON COLUMN public.sales.sri_access_key IS 'Clave de acceso de la factura electrónica generada por el SRI';
COMMENT ON COLUMN public.sales.sri_authorization_number IS 'Número de autorización del SRI';
COMMENT ON COLUMN public.sales.sri_status IS 'Estado del proceso de facturación electrónica: pending, sent, authorized, rejected, error';
COMMENT ON COLUMN public.sales.sri_error_message IS 'Mensaje de error si el proceso falla';
COMMENT ON COLUMN public.sales.sri_sent_at IS 'Fecha y hora en que se envió la factura al SRI';
COMMENT ON COLUMN public.sales.sri_authorized_at IS 'Fecha y hora en que se autorizó la factura por el SRI';

