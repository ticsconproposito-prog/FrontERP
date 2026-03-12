import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCol,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFile, cilList } from '@coreui/icons'

import logo from 'src/assets/images/logo-ferreteria-agmner.png'
import { useAuth } from 'src/context/AuthContext'

const Dashboard = () => {
  const navigate = useNavigate()
  const { paginasPermitidas, tienePerfiles } = useAuth()

  const tienePermiso = (ruta) => {
    if (!tienePerfiles) return true
    return paginasPermitidas.some((url) => url === ruta || url.includes(ruta) || ruta.includes(url))
  }

  const todosAccesos = [
    {
      title: 'Facturación',
      description: 'Crea y gestiona facturas de venta para tus clientes.',
      icon: cilFile,
      color: '#0d6efd',
      bg: '#e7f0ff',
      route: '/pages/ventas/facturacion',
    },
    {
      title: 'Reporte de Ventas',
      description: 'Consulta el historial y detalle de todas las facturas emitidas.',
      icon: cilList,
      color: '#198754',
      bg: '#e6f4ec',
      route: '/pages/reportes/reporteVentas',
    },
  ]

  const accesos = todosAccesos.filter((item) => tienePermiso(item.route))

  return (
    <>
      {/* Hero con logotipo */}
      <CCard
        className="mb-4 border-0 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
      >
        <CCardBody className="py-5 text-center">
          <img
            src={logo}
            alt="Ferreteria y Blockera Agmner"
            style={{
              maxWidth: '280px',
              width: '70%',
              height: 'auto',
              marginBottom: '1.5rem',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
            }}
          />
          <h2 className="text-white fw-bold mb-1" style={{ letterSpacing: '0.5px' }}>
            Ferretería y Blockera Agmner
          </h2>
          <p className="mb-0" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem' }}>
            Sistema de Gestión Empresarial
          </p>
        </CCardBody>
      </CCard>

      {/* Accesos rápidos */}
      <CRow className="mb-4 g-3">
        {accesos.map((item, idx) => (
          <CCol xs={12} sm={6} key={idx}>
            <CCard
              className="border-0 shadow-sm h-100"
              style={{ cursor: 'pointer', transition: 'transform 0.18s, box-shadow 0.18s' }}
              onClick={() => navigate(item.route)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <CCardBody className="d-flex align-items-center gap-3 py-4 px-4">
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: item.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CIcon icon={item.icon} style={{ color: item.color, width: 26, height: 26 }} />
                </div>
                <div>
                  <div className="fs-5 fw-bold mb-1" style={{ color: '#1a1a2e' }}>{item.title}</div>
                  <div className="text-muted small">{item.description}</div>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* Mensaje de bienvenida */}
      <CCard className="border-0 shadow-sm">
        <CCardBody className="text-center py-4">
          <p className="text-muted mb-0" style={{ maxWidth: 480, margin: '0 auto' }}>
            Utiliza el menú lateral para acceder a todas las secciones del sistema.
          </p>
        </CCardBody>
      </CCard>
    </>
  )
}

export default Dashboard
