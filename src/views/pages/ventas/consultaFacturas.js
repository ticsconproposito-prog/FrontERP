import React, { useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'

const PAGE_SIZE = 20
const _d = new Date()
const HOY = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`

const formatFecha = (fecha) => {
  if (!fecha) return ''
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

const formatMoneda = (valor) =>
  `Q${Number(valor).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const Paginador = ({ paginaActual, totalPaginas, totalElementos, onCambiar }) => {
  if (totalPaginas <= 1) return null
  return (
    <CRow className="mt-3 align-items-center">
      <CCol xs="auto" className="text-muted small">
        Mostrando página {paginaActual + 1} de {totalPaginas} &mdash; {totalElementos} registros en total
      </CCol>
      <CCol className="d-flex justify-content-end">
        <CPagination>
          <CPaginationItem disabled={paginaActual === 0} onClick={() => onCambiar(0)}>«</CPaginationItem>
          <CPaginationItem disabled={paginaActual === 0} onClick={() => onCambiar(paginaActual - 1)}>‹</CPaginationItem>
          {Array.from({ length: totalPaginas }, (_, i) => i)
            .filter((i) => i === 0 || i === totalPaginas - 1 || Math.abs(i - paginaActual) <= 2)
            .reduce((acc, i, idx, arr) => {
              if (idx > 0 && i - arr[idx - 1] > 1) acc.push('...')
              acc.push(i)
              return acc
            }, [])
            .map((item, idx) =>
              item === '...' ? (
                <CPaginationItem key={`e-${idx}`} disabled>…</CPaginationItem>
              ) : (
                <CPaginationItem key={item} active={item === paginaActual} onClick={() => onCambiar(item)}>
                  {item + 1}
                </CPaginationItem>
              ),
            )}
          <CPaginationItem disabled={paginaActual === totalPaginas - 1} onClick={() => onCambiar(paginaActual + 1)}>›</CPaginationItem>
          <CPaginationItem disabled={paginaActual === totalPaginas - 1} onClick={() => onCambiar(totalPaginas - 1)}>»</CPaginationItem>
        </CPagination>
      </CCol>
    </CRow>
  )
}

const ConsultaFacturas = () => {
  const [tipoDetalle, setTipoDetalle] = useState('1')
  const [fechaInicio, setFechaInicio] = useState(HOY)
  const [fechaFin, setFechaFin] = useState(HOY)
  const [filtroAplicado, setFiltroAplicado] = useState({ inicio: HOY, fin: HOY })
  const [tiposDocumento, setTiposDocumento] = useState({})

  // ── Detalle por Factura ──────────────────────────────────────────────────
  const [facturas, setFacturas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [paginaActual, setPaginaActual] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [totalElementos, setTotalElementos] = useState(0)
  const [resumen, setResumen] = useState({ cantidadFacturas: 0, totalVenta: 0 })
  const [todasFacturas, setTodasFacturas] = useState([])

  // ── Detalle por Producto ─────────────────────────────────────────────────
  const [detalles, setDetalles] = useState([])
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState(null)
  const [paginaDetalle, setPaginaDetalle] = useState(0)
  const [totalPaginasDetalle, setTotalPaginasDetalle] = useState(0)
  const [totalDetalles, setTotalDetalles] = useState(0)

  // Diccionario Tipo Documento
  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch('/api/diccionarios?diccionario=TIPODOCUMENTO&estado=1')
        if (!res.ok) return
        const data = await res.json()
        const lista = Array.isArray(data) ? data : data.content ?? []
        const mapa = {}
        lista.forEach((item) => { mapa[String(item.indice)] = item.valor })
        setTiposDocumento(mapa)
      } catch { /* muestra código si falla */ }
    }
    cargar()
  }, [])

  // Cargar Facturas (tipoDetalle === '1')
  useEffect(() => {
    if (tipoDetalle !== '1') return
    const cargarFacturas = async () => {
      setCargando(true)
      setError(null)
      try {
        const filtros = {
          ...(filtroAplicado.inicio && { fechaInicio: filtroAplicado.inicio }),
          ...(filtroAplicado.fin && { fechaFin: filtroAplicado.fin }),
        }

        // Carga paginada para la tabla
        const params = new URLSearchParams({ page: paginaActual, size: PAGE_SIZE, ...filtros })
        const res = await fetch(`/api/erpEncabezadoFacturas?${params}`)
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setFacturas(data)
          setTotalPaginas(1)
          setTotalElementos(data.length)
        } else {
          setFacturas(data.content ?? [])
          setTotalPaginas(data.totalPages ?? 1)
          setTotalElementos(data.totalElements ?? 0)
        }

        // Carga completa para resumen y exportación (solo cuando cambia el filtro, no la página)
        if (paginaActual === 0) {
          const paramsTotal = new URLSearchParams({ page: 0, size: 10000, ...filtros })
          const resTotal = await fetch(`/api/erpEncabezadoFacturas?${paramsTotal}`)
          if (resTotal.ok) {
            const dataTotal = await resTotal.json()
            const todas = Array.isArray(dataTotal) ? dataTotal : dataTotal.content ?? []
            setTodasFacturas(todas)
            setResumen({
              cantidadFacturas: Array.isArray(dataTotal) ? dataTotal.length : dataTotal.totalElements ?? 0,
              totalVenta: todas.reduce((sum, f) => sum + (f.total ?? 0), 0),
            })
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setCargando(false)
      }
    }
    cargarFacturas()
  }, [paginaActual, filtroAplicado, tipoDetalle])

  // Cargar Detalles por Producto (tipoDetalle === '2')
  useEffect(() => {
    if (tipoDetalle !== '2') return
    const cargarDetalles = async () => {
      setCargandoDetalle(true)
      setErrorDetalle(null)
      try {
        // 1. Obtener todos los encabezados del rango de fechas
        const paramsEnc = new URLSearchParams({
          page: 0,
          size: 1000,
          ...(filtroAplicado.inicio && { fechaInicio: filtroAplicado.inicio }),
          ...(filtroAplicado.fin && { fechaFin: filtroAplicado.fin }),
        })
        const resEnc = await fetch(`/api/erpEncabezadoFacturas?${paramsEnc}`)
        if (!resEnc.ok) throw new Error(`Error ${resEnc.status}: ${resEnc.statusText}`)
        const dataEnc = await resEnc.json()
        const encabezados = Array.isArray(dataEnc) ? dataEnc : dataEnc.content ?? []

        // 2. Para cada encabezado obtener su detalle
        const resultados = await Promise.all(
          encabezados.map(async (enc) => {
            try {
              const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${enc.idEncabezadoFactura}`)
              if (!res.ok) return []
              const data = await res.json()
              const items = Array.isArray(data) ? data : data.content ?? []
              return items.map((item) => ({
                ...item,
                _noFactura: enc.preimpresoResAPI,
                _referencia: enc.referencia,
                _fecha: enc.FechaFactura,
              }))
            } catch {
              return []
            }
          }),
        )

        const todos = resultados.flat()

        // 3. Obtener datos de producto desde /api/productos/{idProducto}
        const idsUnicos = [...new Set(
          todos.map((d) => (typeof d.idProducto === 'object' ? d.idProducto?.idProducto : d.idProducto)).filter(Boolean),
        )]

        const productosMap = {}
        await Promise.all(
          idsUnicos.map(async (id) => {
            try {
              const res = await fetch(`/api/productos?idProducto=${id}&page=0&size=1`)
              if (!res.ok) return
              const data = await res.json()
              const lista = Array.isArray(data) ? data : data.content ?? []
              if (lista.length > 0) productosMap[id] = lista[0]
            } catch { /* ignora si falla un producto */ }
          }),
        )

        const todosConProducto = todos.map((d) => {
          const idProd = typeof d.idProducto === 'object' ? d.idProducto?.idProducto : d.idProducto
          const prod = productosMap[idProd] ?? {}
          return { ...d, _producto: prod }
        })

        setDetalles(todosConProducto)
        setTotalDetalles(todosConProducto.length)
        setTotalPaginasDetalle(Math.ceil(todosConProducto.length / PAGE_SIZE))
        setPaginaDetalle(0)
      } catch (err) {
        setErrorDetalle(err.message)
      } finally {
        setCargandoDetalle(false)
      }
    }
    cargarDetalles()
  }, [filtroAplicado, tipoDetalle])

  const handleCambiarTipo = (valor) => {
    setTipoDetalle(valor)
    setPaginaActual(0)
    setPaginaDetalle(0)
  }

  const handleBuscar = () => {
    setPaginaActual(0)
    setPaginaDetalle(0)
    setFiltroAplicado({ inicio: fechaInicio, fin: fechaFin })
  }

  const handleLimpiar = () => {
    setFechaInicio(HOY)
    setFechaFin(HOY)
    setPaginaActual(0)
    setPaginaDetalle(0)
    setFiltroAplicado({ inicio: HOY, fin: HOY })
  }

  const exportarExcel = async () => {
    const periodo =
      filtroAplicado.inicio && filtroAplicado.fin
        ? filtroAplicado.inicio === filtroAplicado.fin
          ? formatFecha(filtroAplicado.inicio)
          : `${formatFecha(filtroAplicado.inicio)} al ${formatFecha(filtroAplicado.fin)}`
        : 'Todos'

    const boldFont = { bold: true }
    const fillGris = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
    const fillVerde = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }
    const borderThin = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }

    const aplicarEstiloEncabezado = (fila) => {
      fila.eachCell((cell) => {
        cell.font = boldFont
        cell.fill = fillGris
        cell.border = borderThin
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })
    }

    const wb = new ExcelJS.Workbook()

    if (tipoDetalle === '1') {
      const ws = wb.addWorksheet('Detalle por Factura')
      ws.columns = [
        { width: 18 }, { width: 22 }, { width: 14 }, { width: 32 },
        { width: 18 }, { width: 13 }, { width: 11 }, { width: 13 }, { width: 13 },
      ]

      // ── Título del reporte ──
      const filaTitulo = ws.addRow(['Reporte: Detalle por Factura'])
      filaTitulo.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF000000' } }
      filaTitulo.getCell(1).fill = fillGris
      filaTitulo.getCell(1).alignment = { vertical: 'middle' }
      filaTitulo.height = 22

      // ── Resumen en 3 filas — fila vacía superior + solo bordes externos ──
      ws.addRow([])

      const thin = { style: 'thin' }
      const agregarFilaResumen = (etiqueta, valor, esPrimera, esUltima) => {
        const fila = ws.addRow([etiqueta, valor])
        fila.getCell(1).border = { top: esPrimera ? thin : undefined, bottom: esUltima ? thin : undefined, left: thin }
        fila.getCell(2).border = { top: esPrimera ? thin : undefined, bottom: esUltima ? thin : undefined, right: thin }
        fila.getCell(1).font = { bold: true }
        fila.getCell(1).fill = fillGris
        fila.getCell(2).fill = fillGris
        fila.getCell(1).alignment = { vertical: 'middle' }
        fila.getCell(2).alignment = { vertical: 'middle' }
        fila.height = 18
        return fila
      }
      agregarFilaResumen('Período consultado:', periodo, true, false)
      agregarFilaResumen('Cantidad de Facturas:', resumen.cantidadFacturas, false, false)
      agregarFilaResumen('Total de Venta:', formatMoneda(resumen.totalVenta), false, true)

      ws.addRow([]) // fila vacía

      // ── Encabezados de columna ──
      const filaEncabezado = ws.addRow([
        'No. Factura', 'Referencia', 'Fecha Emisión', 'Cliente',
        'Tipo Documento', 'Subtotal', 'IVA', 'Total', 'Estado',
      ])
      aplicarEstiloEncabezado(filaEncabezado)
      filaEncabezado.height = 20

      // ── Datos ──
      todasFacturas.forEach((f) => {
        const fila = ws.addRow([
          f.preimpresoResAPI ?? '',
          f.referencia ?? '',
          f.FechaFactura ? formatFecha(f.FechaFactura) : '',
          f.idCliente?.nombreCliente ?? '',
          tiposDocumento[String(f.tipoDocumento)] ?? f.tipoDocumento ?? '',
          f.totalNeto ?? 0,
          f.iva ?? 0,
          f.total ?? 0,
          f.facturaProcesada ? 'Procesada' : 'Pendiente',
        ])
        fila.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = borderThin
          cell.alignment = { vertical: 'middle' }
        })
        ;[6, 7, 8].forEach((col) => {
          fila.getCell(col).numFmt = '"Q"#,##0.00'
        })
        fila.getCell(8).font = { bold: true, color: { argb: 'FF1E7E34' } }
        const celdaEstado = fila.getCell(9)
        celdaEstado.fill = f.facturaProcesada ? fillVerde : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } }
      })

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `facturas_${filtroAplicado.inicio}_${filtroAplicado.fin}.xlsx`
      a.click()
      URL.revokeObjectURL(url)

    } else {
      const totalDetalleFmt = detalles.reduce((s, d) => s + (d.ImpTotal ?? 0), 0)
      const ws = wb.addWorksheet('Detalle por Producto')
      ws.columns = [
        { width: 18 }, { width: 22 }, { width: 13 }, { width: 18 },
        { width: 18 }, { width: 42 }, { width: 11 }, { width: 11 }, { width: 13 },
      ]

      // ── Título del reporte ──
      const filaTituloP = ws.addRow(['Reporte: Detalle por Producto'])
      filaTituloP.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF000000' } }
      filaTituloP.getCell(1).fill = fillGris
      filaTituloP.getCell(1).alignment = { vertical: 'middle' }
      filaTituloP.height = 22

      // ── Resumen en 3 filas — fila vacía superior + solo bordes externos ──
      ws.addRow([])

      const thinP = { style: 'thin' }
      const agregarFilaResumenP = (etiqueta, valor, esPrimera, esUltima) => {
        const fila = ws.addRow([etiqueta, valor])
        fila.getCell(1).border = { top: esPrimera ? thinP : undefined, bottom: esUltima ? thinP : undefined, left: thinP }
        fila.getCell(2).border = { top: esPrimera ? thinP : undefined, bottom: esUltima ? thinP : undefined, right: thinP }
        fila.getCell(1).font = { bold: true }
        fila.getCell(1).fill = fillGris
        fila.getCell(2).fill = fillGris
        fila.getCell(1).alignment = { vertical: 'middle' }
        fila.getCell(2).alignment = { vertical: 'middle' }
        fila.height = 18
        return fila
      }
      agregarFilaResumenP('Período consultado:', periodo, true, false)
      agregarFilaResumenP('Cantidad de Productos:', totalDetalles, false, false)
      agregarFilaResumenP('Total de Venta:', formatMoneda(totalDetalleFmt), false, true)

      ws.addRow([])

      // ── Encabezados de columna ──
      const filaEncabezado = ws.addRow([
        'No. Factura', 'Referencia', 'Fecha', 'Cód. Producto',
        'Cód. Proveedor', 'Descripción', 'Cantidad', 'IVA', 'Total',
      ])
      aplicarEstiloEncabezado(filaEncabezado)
      filaEncabezado.height = 20

      // ── Datos ──
      detalles.forEach((d) => {
        const fila = ws.addRow([
          d._noFactura ?? '',
          d._referencia ?? '',
          d._fecha ? formatFecha(d._fecha) : '',
          d._producto?.codigoProducto ?? '',
          d._producto?.codigoProductoProveedor ?? '',
          d._producto?.descripcionProducto ?? '',
          d.cantidad ?? 0,
          d.iva ?? 0,
          d.ImpTotal ?? 0,
        ])
        fila.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = borderThin
          cell.alignment = { vertical: 'middle' }
        })
        ;[8, 9].forEach((col) => {
          fila.getCell(col).numFmt = '"Q"#,##0.00'
        })
        fila.getCell(9).font = { bold: true, color: { argb: 'FF1E7E34' } }
      })

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `productos_${filtroAplicado.inicio}_${filtroAplicado.fin}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const imprimirResumen = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const periodo =
      filtroAplicado.inicio && filtroAplicado.fin
        ? filtroAplicado.inicio === filtroAplicado.fin
          ? formatFecha(filtroAplicado.inicio)
          : `${formatFecha(filtroAplicado.inicio)} al ${formatFecha(filtroAplicado.fin)}`
        : 'Sin filtro'

    const esFactura = tipoDetalle === '1'
    const titulo = esFactura ? 'Reporte: Detalle por Factura' : 'Reporte: Detalle por Producto'
    const cantidad = esFactura ? resumen.cantidadFacturas : totalDetalles
    const labelCantidad = esFactura ? 'Cantidad de Facturas:' : 'Cantidad de Productos:'
    const totalVenta = esFactura
      ? formatMoneda(resumen.totalVenta)
      : formatMoneda(detalles.reduce((s, d) => s + (d.ImpTotal ?? 0), 0))

    const margenX = 20
    const colorFondo = [217, 225, 242]   // #D9E1F2
    const colorTexto = [0, 0, 0]
    const colorBorde = [180, 195, 220]
    const anchoBloque = 170
    const altoFila = 10

    // ── Título ──
    doc.setFillColor(...colorFondo)
    doc.rect(margenX, 20, anchoBloque, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...colorTexto)
    doc.text(titulo, margenX + 3, 27)

    // ── Recuadro resumen ──
    let y = 35
    const filas = [
      ['Período consultado:', periodo],
      [labelCantidad, String(cantidad)],
      ['Total de Venta:', totalVenta],
    ]

    // Fondo de todas las filas
    doc.setFillColor(...colorFondo)
    doc.rect(margenX, y, anchoBloque, altoFila * filas.length, 'F')

    // Borde exterior del bloque
    doc.setDrawColor(...colorBorde)
    doc.setLineWidth(0.4)
    doc.rect(margenX, y, anchoBloque, altoFila * filas.length)

    filas.forEach(([etiqueta, valor], i) => {
      const yFila = y + i * altoFila + 7
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(etiqueta, margenX + 3, yFila)
      doc.setFont('helvetica', 'normal')
      doc.text(valor, margenX + 60, yFila)
    })

    doc.save(`resumen_${filtroAplicado.inicio}_${filtroAplicado.fin}.pdf`)
  }

  const esCargando = tipoDetalle === '1' ? cargando : cargandoDetalle
  const detallesPagina = detalles.slice(paginaDetalle * PAGE_SIZE, (paginaDetalle + 1) * PAGE_SIZE)

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong className="fs-4">Consulta de Facturas</strong>
          </CCardHeader>
          <CCardBody className="p-4">

            {/* ── Barra de filtros ── */}
            <CRow className="mb-4 align-items-end g-3">
              <CCol md={3}>
                <CFormLabel htmlFor="tipoDetalle">Tipo de Consulta</CFormLabel>
                <CFormSelect
                  id="tipoDetalle"
                  value={tipoDetalle}
                  onChange={(e) => handleCambiarTipo(e.target.value)}
                >
                  <option value="">Seleccione una opción</option>
                  <option value="1">Detalle por Factura</option>
                  <option value="2">Detalle por Producto</option>
                </CFormSelect>
              </CCol>

              <CCol className="d-flex justify-content-end align-items-end gap-3 flex-wrap">
                <div>
                  <CFormLabel htmlFor="fechaInicio">Fecha Inicio</CFormLabel>
                  <CFormInput
                    type="date"
                    id="fechaInicio"
                    value={fechaInicio}
                    max={fechaFin || undefined}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div>
                  <CFormLabel htmlFor="fechaFin">Fecha Fin</CFormLabel>
                  <CFormInput
                    type="date"
                    id="fechaFin"
                    value={fechaFin}
                    min={fechaInicio || undefined}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <CButton color="primary" onClick={handleBuscar} disabled={esCargando}>
                    {esCargando ? <CSpinner size="sm" /> : 'Buscar'}
                  </CButton>
                  <CButton
                    style={{ backgroundColor: '#6c757d', borderColor: '#6c757d', color: '#fff' }}
                    onClick={handleLimpiar}
                    disabled={esCargando}
                  >
                    Limpiar
                  </CButton>
                  <CButton
                    style={{ backgroundColor: '#1e8449', borderColor: '#1e8449', color: '#fff' }}
                    onClick={exportarExcel}
                    disabled={esCargando || (tipoDetalle === '1' ? todasFacturas.length === 0 : detalles.length === 0)}
                  >
                    Exportar Excel
                  </CButton>
                  <CButton
                    style={{ backgroundColor: '#1a3a6b', borderColor: '#1a3a6b', color: '#fff' }}
                    onClick={imprimirResumen}
                    disabled={esCargando || (tipoDetalle === '1' ? resumen.cantidadFacturas === 0 : totalDetalles === 0)}
                  >
                    Imprimir Resumen
                  </CButton>
                </div>
              </CCol>
            </CRow>

            {/* ── Resumen del período (solo Detalle por Factura) ── */}
            {tipoDetalle === '1' && !error && (
              <CRow className="mb-4 g-3">
                <CCol md={4}>
                  <div className="border rounded p-3 text-center" style={{ borderColor: '#1a3a6b' }}>
                    <div className="text-muted small mb-1">Período consultado</div>
                    <div className="fs-3 fw-bold" style={{ color: '#1a8fd1' }}>
                      {filtroAplicado.inicio && filtroAplicado.fin
                        ? filtroAplicado.inicio === filtroAplicado.fin
                          ? formatFecha(filtroAplicado.inicio)
                          : `${formatFecha(filtroAplicado.inicio)} — ${formatFecha(filtroAplicado.fin)}`
                        : 'Sin filtro'}
                    </div>
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="border rounded p-3 text-center" style={{ borderColor: '#321fdb' }}>
                    <div className="text-muted small mb-1">Cantidad de Facturas</div>
                    <div className="fs-3 fw-bold text-primary">
                      {cargando ? <CSpinner size="sm" /> : resumen.cantidadFacturas}
                    </div>
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="border rounded p-3 text-center" style={{ borderColor: '#2eb85c' }}>
                    <div className="text-muted small mb-1">Total de Venta</div>
                    <div className="fs-3 fw-bold text-success">
                      {cargando ? <CSpinner size="sm" /> : formatMoneda(resumen.totalVenta)}
                    </div>
                  </div>
                </CCol>
              </CRow>
            )}

            {/* ── Spinner ── */}
            {esCargando && (
              <div className="text-center py-5">
                <CSpinner color="primary" />
                <div className="mt-2 text-muted small">Cargando información...</div>
              </div>
            )}

            {/* ── Error ── */}
            {!esCargando && (error || errorDetalle) && (
              <div className="alert alert-danger" role="alert">
                {error || errorDetalle}
              </div>
            )}

            {/* ── Tabla: Detalle por Factura ── */}
            {!esCargando && !error && tipoDetalle === '1' && (
              <>
                <CTable striped hover bordered responsive>
                  <CTableHead className="bg-light text-dark">
                    <CTableRow>
                      <CTableHeaderCell className="text-center">No. Factura</CTableHeaderCell>
                      <CTableHeaderCell>Referencia</CTableHeaderCell>
                      <CTableHeaderCell>Fecha Emisión</CTableHeaderCell>
                      <CTableHeaderCell>Cliente</CTableHeaderCell>
                      <CTableHeaderCell>Tipo Documento</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Subtotal</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">IVA</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Estado</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {facturas.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={9} className="text-center py-4 text-muted">
                          No hay facturas para mostrar.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      facturas.map((factura, index) => (
                        <CTableRow key={factura.preimpresoResAPI || index}>
                          <CTableDataCell className="text-center">{factura.preimpresoResAPI || '—'}</CTableDataCell>
                          <CTableDataCell>{factura.referencia || '—'}</CTableDataCell>
                          <CTableDataCell>{factura.FechaFactura || '—'}</CTableDataCell>
                          <CTableDataCell>{factura.idCliente?.nombreCliente || '—'}</CTableDataCell>
                          <CTableDataCell>{tiposDocumento[String(factura.tipoDocumento)] ?? factura.tipoDocumento ?? '—'}</CTableDataCell>
                          <CTableDataCell className="text-end">Q{(factura.totalNeto ?? 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-end">Q{(factura.iva ?? 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-end fw-bold text-success">Q{(factura.total ?? 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <span className={`badge bg-${factura.facturaProcesada ? 'success' : 'secondary'}`}>
                              {factura.facturaProcesada ? 'Procesada' : 'Pendiente'}
                            </span>
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
                <Paginador
                  paginaActual={paginaActual}
                  totalPaginas={totalPaginas}
                  totalElementos={totalElementos}
                  onCambiar={setPaginaActual}
                />
              </>
            )}

            {/* ── Tabla: Detalle por Producto ── */}
            {!esCargando && !errorDetalle && tipoDetalle === '2' && (
              <>
                <CRow className="mb-4 g-3">
                  <CCol md={4}>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#1a3a6b' }}>
                      <div className="text-muted small mb-1">Período consultado</div>
                      <div className="fs-3 fw-bold" style={{ color: '#1a8fd1' }}>
                        {filtroAplicado.inicio && filtroAplicado.fin
                          ? filtroAplicado.inicio === filtroAplicado.fin
                            ? formatFecha(filtroAplicado.inicio)
                            : `${formatFecha(filtroAplicado.inicio)} — ${formatFecha(filtroAplicado.fin)}`
                          : 'Sin filtro'}
                      </div>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#321fdb' }}>
                      <div className="text-muted small mb-1">Cantidad de Productos</div>
                      <div className="fs-3 fw-bold text-primary">{totalDetalles}</div>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#2eb85c' }}>
                      <div className="text-muted small mb-1">Total de Venta</div>
                      <div className="fs-3 fw-bold text-success">
                        {formatMoneda(detalles.reduce((sum, d) => sum + (d.ImpTotal ?? 0), 0))}
                      </div>
                    </div>
                  </CCol>
                </CRow>

                <CTable striped hover bordered responsive>
                  <CTableHead className="bg-light text-dark">
                    <CTableRow>
                      <CTableHeaderCell className="text-center">No. Factura</CTableHeaderCell>
                      <CTableHeaderCell>Referencia</CTableHeaderCell>
                      <CTableHeaderCell>Fecha</CTableHeaderCell>
                      <CTableHeaderCell>Cód. Producto</CTableHeaderCell>
                      <CTableHeaderCell>Cód. Proveedor</CTableHeaderCell>
                      <CTableHeaderCell>Descripción</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Cantidad</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">IVA</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {detallesPagina.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={9} className="text-center py-4 text-muted">
                          No hay detalles para mostrar.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      detallesPagina.map((det, index) => (
                        <CTableRow key={index}>
                          <CTableDataCell className="text-center">{det._noFactura || '—'}</CTableDataCell>
                          <CTableDataCell>{det._referencia || '—'}</CTableDataCell>
                          <CTableDataCell>{det._fecha ? formatFecha(det._fecha) : '—'}</CTableDataCell>
                          <CTableDataCell>{det._producto?.codigoProducto || '—'}</CTableDataCell>
                          <CTableDataCell>{det._producto?.codigoProductoProveedor || '—'}</CTableDataCell>
                          <CTableDataCell>{det._producto?.descripcionProducto || '—'}</CTableDataCell>
                          <CTableDataCell className="text-center">{det.cantidad ?? '—'}</CTableDataCell>
                          <CTableDataCell className="text-end">Q{(det.iva ?? 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-end fw-bold text-success">Q{(det.ImpTotal ?? 0).toFixed(2)}</CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
                <Paginador
                  paginaActual={paginaDetalle}
                  totalPaginas={totalPaginasDetalle}
                  totalElementos={totalDetalles}
                  onCambiar={setPaginaDetalle}
                />
              </>
            )}

          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ConsultaFacturas
