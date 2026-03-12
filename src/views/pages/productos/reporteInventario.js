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
const SIZE_TODOS = 10000

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
      estado:                  item.idProducto?.estado                  ?? item.estado,
      idUbicacion:             item.idUbicacion                         ?? '—',
      cantidadExistencias:     item.cantidadExistencias                 || 0,
      cantidadDanados:         item.cantidadDanados                     || 0,
    }))

  // ── Reporte General ──
  // Con búsqueda: llamadas paralelas por campo server-side (descripcion, codigoProducto, codigoProductoProveedor)
  const cargarInventarioAgrupado = async (pagina = 0, termino = busqueda) => {
    try {
      setLoadingAgrupado(true)
      setErrorAgrupado(null)
      const t = (termino || '').trim()

      if (!t) {
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
        const SIZE_BUSQUEDA = 500
        const palabras = t.split(/\s+/).filter(Boolean)

        const fetchDescripcion = (palabra) =>
          fetch(`/api/inventarioAgrupado?descripcion=${encodeURIComponent(palabra)}&page=0&size=${SIZE_BUSQUEDA}`)
            .then(r => r.json()).then(d => (Array.isArray(d) ? d : d.content || []))

        const [rCodigo, rProveedor, ...rDescPalabras] = await Promise.all([
          fetch(`/api/inventarioAgrupado?codigoProducto=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
          fetch(`/api/inventarioAgrupado?codigoProductoProveedor=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
          ...palabras.map(fetchDescripcion),
        ])

        // Intersección por descripción (el producto debe aparecer en TODAS las palabras)
        let porDescripcion = rDescPalabras[0] || []
        for (let i = 1; i < rDescPalabras.length; i++) {
          const ids = new Set(rDescPalabras[i].map(p => p.producto?.idProducto))
          porDescripcion = porDescripcion.filter(p => ids.has(p.producto?.idProducto))
        }

        const combinados = [
          ...(Array.isArray(rCodigo) ? rCodigo : rCodigo.content || []),
          ...(Array.isArray(rProveedor) ? rProveedor : rProveedor.content || []),
          ...porDescripcion,
        ]
        const unicos = combinados.filter((p, idx, arr) =>
          arr.findIndex(x => x.producto?.idProducto === p.producto?.idProducto) === idx
        )
        const inicio = pagina * PAGE_SIZE
        setTodosAgrupado(unicos)
        setInventarioAgrupado(unicos.slice(inicio, inicio + PAGE_SIZE))
        setPageAgrupado(pagina)
        setTotalPagesAgrupado(Math.ceil(unicos.length / PAGE_SIZE))
        setTotalElemsAgrupado(unicos.length)
      }
    } catch (err) {
      setErrorAgrupado(err.message)
      setInventarioAgrupado([])
    } finally {
      setLoadingAgrupado(false)
    }
  }

  // ── Reporte por Ubicación ──
  // Con búsqueda: llamadas paralelas por campo server-side (descripcion, codigoProducto, codigoProductoProveedor)
  const cargarInventario = async (pagina = 0, termino = busqueda) => {
    try {
      setLoading(true)
      setError(null)
      const t = (termino || '').trim()

      if (!t) {
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
        const SIZE_BUSQUEDA = 500
        const palabras = t.split(/\s+/).filter(Boolean)

        const fetchDescripcion = (palabra) =>
          fetch(`/api/inventario?descripcion=${encodeURIComponent(palabra)}&page=0&size=${SIZE_BUSQUEDA}`)
            .then(r => r.json()).then(d => (Array.isArray(d) ? d : d.content || []))

        const [rCodigo, rProveedor, ...rDescPalabras] = await Promise.all([
          fetch(`/api/inventario?codigoProducto=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
          fetch(`/api/inventario?codigoProductoProveedor=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
          ...palabras.map(fetchDescripcion),
        ])

        // Intersección por descripción (el producto debe aparecer en TODAS las palabras)
        let porDescripcion = rDescPalabras[0] || []
        for (let i = 1; i < rDescPalabras.length; i++) {
          const ids = new Set(rDescPalabras[i].map(p => p.idInventario))
          porDescripcion = porDescripcion.filter(p => ids.has(p.idInventario))
        }

        const combinados = [
          ...(Array.isArray(rCodigo) ? rCodigo : rCodigo.content || []),
          ...(Array.isArray(rProveedor) ? rProveedor : rProveedor.content || []),
          ...porDescripcion,
        ]
        const unicos = combinados.filter((p, idx, arr) =>
          arr.findIndex(x => x.idInventario === p.idInventario) === idx
        )
        const formateados = formatearInventario(unicos)
        const inicio = pagina * PAGE_SIZE
        setTodosInventario(formateados)
        setInventario(formateados.slice(inicio, inicio + PAGE_SIZE))
        setPageInv(pagina)
        setTotalPagesInv(Math.ceil(formateados.length / PAGE_SIZE))
        setTotalElemsInv(formateados.length)
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

  // ── Exportar a Excel (todos los registros según filtros activos) ──
  const exportarAExcel = async () => {
    const t = busqueda.trim()

    if (tipoReporte === '1') {
      let todos = []
      if (t && todosAgrupado.length > 0) {
        todos = todosAgrupado
      } else if (t) {
        try {
          const SIZE_BUSQUEDA = 500
          const palabras = t.split(/\s+/).filter(Boolean)
          const fetchDescripcion = (palabra) =>
            fetch(`/api/inventarioAgrupado?descripcion=${encodeURIComponent(palabra)}&page=0&size=${SIZE_BUSQUEDA}`)
              .then(r => r.json()).then(d => (Array.isArray(d) ? d : d.content || []))
          const [rCodigo, rProveedor, ...rDescPalabras] = await Promise.all([
            fetch(`/api/inventarioAgrupado?codigoProducto=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
            fetch(`/api/inventarioAgrupado?codigoProductoProveedor=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
            ...palabras.map(fetchDescripcion),
          ])
          let porDescripcion = rDescPalabras[0] || []
          for (let i = 1; i < rDescPalabras.length; i++) {
            const ids = new Set(rDescPalabras[i].map(p => p.producto?.idProducto))
            porDescripcion = porDescripcion.filter(p => ids.has(p.producto?.idProducto))
          }
          const combinados = [
            ...(Array.isArray(rCodigo) ? rCodigo : rCodigo.content || []),
            ...(Array.isArray(rProveedor) ? rProveedor : rProveedor.content || []),
            ...porDescripcion,
          ]
          todos = combinados.filter((p, idx, arr) =>
            arr.findIndex(x => x.producto?.idProducto === p.producto?.idProducto) === idx
          )
        } catch { return }
      } else {
        try {
          const res = await fetch(`/api/inventarioAgrupado?page=0&size=${SIZE_TODOS}`)
          if (!res.ok) throw new Error(`Error ${res.status}`)
          const data = await res.json()
          todos = Array.isArray(data) ? data : data.content || []
        } catch { return }
      }

      const datosExcel = todos.map((item, i) => ({
        'No.':                 i + 1,
        'Código Producto':   item.producto?.codigoProducto          || '',
        'Código Proveedor':  item.producto?.codigoProductoProveedor || '',
        'Descripción':       item.producto?.descripcionProducto     || '',
        'Precio Compra':     item.producto?.precioCompra != null ? Number(item.producto.precioCompra).toFixed(2) : '',
        'Total Existencias': item.totalExistencias ?? 0,
        'Total Dañados':     item.totalDanados     ?? 0,
        'Unidad de Medida':  obtenerNombreUnidad(item.producto?.unidadDeMedida),
        'Estado':            obtenerNombreEstado(item.producto?.estado),
      }))
      const ws = XLSX.utils.json_to_sheet(datosExcel)
      ws['!cols'] = [{ wch:5 },{ wch:20 },{ wch:20 },{ wch:50 },{ wch:15 },{ wch:18 },{ wch:15 },{ wch:20 },{ wch:15 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte General')
      XLSX.writeFile(wb, `ReporteGeneral_${new Date().toISOString().slice(0,10)}.xlsx`)

    } else {
      let todos = []
      if (t && todosInventario.length > 0) {
        todos = todosInventario
      } else if (t) {
        try {
          const SIZE_BUSQUEDA = 500
          const palabras = t.split(/\s+/).filter(Boolean)
          const fetchDescripcion = (palabra) =>
            fetch(`/api/inventario?descripcion=${encodeURIComponent(palabra)}&page=0&size=${SIZE_BUSQUEDA}`)
              .then(r => r.json()).then(d => (Array.isArray(d) ? d : d.content || []))
          const [rCodigo, rProveedor, ...rDescPalabras] = await Promise.all([
            fetch(`/api/inventario?codigoProducto=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
            fetch(`/api/inventario?codigoProductoProveedor=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
            ...palabras.map(fetchDescripcion),
          ])
          let porDescripcion = rDescPalabras[0] || []
          for (let i = 1; i < rDescPalabras.length; i++) {
            const ids = new Set(rDescPalabras[i].map(p => p.idInventario))
            porDescripcion = porDescripcion.filter(p => ids.has(p.idInventario))
          }
          const combinados = [
            ...(Array.isArray(rCodigo) ? rCodigo : rCodigo.content || []),
            ...(Array.isArray(rProveedor) ? rProveedor : rProveedor.content || []),
            ...porDescripcion,
          ]
          const unicos = combinados.filter((p, idx, arr) =>
            arr.findIndex(x => x.idInventario === p.idInventario) === idx
          )
          todos = formatearInventario(unicos)
        } catch { return }
      } else {
        try {
          const res = await fetch(`/api/inventario?page=0&size=${SIZE_TODOS}`)
          if (!res.ok) throw new Error(`Error ${res.status}`)
          const data = await res.json()
          const arr = Array.isArray(data) ? data : data.content || []
          todos = formatearInventario(arr)
        } catch { return }
      }

      const datosExcel = todos.map((item, i) => ({
        'No.':                i + 1,
        'Código Producto':  item.codigoProducto          || '',
        'Código Proveedor': item.codigoProductoProveedor || '',
        'Descripción':      item.descripcionProducto     || '',
        'Precio Compra':    Number(item.precioCompra || 0).toFixed(2),
        'Existencias':      item.cantidadExistencias,
        'Dañados':          item.cantidadDanados,
        'Ubicación':        obtenerNombreUbicacion(item.idUbicacion),
        'Estado':           obtenerNombreEstado(item.estado),
      }))
      const ws = XLSX.utils.json_to_sheet(datosExcel)
      ws['!cols'] = [{ wch:5 },{ wch:20 },{ wch:20 },{ wch:50 },{ wch:15 },{ wch:12 },{ wch:12 },{ wch:20 },{ wch:15 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte por Ubicación')
      XLSX.writeFile(wb, `ReporteUbicacion_${new Date().toISOString().slice(0,10)}.xlsx`)
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
                      <CTableHead style={{ '--cui-table-bg': '#1a3a6b', '--cui-table-color': '#fff', '--cui-table-border-color': '#2a4a8b', backgroundColor: '#1a3a6b', color: '#fff' }}>
                        <CTableRow>
                          <CTableHeaderCell className="text-center">No.</CTableHeaderCell>
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
                      <CTableHead style={{ '--cui-table-bg': '#1a3a6b', '--cui-table-color': '#fff', '--cui-table-border-color': '#2a4a8b', backgroundColor: '#1a3a6b', color: '#fff' }}>
                        <CTableRow>
                          <CTableHeaderCell className="text-center">No.</CTableHeaderCell>
                          <CTableHeaderCell>Código Producto</CTableHeaderCell>
                          <CTableHeaderCell>Código Proveedor</CTableHeaderCell>
                          <CTableHeaderCell>Descripción</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Precio Compra</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Existencias</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Dañados</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Ubicación</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Estado</CTableHeaderCell>
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
                            <CTableDataCell className="text-center">{obtenerNombreEstado(item.estado)}</CTableDataCell>
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
