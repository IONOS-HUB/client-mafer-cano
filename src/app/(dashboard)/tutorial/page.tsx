"use client";

import { Card } from "@/components/ui/card";
import { 
    ShoppingCart, 
    Package, 
    BarChart3, 
    Settings, 
    Plus, 
    Search, 
    Filter,
    FileText,
    Printer,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    ArrowRight,
    Users,
    Receipt,
    Tag
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TutorialPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4 mb-8">
                <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
                    Guía del Sistema
                </h1>
                <p className="text-lg text-zinc-600 dark:text-zinc-400">
                    Aprende a usar todas las funcionalidades del sistema de gestión
                </p>
            </div>

            {/* Tabla de Contenidos */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
                    Tabla de Contenidos
                </h2>
                <nav className="space-y-2">
                    <a href="#punto-de-venta" className="block text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" />
                        1. Punto de Venta (POS)
                    </a>
                    <a href="#productos-servicios" className="block text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" />
                        2. Productos y Servicios
                    </a>
                    <a href="#historial-inventario" className="block text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" />
                        3. Historial de Inventario
                    </a>
                    <a href="#configuracion" className="block text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" />
                        4. Configuración
                    </a>
                </nav>
            </Card>

            {/* Sección 1: Punto de Venta */}
            <section id="punto-de-venta" className="scroll-mt-8">
                <Card className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                                Punto de Venta (POS)
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Gestiona las ventas de productos y servicios
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <Plus className="h-5 w-5 text-blue-500" />
                                Agregar Productos y Servicios
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Haz clic en <strong>"Agregar Producto"</strong> para añadir productos al carrito</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Haz clic en <strong>"Agregar Servicio"</strong> para añadir servicios al carrito</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Puedes buscar productos por código de barras o por nombre</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Ajusta las cantidades directamente en el carrito</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Elimina items del carrito haciendo clic en el ícono de eliminar</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                Procesar Venta
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Una vez que tengas items en el carrito, haz clic en <strong>"Procesar Venta"</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Selecciona el tipo de factura: <strong>Consumidor Final</strong> o <strong>Con Datos</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Si es "Con Datos", completa la información del cliente (nombre, RUC/CI, dirección, etc.)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Selecciona el método de pago: <strong>Efectivo</strong>, <strong>Tarjeta</strong> o <strong>Transferencia</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Si pagas con efectivo, ingresa el monto recibido para calcular el cambio automáticamente</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Confirma la venta y se generará automáticamente la factura</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <Printer className="h-5 w-5 text-blue-500" />
                                Imprimir Factura
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Después de confirmar la venta, se abrirá automáticamente la vista de impresión</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Usa <strong>Ctrl + P</strong> (o Cmd + P en Mac) para imprimir</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Configura la impresora térmica como destino de impresión</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>El ticket se imprime en formato estándar de 80mm</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>💡 Tip:</strong> El stock de productos se actualiza automáticamente cuando realizas una venta.
                            </p>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Sección 2: Productos y Servicios */}
            <section id="productos-servicios" className="scroll-mt-8">
                <Card className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                                Productos y Servicios
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Administra tu catálogo de productos y servicios
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <Plus className="h-5 w-5 text-green-500" />
                                Gestión de Productos
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Haz clic en <strong>"Agregar Producto"</strong> para crear un nuevo producto</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Completa la información: código de barras, descripción, precio y stock inicial</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Edita productos existentes haciendo clic en el ícono de editar</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Busca productos usando la barra de búsqueda o escaneando el código de barras</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Los productos se organizan automáticamente por nombre</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <Tag className="h-5 w-5 text-green-500" />
                                Gestión de Servicios
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Haz clic en <strong>"Agregar Servicio"</strong> para crear un nuevo servicio</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Ingresa la descripción y el precio del servicio</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Los servicios no tienen stock, solo precio</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Edita servicios haciendo clic en el ícono de editar</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                Ajustes de Stock
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Haz clic en <strong>"Ajustar Stock"</strong> en cualquier producto</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Selecciona el tipo de ajuste: <strong>Entrada</strong> (aumentar) o <strong>Salida</strong> (disminuir)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Ingresa la cantidad a ajustar</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Selecciona el motivo del ajuste (compra, devolución, corrección, etc.)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Todos los ajustes se registran en el historial de inventario</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Sección 3: Historial de Inventario */}
            <section id="historial-inventario" className="scroll-mt-8">
                <Card className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                                Historial de Inventario
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Consulta todos los movimientos de stock registrados
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <Search className="h-5 w-5 text-purple-500" />
                                Filtros de Búsqueda
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Búsqueda por Producto:</strong> Escribe el nombre del producto para filtrar</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Tipo de Ajuste:</strong> Filtra por "Entrada" o "Salida" de stock</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Rango de Fechas:</strong> Selecciona una fecha "Desde" y "Hasta" para ver movimientos en un período específico</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Los filtros se aplican automáticamente mientras escribes o seleccionas</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Haz clic en "Limpiar Todo" para resetear todos los filtros</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <FileText className="h-5 w-5 text-purple-500" />
                                Información de la Tabla
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Fecha y Hora:</strong> Muestra cuándo se realizó el ajuste</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Producto:</strong> Nombre del producto afectado (pasa el mouse para ver el nombre completo)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Código:</strong> Código de barras del producto</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Tipo:</strong> Badge verde para "Entrada" (aumento) o rojo para "Salida" (disminución)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Cantidad:</strong> Cantidad ajustada (positiva para entradas, negativa para salidas)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Stock Nuevo:</strong> Stock resultante después del ajuste</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span><strong>Motivo:</strong> Razón del ajuste (pasa el mouse para ver el motivo completo)</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-purple-500" />
                                Ver Facturas Relacionadas
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Si el ajuste fue por una venta, verás un botón <strong>"Ver Factura"</strong> en la columna Acciones</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Haz clic en el botón para ver los detalles completos de la factura</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Puedes imprimir un duplicado de la factura desde la ventana de detalles</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <Filter className="h-5 w-5 text-purple-500" />
                                Paginación
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>La tabla muestra 10 registros por página</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Usa los botones "Anterior" y "Siguiente" para navegar entre páginas</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Se muestra el total de registros y el rango actual</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Sección 4: Configuración */}
            <section id="configuracion" className="scroll-mt-8">
                <Card className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Settings className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                                Configuración
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Configuración de la impresora y preferencias del sistema
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <Printer className="h-5 w-5 text-amber-500" />
                                Impresora Térmica
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>El sistema utiliza la impresión del navegador (Ctrl + P o Cmd + P)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Las facturas se imprimen en formato estándar de 80mm</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Usa el botón <strong>"Imprimir Prueba"</strong> para verificar que la impresora funcione correctamente</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Asegúrate de seleccionar tu impresora térmica como destino de impresión</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-white flex items-center gap-2">
                                <FileText className="h-5 w-5 text-amber-500" />
                                Prueba de Impresión
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 ml-7">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Ve a la página de <strong>Configuración</strong> para encontrar la sección de Prueba de Impresión</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Haz clic en el botón <strong>"Imprimir Prueba"</strong> para generar un ticket de prueba</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>El sistema generará automáticamente un ticket de prueba con información básica</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Verifica que el formato sea correcto y que la impresora responda adecuadamente</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Si el ticket de prueba se imprime correctamente, tu impresora está lista para usar</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <span>Puedes repetir esta prueba cuantas veces necesites para ajustar la configuración</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>⚠️ Nota:</strong> Si tienes problemas con la impresión, verifica que la impresora térmica esté conectada y configurada como predeterminada en tu sistema operativo.
                            </p>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Botón para volver a Configuración */}
            <div className="flex justify-center pt-6">
                <Link href="/settings">
                    <Button variant="outline" size="lg" className="gap-2">
                        <ArrowRight className="h-4 w-4 rotate-180" />
                        Volver a Configuración
                    </Button>
                </Link>
            </div>
        </div>
    );
}

