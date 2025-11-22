-- Eliminar columna price de la tabla services (si fue agregada)
ALTER TABLE services DROP COLUMN IF EXISTS price;
