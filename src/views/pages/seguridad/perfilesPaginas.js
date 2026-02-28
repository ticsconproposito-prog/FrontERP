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
  idPerfil: '',
  perfilTexto: '',
  idPagina: '',
  paginaTexto: '',
}

const PerfilesPaginas = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const [registros, setRegistros] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [paginas, setPaginas] = useState([])
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

  // Búsqueda de perfil
  const [sugerenciasPerfil, setSugerenciasPerfil] = useState([])
  const [mostrarSugerenciasPerfil, setMostrarSugerenciasPerfil] = useState(false)

  // Búsqueda en tabla
  const [busqueda, setBusqueda] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [rReg, rPerf, rPag] = await Promise.all([
        fetch('/api/perfilesPaginas?size=1000'),
        fetch('/api/perfiles?size=1000'),
        fetch('/api/paginas?size=1000'),
      ])
      const dataReg = await rReg.json()
      const dataPerf = await rPerf.json()
      const dataPag = await rPag.json()
      setRegistros(Array.isArray(dataReg) ? dataReg : (dataReg?.content || []))
      setPerfiles(Array.isArray(dataPerf) ? dataPerf : (dataPerf?.content || []))
      setPaginas(Array.isArray(dataPag) ? dataPag : (dataPag?.content || []))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handlePerfilChange = (e) => {
    const valor = e.target.value
    setForm((prev) => ({ ...prev, perfilTexto: valor, idPerfil: '' }))
    setErrores((prev) => ({ ...prev, idPerfil: '' }))
    const limpio = valor.trim().toLowerCase()
    if (limpio.length >= 1) {
      const encontrados = perfiles.filter((p) =>
        (p.nombrePerfil || '').toLowerCase().includes(limpio)
      )
      setSugerenciasPerfil(encontrados.slice(0, 10))
      setMostrarSugerenciasPerfil(encontrados.length > 0)
    } else {
      setSugerenciasPerfil([])
      setMostrarSugerenciasPerfil(false)
    }
  }

  const seleccionarPerfil = (perfil) => {
    const id = perfil.idPerfil ?? perfil.id_Perfil
    setForm((prev) => ({
      ...prev,
      idPerfil: String(id ?? ''),
      perfilTexto: perfil.nombrePerfil || '',
    }))
    setSugerenciasPerfil([])
    setMostrarSugerenciasPerfil(false)
    setErrores((prev) => ({ ...prev, idPerfil: '' }))
  }

  const validar = () => {
    const nuevosErrores = {}
    if (!form.idPerfil) nuevosErrores.idPerfil = 'Seleccione un perfil válido'
    if (!form.idPagina) nuevosErrores.idPagina = 'Seleccione una página'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const abrirModalNuevo = () => {
    setForm(FORM_INICIAL)
    setErrores({})
    setModoEdicion(false)
    setIdRegistroEditar(null)
    setSugerenciasPerfil([])
    setMostrarSugerenciasPerfil(false)
    setVisibleModal(true)
  }

  const abrirModalEditar = (reg) => {
    const perfil = perfiles.find((p) => (p.idPerfil ?? p.id_Perfil) == reg.idPerfil)
    const pagina = paginas.find((p) => (p.idPagina ?? p.id_Pagina) == reg.idPagina)
    setForm({
      idPerfil: String(reg.idPerfil ?? ''),
      perfilTexto: perfil?.nombrePerfil || String(reg.idPerfil ?? ''),
      idPagina: String(reg.idPagina ?? ''),
      paginaTexto: pagina?.nombrePagina || String(reg.idPagina ?? ''),
    })
    setErrores({})
    setModoEdicion(true)
    setIdRegistroEditar(reg.idPerfilPagina ?? reg.id_PerfilPagina ?? reg.idPagina)
    setSugerenciasPerfil([])
    setMostrarSugerenciasPerfil(false)
    setVisibleModal(true)
  }

  const guardarRegistro = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const body = {
        idPerfil: parseInt(form.idPerfil, 10),
        idPagina: parseInt(form.idPagina, 10),
        permiso: 0,
        idUsuarioModificacion: idUsuarioActual,
      }

      let url = '/api/grabarPerfilPagina'
      let method = 'POST'
      if (modoEdicion && idRegistroEditar) {
        url = `/api/editarPerfilPagina/${idRegistroEditar}`
        method = 'PUT'
        body.idPerfilPagina = idRegistroEditar
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
      setMensajeExito(modoEdicion ? 'Registro actualizado correctamente.' : 'Página asignada al perfil correctamente.')
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
      const res = await fetch(`/api/eliminarPerfilPagina/${idEliminar}`, { method: 'DELETE' })
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

  const obtenerNombrePerfil = (id) => {
    const p = perfiles.find((x) => (x.idPerfil ?? x.id_Perfil) == id)
    return p?.nombrePerfil || id || '—'
  }

  const obtenerNombrePagina = (id) => {
    const p = paginas.find((x) => (x.idPagina ?? x.id_Pagina) == id)
    return p?.nombrePagina || id || '—'
  }

  const obtenerURLPagina = (id) => {
    const p = paginas.find((x) => (x.idPagina ?? x.id_Pagina) == id)
    return p?.URL || p?.url || '—'
  }

  const registrosFiltrados = registros.filter((reg) => {
    const q = busqueda.trim().toLowerCase()
    const matchBusqueda = !q ||
      obtenerNombrePerfil(reg.idPerfil).toLowerCase().includes(q) ||
      obtenerNombrePagina(reg.idPagina).toLowerCase().includes(q) ||
      obtenerURLPagina(reg.idPagina).toLowerCase().includes(q)

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
              <strong className="fs-4">Páginas por Perfil</strong>
              <CButton color="primary" className="text-light" onClick={abrirModalNuevo}>
                + Asignar Página
              </CButton>
            </CCardHeader>
            <CCardBody>
              {/* Filtros */}
              <CRow className="mb-3 g-2">
                <CCol md={4}>
                  <CFormInput
                    placeholder="Buscar por perfil o página..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormSelect
                    value={filtroPerfil}
                    onChange={(e) => setFiltroPerfil(e.target.value)}
                  >
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
                    <CTableHeaderCell className="py-2">Perfil</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Página</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">URL</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-center">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {registrosFiltrados.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={5} className="text-center py-4 text-muted">
                        No hay páginas asignadas a perfiles.
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    registrosFiltrados.map((reg, idx) => (
                      <CTableRow key={reg.idPerfilPagina ?? reg.id_PerfilPagina ?? idx}>
                        <CTableDataCell>{idx + 1}</CTableDataCell>
                        <CTableDataCell>
                          <strong>{obtenerNombrePerfil(reg.idPerfil)}</strong>
                        </CTableDataCell>
                        <CTableDataCell>{obtenerNombrePagina(reg.idPagina)}</CTableDataCell>
                        <CTableDataCell>
                          <span className="text-primary">{obtenerURLPagina(reg.idPagina)}</span>
                        </CTableDataCell>
                        <CTableDataCell className="text-center text-nowrap">
                          <CButton
                            color="info"
                            size="sm"
                            className="text-white me-2"
                            onClick={() => verRegistro(reg)}
                            title="Ver detalle"
                          >
                            👁️
                          </CButton>
                          <CButton
                            color="warning"
                            size="sm"
                            className="text-dark me-2"
                            onClick={() => abrirModalEditar(reg)}
                            title="Editar"
                          >
                            ✏️
                          </CButton>
                          <CButton
                            color="danger"
                            size="sm"
                            className="text-white"
                            onClick={() => confirmarEliminar(reg.idPerfilPagina ?? reg.id_PerfilPagina)}
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
          <CModalTitle>{modoEdicion ? '✏️ Editar Asignación' : '➕ Asignar Página a Perfil'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <CForm>
            <CRow className="g-3">
              {/* Perfil con búsqueda */}
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Perfil <span className="text-danger">*</span></CFormLabel>
                <div style={{ position: 'relative' }}>
                  <CFormInput
                    placeholder="Escriba para buscar perfil..."
                    value={form.perfilTexto}
                    onChange={handlePerfilChange}
                    autoComplete="off"
                    className={errores.idPerfil ? 'is-invalid' : ''}
                  />
                  {errores.idPerfil && <div className="invalid-feedback">{errores.idPerfil}</div>}
                  {form.idPerfil && (
                    <small className="text-success">✔ Perfil seleccionado</small>
                  )}
                  {mostrarSugerenciasPerfil && sugerenciasPerfil.length > 0 && (
                    <div
                      className="list-group"
                      style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        zIndex: 1060, maxHeight: '200px', overflowY: 'auto',
                        border: '1px solid #dee2e6', borderRadius: '4px',
                        backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {sugerenciasPerfil.map((p) => (
                        <button
                          key={p.idPerfil ?? p.id_Perfil}
                          type="button"
                          className="list-group-item list-group-item-action text-start py-2"
                          onClick={() => seleccionarPerfil(p)}
                          style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          {p.nombrePerfil}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CCol>

              {/* Página */}
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Página <span className="text-danger">*</span></CFormLabel>
                <CFormSelect
                  value={form.idPagina}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, idPagina: e.target.value }))
                    setErrores((prev) => ({ ...prev, idPagina: '' }))
                  }}
                  className={errores.idPagina ? 'is-invalid' : ''}
                >
                  <option value="">Seleccione una página...</option>
                  {paginas.map((p) => (
                    <option key={p.idPagina ?? p.id_Pagina} value={p.idPagina ?? p.id_Pagina}>
                      {p.nombrePagina} — {p.URL || p.url || ''}
                    </option>
                  ))}
                </CFormSelect>
                {errores.idPagina && <div className="invalid-feedback d-block">{errores.idPagina}</div>}
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
              : (modoEdicion ? 'Guardar Cambios' : 'Asignar Página')}
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
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">Perfil</CFormLabel>
                <p className="mb-0 fs-6"><strong>{obtenerNombrePerfil(registroVer.idPerfil)}</strong></p>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">Página</CFormLabel>
                <p className="mb-0 fs-6">{obtenerNombrePagina(registroVer.idPagina)}</p>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">URL</CFormLabel>
                <p className="mb-0 fs-6 text-primary">{obtenerURLPagina(registroVer.idPagina)}</p>
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

export default PerfilesPaginas
