import React, { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'
import { useAuth } from '../context/AuthContext'

import logo from 'src/assets/images/logo-ferreteria-agmner.png'

// sidebar nav config
import navigation from '../_nav'

// Rutas siempre visibles sin importar el perfil
const RUTAS_PUBLICAS = ['/dashboard', '/']

const filtrarNavegacion = (items, urlsPermitidas, permisosCargados, tienePerfiles) => {
  if (!permisosCargados) return []

  const filtrarEstrictamente = tienePerfiles

  // Primera pasada: filtrar items normales (los CNavTitle pasan siempre)
  const filtrados = items.reduce((acc, item) => {
    // CNavTitle: incluir provisionalmente (se depuran luego)
    if (!item.to && !item.items) {
      return [...acc, item]
    }

    // Grupos con sub-items: filtrar sus hijos
    if (item.items) {
      const subItemsFiltrados = item.items.filter((sub) => {
        if (!sub.to) return true
        if (RUTAS_PUBLICAS.includes(sub.to)) return true
        if (!filtrarEstrictamente) return true
        return urlsPermitidas.includes(sub.to)
      })
      if (subItemsFiltrados.length > 0) {
        return [...acc, { ...item, items: subItemsFiltrados }]
      }
      return acc
    }

    // Items individuales
    if (!item.to) return [...acc, item]
    if (RUTAS_PUBLICAS.includes(item.to)) return [...acc, item]
    if (!filtrarEstrictamente) return [...acc, item]
    if (urlsPermitidas.includes(item.to)) return [...acc, item]

    return acc
  }, [])

  // Segunda pasada: quitar CNavTitle que no tengan items visibles debajo
  return filtrados.filter((item, idx) => {
    const esTitle = !item.to && !item.items
    if (!esTitle) return true
    // Buscar si hay al menos un item no-title antes del siguiente title
    for (let i = idx + 1; i < filtrados.length; i++) {
      const siguiente = filtrados[i]
      if (!siguiente.to && !siguiente.items) break // otro title → no hay items
      return true // hay al menos un item visible
    }
    return false
  })
}

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { paginasPermitidas, permisosCargados, tienePerfiles } = useAuth()

  // Memoizamos el filtrado para evitar recomputarlo en cada render del sidebar
  const navFiltrado = useMemo(
    () => filtrarNavegacion(navigation, paginasPermitidas, permisosCargados, tienePerfiles),
    [paginasPermitidas, permisosCargados, tienePerfiles],
  )

  return (
    <CSidebar
      className="border-end"
      colorScheme="light "
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom py-3">
        <CSidebarBrand className="d-none d-md-flex justify-content-center w-100" to="/">
          <img
            src={logo}
            alt="Ferreteria y Blockera Agmner"
            style={{ display: 'block', margin: '0 auto', width: '85%', maxWidth: '220px', height: 'auto' }}
          />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={navFiltrado} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
