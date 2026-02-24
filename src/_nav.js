import CIcon from '@coreui/icons-react'
import {
  cilLibraryAdd,
  cilCash,
  cilChart,
  cilHome,
  cilStar,
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
        name: 'Consulta Facturas',
        to: '/base/breadcrumbs',
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
        name: 'Resumen de Ventas',
        to: '/forms/checks-radios',
      },
      {
        component: CNavItem,
        name: 'Detalle de Ventas',
        to: '/forms/floating-labels',
      },
      {
        component: CNavItem,
        name: 'Facturas Proveedores',
        to: '/forms/form-control',
      },
    ],
  },
  {
    component: CNavTitle,
    name: 'Extras',
  },
  {
    component: CNavGroup,
    name: 'Pages',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Login',
        to: '/login',
      },
      {
        component: CNavItem,
        name: 'Register',
        to: '/register',
      },
      {
        component: CNavItem,
        name: 'Error 404',
        to: '/404',
      },
      {
        component: CNavItem,
        name: 'Error 500',
        to: '/500',
      },
    ],
  }
]

export default _nav
