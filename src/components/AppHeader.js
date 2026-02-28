import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu } from '@coreui/icons'

import { AppBreadcrumb } from './index'
import { AppHeaderDropdown } from './header/index'
import { useAuth } from '../context/AuthContext'

const formatearFechaLogin = (isoString) => {
  if (!isoString) return ''
  try {
    const fecha = new Date(isoString)
    const dia = String(fecha.getDate()).padStart(2, '0')
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const anio = fecha.getFullYear()
    const horas = String(fecha.getHours()).padStart(2, '0')
    const minutos = String(fecha.getMinutes()).padStart(2, '0')
    return `${dia}/${mes}/${anio} ${horas}:${minutos}`
  } catch {
    return ''
  }
}

const AppHeader = () => {
  const headerRef = useRef()
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { usuario, fechaLogin } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }
    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  const nombreUsuario = usuario?.usuario || usuario?.nombre || 'Usuario'
  const fechaFormateada = formatearFechaLogin(fechaLogin)

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>

        {/* Nombre y fecha de logueo */}
        <CHeaderNav className="ms-auto me-3 d-none d-md-flex align-items-center">
          <div className="text-end lh-sm">
            <div className="fw-semibold" style={{ fontSize: '14px', color: '#1a237e' }}>
              {nombreUsuario}
            </div>
            {fechaFormateada && (
              <div className="text-muted" style={{ fontSize: '11px' }}>
                Ingreso: {fechaFormateada}
              </div>
            )}
          </div>
        </CHeaderNav>

        <CHeaderNav>
          <AppHeaderDropdown />
        </CHeaderNav>
      </CContainer>
      <CContainer className="px-4" fluid>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
