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
  nombrePagina: '',
  URL: '',
}

const Paginas = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const [paginas, setPaginas] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idPaginaEditar, setIdPaginaEditar] = useState(null)

  const [visibleModal, setVisibleModal] = useState(false)
  const [modalExito, setModalExito] = useState(false)
  const [modalError, setModalError] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  const [modalEliminar, setModalEliminar] = useState(false)
  const [idEliminar, setIdEliminar] = useState(null)
  const [modalVer, setModalVer] = useState(false)
  const [paginaVer, setPaginaVer] = useState(null)

  const [busqueda, setBusqueda] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const r = await fetch('/api/paginas?size=1000')
      const data = await r.json()
      setPaginas(Array.isArray(data) ? data : (data?.content || []))
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
    if (!String(form.nombrePagina || '').trim()) nuevosErrores.nombrePagina = 'El nombre de la página es requerido'
    if (!String(form.URL || '').trim()) nuevosErrores.URL = 'La URL es requerida'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const abrirModalNuevo = () => {
    setForm(FORM_INICIAL)
    setErrores({})
    setModoEdicion(false)
    setIdPaginaEditar(null)
    setVisibleModal(true)
  }

  const abrirModalEditar = (pag) => {
    setForm({
      nombrePagina: pag.nombrePagina || '',
      URL: pag.URL || pag.url || '',
    })
    setErrores({})
    setModoEdicion(true)
    setIdPaginaEditar(pag.idPagina ?? pag.id_Pagina)
    setVisibleModal(true)
  }

  const guardarPagina = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const urlValue = String(form.URL || '').trim()
      const body = {
        nombrePagina: String(form.nombrePagina || '').trim(),
        URL: urlValue,
        url: urlValue,
        idUsuarioModificacion: idUsuarioActual,
      }

      let url = '/api/grabarPagina'
      let method = 'POST'
      if (modoEdicion && idPaginaEditar) {
        url = `/api/editarPagina/${idPaginaEditar}`
        method = 'PUT'
        body.idPagina = idPaginaEditar
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
      setMensajeExito(modoEdicion ? 'Página actualizada correctamente.' : 'Página guardada correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setMensajeError(err.message || 'Error al guardar la página')
      setModalError(true)
    } finally {
      setGuardando(false)
    }
  }

  const verPagina = (pag) => {
    setPaginaVer(pag)
    setModalVer(true)
  }

  const confirmarEliminar = (id) => {
    setIdEliminar(id)
    setModalEliminar(true)
  }

  const eliminarPagina = async () => {
    try {
      const res = await fetch(`/api/eliminarPagina/${idEliminar}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuarioModificacion: idUsuarioActual }),
      })
      if (!res.ok) throw new Error('Error al eliminar la página')
      setModalEliminar(false)
      setMensajeExito('Página eliminada correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setModalEliminar(false)
      setMensajeError(err.message || 'Error al eliminar')
      setModalError(true)
    }
  }

  const paginasFiltradas = paginas.filter((pag) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      (pag.nombrePagina || '').toLowerCase().includes(q) ||
      (pag.URL || pag.url || '').toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-3">Cargando páginas...</p>
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
              <strong className="fs-4">Gestión de Páginas</strong>
              <CButton color="primary" className="text-light" onClick={abrirModalNuevo}>
                + Nueva Página
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3">
                <CCol md={4}>
                  <CFormInput
                    placeholder="Buscar por nombre o URL..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </CCol>
              </CRow>

              <CTable bordered hover responsive striped>
                <CTableHead className="table-primary">
                  <CTableRow>
                    <CTableHeaderCell className="py-2">#</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Nombre de Página</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">URL</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-center">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {paginasFiltradas.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={4} className="text-center py-4 text-muted">
                        No hay páginas registradas.
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    paginasFiltradas.map((pag, idx) => (
                      <CTableRow key={pag.idPagina ?? pag.id_Pagina ?? idx}>
                        <CTableDataCell>{idx + 1}</CTableDataCell>
                        <CTableDataCell><strong>{pag.nombrePagina || '—'}</strong></CTableDataCell>
                        <CTableDataCell>
                          <span className="text-primary">{pag.URL || pag.url || '—'}</span>
                        </CTableDataCell>
                        <CTableDataCell className="text-center text-nowrap">
                          <CButton
                            color="info"
                            size="sm"
                            className="text-white me-2"
                            onClick={() => verPagina(pag)}
                            title="Ver detalle"
                          >
                            👁️
                          </CButton>
                          <CButton
                            color="warning"
                            size="sm"
                            className="text-dark me-2"
                            onClick={() => abrirModalEditar(pag)}
                            title="Editar"
                          >
                            ✏️
                          </CButton>
                          <CButton
                            color="danger"
                            size="sm"
                            className="text-white"
                            onClick={() => confirmarEliminar(pag.idPagina ?? pag.id_Pagina)}
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
          <CModalTitle>{modoEdicion ? '✏️ Editar Página' : '➕ Nueva Página'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <CForm>
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Nombre de Página <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  name="nombrePagina"
                  value={form.nombrePagina}
                  onChange={handleChange}
                  placeholder="Ej: Gestión de Productos"
                  className={errores.nombrePagina ? 'is-invalid' : ''}
                />
                {errores.nombrePagina && <div className="invalid-feedback">{errores.nombrePagina}</div>}
              </CCol>

              <CCol md={12}>
                <CFormLabel className="fw-semibold">URL <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  name="URL"
                  value={form.URL}
                  onChange={handleChange}
                  placeholder="Ej: /pages/productos/gestionProductos"
                  className={errores.URL ? 'is-invalid' : ''}
                />
                {errores.URL && <div className="invalid-feedback">{errores.URL}</div>}
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton color="light" className="border" onClick={() => setVisibleModal(false)} disabled={guardando}>
            Cancelar
          </CButton>
          <CButton color="primary" className="text-light" onClick={guardarPagina} disabled={guardando}>
            {guardando
              ? <><CSpinner size="sm" className="me-2" />Guardando...</>
              : (modoEdicion ? 'Guardar Cambios' : 'Guardar Página')}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Ver */}
      <CModal visible={modalVer} onClose={() => setModalVer(false)} size="md">
        <CModalHeader className="bg-info text-white">
          <CModalTitle>👁️ Detalle de la Página</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          {paginaVer && (
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">Nombre de Página</CFormLabel>
                <p className="mb-0 fs-6"><strong>{paginaVer.nombrePagina || '—'}</strong></p>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">URL</CFormLabel>
                <p className="mb-0 fs-6 text-primary">{paginaVer.URL || paginaVer.url || '—'}</p>
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
        <CModalBody>¿Está seguro que desea eliminar esta página? Esta acción no se puede deshacer.</CModalBody>
        <CModalFooter>
          <CButton color="light" className="border" onClick={() => setModalEliminar(false)}>Cancelar</CButton>
          <CButton color="danger" className="text-white" onClick={eliminarPagina}>Eliminar</CButton>
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

export default Paginas
