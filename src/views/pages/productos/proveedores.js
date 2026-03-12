import React, { useEffect, useState } from 'react'
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
  CRow,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CPagination,
  CPaginationItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormTextarea,
} from '@coreui/react'
import "react-datepicker/dist/react-datepicker.css"
import * as XLSX from 'xlsx'

const Layout = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const [proveedores, setProveedores] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [filtros, setFiltros] = useState({
    nombre: '',
    nombreDeContacto1: '',
  })
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false)
  const [modoEdicionProveedor, setModoEdicionProveedor] = useState(false)
  const [idProveedorEditar, setIdProveedorEditar] = useState(null)
  const [modalExitoVisible, setModalExitoVisible] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [proveedorVer, setProveedorVer] = useState(null)
  const [modalConfirmarEliminar, setModalConfirmarEliminar] = useState(false)
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorGrabar, setErrorGrabar] = useState('')
  const [errorsProveedor, setErrorsProveedor] = useState({})

  const [formProveedor, setFormProveedor] = useState({
    nombre: '',
    direccionFisica: '',
    correoElectronico: '',
    nombreDeContacto1: '',
    nombreDeContacto2: '',
    telefono1: '',
    telefono2: '',
    creditoAutorizado: '',
    deudaActual: '',
  })

  const pageSize = 20

  const quitarFocoDelModal = () => {
    const active = document.activeElement
    if (active && typeof active.blur === 'function') {
      active.blur()
    }
  }

  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros((prev) => ({ ...prev, [name]: value }))
  }

  const cargarProveedores = async (pagina = 0, filtrosActuales = filtros) => {
    try {
      const params = new URLSearchParams()
      params.set('page', String(pagina))
      params.set('size', String(pageSize))
      if (filtrosActuales.nombre?.trim()) params.set('nombre', filtrosActuales.nombre.trim())
      if (filtrosActuales.nombreDeContacto1?.trim()) params.set('nombreDeContacto', filtrosActuales.nombreDeContacto1.trim())

      const response = await fetch(`/api/proveedores?${params.toString()}`)
      const data = await response.json()

      const lista = Array.isArray(data) ? data : (data?.content || [])
      setProveedores(lista)
      setTotalPages(data.totalPages !== undefined ? data.totalPages : 1)
      setPage(data.number !== undefined ? data.number : 0)
    } catch (e) {
      console.error('Error al cargar proveedores:', e)
      setProveedores([])
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (
        filtros.nombre.length < 2 &&
        filtros.nombreDeContacto1.length < 2
      ) {
        cargarProveedores(0)
        return
      }
      cargarProveedores(0, filtros)
    }, 500)
    return () => clearTimeout(delayDebounce)
  }, [filtros])

  const handleFormProveedorChange = (e) => {
    const { name, value } = e.target
    setFormProveedor((prev) => ({ ...prev, [name]: value }))
  }

  const abrirModalAgregar = () => {
    setModoEdicionProveedor(false)
    setIdProveedorEditar(null)
    setFormProveedor({
      nombre: '',
      direccionFisica: '',
      correoElectronico: '',
      nombreDeContacto1: '',
      nombreDeContacto2: '',
      telefono1: '',
      telefono2: '',
      creditoAutorizado: '',
      deudaActual: '',
    })
    setErrorGrabar('')
    setErrorsProveedor({})
    setModalAgregarVisible(true)
  }

  const abrirModalEditar = (proveedor) => {
    setModoEdicionProveedor(true)
    setIdProveedorEditar(proveedor.idProveedor ?? null)
    setFormProveedor({
      nombre: proveedor.nombre ?? proveedor.nombreProveedor ?? '',
      direccionFisica: proveedor.direccionFisica ?? proveedor.direccion ?? '',
      correoElectronico: proveedor.correoElectronico ?? proveedor.email ?? '',
      nombreDeContacto1: proveedor.nombreDeContacto1 ?? proveedor.nombreContacto1 ?? '',
      nombreDeContacto2: proveedor.nombreDeContacto2 ?? proveedor.nombreContacto2 ?? '',
      telefono1: proveedor.telefono1 ?? proveedor.telefono ?? '',
      telefono2: proveedor.telefono2 ?? '',
      creditoAutorizado: proveedor.creditoAutorizado != null && proveedor.creditoAutorizado !== '' ? String(proveedor.creditoAutorizado) : '',
      deudaActual: proveedor.deudaActual != null && proveedor.deudaActual !== '' ? String(proveedor.deudaActual) : '',
    })
    setErrorGrabar('')
    setErrorsProveedor({})
    setModalAgregarVisible(true)
  }

  const cerrarModalAgregar = () => {
    setModalAgregarVisible(false)
    setModoEdicionProveedor(false)
    setIdProveedorEditar(null)
    setErrorGrabar('')
    setErrorsProveedor({})
  }

  const grabarProveedor = async (e) => {
    e.preventDefault()
    setErrorGrabar('')
    const nuevosErrores = {}
    if (!formProveedor.nombre?.trim()) nuevosErrores.nombre = 'El nombre del proveedor es obligatorio'
    if (!formProveedor.direccionFisica?.trim()) nuevosErrores.direccionFisica = 'La dirección física es obligatoria'
    if (!formProveedor.nombreDeContacto1?.trim()) nuevosErrores.nombreDeContacto1 = 'El contacto 1 es obligatorio'
    if (!formProveedor.telefono1?.trim()) nuevosErrores.telefono1 = 'El teléfono 1 es obligatorio'
    if (Object.keys(nuevosErrores).length > 0) {
      setErrorsProveedor(nuevosErrores)
      return
    }
    setErrorsProveedor({})
    setGuardando(true)
    try {
      const body = {
        nombre: formProveedor.nombre?.trim() || '',
        direccionFisica: formProveedor.direccionFisica?.trim() || '',
        correoElectronico: formProveedor.correoElectronico?.trim() || '',
        nombreDeContacto1: formProveedor.nombreDeContacto1?.trim() || '',
        nombreDeContacto2: formProveedor.nombreDeContacto2?.trim() || '',
        telefono1: formProveedor.telefono1?.trim() || '',
        telefono2: formProveedor.telefono2?.trim() || '',
        creditoAutorizado: formProveedor.creditoAutorizado !== '' ? Number(formProveedor.creditoAutorizado) : null,
        deudaActual: formProveedor.deudaActual !== '' ? Number(formProveedor.deudaActual) : null,
        idUsuarioModificacion: idUsuarioActual,
      }
      const url = modoEdicionProveedor && idProveedorEditar
        ? `/api/editarProveedor/${idProveedorEditar}`
        : '/api/grabarProveedor'
      const method = modoEdicionProveedor && idProveedorEditar ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || (modoEdicionProveedor ? 'Error al actualizar el proveedor' : 'Error al guardar el proveedor'))
      }
      quitarFocoDelModal()
      cerrarModalAgregar()
      setMensajeExito(modoEdicionProveedor ? 'El proveedor fue actualizado exitosamente.' : 'El registro fue guardado exitosamente.')
      setModalExitoVisible(true)
    } catch (err) {
      console.error('Error grabar proveedor:', err)
      setErrorGrabar(err.message || 'No se pudo guardar el proveedor')
    } finally {
      setGuardando(false)
    }
  }

  const abrirConfirmarEliminar = (proveedor) => {
    setProveedorAEliminar(proveedor)
    setModalConfirmarEliminar(true)
  }

  const cerrarConfirmarEliminar = () => {
    if (!eliminando) {
      setModalConfirmarEliminar(false)
      setProveedorAEliminar(null)
    }
  }

  const confirmarEliminarProveedor = async () => {
    if (!proveedorAEliminar?.idProveedor) return
    setEliminando(true)
    try {
      const response = await fetch(`/api/eliminarProveedor/${proveedorAEliminar.idProveedor}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuarioModificacion: idUsuarioActual }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Error al eliminar el proveedor')
      }
      quitarFocoDelModal()
      setModalConfirmarEliminar(false)
      setProveedorAEliminar(null)
      setMensajeExito('El proveedor fue eliminado correctamente.')
      setModalExitoVisible(true)
      cargarProveedores(0, filtros)
    } catch (err) {
      console.error('Error al eliminar proveedor:', err)
      alert(err.message || 'No se pudo eliminar el proveedor')
    } finally {
      setEliminando(false)
    }
  }

  const exportarAExcel = async () => {
    try {
      const params = new URLSearchParams()
      params.set('page', '0')
      params.set('size', '10000')
      if (filtros.nombre?.trim()) params.set('nombre', filtros.nombre.trim())
      if (filtros.nombreDeContacto1?.trim()) params.set('nombreDeContacto', filtros.nombreDeContacto1.trim())

      const response = await fetch(`/api/proveedores?${params.toString()}`)
      if (!response.ok) throw new Error('Error al obtener los proveedores')

      const data = await response.json()
      const lista = Array.isArray(data) ? data : (data?.content || [])

      if (!lista || lista.length === 0) {
        alert('No hay proveedores para exportar')
        return
      }

      const datosExcel = lista.map((proveedor, index) => ({
        'No.': index + 1,
        'Nombre Proveedor': proveedor.nombre ?? proveedor.nombreProveedor ?? '',
        'Dirección Física': proveedor.direccionFisica ?? proveedor.direccion ?? '',
        'Correo Electrónico': proveedor.correoElectronico ?? proveedor.email ?? '',
        'Nombre Contacto 1': proveedor.nombreDeContacto1 ?? proveedor.nombreContacto1 ?? '',
        'Nombre Contacto 2': proveedor.nombreDeContacto2 ?? proveedor.nombreContacto2 ?? '',
        'Teléfono 1': proveedor.telefono1 ?? proveedor.telefono ?? '',
        'Teléfono 2': proveedor.telefono2 ?? '',
        'Crédito Autorizado': proveedor.creditoAutorizado ?? '',
        'Deuda Actual': proveedor.deudaActual ?? '',
      }))

      const ws = XLSX.utils.json_to_sheet(datosExcel)
      ws['!cols'] = [
        { wch: 5 },
        { wch: 28 },
        { wch: 35 },
        { wch: 28 },
        { wch: 22 },
        { wch: 22 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Proveedores')

      const fecha = new Date()
      const nombreArchivo = `Proveedores_${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}_${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}.xlsx`
      XLSX.writeFile(wb, nombreArchivo)
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('No se pudo exportar el archivo. ' + error.message)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="w-100 shadow-sm border-0" >
          <CCardHeader>
            <strong className="fs-4">Proveedores</strong>
          </CCardHeader>
          <CCardBody className="p-4">
            <div className="mb-3 d-flex justify-content-end gap-2">
              <CButton color="success" className="text-light" onClick={abrirModalAgregar}>
                + Agregar
              </CButton>
              <CButton color="info" className="text-light" onClick={exportarAExcel}>
                Exportar
              </CButton>
            </div>

            <CForm className="mt-3">
              <CRow className="gy-3" >
                <CCol md={4} >
                  <CFormLabel className="fw-bold">Nombre Proveedor </CFormLabel>
                  <CFormInput name="nombre"
                    placeholder="Nombre proveedor"
                    value={filtros.nombre}
                    onChange={handleFiltroChange} />
                </CCol>
                <CCol md={4}>
                  <CFormLabel className="fw-bold">Nombre Contacto No. 1 </CFormLabel>
                  <CFormInput
                    name="nombreDeContacto1"
                    placeholder="Teclee el nombre del contacto 1 para buscar"
                    value={filtros.nombreDeContacto1}
                    onChange={handleFiltroChange}
                    autoComplete="off"
                  />
                </CCol>
              </CRow>
            </CForm >

            <CModal visible={modalAgregarVisible} onClose={cerrarModalAgregar} backdrop="static" size="lg">
              <CModalHeader className="bg-light">
                <CModalTitle className="text-dark">{modoEdicionProveedor ? 'Editar Proveedor' : 'Agregar Proveedor'}</CModalTitle>
              </CModalHeader>
              <CForm onSubmit={grabarProveedor}>
                <CModalBody>
                  {errorGrabar && (
                    <div className="alert alert-danger small mb-3" role="alert">
                      {errorGrabar}
                    </div>
                  )}
                  
                  <CRow className="gy-2">
                    
                       <CRow className="g-3">
                    <CCol xs={6}>
                      <CFormLabel className="text-dark fw-bold">Nombre</CFormLabel>
                      <CFormInput
                        name="nombre"
                        value={formProveedor.nombre}
                        onChange={handleFormProveedorChange}
                        placeholder="Nombre del proveedor"
                        invalid={!!errorsProveedor.nombre}
                      />
                      {errorsProveedor.nombre && (
                        <div className="invalid-feedback d-block">{errorsProveedor.nombre}</div>
                      )}
                    </CCol>
                    <CCol xs={6}>
                      <CFormLabel className="text-dark fw-bold">Correo electrónico</CFormLabel>
                      <CFormInput
                        name="correoElectronico"
                        type="email"
                        value={formProveedor.correoElectronico}
                        onChange={handleFormProveedorChange}
                       placeholder='correo@ejemplo.com'
                      />
                    </CCol>
                    </CRow>
                       <CRow className="g-3">
                    <CCol xs={6}>
                      <CFormLabel className="text-dark fw-bold">Dirección física</CFormLabel>
                      <CFormTextarea
                        name="direccionFisica"
                        value={formProveedor.direccionFisica}
                        onChange={handleFormProveedorChange}
                        placeholder="Dirección"
                        rows={2}
                        invalid={!!errorsProveedor.direccionFisica}
                      />
                      {errorsProveedor.direccionFisica && (
                        <div className="invalid-feedback d-block">{errorsProveedor.direccionFisica}</div>
                      )}
                    </CCol>
                    </CRow>
                    
                     
                      <CRow className="g-3">
                    <CCol xs={6}>
                      <CFormLabel className="text-dark fw-bold">Contacto 1</CFormLabel>
                      <CFormInput
                        name="nombreDeContacto1"
                        value={formProveedor.nombreDeContacto1}
                        onChange={handleFormProveedorChange}
                        placeholder="Nombre del contacto principal"
                        invalid={!!errorsProveedor.nombreDeContacto1}
                      />
                      {errorsProveedor.nombreDeContacto1 && (
                        <div className="invalid-feedback d-block">{errorsProveedor.nombreDeContacto1}</div>
                      )}
                    </CCol>
                         <CCol md={6}>
                      <CFormLabel className="text-dark fw-bold">Teléfono 1</CFormLabel>
                      <CFormInput
                        name="telefono1"
                        value={formProveedor.telefono1}
                        onChange={handleFormProveedorChange}
                        placeholder="Número de teléfono principal"
                        invalid={!!errorsProveedor.telefono1}
                      />
                      {errorsProveedor.telefono1 && (
                        <div className="invalid-feedback d-block">{errorsProveedor.telefono1}</div>
                      )}
                    </CCol>
                    </CRow>
                    <CRow className="g-3">
                    <CCol xs={6}>
                      <CFormLabel className="text-dark fw-bold">Contacto 2</CFormLabel>
                      <CFormInput
                        name="nombreDeContacto2"
                        value={formProveedor.nombreDeContacto2}
                        onChange={handleFormProveedorChange}
                        placeholder="Nombre del contacto secundario"
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="text-dark fw-bold">Teléfono 2</CFormLabel>
                      <CFormInput
                        name="telefono2"
                        value={formProveedor.telefono2}
                        onChange={handleFormProveedorChange}
                        placeholder="Número de teléfono secundario"
                      />
                    </CCol>
                    </CRow>
                   
                   
                      <CRow className="g-3">
                    <CCol md={6}>
                      <CFormLabel className="text-dark fw-bold">Crédito autorizado</CFormLabel>
                      <CFormInput
                        name="creditoAutorizado"
                        type="number"
                        step="any"
                        value={formProveedor.creditoAutorizado}
                        onChange={handleFormProveedorChange}
                        placeholder="0"
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel className="text-dark fw-bold">Deuda actual</CFormLabel>
                      <CFormInput
                        name="deudaActual"
                        type="number"
                        step="any"
                        value={formProveedor.deudaActual}
                        onChange={handleFormProveedorChange}
                        placeholder="0"
                      />
                    </CCol>
                    </CRow>
                   
                  </CRow>
                </CModalBody>
                <CModalFooter>
                  <CButton color="secondary" type="button" onClick={cerrarModalAgregar} disabled={guardando}>
                    Cerrar
                  </CButton>
                  <CButton className="text-light" color="success" type="submit" disabled={guardando}>
                    {guardando ? (modoEdicionProveedor ? 'Actualizando…' : 'Guardando…') : (modoEdicionProveedor ? 'Actualizar' : 'Guardar')}
                  </CButton>
                </CModalFooter>
              </CForm>
            </CModal>

            <CModal visible={modalExitoVisible} onClose={() => setModalExitoVisible(false)} alignment="center">
              <CModalHeader>
                <CModalTitle className="text-success">Éxito</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <p className="mb-0">{mensajeExito || 'El registro fue guardado exitosamente.'}</p>
              </CModalBody>
              <CModalFooter>
                <CButton color="success" onClick={() => { setModalExitoVisible(false); cargarProveedores(0, filtros) }}>
                  Aceptar
                </CButton>
              </CModalFooter>
            </CModal>

            <CModal visible={modalConfirmarEliminar} onClose={cerrarConfirmarEliminar} backdrop={eliminando ? 'static' : true}>
              <CModalHeader>
                <CModalTitle>Eliminar proveedor</CModalTitle>
              </CModalHeader>
              <CModalBody>
                ¿Está seguro que desea eliminar el proveedor{' '}
                <strong>{proveedorAEliminar?.nombre ?? proveedorAEliminar?.nombreProveedor ?? ''}</strong>?
                <br />
                <span className="text-muted small">Esta acción no se puede deshacer.</span>
              </CModalBody>
              <CModalFooter>
                <CButton color="secondary" onClick={cerrarConfirmarEliminar} disabled={eliminando}>
                  Cancelar
                </CButton>
                <CButton color="danger" onClick={confirmarEliminarProveedor} disabled={eliminando}>
                  {eliminando ? 'Eliminando…' : 'Eliminar'}
                </CButton>
              </CModalFooter>
            </CModal>

            <CModal visible={!!proveedorVer} onClose={() => setProveedorVer(null)} size="lg" backdrop="static">
              <CModalHeader className="border-0 pb-0">
                <CModalTitle className="text-dark">Detalle del proveedor</CModalTitle>
              </CModalHeader>
              <CModalBody className="pt-2">
                {proveedorVer && (
                  <>
                    <div className="mb-4 pb-3 border-bottom">
                      <h5 className="text-primary mb-0 fw-semibold">
                        {proveedorVer.nombre ?? proveedorVer.nombreProveedor ?? 'Sin nombre'}
                      </h5>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted small fw-semibold mb-3">Datos generales</h6>
                      <div className="bg-light rounded-3 p-3">
                        <CRow className="g-3">
                          <CCol xs={12}>
                            <div>
                              <span className="text-muted small d-block mb-1">Dirección</span>
                              <span className="d-block">{proveedorVer.direccionFisica ?? proveedorVer.direccion ?? '—'}</span>
                            </div>
                          </CCol>
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Correo electrónico</span>
                              <span className="d-block">
                                {proveedorVer.correoElectronico ?? proveedorVer.email ? (
                                  <a href={`mailto:${proveedorVer.correoElectronico ?? proveedorVer.email}`} className="text-decoration-none">
                                    {proveedorVer.correoElectronico ?? proveedorVer.email}
                                  </a>
                                ) : '—'}
                              </span>
                            </div>
                          </CCol>
                        </CRow>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted small fw-semibold mb-3">Contactos</h6>
                      <div className="bg-light rounded-3 p-3">
                        <CRow className="g-3">
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Contacto 1</span>
                              <span className="d-block fw-medium">{proveedorVer.nombreDeContacto1 ?? proveedorVer.nombreContacto1 ?? '—'}</span>
                              {(proveedorVer.telefono1 ?? proveedorVer.telefono) && (
                                <a href={`tel:${proveedorVer.telefono1 ?? proveedorVer.telefono}`} className="small text-decoration-none d-block mt-1">
                                  📞 {proveedorVer.telefono1 ?? proveedorVer.telefono}
                                </a>
                              )}
                            </div>
                          </CCol>
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Contacto 2</span>
                              <span className="d-block fw-medium">{proveedorVer.nombreDeContacto2 ?? proveedorVer.nombreContacto2 ?? '—'}</span>
                              {proveedorVer.telefono2 && (
                                <a href={`tel:${proveedorVer.telefono2}`} className="small text-decoration-none d-block mt-1">
                                  📞 {proveedorVer.telefono2}
                                </a>
                              )}
                            </div>
                          </CCol>
                        </CRow>
                      </div>
                    </div>

                    <div>
                      <h6 className="text-uppercase text-muted small fw-semibold mb-3">Información financiera</h6>
                      <div className="bg-light rounded-3 p-3">
                        <CRow className="g-3">
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Crédito autorizado</span>
                              <span className="d-block fw-medium">
                                {proveedorVer.creditoAutorizado != null && proveedorVer.creditoAutorizado !== '' ? (
                                  <>Q {Number(proveedorVer.creditoAutorizado).toLocaleString('es-GT')}</>
                                ) : '—'}
                              </span>
                            </div>
                          </CCol>
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Deuda actual</span>
                              <span className="d-block fw-medium">
                                {proveedorVer.deudaActual != null && proveedorVer.deudaActual !== '' ? (
                                  <>Q {Number(proveedorVer.deudaActual).toLocaleString('es-GT')}</>
                                ) : '—'}
                              </span>
                            </div>
                          </CCol>
                        </CRow>
                      </div>
                    </div>
                  </>
                )}
              </CModalBody>
              <CModalFooter className="border-0 pt-0">
                <CButton color="secondary" onClick={() => setProveedorVer(null)}>Cerrar</CButton>
              </CModalFooter>
            </CModal>

            <div className="table-responsive mt-4" style={{ minHeight: 0 }}>
              <CTable striped bordered hover responsive className="mb-0">
              <CTableHead style={{ '--cui-table-bg': '#1a3a6b', '--cui-table-color': '#fff', '--cui-table-border-color': '#2a4a8b', backgroundColor: '#1a3a6b', color: '#fff' }}>
                <CTableRow>
                  <CTableHeaderCell>No.</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Nombre Proveedor</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Correo Electrónico</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Contacto No. 1</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Telefono No. 1</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap text-center">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {proveedores.map((proveedor, index) => (
                  <CTableRow key={`prov-${proveedor.idProveedor ?? index}`}>
                    <CTableDataCell>{page * pageSize + index + 1}</CTableDataCell>
                    <CTableDataCell>{proveedor.nombre ?? proveedor.nombreProveedor ?? ''}</CTableDataCell>
                    <CTableDataCell>{proveedor.correoElectronico ?? proveedor.email ?? ''}</CTableDataCell>
                    <CTableDataCell>{proveedor.nombreDeContacto1 ?? proveedor.nombreContacto1 ?? ''}</CTableDataCell>
                    <CTableDataCell>{proveedor.telefono1 ?? proveedor.telefono ?? ''}</CTableDataCell>
                    <CTableDataCell className="py-2 text-nowrap text-center">
                        <CButton size="sm" color="info" className="me-2" onClick={() => setProveedorVer(proveedor)} title="Ver">
                         👁️
                        </CButton>
                      <CButton size="sm" color="warning" className="me-2" onClick={() => abrirModalEditar(proveedor)} title="Editar">
                        ✏️
                      </CButton>
                        <CButton size="sm" color="danger" onClick={() => abrirConfirmarEliminar(proveedor)} title="Eliminar">
                          🗑️
                        </CButton>
                        </CTableDataCell>
                        
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
            </div>
            <CPagination className="justify-content-end mt-3 flex-wrap align-items-center">
              <CPaginationItem disabled={page === 0} onClick={() => cargarProveedores(0)} title="Primera página">«</CPaginationItem>
              <CPaginationItem disabled={page === 0} onClick={() => cargarProveedores(page - 1)}>Anterior</CPaginationItem>
              {(() => {
                if (totalPages <= 7) {
                  return [...Array(totalPages)].map((_, i) => (
                    <CPaginationItem key={i} active={i === page} onClick={() => cargarProveedores(i)}>{i + 1}</CPaginationItem>
                  ))
                }
                const items = []
                const inicio = Math.max(0, page - 2)
                const fin = Math.min(totalPages - 1, page + 2)
                if (page > 2) {
                  items.push(<CPaginationItem key={0} onClick={() => cargarProveedores(0)}>1</CPaginationItem>)
                  if (page > 3) items.push(<CPaginationItem key="e1" disabled>…</CPaginationItem>)
                }
                for (let i = inicio; i <= fin; i++) {
                  items.push(<CPaginationItem key={i} active={i === page} onClick={() => cargarProveedores(i)}>{i + 1}</CPaginationItem>)
                }
                if (page < totalPages - 3) {
                  if (page < totalPages - 4) items.push(<CPaginationItem key="e2" disabled>…</CPaginationItem>)
                  items.push(<CPaginationItem key={totalPages - 1} onClick={() => cargarProveedores(totalPages - 1)}>{totalPages}</CPaginationItem>)
                }
                return items
              })()}
              <CPaginationItem disabled={page === totalPages - 1} onClick={() => cargarProveedores(page + 1)}>Siguiente</CPaginationItem>
              <CPaginationItem disabled={page === totalPages - 1} onClick={() => cargarProveedores(totalPages - 1)} title="Última página">»</CPaginationItem>
            </CPagination>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
  }
export default Layout