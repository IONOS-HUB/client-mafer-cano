-- Agregar columna para datos del cliente en la tabla sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS customer_data jsonb;

-- Agregar columna para método de pago si no existe
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('cash', 'card', 'transfer'));

-- Comentarios para documentación
COMMENT ON COLUMN public.sales.customer_data IS 'Datos del cliente para facturación (JSON). Null para consumidor final.';
COMMENT ON COLUMN public.sales.payment_method IS 'Método de pago: cash (efectivo), card (tarjeta), transfer (transferencia)';

-- Índice para búsquedas por método de pago
CREATE INDEX IF NOT EXISTS sales_payment_method_idx 
    ON public.sales(payment_method);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS sales_created_at_idx 
    ON public.sales(created_at DESC);
