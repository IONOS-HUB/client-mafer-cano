-- ============================================
-- TABLA DE CLIENTES
-- ============================================

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    identification_type text NOT NULL CHECK (identification_type IN ('ruc', 'cedula', 'passport')),
    identification text NOT NULL UNIQUE,
    business_name text,
    name text,
    email text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para búsquedas rápidas por identificación
CREATE INDEX IF NOT EXISTS customers_identification_idx 
    ON public.customers(identification);

-- Índice para búsquedas por tipo de identificación
CREATE INDEX IF NOT EXISTS customers_identification_type_idx 
    ON public.customers(identification_type);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS customers_updated_at_trigger ON public.customers;
CREATE TRIGGER customers_updated_at_trigger
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.customers IS 'Tabla para almacenar información de clientes';
COMMENT ON COLUMN public.customers.identification IS 'Número de identificación único (RUC, Cédula o Pasaporte)';
COMMENT ON COLUMN public.customers.business_name IS 'Razón social (solo para RUC)';
COMMENT ON COLUMN public.customers.name IS 'Nombre completo (solo para cédula/pasaporte)';

