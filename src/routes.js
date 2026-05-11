import React from 'react'

const Principal = React.lazy(() => import('./views/dashboard/Dashboard'))

// Páginas del CRM
const Productos = React.lazy(() => import('./views/pages/productos/gestionProductos'))
const Movimientos = React.lazy(() => import('./views/pages/productos/movimientos'))
const AgregarMovimiento = React.lazy(() => import('./views/pages/productos/agregarMovimiento'))
const VerMovimiento = React.lazy(() => import('./views/pages/productos/verMovimiento'))
const EditarMovimiento = React.lazy(() => import('./views/pages/productos/editarMovimiento'))
const ReporteInventario = React.lazy(() => import('./views/pages/productos/reporteInventario'))
const Proveedores = React.lazy(() => import('./views/pages/productos/proveedores'))
const mntFacturacion = React.lazy(() => import('./views/pages/ventas/mntFacturacion'))
const Clientes = React.lazy(() => import('./views/pages/ventas/clientes'))
const ReporteVentas = React.lazy(() => import('./views/pages/reportes/reporteVentas'))
const ReporteConsignaciones = React.lazy(() => import('./views/pages/reportes/reporteConsignaciones'))
const Facturacion = React.lazy(() => import('./views/pages/ventas/facturacion'))
const Empleados = React.lazy(() => import('./views/pages/seguridad/empleados'))
const Usuarios = React.lazy(() => import('./views/pages/seguridad/usuarios'))
const Paginas = React.lazy(() => import('./views/pages/seguridad/paginas'))
const Perfiles = React.lazy(() => import('./views/pages/seguridad/perfiles'))
const PerfilesPaginas = React.lazy(() => import('./views/pages/seguridad/perfilesPaginas'))
const UsuariosPerfiles = React.lazy(() => import('./views/pages/seguridad/usuariosPerfiles'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Principal', element: Principal },
  { path: '/pages/productos/gestionProductos', name: 'Productos', element: Productos },
  { path: '/pages/productos/movimientos', name: 'Movimientos', element: Movimientos },
  { path: '/pages/productos/agregar-movimiento', name: 'Agregar Movimiento', element: AgregarMovimiento },
  { path: '/pages/productos/ver-movimiento/:id', name: 'Ver Movimiento', element: VerMovimiento },
  { path: '/pages/productos/editar-movimiento/:id', name: 'Editar Movimiento', element: EditarMovimiento },
  { path: '/pages/productos/reporte-inventario', name: 'Reporte Inventario', element: ReporteInventario },
  { path: '/pages/productos/proveedores', name: 'Proveedores', element: Proveedores },
  { path: '/pages/ventas/facturacion', name: 'Facturacion', element: Facturacion },
  { path: '/pages/ventas/clientes', name: 'Clientes', element: Clientes },
  { path: '/pages/reportes/reporteVentas', name: 'Reporte de Ventas', element: ReporteVentas },
  { path: '/pages/reportes/reporteConsignaciones', name: 'Reporte de Consignaciones', element: ReporteConsignaciones },
  { path: '/pages/ventas/mntFacturacion', name: 'Detalle de Facturas', element: mntFacturacion },
  { path: '/pages/seguridad/empleados', name: 'Empleados', element: Empleados },
  { path: '/pages/seguridad/usuarios', name: 'Usuarios', element: Usuarios },
  { path: '/pages/seguridad/paginas', name: 'Paginas', element: Paginas },
  { path: '/pages/seguridad/perfiles', name: 'Perfiles', element: Perfiles },
  { path: '/pages/seguridad/perfilesPaginas', name: 'Páginas por Perfil', element: PerfilesPaginas },
  { path: '/pages/seguridad/usuariosPerfiles', name: 'Perfiles por Usuario', element: UsuariosPerfiles },
]

export default routes
