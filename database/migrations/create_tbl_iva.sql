-- ============================================
-- TABLA DE CONFIGURACIÓN DE IVA
-- ============================================

-- Crear tabla para almacenar el valor del IVA
CREATE TABLE IF NOT EXISTS public.tbl_iva (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    value numeric NOT NULL DEFAULT 0.15, -- Valor por defecto 15% (0.15 como decimal)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear un trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_tbl_iva_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tbl_iva_updated_at_trigger ON public.tbl_iva;
CREATE TRIGGER tbl_iva_updated_at_trigger
    BEFORE UPDATE ON public.tbl_iva
    FOR EACH ROW
    EXECUTE FUNCTION update_tbl_iva_updated_at();

-- Insertar valor inicial si no existe
INSERT INTO public.tbl_iva (value)
SELECT 0.15
WHERE NOT EXISTS (SELECT 1 FROM public.tbl_iva);

-- Comentarios para documentación
COMMENT ON TABLE public.tbl_iva IS 'Tabla para almacenar el valor del IVA configurado en el sistema';
COMMENT ON COLUMN public.tbl_iva.value IS 'Valor del IVA como decimal (0.15 = 15%, 0.08 = 8%, etc.)';
COMMENT ON COLUMN public.tbl_iva.id IS 'ID único del registro (solo debe haber un registro)';
