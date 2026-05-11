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

// Timeout máximo para cualquier petición del flujo de login.
// Si el backend tarda más, la UI no se queda colgada indefinidamente.
const LOGIN_TIMEOUT_MS = 15_000

const fetchConTimeout = async (url, opciones = {}, timeoutMs = LOGIN_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opciones, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

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
      // 1. Validar credenciales y obtener idUsuario
      // NOTA DE SEGURIDAD: Idealmente esto debería ser POST /api/login que valide
      // en el servidor y devuelva un token. La validación en cliente expone
      // todas las contraseñas en el panel Network del navegador.
      // Mientras eso se implementa en backend, intentamos pedir el menor
      // volumen de datos posible.
      const resUsuarios = await fetchConTimeout('/api/usuarios?size=1000')
      if (!resUsuarios.ok) {
        setError('No se pudo conectar con el servidor. Intente nuevamente.')
        return
      }

      const listaUsuariosRaw = await resUsuarios.json()
      const listaUsuarios = Array.isArray(listaUsuariosRaw)
        ? listaUsuariosRaw
        : Array.isArray(listaUsuariosRaw?.content)
          ? listaUsuariosRaw.content
          : []

      const usuarioInput = form.usuario.trim().toLowerCase()
      const contrasenaInput = form.contrasena.trim()
      const usuarioEncontrado = listaUsuarios.find(
        (u) =>
          String(u.usuario || '').toLowerCase() === usuarioInput &&
          String(u.contrasena || '') === contrasenaInput,
      )

      if (!usuarioEncontrado) {
        setError('Usuario o contraseña incorrectos.')
        return
      }

      const idUsuario = Number(
        usuarioEncontrado.idUsuario ?? usuarioEncontrado.id_Usuario ?? 0
      )

      // 2. Marcar la sesión como activa en segLogins (no bloqueamos el login si falla)
      let idLoginNuevo = null
      try {
        const resSegLogins = await fetchConTimeout('/api/segLogins?size=1000')
        if (resSegLogins.ok) {
          const segLoginsRaw = await resSegLogins.json()
          const lista = Array.isArray(segLoginsRaw)
            ? segLoginsRaw
            : Array.isArray(segLoginsRaw?.content)
              ? segLoginsRaw.content
              : []

          const registroExistente = lista.find(
            (r) => Number(r.idUsuario ?? r.id_Usuario ?? -1) === idUsuario
          )

          if (registroExistente) {
            const idLoginExistente =
              registroExistente.idLogin ??
              registroExistente.id_Login ??
              registroExistente.idSegLogin ??
              null

            const resEditar = await fetchConTimeout(`/api/editarSegLogin/${idLoginExistente}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idLogin: idLoginExistente, idUsuario, estadoConexion: 'Activo' }),
            })
            if (resEditar.ok) {
              idLoginNuevo = idLoginExistente
            }
          } else {
            const resGrabar = await fetchConTimeout('/api/grabarSegLogin', {
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
        // Si segLogins falla por timeout o red, continuamos sin bloquear el login
        console.warn('[Login] No se pudo gestionar el registro de sesión:', e)
      }

      // 3. Guardar sesión y cargar permisos (paralelo dentro de AuthContext.login)
      await login(usuarioEncontrado, idLoginNuevo)
      navigate('/dashboard')
    } catch (err) {
      if (err?.name === 'AbortError') {
        setError('El servidor está tardando demasiado en responder. Intente de nuevo en unos segundos.')
      } else {
        setError('No se pudo conectar con el servidor. Intente nuevamente.')
      }
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
              {/* Header blanco con logo circular */}
              <div className="text-center pt-3 pb-0" style={{ background: '#fff' }}>
                <img
                  src={logo}
                  alt="Logo AGMNER"
                  style={{ maxWidth: '320px', width: '100%', height: 'auto' }}
                />
              </div>

              <CCardBody className="px-4 px-md-5 pb-4 pb-md-5 pt-1">
                <h4 className="text-center mb-1 fw-bold" style={{ color: '#1a237e' }}>
                  Iniciar Sesión
                </h4>
                <p className="text-center text-muted small mb-3">
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
