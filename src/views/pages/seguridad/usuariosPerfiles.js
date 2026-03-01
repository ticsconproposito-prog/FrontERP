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
  CFormSelect,
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
  idUsuario: '',
  usuarioTexto: '',
  idPerfil: '',
  comentario: '',
}

const UsuariosPerfiles = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const [registros, setRegistros] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idRegistroEditar, setIdRegistroEditar] = useState(null)

  const [visibleModal, setVisibleModal] = useState(false)
  const [modalExito, setModalExito] = useState(false)
  const [modalError, setModalError] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  const [modalEliminar, setModalEliminar] = useState(false)
  const [idEliminar, setIdEliminar] = useState(null)
  const [modalVer, setModalVer] = useState(false)
  const [registroVer, setRegistroVer] = useState(null)

  // Búsqueda de usuario
  const [sugerenciasUsuario, setSugerenciasUsuario] = useState([])
  const [mostrarSugerenciasUsuario, setMostrarSugerenciasUsuario] = useState(false)

  // Filtros tabla
  const [busqueda, setBusqueda] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [rReg, rUsr, rPerf] = await Promise.all([
        fetch('/api/usuariosPerfiles?size=1000'),
        fetch('/api/usuarios?size=1000'),
        fetch('/api/perfiles?size=1000'),
      ])
      const dataReg = await rReg.json()
      const dataUsr = await rUsr.json()
      const dataPerf = await rPerf.json()
      setRegistros(Array.isArray(dataReg) ? dataReg : (dataReg?.content || []))
      setUsuarios(Array.isArray(dataUsr) ? dataUsr : (dataUsr?.content || []))
      setPerfiles(Array.isArray(dataPerf) ? dataPerf : (dataPerf?.content || []))
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

  const handleUsuarioChange = (e) => {
    const valor = e.target.value
    setForm((prev) => ({ ...prev, usuarioTexto: valor, idUsuario: '' }))
    setErrores((prev) => ({ ...prev, idUsuario: '' }))
    const limpio = valor.trim().toLowerCase()
    if (limpio.length >= 1) {
      const encontrados = usuarios.filter((u) =>
        (u.usuario || '').toLowerCase().includes(limpio)
      )
      setSugerenciasUsuario(encontrados.slice(0, 10))
      setMostrarSugerenciasUsuario(encontrados.length > 0)
    } else {
      setSugerenciasUsuario([])
      setMostrarSugerenciasUsuario(false)
    }
  }

  const seleccionarUsuario = (usr) => {
    const id = usr.id_Usuario ?? usr.idUsuario
    setForm((prev) => ({
      ...prev,
      idUsuario: String(id ?? ''),
      usuarioTexto: usr.usuario || '',
    }))
    setSugerenciasUsuario([])
    setMostrarSugerenciasUsuario(false)
    setErrores((prev) => ({ ...prev, idUsuario: '' }))
  }

  const validar = () => {
    const nuevosErrores = {}
    if (!form.idUsuario) nuevosErrores.idUsuario = 'Seleccione un usuario válido'
    if (!form.idPerfil) nuevosErrores.idPerfil = 'Seleccione un perfil'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const abrirModalNuevo = () => {
    setForm(FORM_INICIAL)
    setErrores({})
    setModoEdicion(false)
    setIdRegistroEditar(null)
    setSugerenciasUsuario([])
    setMostrarSugerenciasUsuario(false)
    setVisibleModal(true)
  }

  const abrirModalEditar = (reg) => {
    const usr = usuarios.find((u) => (u.id_Usuario ?? u.idUsuario) == reg.idUsuario)
    setForm({
      idUsuario: String(reg.idUsuario ?? ''),
      usuarioTexto: usr?.usuario || String(reg.idUsuario ?? ''),
      idPerfil: String(reg.idPerfil ?? ''),
      comentario: reg.comentario || '',
    })
    setErrores({})
    setModoEdicion(true)
    setIdRegistroEditar(reg.idUsuarioPerfil ?? reg.id_UsuarioPerfil)
    setSugerenciasUsuario([])
    setMostrarSugerenciasUsuario(false)
    setVisibleModal(true)
  }

  const guardarRegistro = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const body = {
        idUsuario: parseInt(form.idUsuario, 10),
        idPerfil: parseInt(form.idPerfil, 10),
        permiso: 0,
        comentario: String(form.comentario || '').trim(),
        idUsuarioModificacion: idUsuarioActual,
      }

      let url = '/api/grabarUsuarioPerfil'
      let method = 'POST'
      if (modoEdicion && idRegistroEditar) {
        url = `/api/editarUsuarioPerfil/${idRegistroEditar}`
        method = 'PUT'
        body.idUsuarioPerfil = idRegistroEditar
      }

      console.log('URL:', url)
      console.log('Body:', JSON.stringify(body, null, 2))

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
      setMensajeExito(modoEdicion ? 'Registro actualizado correctamente.' : 'Perfil asignado al usuario correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setMensajeError(err.message || 'Error al guardar')
      setModalError(true)
    } finally {
      setGuardando(false)
    }
  }

  const verRegistro = (reg) => {
    setRegistroVer(reg)
    setModalVer(true)
  }

  const confirmarEliminar = (id) => {
    setIdEliminar(id)
    setModalEliminar(true)
  }

  const eliminarRegistro = async () => {
    try {
      const res = await fetch(`/api/eliminarUsuarioPerfil/${idEliminar}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuarioModificacion: idUsuarioActual }),
      })
      if (!res.ok) throw new Error('Error al eliminar el registro')
      setModalEliminar(false)
      setMensajeExito('Registro eliminado correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setModalEliminar(false)
      setMensajeError(err.message || 'Error al eliminar')
      setModalError(true)
    }
  }

  const obtenerNombreUsuario = (id) => {
    const u = usuarios.find((x) => (x.id_Usuario ?? x.idUsuario) == id)
    return u?.usuario || id || '—'
  }

  const obtenerNombrePerfil = (id) => {
    const p = perfiles.find((x) => (x.idPerfil ?? x.id_Perfil) == id)
    return p?.nombrePerfil || id || '—'
  }

  const registrosFiltrados = registros.filter((reg) => {
    const q = busqueda.trim().toLowerCase()
    const matchBusqueda = !q ||
      obtenerNombreUsuario(reg.idUsuario).toLowerCase().includes(q) ||
      obtenerNombrePerfil(reg.idPerfil).toLowerCase().includes(q) ||
      (reg.comentario || '').toLowerCase().includes(q)
    const matchPerfil = !filtroPerfil || String(reg.idPerfil) === filtroPerfil
    return matchBusqueda && matchPerfil
  })

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-3">Cargando...</p>
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
              <strong className="fs-4">Perfiles por Usuario</strong>
              <CButton color="primary" className="text-light" onClick={abrirModalNuevo}>
                + Asignar Perfil
              </CButton>
            </CCardHeader>
            <CCardBody>
              {/* Filtros */}
              <CRow className="mb-3 g-2">
                <CCol md={4}>
                  <CFormInput
                    placeholder="Buscar por usuario, perfil o comentario..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)}>
                    <option value="">Todos los perfiles</option>
                    {perfiles.map((p) => (
                      <option key={p.idPerfil ?? p.id_Perfil} value={p.idPerfil ?? p.id_Perfil}>
                        {p.nombrePerfil}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>

              {/* Tabla */}
              <CTable bordered hover responsive striped>
                <CTableHead className="table-primary">
                  <CTableRow>
                    <CTableHeaderCell className="py-2">#</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Usuario</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Perfil</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Comentario</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-center">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {registrosFiltrados.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={5} className="text-center py-4 text-muted">
                        No hay perfiles asignados a usuarios.
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    registrosFiltrados.map((reg, idx) => (
                      <CTableRow key={reg.idUsuarioPerfil ?? reg.id_UsuarioPerfil ?? idx}>
                        <CTableDataCell>{idx + 1}</CTableDataCell>
                        <CTableDataCell><strong>{obtenerNombreUsuario(reg.idUsuario)}</strong></CTableDataCell>
                        <CTableDataCell>{obtenerNombrePerfil(reg.idPerfil)}</CTableDataCell>
                        <CTableDataCell>{reg.comentario || '—'}</CTableDataCell>
                        <CTableDataCell className="text-center text-nowrap">
                          <CButton color="info" size="sm" className="text-white me-2" onClick={() => verRegistro(reg)} title="Ver">
                            👁️
                          </CButton>
                          <CButton color="warning" size="sm" className="text-dark me-2" onClick={() => abrirModalEditar(reg)} title="Editar">
                            ✏️
                          </CButton>
                          <CButton color="danger" size="sm" className="text-white" onClick={() => confirmarEliminar(reg.idUsuarioPerfil ?? reg.id_UsuarioPerfil)} title="Eliminar">
                            🗑️
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
              {registrosFiltrados.length > 0 && (
                <small className="text-muted">Total: {registrosFiltrados.length} registro(s)</small>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Modal Formulario */}
      <CModal visible={visibleModal} onClose={() => setVisibleModal(false)} size="lg" backdrop="static" keyboard={false}>
        <CModalHeader className="bg-primary text-white">
          <CModalTitle>{modoEdicion ? '✏️ Editar Asignación' : '➕ Asignar Perfil a Usuario'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <CForm>
            <CRow className="g-3">
              {/* Usuario con búsqueda */}
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Usuario <span className="text-danger">*</span></CFormLabel>
                <div style={{ position: 'relative' }}>
                  <CFormInput
                    placeholder="Escriba para buscar usuario..."
                    value={form.usuarioTexto}
                    onChange={handleUsuarioChange}
                    autoComplete="off"
                    className={errores.idUsuario ? 'is-invalid' : ''}
                  />
                  {errores.idUsuario && <div className="invalid-feedback">{errores.idUsuario}</div>}
                  {form.idUsuario && <small className="text-success">✔ Usuario seleccionado</small>}
                  {mostrarSugerenciasUsuario && sugerenciasUsuario.length > 0 && (
                    <div
                      className="list-group"
                      style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        zIndex: 1060, maxHeight: '200px', overflowY: 'auto',
                        border: '1px solid #dee2e6', borderRadius: '4px',
                        backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {sugerenciasUsuario.map((u) => (
                        <button
                          key={u.id_Usuario ?? u.idUsuario}
                          type="button"
                          className="list-group-item list-group-item-action text-start py-2"
                          onClick={() => seleccionarUsuario(u)}
                          style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          <strong>{u.usuario}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CCol>

              {/* Perfil */}
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Perfil <span className="text-danger">*</span></CFormLabel>
                <CFormSelect
                  name="idPerfil"
                  value={form.idPerfil}
                  onChange={handleChange}
                  className={errores.idPerfil ? 'is-invalid' : ''}
                >
                  <option value="">Seleccione un perfil...</option>
                  {perfiles.map((p) => (
                    <option key={p.idPerfil ?? p.id_Perfil} value={p.idPerfil ?? p.id_Perfil}>
                      {p.nombrePerfil}
                    </option>
                  ))}
                </CFormSelect>
                {errores.idPerfil && <div className="invalid-feedback d-block">{errores.idPerfil}</div>}
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
          <CButton color="primary" className="text-light" onClick={guardarRegistro} disabled={guardando}>
            {guardando
              ? <><CSpinner size="sm" className="me-2" />Guardando...</>
              : (modoEdicion ? 'Guardar Cambios' : 'Asignar Perfil')}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Ver */}
      <CModal visible={modalVer} onClose={() => setModalVer(false)} size="md">
        <CModalHeader className="bg-info text-white">
          <CModalTitle>👁️ Detalle de Asignación</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          {registroVer && (
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Usuario</CFormLabel>
                <p className="mb-0 fs-6"><strong>{obtenerNombreUsuario(registroVer.idUsuario)}</strong></p>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Perfil</CFormLabel>
                <p className="mb-0 fs-6">{obtenerNombrePerfil(registroVer.idPerfil)}</p>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">Comentario</CFormLabel>
                <p className="mb-0 fs-6">{registroVer.comentario || '—'}</p>
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
        <CModalBody>¿Está seguro que desea eliminar esta asignación? Esta acción no se puede deshacer.</CModalBody>
        <CModalFooter>
          <CButton color="light" className="border" onClick={() => setModalEliminar(false)}>Cancelar</CButton>
          <CButton color="danger" className="text-white" onClick={eliminarRegistro}>Eliminar</CButton>
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

export default UsuariosPerfiles
