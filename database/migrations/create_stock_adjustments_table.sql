-- Tabla para el historial de ajustes de inventario
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid NOT NULL,
    adjustment_type text NOT NULL CHECK (adjustment_type IN ('add', 'subtract')),
    quantity integer NOT NULL CHECK (quantity > 0),
    reason text NOT NULL,
    previous_stock integer NOT NULL,
    new_stock integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id),
    CONSTRAINT stock_adjustments_product_id_fkey FOREIGN KEY (product_id) 
        REFERENCES public.products(id) ON DELETE CASCADE
);

-- Índice para mejorar el rendimiento de consultas por producto
CREATE INDEX IF NOT EXISTS stock_adjustments_product_id_idx 
    ON public.stock_adjustments(product_id);

-- Índice para mejorar el rendimiento de consultas por fecha
CREATE INDEX IF NOT EXISTS stock_adjustments_created_at_idx 
    ON public.stock_adjustments(created_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE public.stock_adjustments IS 'Historial de todos los ajustes de stock realizados en los productos';
COMMENT ON COLUMN public.stock_adjustments.adjustment_type IS 'Tipo de ajuste: add (entrada) o subtract (salida)';
COMMENT ON COLUMN public.stock_adjustments.quantity IS 'Cantidad ajustada (siempre positiva)';
COMMENT ON COLUMN public.stock_adjustments.reason IS 'Motivo del ajuste de stock';
COMMENT ON COLUMN public.stock_adjustments.previous_stock IS 'Stock antes del ajuste';
COMMENT ON COLUMN public.stock_adjustments.new_stock IS 'Stock después del ajuste';
