import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CSpinner,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import * as XLSX from 'xlsx'

const PAGE_SIZE  = 20
const SIZE_TODOS = 10000  // tamaño para cargar todos los datos al buscar

const ReporteInventario = () => {
  const navigate = useNavigate()

  // Tipo de reporte
  const [tipoReporte, setTipoReporte] = useState('1')

  // Búsqueda
  const [busqueda, setBusqueda] = useState('')

  // ── Reporte General ──
  const [inventarioAgrupado, setInventarioAgrupado] = useState([])
  const [todosAgrupado, setTodosAgrupado]           = useState([])   // todos los resultados al buscar
  const [pageAgrupado, setPageAgrupado]             = useState(0)
  const [totalPagesAgrupado, setTotalPagesAgrupado] = useState(0)
  const [totalElemsAgrupado, setTotalElemsAgrupado] = useState(0)
  const [loadingAgrupado, setLoadingAgrupado]       = useState(false)
  const [errorAgrupado, setErrorAgrupado]           = useState(null)

  // ── Reporte por Ubicación ──
  const [inventario, setInventario]         = useState([])
  const [todosInventario, setTodosInventario] = useState([])         // todos los resultados al buscar
  const [pageInv, setPageInv]               = useState(0)
  const [totalPagesInv, setTotalPagesInv]   = useState(0)
  const [totalElemsInv, setTotalElemsInv]   = useState(0)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)

  // Diccionarios y ubicaciones
  const [unidadesMedida, setUnidadesMedida] = useState([])
  const [estados, setEstados]               = useState([])
  const [ubicaciones, setUbicaciones]       = useState([])

  // ── Helpers ──
  const obtenerNombreUnidad = (id) => {
    const u = unidadesMedida.find((u) => Number(u.indice) === Number(id))
    return u ? u.valor : String(id ?? '')
  }
  const obtenerNombreEstado = (id) => {
    const e = estados.find((e) => Number(e.indice) === Number(id))
    return e ? e.valor : String(id ?? '')
  }
  const obtenerNombreUbicacion = (id) => {
    const u = ubicaciones.find((u) => Number(u.idUbicacion) === Number(id))
    return u ? (u.nombreUbicacion || String(id)) : String(id ?? '')
  }

  // ── Cargar diccionarios y ubicaciones ──
  const cargarDiccionarios = async () => {
    try {
      const [resU, resE, resUb] = await Promise.all([
        fetch('/api/diccionarios?diccionario=UNIDADDEMEDIDA&estado=1'),
        fetch('/api/diccionarios?diccionario=ESTADO&estado=1'),
        fetch('/api/ubicaciones'),
      ])
      const [dU, dE, dUb] = await Promise.all([resU.json(), resE.json(), resUb.json()])
      setUnidadesMedida(Array.isArray(dU) ? dU : dU?.content || [])
      setEstados(Array.isArray(dE) ? dE : dE?.content || [])
      setUbicaciones(Array.isArray(dUb) ? dUb : dUb?.content || [])
    } catch { /* silencioso */ }
  }

  // Formatea items de /api/inventario (anida campos de idProducto)
  const formatearInventario = (arr) =>
    arr.map((item) => ({
      idInventario:            item.idInventario,
      codigoProducto:          item.idProducto?.codigoProducto          || 'N/A',
      codigoProductoProveedor: item.idProducto?.codigoProductoProveedor || 'N/A',
      descripcionProducto:     item.idProducto?.descripcionProducto     || 'N/A',
      precioCompra:            item.idProducto?.precioCompra            || 0,
      idUbicacion:             item.idUbicacion                         ?? '—',
      cantidadExistencias:     item.cantidadExistencias                 || 0,
      cantidadDanados:         item.cantidadDanados                     || 0,
    }))

  // Aplica filtro client-side sobre un array de items del Reporte General
  const filtrarAgrupado = (items, t) => {
    if (!t.trim()) return items
    const tl = t.trim().toLowerCase()
    return items.filter((item) => {
      const cod  = (item.producto?.codigoProducto          || '').toLowerCase()
      const prov = (item.producto?.codigoProductoProveedor || '').toLowerCase()
      const desc = (item.producto?.descripcionProducto     || '').toLowerCase()
      return cod.includes(tl) || prov.includes(tl) || desc.includes(tl)
    })
  }

  // Aplica filtro client-side sobre un array de items del Reporte por Ubicación
  const filtrarInventario = (items, t) => {
    if (!t.trim()) return items
    const tl = t.trim().toLowerCase()
    return items.filter((item) => {
      const cod  = (item.codigoProducto          || '').toLowerCase()
      const prov = (item.codigoProductoProveedor  || '').toLowerCase()
      const desc = (item.descripcionProducto      || '').toLowerCase()
      return cod.includes(tl) || prov.includes(tl) || desc.includes(tl)
    })
  }

  // ── Reporte General ──
  // Carga la página de API cuando no hay búsqueda.
  // Cuando hay búsqueda: carga TODOS los datos y filtra client-side.
  const cargarInventarioAgrupado = async (pagina = 0, termino = busqueda) => {
    try {
      setLoadingAgrupado(true)
      setErrorAgrupado(null)
      const t = (termino || '').trim()

      if (!t) {
        // Sin búsqueda → paginación de API
        const params = new URLSearchParams({ page: pagina, size: PAGE_SIZE })
        const res = await fetch(`/api/inventarioAgrupado?${params}`)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        setTodosAgrupado([])
        setInventarioAgrupado(Array.isArray(data) ? data : data.content || [])
        setPageAgrupado(data.number ?? 0)
        setTotalPagesAgrupado(data.totalPages ?? 0)
        setTotalElemsAgrupado(data.totalElements ?? 0)
      } else {
        // Con búsqueda → cargar TODO y filtrar client-side
        const res = await fetch(`/api/inventarioAgrupado?page=0&size=${SIZE_TODOS}`)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        const todos = Array.isArray(data) ? data : data.content || []
        const filtrados = filtrarAgrupado(todos, t)
        const inicio = pagina * PAGE_SIZE
        setTodosAgrupado(filtrados)
        setInventarioAgrupado(filtrados.slice(inicio, inicio + PAGE_SIZE))
        setPageAgrupado(pagina)
        setTotalPagesAgrupado(Math.ceil(filtrados.length / PAGE_SIZE))
        setTotalElemsAgrupado(filtrados.length)
      }
    } catch (err) {
      setErrorAgrupado(err.message)
      setInventarioAgrupado([])
    } finally {
      setLoadingAgrupado(false)
    }
  }

  // ── Reporte por Ubicación ──
  const cargarInventario = async (pagina = 0, termino = busqueda) => {
    try {
      setLoading(true)
      setError(null)
      const t = (termino || '').trim()

      if (!t) {
        // Sin búsqueda → paginación de API
        const params = new URLSearchParams({ page: pagina, size: PAGE_SIZE })
        const res = await fetch(`/api/inventario?${params}`)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        const arr = Array.isArray(data) ? data : data.content || []
        setTodosInventario([])
        setInventario(formatearInventario(arr))
        setPageInv(data.number ?? 0)
        setTotalPagesInv(data.totalPages ?? 0)
        setTotalElemsInv(data.totalElements ?? 0)
      } else {
        // Con búsqueda → cargar TODO y filtrar client-side
        const res = await fetch(`/api/inventario?page=0&size=${SIZE_TODOS}`)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        const arr = Array.isArray(data) ? data : data.content || []
        const todos = formatearInventario(arr)
        const filtrados = filtrarInventario(todos, t)
        const inicio = pagina * PAGE_SIZE
        setTodosInventario(filtrados)
        setInventario(filtrados.slice(inicio, inicio + PAGE_SIZE))
        setPageInv(pagina)
        setTotalPagesInv(Math.ceil(filtrados.length / PAGE_SIZE))
        setTotalElemsInv(filtrados.length)
      }
    } catch (err) {
      setError(err.message)
      setInventario([])
    } finally {
      setLoading(false)
    }
  }

  // ── Paginación (client-side cuando hay búsqueda, server-side cuando no) ──
  const irPaginaAgrupado = (p) => {
    if (busqueda.trim() && todosAgrupado.length > 0) {
      const inicio = p * PAGE_SIZE
      setInventarioAgrupado(todosAgrupado.slice(inicio, inicio + PAGE_SIZE))
      setPageAgrupado(p)
    } else {
      cargarInventarioAgrupado(p, busqueda)
    }
  }

  const irPaginaInv = (p) => {
    if (busqueda.trim() && todosInventario.length > 0) {
      const inicio = p * PAGE_SIZE
      setInventario(todosInventario.slice(inicio, inicio + PAGE_SIZE))
      setPageInv(p)
    } else {
      cargarInventario(p, busqueda)
    }
  }

  // ── Limpiar ──
  const limpiarBusqueda = () => {
    setBusqueda('')
    if (tipoReporte === '1') cargarInventarioAgrupado(0, '')
    else cargarInventario(0, '')
  }

  // ── Exportar a Excel (página actual) ──
  const exportarAExcel = () => {
    if (tipoReporte === '1') {
      const datosExcel = inventarioAgrupado.map((item, i) => ({
        '#': pageAgrupado * PAGE_SIZE + i + 1,
        'Código Producto':   item.producto?.codigoProducto || '',
        'Código Proveedor':  item.producto?.codigoProductoProveedor || '',
        'Descripción':       item.producto?.descripcionProducto || '',
        'Precio Compra':     item.producto?.precioCompra != null ? Number(item.producto.precioCompra).toFixed(2) : '',
        'Unidad de Medida':  obtenerNombreUnidad(item.producto?.unidadDeMedida),
        'Total Existencias': item.totalExistencias ?? 0,
        'Total Dañados':     item.totalDanados ?? 0,
        'Estado':            obtenerNombreEstado(item.producto?.estado),
      }))
      const ws = XLSX.utils.json_to_sheet(datosExcel)
      ws['!cols'] = [{ wch:5 },{ wch:20 },{ wch:20 },{ wch:45 },{ wch:15 },{ wch:20 },{ wch:18 },{ wch:15 },{ wch:15 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte General')
      XLSX.writeFile(wb, 'ReporteGeneral.xlsx')
    } else {
      const datosExcel = inventario.map((item, i) => ({
        '#': pageInv * PAGE_SIZE + i + 1,
        'Código Producto':  item.codigoProducto,
        'Código Proveedor': item.codigoProductoProveedor,
        'Descripción':      item.descripcionProducto,
        'Precio Compra':    Number(item.precioCompra).toFixed(2),
        'Existencias':      item.cantidadExistencias,
        'Dañados':          item.cantidadDanados,
        'Ubicación':        obtenerNombreUbicacion(item.idUbicacion),
      }))
      const ws = XLSX.utils.json_to_sheet(datosExcel)
      ws['!cols'] = [{ wch:5 },{ wch:20 },{ wch:20 },{ wch:45 },{ wch:15 },{ wch:12 },{ wch:12 },{ wch:12 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte por Ubicación')
      XLSX.writeFile(wb, 'ReporteInventario.xlsx')
    }
  }

  // ── Effects ──
  useEffect(() => { cargarDiccionarios() }, [])

  // Al cambiar tipo de reporte: solo resetear búsqueda
  // (el reset dispara el efecto de debounce que hace la carga)
  useEffect(() => {
    setBusqueda('')
  }, [tipoReporte])

  // Único efecto de carga — igual que gestionProductos.js
  // Cubre: carga inicial, cambio de busqueda y cambio de tipoReporte
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tipoReporte === '1') cargarInventarioAgrupado(0, busqueda)
      else cargarInventario(0, busqueda)
    }, 500)
    return () => clearTimeout(timer)
  }, [busqueda, tipoReporte])

  // ── Componente de paginación reutilizable ──
  const Paginacion = ({ page, totalPages, onIr }) => {
    if (totalPages <= 1) return null
    const items = []
    const inicio = Math.max(0, page - 2)
    const fin    = Math.min(totalPages - 1, page + 2)

    if (page > 2) {
      items.push(<CPaginationItem key={0} onClick={() => onIr(0)}>1</CPaginationItem>)
      if (page > 3) items.push(<CPaginationItem key="e1" disabled>…</CPaginationItem>)
    }
    for (let i = inicio; i <= fin; i++)
      items.push(
        <CPaginationItem key={i} active={i === page} onClick={() => onIr(i)}>{i + 1}</CPaginationItem>,
      )
    if (page < totalPages - 3) {
      if (page < totalPages - 4) items.push(<CPaginationItem key="e2" disabled>…</CPaginationItem>)
      items.push(
        <CPaginationItem key={totalPages - 1} onClick={() => onIr(totalPages - 1)}>{totalPages}</CPaginationItem>,
      )
    }
    return (
      <CPagination align="end" className="flex-wrap mt-3">
        <CPaginationItem disabled={page === 0} onClick={() => onIr(0)} title="Primera">«</CPaginationItem>
        <CPaginationItem disabled={page === 0} onClick={() => onIr(page - 1)}>Anterior</CPaginationItem>
        {items}
        <CPaginationItem disabled={page === totalPages - 1} onClick={() => onIr(page + 1)}>Siguiente</CPaginationItem>
        <CPaginationItem disabled={page === totalPages - 1} onClick={() => onIr(totalPages - 1)} title="Última">»</CPaginationItem>
      </CPagination>
    )
  }

  const isLoading = tipoReporte === '1' ? loadingAgrupado : loading
  const isError   = tipoReporte === '1' ? errorAgrupado   : error

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Reporte de Inventario</strong>
            </CCardHeader>
            <CCardBody>
              {/* Filtros */}
              <CRow className="mb-3">
                <CCol md={3}>
                  <CFormLabel className="fw-semibold">Tipo de Reporte</CFormLabel>
                  <CFormSelect value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value)}>
                    <option value="1">Reporte General</option>
                    <option value="2">Reporte por Ubicación</option>
                  </CFormSelect>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="fw-semibold">Buscar</CFormLabel>
                  <CFormInput
                    type="text"
                    placeholder="Buscar por código de producto, código de proveedor o descripción..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    autoComplete="off"
                  />
                </CCol>
                <CCol md={3} className="d-flex align-items-end justify-content-end gap-2">
                  <CButton color="secondary" onClick={limpiarBusqueda}>Limpiar</CButton>
                  <CButton color="success" className="text-white" onClick={exportarAExcel}>Exportar</CButton>
                </CCol>
              </CRow>

              {/* Tabla */}
              {isLoading ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                  <p className="mt-2">Cargando inventario...</p>
                </div>
              ) : isError ? (
                <div className="alert alert-danger" role="alert">Error al cargar inventario: {isError}</div>
              ) : tipoReporte === '1' ? (
                inventarioAgrupado.length === 0 ? (
                  <div className="alert alert-info" role="alert">No se encontraron registros de inventario.</div>
                ) : (
                  <>
                    <small className="text-muted d-block mb-2">
                      Mostrando {pageAgrupado * PAGE_SIZE + 1}–{Math.min((pageAgrupado + 1) * PAGE_SIZE, totalElemsAgrupado)} de {totalElemsAgrupado} registros
                    </small>
                    <CTable striped hover bordered responsive>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                          <CTableHeaderCell>Código Producto</CTableHeaderCell>
                          <CTableHeaderCell>Código Proveedor</CTableHeaderCell>
                          <CTableHeaderCell>Descripción</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Precio Compra</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Total Existencias</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Total Dañados</CTableHeaderCell>
                          <CTableHeaderCell>Unidad de Medida</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Estado</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {inventarioAgrupado.map((item, index) => (
                          <CTableRow key={item.producto?.idProducto || index}>
                            <CTableDataCell className="text-center">{pageAgrupado * PAGE_SIZE + index + 1}</CTableDataCell>
                            <CTableDataCell>{item.producto?.codigoProducto || '—'}</CTableDataCell>
                            <CTableDataCell>{item.producto?.codigoProductoProveedor || '—'}</CTableDataCell>
                            <CTableDataCell>{item.producto?.descripcionProducto || '—'}</CTableDataCell>
                            <CTableDataCell className="text-end">Q{Number(item.producto?.precioCompra || 0).toFixed(2)}</CTableDataCell>
                            <CTableDataCell className="text-center">{item.totalExistencias ?? 0}</CTableDataCell>
                            <CTableDataCell className="text-center">{item.totalDanados ?? 0}</CTableDataCell>
                            <CTableDataCell>{obtenerNombreUnidad(item.producto?.unidadDeMedida)}</CTableDataCell>
                            <CTableDataCell className="text-center">{obtenerNombreEstado(item.producto?.estado)}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                    <Paginacion page={pageAgrupado} totalPages={totalPagesAgrupado} onIr={irPaginaAgrupado} />
                  </>
                )
              ) : (
                inventario.length === 0 ? (
                  <div className="alert alert-info" role="alert">No se encontraron registros de inventario.</div>
                ) : (
                  <>
                    <small className="text-muted d-block mb-2">
                      Mostrando {pageInv * PAGE_SIZE + 1}–{Math.min((pageInv + 1) * PAGE_SIZE, totalElemsInv)} de {totalElemsInv} registros
                    </small>
                    <CTable striped hover bordered responsive>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                          <CTableHeaderCell>Código Producto</CTableHeaderCell>
                          <CTableHeaderCell>Código Proveedor</CTableHeaderCell>
                          <CTableHeaderCell>Descripción</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Precio Compra</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Existencias</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Dañados</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Ubicación</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {inventario.map((item, index) => (
                          <CTableRow key={item.idInventario || index}>
                            <CTableDataCell className="text-center">{pageInv * PAGE_SIZE + index + 1}</CTableDataCell>
                            <CTableDataCell>{item.codigoProducto}</CTableDataCell>
                            <CTableDataCell>{item.codigoProductoProveedor}</CTableDataCell>
                            <CTableDataCell>{item.descripcionProducto}</CTableDataCell>
                            <CTableDataCell className="text-end">Q{Number(item.precioCompra).toFixed(2)}</CTableDataCell>
                            <CTableDataCell className="text-center">{item.cantidadExistencias}</CTableDataCell>
                            <CTableDataCell className="text-center">{item.cantidadDanados}</CTableDataCell>
                            <CTableDataCell className="text-center">{obtenerNombreUbicacion(item.idUbicacion)}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                    <Paginacion page={pageInv} totalPages={totalPagesInv} onIr={irPaginaInv} />
                  </>
                )
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default ReporteInventario
