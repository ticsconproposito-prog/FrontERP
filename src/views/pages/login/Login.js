import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useAuth } from '../../../context/AuthContext'

import logo from 'src/assets/images/logo-ferreteria-agmner.png'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ usuario: '', contrasena: '' })
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.usuario.trim() || !form.contrasena.trim()) {
      setError('Por favor ingrese usuario y contraseña.')
      return
    }

    setCargando(true)
    setError('')

    try {
      // 1. Obtener lista de usuarios y validar credenciales
      const resUsuarios = await fetch('/api/usuarios')
      if (!resUsuarios.ok) {
        setError('No se pudo conectar con el servidor. Intente nuevamente.')
        return
      }

      const listaUsuarios = await resUsuarios.json()
      const usuarioEncontrado = Array.isArray(listaUsuarios)
        ? listaUsuarios.find(
            (u) =>
              String(u.usuario || '').toLowerCase() === form.usuario.trim().toLowerCase() &&
              String(u.contrasena || '') === form.contrasena.trim(),
          )
        : null

      if (!usuarioEncontrado) {
        setError('Usuario o contraseña incorrectos.')
        return
      }

      const idUsuario = Number(
        usuarioEncontrado.idUsuario ?? usuarioEncontrado.id_Usuario ?? 0
      )

      // 2. Verificar si el usuario ya existe en /api/segLogins
      let idLoginNuevo = null
      try {
        const resSegLogins = await fetch('/api/segLogins')
        if (resSegLogins.ok) {
          const segLogins = await resSegLogins.json()
          const lista = Array.isArray(segLogins)
            ? segLogins
            : Array.isArray(segLogins?.content)
              ? segLogins.content
              : []

          // Buscar registro existente para este usuario
          const registroExistente = lista.find(
            (r) => Number(r.idUsuario ?? r.id_Usuario ?? -1) === idUsuario
          )

          if (registroExistente) {
            // Ya existe: actualizar estadoConexion a Activo
            const idLoginExistente =
              registroExistente.idLogin ??
              registroExistente.id_Login ??
              registroExistente.idSegLogin ??
              null

           /* console.log('[Login] Registro existente encontrado, actualizando:', idLoginExistente)*/

            const resEditar = await fetch(`/api/editarSegLogin/${idLoginExistente}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idLogin: idLoginExistente, idUsuario, estadoConexion: 'Activo' }),
            })
            if (resEditar.ok) {
              idLoginNuevo = idLoginExistente
            }
          } else {
            // No existe: insertar nuevo registro
            /* console.log('[Login] No existe registro, insertando nuevo para idUsuario:', idUsuario) */

            const resGrabar = await fetch('/api/grabarSegLogin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idUsuario, estadoConexion: 'Activo' }),
            })
            if (resGrabar.ok) {
              const texto = await resGrabar.text()
              idLoginNuevo = parseInt(texto, 10) || null
            }
          }
        }
      } catch (e) {
        console.warn('[Login] No se pudo gestionar el registro de sesión:', e)
      }

      // 3. Guardar sesión y cargar permisos
      await login(usuarioEncontrado, idLoginNuevo)
      navigate('/dashboard')
    } catch (err) {
      setError('No se pudo conectar con el servidor. Intente nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div
      className="min-vh-100 d-flex flex-row align-items-center"
      style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 60%, #1565c0 100%)' }}
    >
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={5} lg={4}>
            <CCard className="shadow-lg border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              {/* Header de la tarjeta */}
              <div
                className="text-center py-4 px-4"
                style={{ background: 'linear-gradient(135deg, #1a237e, #1565c0)' }}
              >
                <img
                  src={logo}
                  alt="Logo"
                  style={{ maxWidth: '180px', width: '100%', height: 'auto' }}
                />
              </div>

              <CCardBody className="p-4 p-md-5">
                <h4 className="text-center mb-1 fw-bold" style={{ color: '#1a237e' }}>
                  Iniciar Sesión
                </h4>
                <p className="text-center text-muted small mb-4">
                  Ingrese sus credenciales para continuar
                </p>

                {error && (
                  <CAlert color="danger" className="py-2 small">
                    {error}
                  </CAlert>
                )}

                <CForm onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-muted">Usuario</label>
                    <CInputGroup>
                      <CInputGroupText style={{ background: '#e8eaf6', border: 'none' }}>
                        <CIcon icon={cilUser} style={{ color: '#1a237e' }} />
                      </CInputGroupText>
                      <CFormInput
                        name="usuario"
                        value={form.usuario}
                        onChange={handleChange}
                        placeholder="Nombre de usuario"
                        autoComplete="username"
                        disabled={cargando}
                        style={{ borderLeft: 'none' }}
                      />
                    </CInputGroup>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold small text-muted">Contraseña</label>
                    <CInputGroup>
                      <CInputGroupText style={{ background: '#e8eaf6', border: 'none' }}>
                        <CIcon icon={cilLockLocked} style={{ color: '#1a237e' }} />
                      </CInputGroupText>
                      <CFormInput
                        type={mostrarContrasena ? 'text' : 'password'}
                        name="contrasena"
                        value={form.contrasena}
                        onChange={handleChange}
                        placeholder="Contraseña"
                        autoComplete="current-password"
                        disabled={cargando}
                        style={{ borderLeft: 'none', borderRight: 'none' }}
                      />
                      <CInputGroupText
                        style={{ background: '#f8f9fa', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setMostrarContrasena((v) => !v)}
                        title={mostrarContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        <span style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
                          👁️
                          {mostrarContrasena && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '-1px',
                                right: '-1px',
                                height: '2px',
                                background: '#555',
                                transform: 'rotate(-45deg)',
                                display: 'block',
                              }}
                            />
                          )}
                        </span>
                      </CInputGroupText>
                    </CInputGroup>
                  </div>

                  <CButton
                    type="submit"
                    className="w-100 fw-semibold"
                    disabled={cargando}
                    style={{
                      background: 'linear-gradient(135deg, #1a237e, #1565c0)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '15px',
                    }}
                  >
                    {cargando ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Iniciando sesión...
                      </>
                    ) : (
                      'Ingresar'
                    )}
                  </CButton>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
