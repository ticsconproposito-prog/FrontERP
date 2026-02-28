import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useAuth } from '../../context/AuthContext'

const AppHeaderDropdown = () => {
  const { usuario, fechaLogin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const nombreUsuario = usuario?.usuario || usuario?.nombre || 'Usuario'

  const fechaFormateada = (() => {
    if (!fechaLogin) return null
    try {
      const fecha = new Date(fechaLogin)
      const dia = String(fecha.getDate()).padStart(2, '0')
      const mes = String(fecha.getMonth() + 1).padStart(2, '0')
      const anio = fecha.getFullYear()
      const horas = String(fecha.getHours()).padStart(2, '0')
      const minutos = String(fecha.getMinutes()).padStart(2, '0')
      return `${dia}/${mes}/${anio} ${horas}:${minutos}`
    } catch {
      return null
    }
  })()

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        {/* Avatar genérico con ícono de persona */}
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a237e, #1565c0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <CIcon icon={cilUser} style={{ color: '#fff', width: '20px', height: '20px' }} />
        </div>
      </CDropdownToggle>

      <CDropdownMenu className="pt-0" placement="bottom-end" style={{ minWidth: '220px' }}>
        <div className="px-3 py-3 bg-body-secondary border-bottom">
          <div className="d-flex align-items-center gap-2 mb-1">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a237e, #1565c0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CIcon icon={cilUser} style={{ color: '#fff', width: '16px', height: '16px' }} />
            </div>
            <div className="lh-sm">
              <div className="fw-semibold" style={{ fontSize: '14px' }}>
                {nombreUsuario}
              </div>
              {fechaFormateada && (
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  Ingreso: {fechaFormateada}
                </div>
              )}
            </div>
          </div>
        </div>

        <CDropdownDivider className="m-0" />

        <CDropdownItem
          as="button"
          onClick={handleLogout}
          className="text-danger d-flex align-items-center gap-2 py-2"
        >
          <CIcon icon={cilLockLocked} className="me-1" />
          Cerrar Sesión
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
