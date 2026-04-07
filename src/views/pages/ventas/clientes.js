import React, { useEffect, useRef, useState } from 'react'
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
  CRow,
  CSpinner,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import * as XLSX from 'xlsx'

const Layout = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const PAGE_SIZE = 20
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalElementos, setTotalElementos] = useState(0)
  const [filtros, setFiltros] = useState({
    nombreCliente: '',
    tipoDocumento: 'nit',
    numeroDocumento: '',
  })
  const debounceRef = useRef(null)
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorGrabar, setErrorGrabar] = useState('')
  const [errorsCliente, setErrorsCliente] = useState({})
  const [modalExitoVisible, setModalExitoVisible] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [modoEdicionCliente, setModoEdicionCliente] = useState(false)
  const [idClienteEditar, setIdClienteEditar] = useState(null)
  const [clienteVer, setClienteVer] = useState(null)
  const [modalConfirmarEliminar, setModalConfirmarEliminar] = useState(false)
  const [clienteAEliminar, setClienteAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const [formCliente, setFormCliente] = useState({
    nombreCliente: '',
    direccionFisica: '',
    correoElectronico: '',
    nit: '',
    dpiPasaporte: '',
    nombreFacturacion: '',
    telefono1: '',
    telefono2: '',
    creditoAutorizado: '',
    deudaActual: '',
  })

  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    if (name === 'tipoDocumento') {
      const nuevos = { ...filtros, tipoDocumento: value, numeroDocumento: '' }
      setFiltros(nuevos)
      buscarClientes(0, nuevos)
    } else if (name === 'numeroDocumento') {
      const nuevos = { ...filtros, numeroDocumento: value }
      setFiltros(nuevos)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => buscarClientes(0, nuevos), 300)
    } else {
      const nuevos = { ...filtros, [name]: value }
      setFiltros(nuevos)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => buscarClientes(0, nuevos), 300)
    }
  }

  const buscarClientes = async (pagina = 0, filtrosActuales = filtros) => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ page: pagina, size: PAGE_SIZE })
      if (filtrosActuales.nombreCliente?.trim())
        params.append('nombreCliente', filtrosActuales.nombreCliente.trim())
      if (filtrosActuales.numeroDocumento?.trim()) {
        params.append('tipoDocumento', filtrosActuales.tipoDocumento === 'nit' ? 1 : 2)
        params.append('documentoCliente', filtrosActuales.numeroDocumento.trim())
      }
      const res = await fetch(`/api/clientes?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const lista = Array.isArray(data) ? data : (data?.content || [])
      setClientes(lista)
      setPage(data.number ?? pagina)
      setTotalPaginas(data.totalPages ?? 1)
      setTotalElementos(data.totalElements ?? lista.length)
    } catch (e) {
      console.error('Error al cargar clientes:', e)
      setClientes([])
    } finally {
      setCargando(false)
    }
  }

  const quitarFocoDelModal = () => {
    const active = document.activeElement
    if (active && typeof active.blur === 'function') {
      active.blur()
    }
  }

  const handleFormClienteChange = (e) => {
    const { name, value } = e.target
    setFormCliente((prev) => ({ ...prev, [name]: value }))
  }

  const abrirModalAgregar = () => {
    setModoEdicionCliente(false)
    setIdClienteEditar(null)
    setFormCliente({
      nombreCliente: '',
      direccionFisica: '',
      correoElectronico: '',
      nit: '',
      dpiPasaporte: '',
      nombreFacturacion: '',
      telefono1: '',
      telefono2: '',
      creditoAutorizado: '',
      deudaActual: '',
    })
    setErrorGrabar('')
    setErrorsCliente({})
    setModalAgregarVisible(true)
  }

  const abrirModalEditar = (cliente) => {
    setModoEdicionCliente(true)
    setIdClienteEditar(cliente.idCliente ?? cliente.id ?? null)
    setFormCliente({
      nombreCliente: cliente.nombreCliente ?? '',
      direccionFisica: cliente.direccionFisica ?? '',
      correoElectronico: cliente.correoElectronico ?? '',
      nit: cliente.nit ?? '',
      dpiPasaporte: cliente.documentoIdentificacion ?? '',
      nombreFacturacion: cliente.nombreFacturacion ?? '',
      telefono1: cliente.telefono1 ?? '',
      telefono2: cliente.telefono2 ?? '',
      creditoAutorizado: cliente.creditoAutorizado != null && cliente.creditoAutorizado !== '' ? String(cliente.creditoAutorizado) : '',
      deudaActual: cliente.deudaActual != null && cliente.deudaActual !== '' ? String(cliente.deudaActual) : '',
    })
    setErrorGrabar('')
    setErrorsCliente({})
    setModalAgregarVisible(true)
  }

  const cerrarModalAgregar = () => {
    setModalAgregarVisible(false)
    setModoEdicionCliente(false)
    setIdClienteEditar(null)
    setErrorGrabar('')
    setErrorsCliente({})
  }

  const abrirConfirmarEliminar = (cliente) => {
    setClienteAEliminar(cliente)
    setModalConfirmarEliminar(true)
  }

  const cerrarConfirmarEliminar = () => {
    if (!eliminando) {
      setModalConfirmarEliminar(false)
      setClienteAEliminar(null)
    }
  }

  const exportarAExcel = async () => {
    try {
      const params = new URLSearchParams({ page: 0, size: 10000 })
      if (filtros.nombreCliente?.trim()) params.append('nombreCliente', filtros.nombreCliente.trim())
      if (filtros.numeroDocumento?.trim()) {
        params.append('tipoDocumento', filtros.tipoDocumento === 'nit' ? 1 : 2)
        params.append('documentoCliente', filtros.numeroDocumento.trim())
      }
      const res = await fetch(`/api/clientes?${params}`)
      const data = await res.json()
      const lista = Array.isArray(data) ? data : (data?.content || [])

      if (!lista || lista.length === 0) {
        alert('No hay clientes para exportar')
        return
      }

      const datosExcel = lista.map((cliente, index) => ({
        'No.': index + 1,
        'Nombre Cliente': cliente.nombreCliente ?? '',
        'Correo Electrónico': cliente.correoElectronico ?? '',
        'NIT': cliente.nit ?? '',
        'Nombre Facturación': cliente.nombreFacturacion ?? '',
        'Dirección Física': cliente.direccionFisica ?? '',
        'Teléfono 1': cliente.telefono1 ?? '',
        'Teléfono 2': cliente.telefono2 ?? '',
        'Crédito Autorizado': cliente.creditoAutorizado ?? '',
        'Deuda Actual': cliente.deudaActual ?? '',
      }))

      const ws = XLSX.utils.json_to_sheet(datosExcel)
      ws['!cols'] = [
        { wch: 5 },
        { wch: 28 },
        { wch: 28 },
        { wch: 16 },
        { wch: 28 },
        { wch: 35 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

      const fecha = new Date()
      const nombreArchivo = `Clientes_${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}_${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}.xlsx`
      XLSX.writeFile(wb, nombreArchivo)
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('No se pudo exportar el archivo. ' + error.message)
    }
  }

  const confirmarEliminarCliente = async () => {
    const id = clienteAEliminar?.idCliente ?? clienteAEliminar?.id
    if (!id) return
    setEliminando(true)
    try {
      const response = await fetch(`/api/eliminarCliente/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuarioModificacion: idUsuarioActual }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Error al eliminar el cliente')
      }
      quitarFocoDelModal()
      setModalConfirmarEliminar(false)
      setClienteAEliminar(null)
      setMensajeExito('El cliente fue eliminado correctamente.')
      setModalExitoVisible(true)
      buscarClientes(0, filtros)
    } catch (err) {
      console.error('Error al eliminar cliente:', err)
      alert(err.message || 'No se pudo eliminar el cliente')
    } finally {
      setEliminando(false)
    }
  }

  const grabarCliente = async (e) => {
    e.preventDefault()
    setErrorGrabar('')
    const nuevosErrores = {}
    if (!formCliente.nombreCliente?.trim()) nuevosErrores.nombreCliente = 'El nombre del cliente es obligatorio'
    if (!formCliente.nit?.trim()) nuevosErrores.nit = 'El NIT es obligatorio'
    if (!formCliente.nombreFacturacion?.trim()) nuevosErrores.nombreFacturacion = 'El nombre de facturación es obligatorio'
    if (!formCliente.direccionFisica?.trim()) nuevosErrores.direccionFisica = 'La dirección física es obligatoria'
    if (Object.keys(nuevosErrores).length > 0) {
      setErrorsCliente(nuevosErrores)
      return
    }
    setErrorsCliente({})
    setGuardando(true)
    try {
      const body = {
        nombreCliente: formCliente.nombreCliente?.trim() || '',
        direccionFisica: formCliente.direccionFisica?.trim() || '',
        correoElectronico: formCliente.correoElectronico?.trim() || '',
        nit: formCliente.nit?.trim() || '',
        documentoIdentificacion: formCliente.dpiPasaporte?.trim() || '',
        nombreFacturacion: formCliente.nombreFacturacion?.trim() || '',
        telefono1: formCliente.telefono1?.trim() || '',
        telefono2: formCliente.telefono2?.trim() || '',
        creditoAutorizado: formCliente.creditoAutorizado !== '' ? Number(formCliente.creditoAutorizado) : null,
        deudaActual: formCliente.deudaActual !== '' ? Number(formCliente.deudaActual) : null,
        idUsuarioModificacion: idUsuarioActual,
      }
      const url = modoEdicionCliente && idClienteEditar
        ? `/api/editarCliente/${idClienteEditar}`
        : '/api/grabarCliente'
      const method = modoEdicionCliente && idClienteEditar ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || (modoEdicionCliente ? 'Error al actualizar el cliente' : 'Error al guardar el cliente'))
      }
      quitarFocoDelModal()
      cerrarModalAgregar()
      setMensajeExito(modoEdicionCliente ? 'El cliente fue actualizado exitosamente.' : 'El cliente fue guardado exitosamente.')
      setModalExitoVisible(true)
      buscarClientes(0, filtros)
    } catch (err) {
      console.error('Error grabar cliente:', err)
      setErrorGrabar(err.message || 'No se pudo guardar el cliente')
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    buscarClientes(0, filtros)
  }, [])

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="w-100 shadow-sm border-0">
          <CCardHeader>
            <strong className="fs-4">Clientes</strong>
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
              <CRow className="gy-3">
                <CCol md={3}>
                  <CFormLabel className="fw-bold">Nombre Cliente</CFormLabel>
                  <CFormInput
                    name="nombreCliente"
                    placeholder="Buscar por nombre"
                    value={filtros.nombreCliente}
                    onChange={handleFiltroChange}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="fw-bold">Tipo Documento</CFormLabel>
                  <CFormSelect
                    name="tipoDocumento"
                    value={filtros.tipoDocumento}
                    onChange={handleFiltroChange}
                  >
                    <option value="nit">NIT</option>
                    <option value="dpi">DPI / Pasaporte</option>
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>&nbsp;</CFormLabel>
                  <CFormInput
                    name="numeroDocumento"
                    placeholder={filtros.tipoDocumento === 'nit' ? 'Buscar por NIT' : 'Buscar por DPI / Pasaporte'}
                    value={filtros.numeroDocumento}
                    onChange={handleFiltroChange}
                    autoComplete="off"
                  />
                </CCol>
              </CRow>
            </CForm>

            {cargando && (
              <div className="text-center py-4">
                <CSpinner color="primary" />
                <p className="mt-2 text-muted small">Cargando clientes...</p>
              </div>
            )}
            {!cargando && totalElementos > 0 && (
              <small className="text-muted d-block mt-3">
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElementos)} de {totalElementos} clientes
              </small>
            )}

            <div className="table-responsive mt-2" style={{ minHeight: 0 }}>
              <CTable striped bordered hover responsive className="mb-0">
                <CTableHead style={{ '--cui-table-bg': '#1a3a6b', '--cui-table-color': '#fff', '--cui-table-border-color': '#2a4a8b', backgroundColor: '#1a3a6b', color: '#fff' }}>
                  <CTableRow>
                    <CTableHeaderCell>No.</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-nowrap">Nombre Cliente</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-nowrap">Dirección Física</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-nowrap">Correo Electrónico</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-nowrap">NIT</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-nowrap">DPI / Pasaporte</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-nowrap">Nombre Facturación</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-nowrap">Teléfono 1</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-nowrap text-center">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {clientes.map((cliente, index) => (
                    <CTableRow key={`cli-${cliente.idCliente ?? cliente.id ?? index}`}>
                      <CTableDataCell>{page * PAGE_SIZE + index + 1}</CTableDataCell>
                      <CTableDataCell>{cliente.nombreCliente ?? ''}</CTableDataCell>
                      <CTableDataCell>{cliente.direccionFisica ?? ''}</CTableDataCell>
                      <CTableDataCell>{cliente.correoElectronico ?? ''}</CTableDataCell>
                      <CTableDataCell>{cliente.nit ?? ''}</CTableDataCell>
                      <CTableDataCell>{cliente.documentoIdentificacion ?? ''}</CTableDataCell>
                      <CTableDataCell>{cliente.nombreFacturacion ?? ''}</CTableDataCell>
                      <CTableDataCell>{cliente.telefono1 ?? ''}</CTableDataCell>
                      <CTableDataCell className="py-2 text-nowrap text-center">
                        <CButton size="sm" color="info" className="me-2" onClick={() => setClienteVer(cliente)} title="Ver">
                          👁️
                        </CButton>
                        <CButton size="sm" color="warning" className="me-2" onClick={() => abrirModalEditar(cliente)} title="Editar">
                          ✏️
                        </CButton>
                        <CButton size="sm" color="danger" onClick={() => abrirConfirmarEliminar(cliente)} title="Eliminar">
                          🗑️
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>

            {/* Paginación */}
            {clientes.length > 0 && (() => {
              const items = []
              const inicio = Math.max(0, page - 2)
              const fin    = Math.min(totalPaginas - 1, page + 2)
              if (page > 2) {
                items.push(<CPaginationItem key={0} onClick={() => buscarClientes(0, filtros)}>1</CPaginationItem>)
                if (page > 3) items.push(<CPaginationItem key="e1" disabled>…</CPaginationItem>)
              }
              for (let i = inicio; i <= fin; i++)
                items.push(<CPaginationItem key={i} active={i === page} onClick={() => buscarClientes(i, filtros)}>{i + 1}</CPaginationItem>)
              if (page < totalPaginas - 3) {
                if (page < totalPaginas - 4) items.push(<CPaginationItem key="e2" disabled>…</CPaginationItem>)
                items.push(<CPaginationItem key={totalPaginas - 1} onClick={() => buscarClientes(totalPaginas - 1, filtros)}>{totalPaginas}</CPaginationItem>)
              }
              return (
                <CPagination className="justify-content-end mt-3 flex-wrap">
                  <CPaginationItem disabled={page === 0} onClick={() => buscarClientes(0, filtros)} title="Primera">«</CPaginationItem>
                  <CPaginationItem disabled={page === 0} onClick={() => buscarClientes(page - 1, filtros)}>Anterior</CPaginationItem>
                  {items}
                  <CPaginationItem disabled={page >= totalPaginas - 1} onClick={() => buscarClientes(page + 1, filtros)}>Siguiente</CPaginationItem>
                  <CPaginationItem disabled={page >= totalPaginas - 1} onClick={() => buscarClientes(totalPaginas - 1, filtros)} title="Última">»</CPaginationItem>
                </CPagination>
              )
            })()}

            <CModal visible={modalAgregarVisible} onClose={cerrarModalAgregar} backdrop="static" size="lg">
              <CModalHeader className="bg-light">
                <CModalTitle className="text-dark">{modoEdicionCliente ? 'Editar Cliente' : 'Agregar Cliente'}</CModalTitle>
              </CModalHeader>
              <CForm onSubmit={grabarCliente}>
                <CModalBody>
                  {errorGrabar && (
                    <div className="alert alert-danger small mb-3" role="alert">
                      {errorGrabar}
                    </div>
                  )}

                  <CRow className="gy-2">
                 
                      <CRow className="g-3">
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">Nombre Cliente</CFormLabel>
                          <CFormInput
                            name="nombreCliente"
                            value={formCliente.nombreCliente}
                            onChange={handleFormClienteChange}
                            placeholder="Nombre del cliente"
                            invalid={!!errorsCliente.nombreCliente}
                          />
                          {errorsCliente.nombreCliente && (
                            <div className="invalid-feedback d-block">{errorsCliente.nombreCliente}</div>
                          )}
                        </CCol>
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">Correo electrónico</CFormLabel>
                          <CFormInput
                            name="correoElectronico"
                            type="email"
                            value={formCliente.correoElectronico}
                            onChange={handleFormClienteChange}
                            placeholder="correo@ejemplo.com"
                          />
                        </CCol>
                      </CRow>
                      <CRow className="g-3">
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">NIT</CFormLabel>
                          <CFormInput
                            name="nit"
                            value={formCliente.nit}
                            onChange={handleFormClienteChange}
                            placeholder="NIT"
                            invalid={!!errorsCliente.nit}
                          />
                          {errorsCliente.nit && (
                            <div className="invalid-feedback d-block">{errorsCliente.nit}</div>
                          )}
                        </CCol>
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">DPI / Pasaporte</CFormLabel>
                          <CFormInput
                            name="dpiPasaporte"
                            value={formCliente.dpiPasaporte}
                            onChange={handleFormClienteChange}
                            placeholder="DPI o Pasaporte"
                          />
                        </CCol>
                      </CRow>
                      <CRow className="g-3">
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">Nombre para Facturación</CFormLabel>
                          <CFormInput
                            name="nombreFacturacion"
                            value={formCliente.nombreFacturacion}
                            onChange={handleFormClienteChange}
                            placeholder="Nombre para facturación"
                            invalid={!!errorsCliente.nombreFacturacion}
                          />
                          {errorsCliente.nombreFacturacion && (
                            <div className="invalid-feedback d-block">{errorsCliente.nombreFacturacion}</div>
                          )}
                          </CCol>
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">Dirección física</CFormLabel>
                          <CFormTextarea
                            name="direccionFisica"
                            value={formCliente.direccionFisica}
                            onChange={handleFormClienteChange}
                            placeholder="Dirección"
                            rows={2}
                            invalid={!!errorsCliente.direccionFisica}
                          />
                          {errorsCliente.direccionFisica && (
                            <div className="invalid-feedback d-block">{errorsCliente.direccionFisica}</div>
                          )}
                        </CCol>
                      </CRow>
                 
                   
                      <CRow className="g-3">
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">Teléfono 1</CFormLabel>
                          <CFormInput
                            name="telefono1"
                            value={formCliente.telefono1}
                            onChange={handleFormClienteChange}
                            placeholder="Número de teléfono principal"
                          />
                        </CCol>
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">Teléfono 2</CFormLabel>
                          <CFormInput
                            name="telefono2"
                            value={formCliente.telefono2}
                            onChange={handleFormClienteChange}
                            placeholder="Número de teléfono secundario"
                          />
                        </CCol>
                      </CRow>
                    
                    
                      <CRow className="g-3">
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">Crédito autorizado</CFormLabel>
                          <CFormInput
                            name="creditoAutorizado"
                            type="number"
                            step="any"
                            value={formCliente.creditoAutorizado}
                            onChange={handleFormClienteChange}
                            placeholder="0"
                          />
                        </CCol>
                        <CCol xs={6}>
                          <CFormLabel className="text-dark fw-bold">Deuda actual</CFormLabel>
                          <CFormInput
                            name="deudaActual"
                            type="number"
                            step="any"
                            value={formCliente.deudaActual}
                            onChange={handleFormClienteChange}
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
                    {guardando ? (modoEdicionCliente ? 'Actualizando…' : 'Guardando…') : (modoEdicionCliente ? 'Actualizar' : 'Guardar')}
                  </CButton>
                </CModalFooter>
              </CForm>
            </CModal>

            <CModal visible={modalConfirmarEliminar} onClose={cerrarConfirmarEliminar} backdrop={eliminando ? 'static' : true}>
              <CModalHeader>
                <CModalTitle>Eliminar cliente</CModalTitle>
              </CModalHeader>
              <CModalBody>
                ¿Está seguro que desea eliminar el cliente{' '}
                <strong>{clienteAEliminar?.nombreCliente ?? ''}</strong>?
                <br />
                <span className="text-muted small">Esta acción no se puede deshacer.</span>
              </CModalBody>
              <CModalFooter>
                <CButton color="secondary" onClick={cerrarConfirmarEliminar} disabled={eliminando}>
                  Cancelar
                </CButton>
                <CButton color="danger" onClick={confirmarEliminarCliente} disabled={eliminando}>
                  {eliminando ? 'Eliminando…' : 'Eliminar'}
                </CButton>
              </CModalFooter>
            </CModal>

            <CModal visible={!!clienteVer} onClose={() => setClienteVer(null)} size="lg" backdrop="static">
              <CModalHeader className="border-0 pb-0">
                <CModalTitle className="text-dark">Detalle del cliente</CModalTitle>
              </CModalHeader>
              <CModalBody className="pt-2">
                {clienteVer && (
                  <>
                    <div className="mb-4 pb-3 border-bottom">
                      <h5 className="text-primary mb-0 fw-semibold">
                        {clienteVer.nombreCliente ?? 'Sin nombre'}
                      </h5>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted small fw-semibold mb-3">Datos generales</h6>
                      <div className="bg-light rounded-3 p-3">
                        <CRow className="g-3">
                          <CCol xs={12}>
                            <div>
                              <span className="text-muted small d-block mb-1">Dirección</span>
                              <span className="d-block">{clienteVer.direccionFisica ?? '—'}</span>
                            </div>
                          </CCol>
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Correo electrónico</span>
                              <span className="d-block">
                                {clienteVer.correoElectronico ? (
                                  <a href={`mailto:${clienteVer.correoElectronico}`} className="text-decoration-none">
                                    {clienteVer.correoElectronico}
                                  </a>
                                ) : '—'}
                              </span>
                            </div>
                          </CCol>
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">NIT</span>
                              <span className="d-block">{clienteVer.nit ?? '—'}</span>
                            </div>
                          </CCol>
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">DPI / Pasaporte</span>
                              <span className="d-block">{clienteVer.documentoIdentificacion ?? '—'}</span>
                            </div>
                          </CCol>
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Nombre facturación</span>
                              <span className="d-block">{clienteVer.nombreFacturacion ?? '—'}</span>
                            </div>
                          </CCol>
                        </CRow>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted small fw-semibold mb-3">Teléfonos</h6>
                      <div className="bg-light rounded-3 p-3">
                        <CRow className="g-3">
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Teléfono 1</span>
                              {clienteVer.telefono1 ? (
                                <a href={`tel:${clienteVer.telefono1}`} className="small text-decoration-none d-block mt-1">
                                  📞 {clienteVer.telefono1}
                                </a>
                              ) : (
                                <span className="d-block">—</span>
                              )}
                            </div>
                          </CCol>
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Teléfono 2</span>
                              {clienteVer.telefono2 ? (
                                <a href={`tel:${clienteVer.telefono2}`} className="small text-decoration-none d-block mt-1">
                                  📞 {clienteVer.telefono2}
                                </a>
                              ) : (
                                <span className="d-block">—</span>
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
                                {clienteVer.creditoAutorizado != null && clienteVer.creditoAutorizado !== '' ? (
                                  <>Q {Number(clienteVer.creditoAutorizado).toLocaleString('es-GT')}</>
                                ) : '—'}
                              </span>
                            </div>
                          </CCol>
                          <CCol xs={12} md={6}>
                            <div>
                              <span className="text-muted small d-block mb-1">Deuda actual</span>
                              <span className="d-block fw-medium">
                                {clienteVer.deudaActual != null && clienteVer.deudaActual !== '' ? (
                                  <>Q {Number(clienteVer.deudaActual).toLocaleString('es-GT')}</>
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
                <CButton color="secondary" onClick={() => setClienteVer(null)}>Cerrar</CButton>
              </CModalFooter>
            </CModal>

            <CModal visible={modalExitoVisible} onClose={() => setModalExitoVisible(false)} alignment="center">
              <CModalHeader>
                <CModalTitle className="text-success">Éxito</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <p className="mb-0">{mensajeExito || 'El cliente fue guardado exitosamente.'}</p>
              </CModalBody>
              <CModalFooter>
                <CButton color="success" onClick={() => { setModalExitoVisible(false) }}>
                  Aceptar
                </CButton>
              </CModalFooter>
            </CModal>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Layout
