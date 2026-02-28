import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

const FORM_INICIAL = {
  idEmpleado: '',
  empleadoTexto: '',
  usuario: '',
  contrasena: '',
  comentario: '',
}

const Usuarios = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const [usuarios, setUsuarios] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idUsuarioEditar, setIdUsuarioEditar] = useState(null)

  const [visibleModal, setVisibleModal] = useState(false)
  const [modalExito, setModalExito] = useState(false)
  const [modalError, setModalError] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  const [modalEliminar, setModalEliminar] = useState(false)
  const [idEliminar, setIdEliminar] = useState(null)
  const [modalVer, setModalVer] = useState(false)
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [usuarioVer, setUsuarioVer] = useState(null)

  // Búsqueda de empleado
  const [sugerenciasEmpleado, setSugerenciasEmpleado] = useState([])
  const [mostrarSugerenciasEmpleado, setMostrarSugerenciasEmpleado] = useState(false)

  // Búsqueda en tabla
  const [busqueda, setBusqueda] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [rUsr, rEmp] = await Promise.all([
        fetch('/api/usuarios?size=1000'),
        fetch('/api/empleados?size=1000'),
      ])
      const dataUsr = await rUsr.json()
      const dataEmp = await rEmp.json()
      setUsuarios(Array.isArray(dataUsr) ? dataUsr : (dataUsr?.content || []))
      setEmpleados(Array.isArray(dataEmp) ? dataEmp : (dataEmp?.content || []))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrores((prev) => ({ ...prev, [name]: '' }))
  }

  const handleEmpleadoChange = (e) => {
    const valor = e.target.value
    setForm((prev) => ({ ...prev, empleadoTexto: valor, idEmpleado: '' }))
    setErrores((prev) => ({ ...prev, idEmpleado: '' }))
    const limpio = valor.trim().toLowerCase()
    if (limpio.length >= 2) {
      const encontrados = empleados.filter((emp) => {
        const nombre = `${emp.nombre || ''} ${emp.apellido || ''}`.toLowerCase()
        return nombre.includes(limpio)
      })
      setSugerenciasEmpleado(encontrados.slice(0, 10))
      setMostrarSugerenciasEmpleado(encontrados.length > 0)
    } else {
      setSugerenciasEmpleado([])
      setMostrarSugerenciasEmpleado(false)
    }
  }

  const seleccionarEmpleado = (emp) => {
    setForm((prev) => ({
      ...prev,
      idEmpleado: String(emp.idEmpleado ?? ''),
      empleadoTexto: `${emp.nombre || ''} ${emp.apellido || ''}`.trim(),
    }))
    setSugerenciasEmpleado([])
    setMostrarSugerenciasEmpleado(false)
    setErrores((prev) => ({ ...prev, idEmpleado: '' }))
  }

  const validar = () => {
    const nuevosErrores = {}
    if (!form.idEmpleado) nuevosErrores.idEmpleado = 'Seleccione un empleado válido'
    if (!String(form.usuario || '').trim()) nuevosErrores.usuario = 'El usuario es requerido'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const abrirModalNuevo = () => {
    setForm(FORM_INICIAL)
    setErrores({})
    setModoEdicion(false)
    setIdUsuarioEditar(null)
    setSugerenciasEmpleado([])
    setMostrarSugerenciasEmpleado(false)
    setVisibleModal(true)
  }

  const abrirModalEditar = (usr) => {
    const idEmp = getIdEmpleado(usr)
    const emp = empleados.find((e) => e.idEmpleado == idEmp)
    setForm({
      idEmpleado: String(idEmp),
      empleadoTexto: emp ? `${emp.nombre || ''} ${emp.apellido || ''}`.trim() : String(idEmp),
      usuario: usr.usuario || '',
      contrasena: '',
      comentario: usr.comentario || '',
    })
    setErrores({})
    setModoEdicion(true)
    setIdUsuarioEditar(usr.idUsuario)
    setSugerenciasEmpleado([])
    setMostrarSugerenciasEmpleado(false)
    setVisibleModal(true)
  }

  const guardarUsuario = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const body = {
        idEmpleado: parseInt(form.idEmpleado, 10),
        id_Empleado: parseInt(form.idEmpleado, 10),
        usuario: String(form.usuario || '').trim(),
        contrasena: String(form.contrasena || '').trim(),
        comentario: String(form.comentario || '').trim(),
        idUsuarioModificacion: idUsuarioActual,
      }

      let url = '/api/grabarUsuario'
      let method = 'POST'
      if (modoEdicion && idUsuarioEditar) {
        url = `/api/editarUsuario/${idUsuarioEditar}`
        method = 'PUT'
        body.idUsuario = parseInt(idUsuarioEditar, 10)
        body.id_Usuario = parseInt(idUsuarioEditar, 10)
      }

      console.log('URL:', url)
      console.log('Method:', method)
      console.log('Body enviado:', JSON.stringify(body, null, 2))

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const txt = await res.text()
        let msg = `Error ${res.status}`
        try {
          const json = JSON.parse(txt)
          msg = json?.message || json?.error || json?.detail || txt
        } catch { msg = txt }
        throw new Error(msg)
      }

      setVisibleModal(false)
      setMensajeExito(modoEdicion ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setMensajeError(err.message || 'Error al guardar el usuario')
      setModalError(true)
    } finally {
      setGuardando(false)
    }
  }

  const verUsuario = (usr) => {
    setUsuarioVer(usr)
    setModalVer(true)
  }

  const confirmarEliminar = (id) => {
    setIdEliminar(id)
    setModalEliminar(true)
  }

  const eliminarUsuario = async () => {
    try {
      const res = await fetch(`/api/eliminarUsuario/${idEliminar}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar el usuario')
      setModalEliminar(false)
      setMensajeExito('Usuario eliminado correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setModalEliminar(false)
      setMensajeError(err.message || 'Error al eliminar')
      setModalError(true)
    }
  }

  // Normaliza el campo idEmpleado que puede venir como id_Empleado o idEmpleado desde la API
  const getIdEmpleado = (usr) => usr?.idEmpleado ?? usr?.id_Empleado ?? ''

  const obtenerNombreEmpleado = (idEmpleado) => {
    const emp = empleados.find((e) => e.idEmpleado == idEmpleado)
    return emp ? `${emp.nombre || ''} ${emp.apellido || ''}`.trim() : idEmpleado || '—'
  }

  const usuariosFiltrados = usuarios.filter((usr) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      (usr.usuario || '').toLowerCase().includes(q) ||
      obtenerNombreEmpleado(getIdEmpleado(usr)).toLowerCase().includes(q) ||
      (usr.comentario || '').toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-3">Cargando usuarios...</p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong className="fs-4">Gestión de Usuarios</strong>
              <CButton color="primary" className="text-light" onClick={abrirModalNuevo}>
                + Nuevo Usuario
              </CButton>
            </CCardHeader>
            <CCardBody>
              {/* Búsqueda */}
              <CRow className="mb-3">
                <CCol md={4}>
                  <CFormInput
                    placeholder="Buscar por usuario, empleado o comentario..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </CCol>
              </CRow>

              {/* Tabla */}
              <CTable bordered hover responsive striped>
                <CTableHead className="table-primary">
                  <CTableRow>
                    <CTableHeaderCell className="py-2">#</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Usuario</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Empleado</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Comentario</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-center">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {usuariosFiltrados.length === 0 ? (
                    <CTableRow>
                        <CTableDataCell colSpan={6} className="text-center py-4 text-muted">
                        No hay usuarios registrados.
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    usuariosFiltrados.map((usr, idx) => (
                      <CTableRow key={usr.id_Usuario ?? usr.idUsuario ?? idx}>
                        <CTableDataCell>{idx + 1}</CTableDataCell>
                        <CTableDataCell><strong>{usr.usuario || '—'}</strong></CTableDataCell>
                        <CTableDataCell>{obtenerNombreEmpleado(getIdEmpleado(usr))}</CTableDataCell>
                        <CTableDataCell>{usr.comentario || '—'}</CTableDataCell>
                        <CTableDataCell className="text-center text-nowrap">
                          <CButton
                            color="info"
                            size="sm"
                            className="text-white me-2"
                            onClick={() => verUsuario(usr)}
                            title="Ver detalle"
                          >
                            👁️
                          </CButton>
                          <CButton
                            color="warning"
                            size="sm"
                            className="text-dark me-2"
                            onClick={() => abrirModalEditar(usr)}
                            title="Editar"
                          >
                            ✏️
                          </CButton>
                          <CButton
                            color="danger"
                            size="sm"
                            className="text-white"
                            onClick={() => confirmarEliminar(usr.id_Usuario ?? usr.idUsuario)}
                            title="Eliminar"
                          >
                            🗑️
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Modal Formulario */}
      <CModal visible={visibleModal} onClose={() => setVisibleModal(false)} size="lg" backdrop="static" keyboard={false}>
        <CModalHeader className="bg-primary text-white">
          <CModalTitle>{modoEdicion ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <CForm>
            <CRow className="g-3">
              {/* Empleado con búsqueda */}
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Empleado <span className="text-danger">*</span></CFormLabel>
                <div style={{ position: 'relative' }}>
                  <CFormInput
                    placeholder="Escriba el nombre del empleado..."
                    value={form.empleadoTexto}
                    onChange={handleEmpleadoChange}
                    autoComplete="off"
                    className={errores.idEmpleado ? 'is-invalid' : ''}
                  />
                  {errores.idEmpleado && <div className="invalid-feedback">{errores.idEmpleado}</div>}
                  {form.idEmpleado && (
                    <small className="text-success">✔ Empleado seleccionado</small>
                  )}
                  {mostrarSugerenciasEmpleado && sugerenciasEmpleado.length > 0 && (
                    <div
                      className="list-group"
                      style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        zIndex: 1060, maxHeight: '200px', overflowY: 'auto',
                        border: '1px solid #dee2e6', borderRadius: '4px',
                        backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {sugerenciasEmpleado.map((emp) => (
                        <button
                          key={emp.idEmpleado}
                          type="button"
                          className="list-group-item list-group-item-action text-start py-2"
                          onClick={() => seleccionarEmpleado(emp)}
                          style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          <strong>{emp.nombre} {emp.apellido}</strong>
                          {emp.email && <span className="text-muted ms-2">— {emp.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CCol>

              {/* Usuario */}
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Usuario <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  name="usuario"
                  value={form.usuario}
                  onChange={handleChange}
                  placeholder="Ingrese el nombre de usuario"
                  className={errores.usuario ? 'is-invalid' : ''}
                  autoComplete="off"
                />
                {errores.usuario && <div className="invalid-feedback">{errores.usuario}</div>}
              </CCol>

              {/* Contraseña */}
              <CCol md={12}>
                <CFormLabel className="fw-semibold">
                  Contraseña {!modoEdicion && <span className="text-danger">*</span>}
                  {modoEdicion && <span className="text-muted small"> (dejar vacío para no cambiar)</span>}
                </CFormLabel>
                <div className="input-group">
                  <CFormInput
                    type={mostrarContrasena ? 'text' : 'password'}
                    name="contrasena"
                    value={form.contrasena}
                    onChange={handleChange}
                    placeholder={modoEdicion ? 'Dejar vacío para mantener la contraseña actual' : 'Ingrese la contraseña'}
                    autoComplete="new-password"
                  />
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    onClick={() => setMostrarContrasena((v) => !v)}
                    title={mostrarContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
                    style={{ borderRadius: '0 4px 4px 0' }}
                  >
                    <span style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
                      👁️
                      {mostrarContrasena && (
                        <span style={{
                          position: 'absolute',
                          top: '50%',
                          left: '-1px',
                          right: '-1px',
                          height: '2px',
                          background: 'currentColor',
                          transform: 'rotate(-45deg)',
                          display: 'block',
                        }} />
                      )}
                    </span>
                  </CButton>
                </div>
              </CCol>

              {/* Comentario */}
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Comentario</CFormLabel>
                <CFormTextarea
                  name="comentario"
                  value={form.comentario}
                  onChange={handleChange}
                  placeholder="Ingrese un comentario (opcional)"
                  rows={3}
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton color="light" className="border" onClick={() => setVisibleModal(false)} disabled={guardando}>
            Cancelar
          </CButton>
          <CButton color="primary" className="text-light" onClick={guardarUsuario} disabled={guardando}>
            {guardando
              ? <><CSpinner size="sm" className="me-2" />Guardando...</>
              : (modoEdicion ? 'Guardar Cambios' : 'Crear Usuario')}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Ver Usuario */}
      <CModal visible={modalVer} onClose={() => setModalVer(false)} size="md">
        <CModalHeader className="bg-info text-white">
          <CModalTitle>👁️ Detalle del Usuario</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          {usuarioVer && (
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Usuario</CFormLabel>
                <p className="mb-0 fs-6"><strong>{usuarioVer.usuario || '—'}</strong></p>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">Empleado</CFormLabel>
                <p className="mb-0 fs-6">{obtenerNombreEmpleado(getIdEmpleado(usuarioVer))}</p>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Contraseña</CFormLabel>
                <p className="mb-0 fs-6">
                  {usuarioVer.contrasena
                    ? <span className="text-success">✔ Configurada</span>
                    : <span className="text-muted">No configurada</span>}
                </p>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">Comentario</CFormLabel>
                <p className="mb-0 fs-6">{usuarioVer.comentario || '—'}</p>
              </CCol>
            </CRow>
          )}
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton color="secondary" onClick={() => setModalVer(false)}>Cerrar</CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Confirmar Eliminar */}
      <CModal visible={modalEliminar} onClose={() => setModalEliminar(false)}>
        <CModalHeader className="bg-danger text-white">
          <CModalTitle>Confirmar Eliminación</CModalTitle>
        </CModalHeader>
        <CModalBody>¿Está seguro que desea eliminar este usuario? Esta acción no se puede deshacer.</CModalBody>
        <CModalFooter>
          <CButton color="light" className="border" onClick={() => setModalEliminar(false)}>Cancelar</CButton>
          <CButton color="danger" className="text-white" onClick={eliminarUsuario}>Eliminar</CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Éxito */}
      <CModal visible={modalExito} onClose={() => setModalExito(false)}>
        <CModalHeader className="bg-success text-white">
          <CModalTitle>✔ Éxito</CModalTitle>
        </CModalHeader>
        <CModalBody>{mensajeExito}</CModalBody>
        <CModalFooter>
          <CButton color="success" className="text-white" onClick={() => setModalExito(false)}>Aceptar</CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Error */}
      <CModal visible={modalError} onClose={() => setModalError(false)}>
        <CModalHeader className="bg-danger text-white">
          <CModalTitle>Error</CModalTitle>
        </CModalHeader>
        <CModalBody>{mensajeError}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModalError(false)}>Cerrar</CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default Usuarios
