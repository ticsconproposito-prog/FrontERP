import CIcon from '@coreui/icons-react'
import {
  cilLibraryAdd,
  cilCash,
  cilChart,
  cilHome,
  cilPeople,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Inicio',
    to: '/dashboard',
    icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Principal',
  },
  {
    component: CNavGroup,
    name: 'ventas',
    to: '/base',
    icon: <CIcon icon={cilCash} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Facturación',
        to: '/pages/ventas/facturacion',
      },
      {
        component: CNavItem,
        name: 'Detalle de Facturas',
        to: '/pages/ventas/mntFacturacion',
      },
      {
        component: CNavItem,
        name: 'Clientes',
        to: '/pages/ventas/clientes',
      }
    ],
  },
  {
    component: CNavGroup,
    name: 'Gestión de Productos',
    to: '/buttons',
    icon: <CIcon icon={cilLibraryAdd} customClassName="nav-icon" />,
    items: [
       {
        component: CNavItem,
        name: 'Productos',
        to: '/pages/productos/gestionProductos',
      },
      {
        component: CNavItem,
        name: 'Movimientos',
        to: '/pages/productos/movimientos',
      },
      {
        component: CNavItem,
        name: 'Inventario',
        to: '/pages/productos/reporte-inventario',
      },
      {
        component: CNavItem,
        name: 'Proveedores',
        to: '/pages/productos/proveedores',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Reportes',
    icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Ventas',
        to: '/pages/reportes/reporteVentas',
      }, 
      {
        component: CNavItem,
        name: 'Consignaciones',
        to: '/pages/reportes/reporteConsignaciones',
      },
    ],
  },
  {
    component: CNavTitle,
    name: 'Seguridad',
  },
  {
    component: CNavGroup,
    name: 'Usuarios',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Empleados',
        to: '/pages/seguridad/empleados',
      },
      {
        component: CNavItem,
        name: 'Usuarios',
        to: '/pages/seguridad/usuarios',
      },
      {
        component: CNavItem,
        name: 'Páginas',
        to: '/pages/seguridad/paginas',
      },
      {
        component: CNavItem,
        name: 'Perfiles',
        to: '/pages/seguridad/perfiles',
      },
      {
        component: CNavItem,
        name: 'Páginas por Perfil',
        to: '/pages/seguridad/perfilesPaginas',
      },
      {
        component: CNavItem,
        name: 'Perfiles por Usuario',
        to: '/pages/seguridad/usuariosPerfiles',
      },
    ],
  },
]

export default _nav
