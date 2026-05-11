import React, { useState, useEffect, useRef } from 'react'
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
  CSpinner,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

const Layout = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const navigate = useNavigate()

  // Estado para las órdenes de productos
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tipoMovimiento, setTipoMovimiento] = useState([]);
  const [tipoOrden, setTipoOrden] = useState([]);
  const [estadoFactura, setEstadoFactura] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  // Estados para los filtros
  const [filtros, setFiltros] = useState({
    numeroDocumento: '',
    proveedor: '',
    tipoMovimiento: '',
    fechaInicio: '',
    fechaFin: ''
  });

  // Estados para la paginación
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const returnFocusRef = useRef(null)

  // Estados para eliminar orden
  const [modalConfirmarEliminar, setModalConfirmarEliminar] = useState(false)
  const [ordenAEliminar, setOrdenAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [modalResultado, setModalResultado] = useState(false)
  const [resultadoExito, setResultadoExito] = useState(false)
  const [mensajeResultado, setMensajeResultado] = useState('')

  // Función para obtener el nombre del tipo de movimiento por su ID
  const obtenerNombreTipoMovimiento = (idMovimiento) => {
    // Si no hay ID, retornar mensaje por defecto
    if (!idMovimiento && idMovimiento !== 0) {
      return 'Sin tipo'
    }

    const tipo = tipoMovimiento.find(u => u.indice === idMovimiento)

    // Si no se encuentra en el diccionario, mostrar el ID
    return tipo ? tipo.valor : `ID: ${idMovimiento}`
  }

  // Función para obtener el nombre del tipo de orden por su ID
  const obtenerNombreTipoOrden = (idTipoOrden) => {
    // Si no hay ID, retornar mensaje por defecto
    if (!idTipoOrden && idTipoOrden !== 0) {
      return 'Sin tipo'
    }

    const orden = tipoOrden.find(u => u.indice === idTipoOrden)

    // Si no se encuentra en el diccionario, mostrar el ID
    return orden ? orden.valor : `ID: ${idTipoOrden}`
  }

  // Función para obtener el nombre de los estados de la factura por su ID
  const obtenerNombreTipoEstadoFactura = (idTipoEstadoFactura) => {
    // Si no hay ID, retornar mensaje por defecto
    if (!idTipoEstadoFactura && idTipoEstadoFactura !== 0) {
      return 'Sin tipo'
    }

    const tipoEstadoFactu = estadoFactura.find(u => u.indice === idTipoEstadoFactura)

    // Si no se encuentra en el diccionario, mostrar el ID
    return tipoEstadoFactu ? tipoEstadoFactu.valor : `ID: ${idTipoEstadoFactura}`
  }

  // Función para obtener el nombre del proveedor por su ID
  const obtenerNombreProveedor = (idProveedor) => {
    if (!idProveedor && idProveedor !== 0) {
      return 'Sin proveedor'
    }

    const proveedor = proveedores.find(p => p.idProveedor === idProveedor)
    
    // Si no se encuentra el proveedor, mostrar el ID
    return proveedor ? proveedor.nombre : `ID: ${idProveedor}`
  }

  //Funcion para cargar los diccionarios 
  const cargarDiccionario = async () => {
    try {

      const responseTipoMovimiento = await fetch('/api/diccionarios?diccionario=TIPODEMOVIMIENTO')
      const responseTipoOrden = await fetch('/api/diccionarios?diccionario=TIPODEORDEN')
      const responseEstadoFactura = await fetch('/api/diccionarios?diccionario=ESTADOFATURAORDEN')


      if (!responseTipoMovimiento.ok || !responseTipoOrden.ok || !responseEstadoFactura.ok) {
        throw new Error('Error al cargar diccionarios')
      }

      const dataTipoMovimiento = await responseTipoMovimiento.json()
      const dataTipoOrden = await responseTipoOrden.json()
      const dataEstadoFactura = await responseEstadoFactura.json()

      // Extraer arrays de utipo de movimiento (puede venir como array directo o en content)
      const tipoMov = Array.isArray(dataTipoMovimiento)
        ? dataTipoMovimiento
        : Array.isArray(dataTipoMovimiento?.content)
          ? dataTipoMovimiento.content
          : []

      // Extraer arrays de tipo de orden (puede venir como array directo o en content)
      const tipoOrd = Array.isArray(dataTipoOrden)
        ? dataTipoOrden
        : Array.isArray(dataTipoOrden?.content)
          ? dataTipoOrden.content
          : []

      // Extraer arrays de Estado Factura puede venir como array directo o en content)
      const tipoEstadoFactura = Array.isArray(dataEstadoFactura)
        ? dataEstadoFactura
        : Array.isArray(dataEstadoFactura?.content)
          ? dataEstadoFactura.content
          : []



      console.log('Tipos de movimientos filtrados:', tipoMov)
      setTipoMovimiento(tipoMov)

      console.log('tipo de ordenes filtradas:', tipoOrd)
      setTipoOrden(tipoOrd)
      console.log('Estados Factura filtrados:', tipoEstadoFactura)
      setEstadoFactura(tipoEstadoFactura)

    } catch (error) {
      console.error('Error al cargar:', error)
      setTipoMovimiento([])
      setTipoOrden([])
      setEstadoFactura([])
    }
  }

  // Función para cargar proveedores en lotes de 500 (evita errores HTTP/2 con respuestas grandes)
  const cargarProveedores = async () => {
    try {
      const LOTE = 500
      let acumulado = []
      let pagina = 0
      while (true) {
        const response = await fetch(`/api/proveedores?page=${pagina}&size=${LOTE}`)
        if (!response.ok) throw new Error('Error al cargar proveedores')
        const data = await response.json()
        const content = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : [])
        acumulado = acumulado.concat(content)
        const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 1)
        if (pagina >= totalPages - 1 || content.length < LOTE) break
        pagina++
      }
      setProveedores(acumulado)
    } catch (error) {
      console.error('Error al cargar proveedores:', error)
      setProveedores([])
    }
  }


  // Función para cargar las órdenes desde la API
  const cargarOrdenesProductos = async (pagina = 0, filtrosActuales = filtros) => {
    try {
      setLoading(true)

      // Construir parámetros con los nombres que espera la API
      const params = new URLSearchParams()
      params.set('page', String(pagina))
      params.set('size', '20')

      if (filtrosActuales.numeroDocumento?.trim()) {
        params.set('numeroDeDocumento', filtrosActuales.numeroDocumento.trim())
      }
      if (filtrosActuales.tipoMovimiento !== undefined && filtrosActuales.tipoMovimiento !== '') {
        params.set('tipoDeMovimiento', String(filtrosActuales.tipoMovimiento))
      }
      if (filtrosActuales.fechaInicio?.trim()) {
        params.set('fechaInicio', filtrosActuales.fechaInicio.trim())
      }
      if (filtrosActuales.fechaFin?.trim()) {
        params.set('fechaFin', filtrosActuales.fechaFin.trim())
      }

      const url = `/api/ordenProductos?${params.toString()}`

      const response = await fetch(url)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error de la API:', errorText)
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Verificar si data es un array directo o un objeto con content
      let ordenesArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
          ? data.content
          : []

      // Actualizar paginación
      if (data.number !== undefined) {
        setPage(data.number)
      }
      if (data.totalPages !== undefined) {
        setTotalPages(data.totalPages)
      }

      // Mapear los datos de la API al formato que necesita la tabla
      let ordenesFormateadas = ordenesArray.map(orden => {
        return {
          id: orden.idOrdenProducto,
          idOrdenProducto: orden.idOrdenProducto,
          numeroDocumento: orden.numeroDeDocumento,
          idProveedor: orden.idProveedor,
          tipoMovimiento: orden.tipoDeMovimiento,
          tipoOrden: orden.tipoDeOrden,
          estadoFactura: orden.estadoFactura,
          estado: orden.estado,
          totalOrden: orden.precioTotalOrden,
          valorCancelado: orden.valorCancelado || 0,
          fechaOrden: orden.fechaOrden,
          fechaModificacion: orden.fechaModificacion,
          horaModificacion: orden.horaModificacion,
          comentario: orden.comentario,
          idSucursal: orden.idSucursal,
          idUsuarioModificacion: orden.idUsuarioModificacion
        }
      })

      // Filtrar por nombre de proveedor en el cliente (si se especificó)
      if (filtros.proveedor && filtros.proveedor.trim().length >= 2) {
        const filtroProveedorLower = filtros.proveedor.toLowerCase().trim()
        
        ordenesFormateadas = ordenesFormateadas.filter(orden => {
          // Buscar el proveedor en el array de proveedores
          const proveedor = proveedores.find(p => p.idProveedor === orden.idProveedor)
          
          if (proveedor) {
            const nombreProveedor = (proveedor.nombre || proveedor.nombreProveedor || '').toLowerCase()
            return nombreProveedor.includes(filtroProveedorLower)
          }
          return false
        })
      }

      setMovimientos(ordenesFormateadas)
      setError(null)
    } catch (error) {
      console.error('❌ Error completo:', error)
      setError(error.message)
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal de confirmación para eliminar
  const handleClickEliminar = (movimiento) => {
    setOrdenAEliminar(movimiento)
    setModalConfirmarEliminar(true)
  }

  const cancelarEliminar = () => {
    returnFocusRef.current?.focus()
    setModalConfirmarEliminar(false)
    setOrdenAEliminar(null)
  }

  const confirmarEliminar = async () => {
    if (!ordenAEliminar?.idOrdenProducto) return
    setEliminando(true)
    const idOrden = ordenAEliminar.idOrdenProducto
    try {
      // Primero eliminar los productos asociados al movimiento
      const resMov = await fetch(`/api/eliminarMovProXIdOrden/${idOrden}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuarioModificacion: idUsuarioActual }),
      })
      if (!resMov.ok) {
        const errText = await resMov.text()
        let errMsg = `Error al eliminar productos del movimiento (${resMov.status})`
        try {
          const errJson = JSON.parse(errText)
          errMsg = errJson.message || errJson.error || errMsg
        } catch {
          if (errText) errMsg = errText
        }
        setModalConfirmarEliminar(false)
        setOrdenAEliminar(null)
        setMensajeResultado(errMsg)
        setResultadoExito(false)
        setModalResultado(true)
        return
      }
      // Luego eliminar la orden
      const res = await fetch(`/api/eliminarOrdenProducto/${idOrden}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuarioModificacion: idUsuarioActual }),
      })
      returnFocusRef.current?.focus()
      setModalConfirmarEliminar(false)
      setOrdenAEliminar(null)
      if (!res.ok) {
        const errText = await res.text()
        let errMsg = `Error al eliminar la orden (${res.status})`
        try {
          const errJson = JSON.parse(errText)
          errMsg = errJson.message || errJson.error || errMsg
        } catch {
          if (errText) errMsg = errText
        }
        setMensajeResultado(errMsg)
        setResultadoExito(false)
        setModalResultado(true)
        return
      }
      setMensajeResultado('La orden y sus productos se eliminaron correctamente.')
      setResultadoExito(true)
      setModalResultado(true)
      await cargarOrdenesProductos(page)
    } catch (e) {
      returnFocusRef.current?.focus()
      setModalConfirmarEliminar(false)
      setOrdenAEliminar(null)
      setMensajeResultado(e.message || 'Error de conexión al eliminar.')
      setResultadoExito(false)
      setModalResultado(true)
    } finally {
      setEliminando(false)
    }
  }

  // Manejar cambios en los filtros
  const handleFiltroChange = (e) => {
    const { name, id, value } = e.target
    const fieldName = name || id
    setFiltros(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  // Limpiar filtros
  const exportarAExcel = async () => {
    try {
      // Obtener todos los registros aplicando los filtros actuales
      const params = new URLSearchParams()
      params.set('page', '0')
      params.set('size', '10000')
      if (filtros.numeroDocumento?.trim()) params.set('numeroDeDocumento', filtros.numeroDocumento.trim())
      if (filtros.tipoMovimiento !== undefined && filtros.tipoMovimiento !== '') params.set('tipoDeMovimiento', String(filtros.tipoMovimiento))
      if (filtros.fechaInicio?.trim()) params.set('fechaInicio', filtros.fechaInicio.trim())
      if (filtros.fechaFin?.trim()) params.set('fechaFin', filtros.fechaFin.trim())

      const res = await fetch(`/api/ordenProductos?${params.toString()}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const lista = Array.isArray(data) ? data : (data?.content || [])

      // Mapear al mismo formato que la tabla
      const filas = lista.map((orden, index) => ({
        'No.':              index + 1,
        'Documento':        orden.numeroDeDocumento || '',
        'Fecha Orden':      orden.fechaOrden || '',
        'Proveedor':        obtenerNombreProveedor(orden.idProveedor),
        'Tipo Movimiento':  obtenerNombreTipoMovimiento(orden.tipoDeMovimiento),
        'Tipo Orden':       obtenerNombreTipoOrden(orden.tipoDeOrden),
        'Estado Factura':   obtenerNombreTipoEstadoFactura(orden.estadoFactura),
        'Total Orden':      orden.precioTotalOrden != null ? Number(orden.precioTotalOrden).toFixed(2) : '0.00',
        'Valor Cancelado':  orden.valorCancelado != null ? Number(orden.valorCancelado).toFixed(2) : '0.00',
      }))

      const hoja = XLSX.utils.json_to_sheet(filas)
      const libro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(libro, hoja, 'Movimientos')

      // Ajustar ancho de columnas automáticamente
      const anchos = Object.keys(filas[0] || {}).map(col => ({
        wch: Math.max(col.length, ...filas.map(f => String(f[col] || '').length)) + 2
      }))
      hoja['!cols'] = anchos

      XLSX.writeFile(libro, `Movimientos_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (error) {
      console.error('Error al exportar:', error)
    }
  }

  const limpiarFiltros = () => {
    const nuevosFiltros = {
      numeroDocumento: '',
      proveedor: '',
      tipoMovimiento: '',
      fechaInicio: '',
      fechaFin: ''
    }
    setFiltros(nuevosFiltros)
    cargarOrdenesProductos(0, nuevosFiltros) // Reiniciar a la primera página
  }

  // Cargar las órdenes cuando cambien los filtros
  useEffect(() => {
    // Para campos de texto, aplicar debounce
    const delayDebounce = setTimeout(() => {
      cargarOrdenesProductos(0, filtros) // Siempre empezar en página 0 al filtrar
    }, 500) // Espera 500ms después de que el usuario deje de escribir

    return () => clearTimeout(delayDebounce)
    
  }, [filtros])

  // Cargar diccionarios y proveedores al montar el componente
  useEffect(() => {
    cargarDiccionario()
    cargarProveedores()
  }, [])
  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardBody>
            <CForm>
              <CCardHeader>
                <strong className="fs-4">Movimientos de Productos</strong>
              </CCardHeader>

              <CRow className="mt-3 gy-3">
                <CCol md={3}>
                  <CFormLabel htmlFor="numeroDocumento" className="fw-bold">Número de Documento</CFormLabel>
                  <CFormInput 
                    type="text" 
                    id="numeroDocumento" 
                    placeholder="Número de documento"
                    value={filtros.numeroDocumento}
                    onChange={handleFiltroChange}
                  />
                </CCol>

                <CCol md={3}>
                  <CFormLabel htmlFor="proveedor" className="fw-bold">Proveedor</CFormLabel>
                  <CFormInput 
                    type="text" 
                    id="proveedor" 
                    placeholder="Buscar por nombre de proveedor"
                    value={filtros.proveedor}
                    onChange={handleFiltroChange}
                  />
                </CCol>

                <CCol md={3}>
                  <CFormLabel htmlFor="tipoMovimiento" className="fw-bold">Tipo Movimiento</CFormLabel>
                  <CFormSelect 
                    id="tipoMovimiento"
                    name="tipoMovimiento"
                    value={filtros.tipoMovimiento}
                    onChange={handleFiltroChange}
                  >
                    <option value="">Todos</option>
                    {tipoMovimiento.map((tipo) => (
                      <option key={tipo.indice} value={tipo.indice}>
                        {tipo.valor}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>

              <CRow className="mt-3 gy-3">
                <CCol md={3}>
                  <CFormLabel htmlFor="fechaInicio" className="fw-bold">Fecha Inicio</CFormLabel>
                  <CFormInput 
                    type="date" 
                    id="fechaInicio"
                    value={filtros.fechaInicio}
                    onChange={handleFiltroChange}
                  />
                </CCol>

                <CCol md={3}>
                  <CFormLabel htmlFor="fechaFin" className="fw-bold">Fecha Fin</CFormLabel>
                  <CFormInput 
                    type="date" 
                    id="fechaFin"
                    value={filtros.fechaFin}
                    onChange={handleFiltroChange}
                  />
                </CCol>

                <CCol md={6} className="d-flex align-items-end justify-content-end gap-2">
                  <CButton
                    ref={returnFocusRef}
                    color="secondary"
                    className="text-light"
                    onClick={limpiarFiltros}>
                    Limpiar
                  </CButton>
                  <CButton
                    color="success"
                    className="text-light"
                    onClick={() => navigate('/pages/productos/agregar-movimiento')}>
                    + Agregar
                  </CButton>
                  <CButton color="info" className="text-light" onClick={exportarAExcel}>
                    Exportar
                  </CButton>
                </CCol>
              </CRow>


            </CForm>

            {/* Tabla de movimientos */}
            <CTable striped bordered hover responsive className="mt-4">
              <CTableHead style={{ '--cui-table-bg': '#6c757d', '--cui-table-color': '#fff', '--cui-table-border-color': '#7d868e', backgroundColor: '#6c757d', color: '#fff' }}>
                <CTableRow>
                  <CTableHeaderCell className="py-2 text-nowrap">No.</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Documento</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Fecha Orden</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Proveedor</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Tipo Movimiento</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Tipo Orden</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Estado Factura</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Total Orden</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Valor Cancelado</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {loading ? (
                  <CTableRow>
                    <CTableDataCell colSpan="10" className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                      </div>
                      <div className="mt-2">Cargando órdenes...</div>
                    </CTableDataCell>
                  </CTableRow>
                ) : error ? (
                  <CTableRow>
                    <CTableDataCell colSpan="10" className="text-center py-4 text-danger">
                      <strong>Error:</strong> {error}
                      <div className="mt-2">
                        <CButton
                          color="primary"
                          size="sm"
                          onClick={cargarOrdenesProductos}>
                          Reintentar
                        </CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ) : movimientos.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan="10" className="text-center py-4 text-muted">
                      No hay órdenes de productos registradas
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  movimientos.map((movimiento, index) => (
                    <CTableRow key={movimiento.id}>
                      <CTableDataCell>{(page * 20) + index + 1}</CTableDataCell>
                      <CTableDataCell>{movimiento.numeroDocumento}</CTableDataCell>
                      <CTableDataCell>{movimiento.fechaOrden}</CTableDataCell>
                      <CTableDataCell>{obtenerNombreProveedor(movimiento.idProveedor)}</CTableDataCell>
                      <CTableDataCell>
                        {obtenerNombreTipoMovimiento(movimiento.tipoMovimiento)}
                      </CTableDataCell>
                      <CTableDataCell>
                        {obtenerNombreTipoOrden(movimiento.tipoOrden)}
                      </CTableDataCell>
                      <CTableDataCell>
                        {obtenerNombreTipoEstadoFactura(movimiento.estadoFactura)}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        Q.{movimiento.totalOrden?.toFixed(2) || '0.00'}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        Q.{movimiento.valorCancelado?.toFixed(2) || '0.00'}
                      </CTableDataCell>
                      <CTableDataCell className="py-2 text-nowrap">
                        <CButton
                          color="info"
                          size="sm"
                          className="me-2 text-white"
                          onClick={() => navigate(`/pages/productos/ver-movimiento/${movimiento.idOrdenProducto}`)}
                          title="Ver">
                          👁️
                        </CButton>
                        <CButton
                          color="warning"
                          size="sm"
                          className="me-2 text-white"
                          onClick={() => navigate(`/pages/productos/editar-movimiento/${movimiento.idOrdenProducto}`)}
                          title="Editar">
                          ✏️
                        </CButton>
                        <CButton
                          color="danger"
                          size="sm"
                          className="me-2"
                          onClick={() => handleClickEliminar(movimiento)}
                          title="Eliminar">
                          🗑️
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>

            {/* Componente de paginación */}
            {!loading && !error && movimientos.length > 0 && totalPages > 0 && (
              <CPagination className="justify-content-end mt-3 flex-wrap align-items-center">
                <CPaginationItem disabled={page === 0} onClick={() => cargarOrdenesProductos(0)} title="Primera página">«</CPaginationItem>
                <CPaginationItem disabled={page === 0} onClick={() => cargarOrdenesProductos(page - 1)}>Anterior</CPaginationItem>
                {(() => {
                  if (totalPages <= 7) {
                    return [...Array(totalPages)].map((_, i) => (
                      <CPaginationItem key={i} active={i === page} onClick={() => cargarOrdenesProductos(i)}>{i + 1}</CPaginationItem>
                    ))
                  }
                  const items = []
                  const inicio = Math.max(0, page - 2)
                  const fin = Math.min(totalPages - 1, page + 2)
                  if (page > 2) {
                    items.push(<CPaginationItem key={0} onClick={() => cargarOrdenesProductos(0)}>1</CPaginationItem>)
                    if (page > 3) items.push(<CPaginationItem key="e1" disabled>…</CPaginationItem>)
                  }
                  for (let i = inicio; i <= fin; i++) {
                    items.push(<CPaginationItem key={i} active={i === page} onClick={() => cargarOrdenesProductos(i)}>{i + 1}</CPaginationItem>)
                  }
                  if (page < totalPages - 3) {
                    if (page < totalPages - 4) items.push(<CPaginationItem key="e2" disabled>…</CPaginationItem>)
                    items.push(<CPaginationItem key={totalPages - 1} onClick={() => cargarOrdenesProductos(totalPages - 1)}>{totalPages}</CPaginationItem>)
                  }
                  return items
                })()}
                <CPaginationItem disabled={page === totalPages - 1} onClick={() => cargarOrdenesProductos(page + 1)}>Siguiente</CPaginationItem>
                <CPaginationItem disabled={page === totalPages - 1} onClick={() => cargarOrdenesProductos(totalPages - 1)} title="Última página">»</CPaginationItem>
              </CPagination>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* Modal confirmar eliminar */}
      <CModal visible={modalConfirmarEliminar} onClose={cancelarEliminar} backdrop={eliminando ? 'static' : true}>
        <CModalHeader>
          <CModalTitle>Eliminar orden</CModalTitle>
        </CModalHeader>
        <CModalBody>
          ¿Está seguro que desea eliminar la orden <strong>No.{ordenAEliminar?.idOrdenProducto}</strong>
          <br />
          Con número de documento: <strong>{ordenAEliminar?.numeroDocumento ?` ${ordenAEliminar.numeroDocumento}` : 'No existe'}</strong>?
          <br />
          Esta acción no se puede deshacer.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={cancelarEliminar} disabled={eliminando}>
            Cancelar
          </CButton>
          <CButton color="danger" onClick={confirmarEliminar} disabled={eliminando} style={{ color: '#fff' }}>
            {eliminando ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal resultado */}
      <CModal visible={modalResultado} onClose={() => { returnFocusRef.current?.focus(); setModalResultado(false) }}>
        <CModalHeader>{resultadoExito ? 'Listo' : 'Error'}</CModalHeader>
        <CModalBody>{mensajeResultado}</CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={() => { returnFocusRef.current?.focus(); setModalResultado(false) }}>
            Aceptar
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}
export default Layout
