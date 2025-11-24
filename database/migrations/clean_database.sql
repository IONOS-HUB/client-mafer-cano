-- ============================================
-- LIMPIAR BASE DE DATOS (MANTENER PRODUCTOS Y SERVICIOS)
-- ============================================
-- Este script elimina todas las ventas y ajustes de inventario
-- pero MANTIENE los productos y servicios intactos

-- 1. Eliminar todos los items de ventas
-- (se eliminan automáticamente por CASCADE cuando se eliminan las ventas)

-- 2. Eliminar todas las ventas
DELETE FROM public.sales;

-- 3. Eliminar todos los ajustes de stock/inventario
DELETE FROM public.stock_adjustments;

-- 4. Reiniciar la secuencia de números de factura a 1
-- (para que la próxima factura sea 001-001-000000001)
ALTER SEQUENCE invoice_number_seq RESTART WITH 1;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Puedes ejecutar estas consultas para verificar que todo está limpio:

-- SELECT COUNT(*) FROM sales; -- Debe ser 0
-- SELECT COUNT(*) FROM sale_items; -- Debe ser 0
-- SELECT COUNT(*) FROM stock_adjustments; -- Debe ser 0
-- SELECT COUNT(*) FROM products; -- Debe mantener tus productos
-- SELECT COUNT(*) FROM services; -- Debe mantener tus servicios
