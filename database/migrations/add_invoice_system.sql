-- ============================================
-- SISTEMA DE TALONERÍA (INVOICE NUMBERING)
-- ============================================

-- Agregar columna de número de factura a la tabla sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE;

-- Crear secuencia para numeración automática de facturas
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

-- Función para generar el siguiente número de factura
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
    next_num integer;
    invoice_num text;
BEGIN
    -- Obtener el siguiente número de la secuencia
    next_num := nextval('invoice_number_seq');
    
    -- Formatear como: 001-001-000000001 (establecimiento-punto emisión-secuencial)
    invoice_num := '001-001-' || LPAD(next_num::text, 9, '0');
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar automáticamente el número de factura al crear una venta
CREATE OR REPLACE FUNCTION assign_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_invoice_number_trigger ON public.sales;
CREATE TRIGGER sales_invoice_number_trigger
    BEFORE INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION assign_invoice_number();

-- ============================================
-- MEJORAR STOCK_ADJUSTMENTS PARA VENTAS
-- ============================================

-- Agregar columna para referenciar la venta (si el ajuste fue por una venta)
ALTER TABLE public.stock_adjustments 
ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL;

-- Agregar columna para referenciar el item específico de la venta
ALTER TABLE public.stock_adjustments 
ADD COLUMN IF NOT EXISTS sale_item_id uuid REFERENCES public.sale_items(id) ON DELETE SET NULL;

-- Índice para búsquedas por venta
CREATE INDEX IF NOT EXISTS stock_adjustments_sale_id_idx 
    ON public.stock_adjustments(sale_id);

-- Comentarios para documentación
COMMENT ON COLUMN public.stock_adjustments.sale_id IS 'ID de la venta que causó este ajuste (null si no fue por venta)';
COMMENT ON COLUMN public.stock_adjustments.sale_item_id IS 'ID del item de venta específico que causó este ajuste';
COMMENT ON COLUMN public.sales.invoice_number IS 'Número de factura único generado automáticamente (formato: 001-001-000000001)';

-- Índice para búsquedas por número de factura
CREATE INDEX IF NOT EXISTS sales_invoice_number_idx 
    ON public.sales(invoice_number);
