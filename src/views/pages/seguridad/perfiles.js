import React, { useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
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
  nombrePerfil: '',
}

const Perfiles = () => {
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idPerfilEditar, setIdPerfilEditar] = useState(null)

  const [visibleModal, setVisibleModal] = useState(false)
  const [modalExito, setModalExito] = useState(false)
  const [modalError, setModalError] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  const [modalEliminar, setModalEliminar] = useState(false)
  const [idEliminar, setIdEliminar] = useState(null)
  const [modalVer, setModalVer] = useState(false)
  const [perfilVer, setPerfilVer] = useState(null)

  const [busqueda, setBusqueda] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const r = await fetch('/api/perfiles?size=1000')
      const data = await r.json()
      setPerfiles(Array.isArray(data) ? data : (data?.content || []))
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

  const validar = () => {
    const nuevosErrores = {}
    if (!String(form.nombrePerfil || '').trim()) nuevosErrores.nombrePerfil = 'El nombre del perfil es requerido'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const abrirModalNuevo = () => {
    setForm(FORM_INICIAL)
    setErrores({})
    setModoEdicion(false)
    setIdPerfilEditar(null)
    setVisibleModal(true)
  }

  const abrirModalEditar = (perfil) => {
    setForm({ nombrePerfil: perfil.nombrePerfil || '' })
    setErrores({})
    setModoEdicion(true)
    setIdPerfilEditar(perfil.idPerfil ?? perfil.id_Perfil)
    setVisibleModal(true)
  }

  const guardarPerfil = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const body = {
        nombrePerfil: String(form.nombrePerfil || '').trim(),
        idUsuarioModificacion: 1,
      }

      let url = '/api/grabarPerfil'
      let method = 'POST'
      if (modoEdicion && idPerfilEditar) {
        url = `/api/editarPerfil/${idPerfilEditar}`
        method = 'PUT'
        body.idPerfil = idPerfilEditar
        body.id_Perfil = idPerfilEditar
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
      setMensajeExito(modoEdicion ? 'Perfil actualizado correctamente.' : 'Perfil guardado correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setMensajeError(err.message || 'Error al guardar el perfil')
      setModalError(true)
    } finally {
      setGuardando(false)
    }
  }

  const verPerfil = (perfil) => {
    setPerfilVer(perfil)
    setModalVer(true)
  }

  const confirmarEliminar = (id) => {
    setIdEliminar(id)
    setModalEliminar(true)
  }

  const eliminarPerfil = async () => {
    try {
      const res = await fetch(`/api/eliminarPerfil/${idEliminar}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar el perfil')
      setModalEliminar(false)
      setMensajeExito('Perfil eliminado correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setModalEliminar(false)
      setMensajeError(err.message || 'Error al eliminar')
      setModalError(true)
    }
  }

  const perfilesFiltrados = perfiles.filter((p) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (p.nombrePerfil || '').toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-3">Cargando perfiles...</p>
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
              <strong className="fs-4">Gestión de Perfiles</strong>
              <CButton color="primary" className="text-light" onClick={abrirModalNuevo}>
                + Nuevo Perfil
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3">
                <CCol md={4}>
                  <CFormInput
                    placeholder="Buscar por nombre de perfil..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </CCol>
              </CRow>

              <CTable bordered hover responsive striped>
                <CTableHead className="table-primary">
                  <CTableRow>
                    <CTableHeaderCell className="py-2">#</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Nombre de Perfil</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-center">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {perfilesFiltrados.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-center py-4 text-muted">
                        No hay perfiles registrados.
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    perfilesFiltrados.map((perfil, idx) => (
                      <CTableRow key={perfil.idPerfil ?? perfil.id_Perfil ?? idx}>
                        <CTableDataCell>{idx + 1}</CTableDataCell>
                        <CTableDataCell><strong>{perfil.nombrePerfil || '—'}</strong></CTableDataCell>
                        <CTableDataCell className="text-center text-nowrap">
                          <CButton
                            color="info"
                            size="sm"
                            className="text-white me-2"
                            onClick={() => verPerfil(perfil)}
                            title="Ver detalle"
                          >
                            👁️
                          </CButton>
                          <CButton
                            color="warning"
                            size="sm"
                            className="text-dark me-2"
                            onClick={() => abrirModalEditar(perfil)}
                            title="Editar"
                          >
                            ✏️
                          </CButton>
                          <CButton
                            color="danger"
                            size="sm"
                            className="text-white"
                            onClick={() => confirmarEliminar(perfil.idPerfil ?? perfil.id_Perfil)}
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
      <CModal visible={visibleModal} onClose={() => setVisibleModal(false)} size="md" backdrop="static" keyboard={false}>
        <CModalHeader className="bg-primary text-white">
          <CModalTitle>{modoEdicion ? '✏️ Editar Perfil' : '➕ Nuevo Perfil'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <CForm>
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Nombre de Perfil <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  name="nombrePerfil"
                  value={form.nombrePerfil}
                  onChange={handleChange}
                  placeholder="Ej: Administrador, Vendedor, Bodeguero..."
                  className={errores.nombrePerfil ? 'is-invalid' : ''}
                  autoFocus
                />
                {errores.nombrePerfil && <div className="invalid-feedback">{errores.nombrePerfil}</div>}
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton color="light" className="border" onClick={() => setVisibleModal(false)} disabled={guardando}>
            Cancelar
          </CButton>
          <CButton color="primary" className="text-light" onClick={guardarPerfil} disabled={guardando}>
            {guardando
              ? <><CSpinner size="sm" className="me-2" />Guardando...</>
              : (modoEdicion ? 'Guardar Cambios' : 'Guardar Perfil')}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Ver */}
      <CModal visible={modalVer} onClose={() => setModalVer(false)} size="sm">
        <CModalHeader className="bg-info text-white">
          <CModalTitle>👁️ Detalle del Perfil</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          {perfilVer && (
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">Nombre de Perfil</CFormLabel>
                <p className="mb-0 fs-6"><strong>{perfilVer.nombrePerfil || '—'}</strong></p>
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
        <CModalBody>¿Está seguro que desea eliminar este perfil? Esta acción no se puede deshacer.</CModalBody>
        <CModalFooter>
          <CButton color="light" className="border" onClick={() => setModalEliminar(false)}>Cancelar</CButton>
          <CButton color="danger" className="text-white" onClick={eliminarPerfil}>Eliminar</CButton>
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

export default Perfiles
