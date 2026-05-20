import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import ExcelJS from 'exceljs'

const PAGE_SIZE = 20
const SIZE_TODOS = 10000

const ReporteInventario = () => {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const idUsuarioActual = usuario?.idUsuario ?? usuario?.id_Usuario ?? usuario?.ID_Usuario ?? null

  // Tipo de reporte
  const [tipoReporte, setTipoReporte] = useState('1')

  // Búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [debouncedBusqueda, setDebouncedBusqueda] = useState('')

  // ── Reporte General ──
  const [inventarioAgrupado, setInventarioAgrupado] = useState([])
  const [pageAgrupado, setPageAgrupado] = useState(0)
  const [totalPagesAgrupado, setTotalPagesAgrupado] = useState(0)
  const [totalElemsAgrupado, setTotalElemsAgrupado] = useState(0)
  const [loadingAgrupado, setLoadingAgrupado] = useState(false)
  const [errorAgrupado, setErrorAgrupado] = useState(null)

  // ── Reporte por Ubicación ──
  const [inventario, setInventario] = useState([])
  const [pageInv, setPageInv] = useState(0)
  const [totalPagesInv, setTotalPagesInv] = useState(0)
  const [totalElemsInv, setTotalElemsInv] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filtro de ubicación (solo para reporte por ubicación)
  const [ubicacionFiltro, setUbicacionFiltro] = useState('')
  const [debouncedUbicacion, setDebouncedUbicacion] = useState('')

  // Edición de existencias (solo para reporte por ubicación)
  const [modoEditarExistencias, setModoEditarExistencias] = useState(false)
  const [existenciasEditadas, setExistenciasEditadas] = useState({})
  const [guardandoExistencias, setGuardandoExistencias] = useState(false)

  // Modal de exportación
  const [modalExportarVisible, setModalExportarVisible] = useState(false)

  // Modal de mensajes
  const [modalMsgVisible, setModalMsgVisible] = useState(false)
  const [modalMsgTitle, setModalMsgTitle] = useState('')
  const [modalMsgBody, setModalMsgBody] = useState('')
  const [modalMsgColor, setModalMsgColor] = useState('info')

  // Diccionarios y ubicaciones
  const [unidadesMedida, setUnidadesMedida] = useState([])
  const [estados, setEstados] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])

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
      idInventario: item.idInventario,
      idProducto: item.idProducto?.idProducto,
      codigoProducto: item.idProducto?.codigoProducto || 'N/A',
      codigoProductoProveedor: item.idProducto?.codigoProductoProveedor || 'N/A',
      descripcionProducto: item.idProducto?.descripcionProducto || 'N/A',
      unidadDeMedida: item.idProducto?.unidadDeMedida,
      precioCompra: item.idProducto?.precioCompra || 0,
      precioVenta: item.idProducto?.precioVenta || 0,
      estado: item.idProducto?.estado ?? item.estado,
      idUbicacion: item.idUbicacion ?? '—',
      cantidadExistencias: item.cantidadExistencias || 0,
      cantidadDanados: item.cantidadDanados || 0,
    }))

  // 🔥 Reporte General - Usando el endpoint agrupado con paginación server-side
  const cargarInventarioAgrupado = async (pagina = 0, termino = debouncedBusqueda) => {
    try {
      setLoadingAgrupado(true)
      setErrorAgrupado(null)
      const t = (termino || '').trim()

      const params = new URLSearchParams({ page: pagina, size: PAGE_SIZE })
      if (t) {
        params.append('codigoProducto', t)
        params.append('codigoProductoProveedor', t)
        params.append('descripcion', t)
      }

      const res = await fetch(`/api/inventarioAgrupado?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const arr = Array.isArray(data) ? data : data.content || []

      setInventarioAgrupado(arr)
      setPageAgrupado(data.number ?? 0)
      setTotalPagesAgrupado(data.totalPages ?? 0)
      setTotalElemsAgrupado(data.totalElements ?? 0)
    } catch (err) {
      setErrorAgrupado(err.message)
      setInventarioAgrupado([])
    } finally {
      setLoadingAgrupado(false)
    }
  }

  // 🔥 Reporte por Ubicación - Usando el endpoint con paginación server-side
  const cargarInventario = async (pagina = 0, termino = debouncedBusqueda, ubicacion = debouncedUbicacion) => {
    try {
      setLoading(true)
      setError(null)
      const t = (termino || '').trim()

      const params = new URLSearchParams({ page: pagina, size: PAGE_SIZE })
      if (t) {
        params.append('codigoProducto', t)
        params.append('codigoProductoProveedor', t)
        params.append('descripcion', t)
      }
      if (ubicacion) params.append('idUbicacion', ubicacion)

      const res = await fetch(`/api/inventario?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const arr = Array.isArray(data) ? data : data.content || []

      setInventario(formatearInventario(arr))
      setPageInv(data.number ?? 0)
      setTotalPagesInv(data.totalPages ?? 0)
      setTotalElemsInv(data.totalElements ?? 0)
    } catch (err) {
      setError(err.message)
      setInventario([])
    } finally {
      setLoading(false)
    }
  }

  // ── Paginación ──
  const irPaginaAgrupado = (p) => cargarInventarioAgrupado(p, debouncedBusqueda)
  const irPaginaInv = (p) => cargarInventario(p, debouncedBusqueda, debouncedUbicacion)

  // ── Debounce para búsqueda ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusqueda(busqueda)
    }, 500)
    return () => clearTimeout(timer)
  }, [busqueda])

  // Debounce para ubicación
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUbicacion(ubicacionFiltro)
    }, 300)
    return () => clearTimeout(timer)
  }, [ubicacionFiltro])

  // ── Editar Existencias ──
  const activarModoEditarExistencias = () => {
    const inicial = {}
    inventario.forEach(item => {
      inicial[item.idInventario] = {
        existencias: item.cantidadExistencias != null ? String(item.cantidadExistencias) : '0',
        danados: item.cantidadDanados != null ? String(item.cantidadDanados) : '0',
        precioCompra: item.precioCompra != null ? String(item.precioCompra) : '0',
        precioVenta: item.precioVenta != null ? String(item.precioVenta) : '0',
      }
    })
    setExistenciasEditadas(inicial)
    setModoEditarExistencias(true)
  }

  const cancelarEditarExistencias = () => {
    setModoEditarExistencias(false)
    setExistenciasEditadas({})
  }

  const guardarExistencias = async () => {
    const regexEntero = /^\d+$/
    const regexDecimal = /^\d+(\.\d{1,2})?$/

    const cambiosInv = inventario.filter(item => {
      const ed = existenciasEditadas[item.idInventario]
      if (!ed) return false
      const exCambio = ed.existencias?.trim() && regexEntero.test(ed.existencias.trim()) && Number(ed.existencias) !== Number(item.cantidadExistencias)
      const danCambio = ed.danados?.trim() && regexEntero.test(ed.danados.trim()) && Number(ed.danados) !== Number(item.cantidadDanados)
      return exCambio || danCambio
    })

    const cambiosPrecios = inventario.filter(item => {
      const ed = existenciasEditadas[item.idInventario]
      if (!ed || !item.idProducto) return false
      const compraCambio = ed.precioCompra?.trim() && regexDecimal.test(ed.precioCompra.trim()) && Number(ed.precioCompra) !== Number(item.precioCompra)
      const ventaCambio = ed.precioVenta?.trim() && regexDecimal.test(ed.precioVenta.trim()) && Number(ed.precioVenta) !== Number(item.precioVenta)
      return compraCambio || ventaCambio
    })

    if (cambiosInv.length === 0 && cambiosPrecios.length === 0) {
      setModalMsgTitle('Sin cambios')
      setModalMsgBody('No se detectaron cambios.')
      setModalMsgColor('info')
      setModalMsgVisible(true)
      cancelarEditarExistencias()
      return
    }

    setGuardandoExistencias(true)
    try {
      await Promise.all([
        ...cambiosInv.map(item => {
          const ed = existenciasEditadas[item.idInventario]
          const nuevasEx = ed.existencias?.trim() && regexEntero.test(ed.existencias.trim()) ? Number(ed.existencias) : item.cantidadExistencias
          const nuevosDan = ed.danados?.trim() && regexEntero.test(ed.danados.trim()) ? Number(ed.danados) : item.cantidadDanados
          return fetch(`/api/editarInventario/${item.idInventario}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidadExistencias: nuevasEx, cantidadDanados: nuevosDan, idUsuarioModificacion: idUsuarioActual }),
          }).then(r => { if (!r.ok) throw new Error(`Error al actualizar inventario ${item.idInventario}`) })
        }),
        // Deduplicar por idProducto: un solo llamado por producto aunque tenga varias ubicaciones
        ...Object.values(
          cambiosPrecios.reduce((acc, item) => {
            if (!acc[item.idProducto]) acc[item.idProducto] = item
            return acc
          }, {})
        ).map(item => {
          const ed = existenciasEditadas[item.idInventario]
          const nuevaCompra = ed.precioCompra?.trim() && regexDecimal.test(ed.precioCompra.trim()) ? Number(ed.precioCompra) : item.precioCompra
          const nuevaVenta = ed.precioVenta?.trim() && regexDecimal.test(ed.precioVenta.trim()) ? Number(ed.precioVenta) : item.precioVenta
          return fetch(`/api/editarProducto/${item.idProducto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codigoProducto: item.codigoProducto,
              codigoProductoProveedor: item.codigoProductoProveedor,
              descripcionProducto: item.descripcionProducto,
              unidadDeMedida: item.unidadDeMedida,
              precioCompra: nuevaCompra,
              precioVenta: nuevaVenta,
              idUsuarioModificacion: idUsuarioActual,
            }),
          }).then(r => { if (!r.ok) throw new Error(`Error al actualizar precio de ${item.codigoProducto}`) })
        }),
      ])
      await cargarInventario(pageInv, debouncedBusqueda, debouncedUbicacion)
      cancelarEditarExistencias()
      const idsActualizados = new Set([
        ...cambiosInv.map(i => i.idProducto),
        ...cambiosPrecios.map(i => i.idProducto),
      ])
      const total = idsActualizados.size
      setModalMsgTitle('Éxito')
      setModalMsgBody(`${total} registro(s) actualizado(s) correctamente.`)
      setModalMsgColor('success')
      setModalMsgVisible(true)
    } catch (err) {
      setModalMsgTitle('Error')
      setModalMsgBody(err.message)
      setModalMsgColor('danger')
      setModalMsgVisible(true)
    } finally {
      setGuardandoExistencias(false)
    }
  }

  // ── Limpiar ──
  const limpiarBusqueda = () => {
    setBusqueda('')
    setUbicacionFiltro('')
    setDebouncedBusqueda('')
    setDebouncedUbicacion('')
  }

  // ── Exportar a Excel ──
  const aplicarEstiloEncabezado = (fila) => {
    fila.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A6B' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      }
    })
    fila.height = 20
  }

  const exportarAExcel = async (sinPrecioVenta = false) => {
    setModalExportarVisible(false)
    if (tipoReporte === '1') {
      try {
        const params = new URLSearchParams({ page: 0, size: SIZE_TODOS })
        if (debouncedBusqueda.trim()) {
          params.append('codigoProducto', debouncedBusqueda)
          params.append('codigoProductoProveedor', debouncedBusqueda)
          params.append('descripcion', debouncedBusqueda)
        }

        const res = await fetch(`/api/inventarioAgrupado?${params}`)
        if (!res.ok) throw new Error('Error al exportar')
        const data = await res.json()
        const todos = Array.isArray(data) ? data : data.content || []

        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('Reporte General')

        const columnas = [
          { header: 'No.',              key: 'no',          width: 6  },
          { header: 'Código Producto',  key: 'codProd',     width: 22 },
          { header: 'Código Proveedor', key: 'codProv',     width: 22 },
          { header: 'Descripción',      key: 'desc',        width: 50 },
          { header: 'Total Existencias',key: 'existencias', width: 18 },
          { header: 'Precio Compra',    key: 'compra',      width: 16 },
          ...(!sinPrecioVenta ? [{ header: 'Precio Venta', key: 'venta', width: 16 }] : []),
          { header: 'Total Dañados',    key: 'danados',     width: 15 },
          { header: 'Unidad de Medida', key: 'unidad',      width: 20 },
          { header: 'Estado',           key: 'estado',      width: 15 },
        ]
        ws.columns = columnas

        aplicarEstiloEncabezado(ws.getRow(1))

        todos.forEach((item, i) => {
          const fila = {
            no: i + 1,
            codProd: item.producto?.codigoProducto || '',
            codProv: item.producto?.codigoProductoProveedor || '',
            desc: item.producto?.descripcionProducto || '',
            existencias: item.totalExistencias ?? 0,
            compra: item.producto?.precioCompra != null ? Number(item.producto.precioCompra).toFixed(2) : '',
            danados: item.totalDanados ?? 0,
            unidad: obtenerNombreUnidad(item.producto?.unidadDeMedida),
            estado: obtenerNombreEstado(item.producto?.estado),
          }
          if (!sinPrecioVenta) fila.venta = item.producto?.precioVenta != null ? Number(item.producto.precioVenta).toFixed(2) : ''
          ws.addRow(fila)
        })

        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ReporteGeneral_${new Date().toISOString().slice(0, 10)}.xlsx`
        a.click()
        URL.revokeObjectURL(url)

        setModalMsgTitle('Éxito')
        setModalMsgBody(`Se exportaron ${todos.length} registros correctamente.`)
        setModalMsgColor('success')
        setModalMsgVisible(true)
      } catch (err) {
        setModalMsgTitle('Error')
        setModalMsgBody('Error al exportar: ' + err.message)
        setModalMsgColor('danger')
        setModalMsgVisible(true)
      }
    } else {
      try {
        const params = new URLSearchParams({ page: 0, size: SIZE_TODOS })
        if (debouncedBusqueda.trim()) {
          params.append('codigoProducto', debouncedBusqueda)
          params.append('codigoProductoProveedor', debouncedBusqueda)
          params.append('descripcion', debouncedBusqueda)
        }
        if (debouncedUbicacion) params.append('idUbicacion', debouncedUbicacion)

        const res = await fetch(`/api/inventario?${params}`)
        if (!res.ok) throw new Error('Error al exportar')
        const data = await res.json()
        const arr = Array.isArray(data) ? data : data.content || []
        const todos = formatearInventario(arr)

        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('Reporte por Ubicación')

        const columnas = [
          { header: 'No.',              key: 'no',          width: 6  },
          { header: 'Código Producto',  key: 'codProd',     width: 22 },
          { header: 'Código Proveedor', key: 'codProv',     width: 22 },
          { header: 'Descripción',      key: 'desc',        width: 50 },
          { header: 'Existencias',      key: 'existencias', width: 14 },
          { header: 'Precio Compra',    key: 'compra',      width: 16 },
          ...(!sinPrecioVenta ? [{ header: 'Precio Venta', key: 'venta', width: 16 }] : []),
          { header: 'Dañados',          key: 'danados',     width: 12 },
          { header: 'Ubicación',        key: 'ubicacion',   width: 20 },
          { header: 'Estado',           key: 'estado',      width: 15 },
        ]
        ws.columns = columnas

        aplicarEstiloEncabezado(ws.getRow(1))

        todos.forEach((item, i) => {
          const fila = {
            no: i + 1,
            codProd: item.codigoProducto || '',
            codProv: item.codigoProductoProveedor || '',
            desc: item.descripcionProducto || '',
            existencias: item.cantidadExistencias,
            compra: Number(item.precioCompra || 0).toFixed(2),
            danados: item.cantidadDanados,
            ubicacion: obtenerNombreUbicacion(item.idUbicacion),
            estado: obtenerNombreEstado(item.estado),
          }
          if (!sinPrecioVenta) fila.venta = Number(item.precioVenta || 0).toFixed(2)
          ws.addRow(fila)
        })

        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ReporteUbicacion_${new Date().toISOString().slice(0, 10)}.xlsx`
        a.click()
        URL.revokeObjectURL(url)

        setModalMsgTitle('Éxito')
        setModalMsgBody(`Se exportaron ${todos.length} registros correctamente.`)
        setModalMsgColor('success')
        setModalMsgVisible(true)
      } catch (err) {
        setModalMsgTitle('Error')
        setModalMsgBody('Error al exportar: ' + err.message)
        setModalMsgColor('danger')
        setModalMsgVisible(true)
      }
    }
  }

  // ── Effects ──
  useEffect(() => {
    cargarDiccionarios()
  }, [])

  // Al cambiar tipo de reporte: resetear búsqueda y filtro de ubicación
  useEffect(() => {
    setBusqueda('')
    setUbicacionFiltro('')
    setDebouncedBusqueda('')
    setDebouncedUbicacion('')
  }, [tipoReporte])

  // Cargar datos cuando cambian los filtros debounced
  useEffect(() => {
    if (tipoReporte === '1') {
      cargarInventarioAgrupado(0, debouncedBusqueda)
    } else {
      cargarInventario(0, debouncedBusqueda, debouncedUbicacion)
    }
  }, [debouncedBusqueda, tipoReporte, debouncedUbicacion])

  // ── Componente de paginación reutilizable ──
  const Paginacion = ({ page, totalPages, onIr }) => {
    if (totalPages <= 1) return null
    const items = []
    const inicio = Math.max(0, page - 2)
    const fin = Math.min(totalPages - 1, page + 2)

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
  const isError = tipoReporte === '1' ? errorAgrupado : error

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
              <CRow className="mb-3 g-3">
                <CCol md={3}>
                  <CFormLabel className="fw-semibold">Tipo de Reporte</CFormLabel>
                  <CFormSelect value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value)}>
                    <option value="1">Reporte General</option>
                    <option value="2">Reporte por Ubicación</option>
                  </CFormSelect>
                </CCol>
                {tipoReporte === '2' && (
                  <CCol md={2}>
                    <CFormLabel className="fw-semibold">Ubicación</CFormLabel>
                    <CFormSelect
                      value={ubicacionFiltro}
                      onChange={(e) => setUbicacionFiltro(e.target.value)}
                    >
                      <option value="">Todas las ubicaciones</option>
                      {ubicaciones.map((u) => (
                        <option key={u.idUbicacion} value={u.idUbicacion}>
                          {u.nombreUbicacion || `Ubicación ${u.idUbicacion}`}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                )}
                <CCol md={tipoReporte === '2' ? 3 : 6}>
                  <CFormLabel className="fw-semibold">Buscar</CFormLabel>
                  <CFormInput
                    type="text"
                    placeholder="Buscar por código de producto, código de proveedor o descripción..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    autoComplete="off"
                  />
                  <small className="text-muted">
                    {busqueda && !debouncedBusqueda && "Buscando..."}
                    {debouncedBusqueda && `Resultados para: "${debouncedBusqueda}"`}
                  </small>
                </CCol>
                <CCol md={tipoReporte === '2' ? 4 : 3} className="d-flex align-items-end justify-content-end gap-2">
                  {tipoReporte === '2' && !modoEditarExistencias && (
                    <CButton className="text-white text-nowrap" style={{ backgroundColor: '#e8590c', borderColor: '#e8590c' }} onClick={activarModoEditarExistencias}>
                      Editar Existencias y Precios
                    </CButton>
                  )}
                  {tipoReporte === '2' && modoEditarExistencias && (
                    <>
                      <CButton color="success" className="text-white" onClick={guardarExistencias} disabled={guardandoExistencias}>
                        {guardandoExistencias && <CSpinner size="sm" className="me-1" />}
                        Guardar
                      </CButton>
                      <CButton color="secondary" onClick={cancelarEditarExistencias} disabled={guardandoExistencias}>
                        Cancelar
                      </CButton>
                    </>
                  )}
                  <div className="d-flex gap-2">
                    <CButton color="secondary" className="text-nowrap" onClick={limpiarBusqueda}>Limpiar</CButton>
                    <CButton color="success" className="text-white text-nowrap" onClick={() => setModalExportarVisible(true)}>Exportar</CButton>
                  </div>
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
                          <CTableHeaderCell className="text-center">Código Producto</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Código Proveedor</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Descripción</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Total Existencias</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Precio Compra</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Precio Venta</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Total Dañados</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Unidad de Medida</CTableHeaderCell>
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
                            <CTableDataCell className="text-center">{item.totalExistencias ?? 0}</CTableDataCell>
                            <CTableDataCell className="text-end">Q{Number(item.producto?.precioCompra || 0).toFixed(2)}</CTableDataCell>
                            <CTableDataCell className="text-end">Q{Number(item.producto?.precioVenta || 0).toFixed(2)}</CTableDataCell>
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
                          <CTableHeaderCell className="text-center">Código Producto</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Código Proveedor</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Descripción</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Existencias</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Precio Compra</CTableHeaderCell>
                          <CTableHeaderCell className="text-center">Precio Venta</CTableHeaderCell>
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
                            <CTableDataCell className="text-center">
                              {modoEditarExistencias ? (
                                <CFormInput
                                  type="text"
                                  inputMode="numeric"
                                  size="sm"
                                  style={{ minWidth: '80px' }}
                                  value={existenciasEditadas[item.idInventario]?.existencias ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '' || /^\d*$/.test(val))
                                      setExistenciasEditadas(prev => ({
                                        ...prev,
                                        [item.idInventario]: { ...prev[item.idInventario], existencias: val }
                                      }))
                                  }}
                                />
                              ) : item.cantidadExistencias}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {modoEditarExistencias ? (
                                <CFormInput
                                  type="text"
                                  inputMode="decimal"
                                  size="sm"
                                  style={{ minWidth: '90px' }}
                                  value={existenciasEditadas[item.idInventario]?.precioCompra ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '' || /^\d*\.?\d*$/.test(val))
                                      setExistenciasEditadas(prev => ({
                                        ...prev,
                                        [item.idInventario]: { ...prev[item.idInventario], precioCompra: val }
                                      }))
                                  }}
                                />
                              ) : `Q${Number(item.precioCompra).toFixed(2)}`}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {modoEditarExistencias ? (
                                <CFormInput
                                  type="text"
                                  inputMode="decimal"
                                  size="sm"
                                  style={{ minWidth: '90px' }}
                                  value={existenciasEditadas[item.idInventario]?.precioVenta ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '' || /^\d*\.?\d*$/.test(val))
                                      setExistenciasEditadas(prev => ({
                                        ...prev,
                                        [item.idInventario]: { ...prev[item.idInventario], precioVenta: val }
                                      }))
                                  }}
                                />
                              ) : `Q${Number(item.precioVenta || 0).toFixed(2)}`}
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              {modoEditarExistencias ? (
                                <CFormInput
                                  type="text"
                                  inputMode="numeric"
                                  size="sm"
                                  style={{ minWidth: '80px' }}
                                  value={existenciasEditadas[item.idInventario]?.danados ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '' || /^\d*$/.test(val))
                                      setExistenciasEditadas(prev => ({
                                        ...prev,
                                        [item.idInventario]: { ...prev[item.idInventario], danados: val }
                                      }))
                                  }}
                                />
                              ) : item.cantidadDanados}
                            </CTableDataCell>
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

      {/* Modal de opciones de exportación */}
      <CModal visible={modalExportarVisible} onClose={() => setModalExportarVisible(false)} alignment="center">
        <CModalHeader className="bg-success text-white">
          <CModalTitle>Exportar a Excel</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-1">¿Desea incluir la columna <strong>Precio Venta</strong> en el archivo exportado?</p>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => exportarAExcel(true)}>
            Sin precio venta
          </CButton>
          <CButton color="success" className="text-white" onClick={() => exportarAExcel(false)}>
            Con precio venta
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={modalMsgVisible} onClose={() => setModalMsgVisible(false)} alignment="center">
        <CModalHeader className={`bg-${modalMsgColor} text-white`}>
          <CModalTitle>{modalMsgTitle}</CModalTitle>
        </CModalHeader>
        <CModalBody>{modalMsgBody}</CModalBody>
        <CModalFooter>
          <CButton color={modalMsgColor} className="text-white" onClick={() => setModalMsgVisible(false)}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ReporteInventario