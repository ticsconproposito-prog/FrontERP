import React, { useState, useEffect, useRef } from 'react'
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
  const [fechaInicio, setFechaInicio] = useState(HOY)
  const [fechaFin, setFechaFin] = useState(HOY)
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [filtroAplicado, setFiltroAplicado] = useState({ inicio: HOY, fin: HOY, estado: '' })
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

  // Ref para cancelar peticiones en curso al cambiar filtros o desmontar el componente
  const abortReporteRef = useRef(null)

  // Helper: obtiene TODAS las facturas del período en lotes de 500 (evita respuestas HTTP/2 demasiado grandes)
  const fetchTodasFacturas = async (filtrosBase, signal) => {
    const LOTE = 500
    let acumulado = []
    let pagina = 0
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const params = new URLSearchParams({ page: pagina, size: LOTE, ...filtrosBase })
      const res = await fetch(`/api/erpEncabezadoFacturas?${params}`, { signal })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const data = await res.json()
      const content = Array.isArray(data) ? data : data.content ?? []
      acumulado = acumulado.concat(content)
      const totalPages = Array.isArray(data) ? 1 : (data.totalPages ?? 1)
      if (pagina >= totalPages - 1 || content.length < LOTE) break
      pagina++
    }
    return acumulado
      .filter((f) => String(f.facturaProcesada ?? '').toUpperCase() !== 'A')
      .sort((a, b) => b.idEncabezadoFactura - a.idEncabezadoFactura)
  }

  // Cargar Facturas
  useEffect(() => {
    if (abortReporteRef.current) abortReporteRef.current.abort()
    const controller = new AbortController()
    abortReporteRef.current = controller
    const { signal } = controller

    const cargarFacturas = async () => {
      setCargando(true)
      setError(null)
      try {
        const filtrosBase = {
          ...(filtroAplicado.inicio && { fechaInicio: filtroAplicado.inicio }),
          ...(filtroAplicado.fin && { fechaFin: filtroAplicado.fin }),
          tipoDocumento: '1',
        }

        let todas = await fetchTodasFacturas(filtrosBase, signal)

        // Filtro por estado (S=Procesadas, N=No Procesadas, ''=Todos S+N, nunca se muestran Anuladas)
        // Cualquier valor que no sea 'S' ni 'A' (incluido null, undefined o string vacío) cuenta como 'N'
        todas = todas.filter((f) => {
          const raw = String(f.facturaProcesada ?? '').toUpperCase()
          const ep = raw === 'S' || raw === 'A' ? raw : 'N'
          if (ep === 'A') return false                          // excluir anuladas siempre
          if (!filtroAplicado.estado) return true              // Todos: S y N
          return ep === filtroAplicado.estado.toUpperCase()    // filtro específico
        })

        setTodasFacturas(todas)
        setTotalElementos(todas.length)
        setTotalPaginas(Math.ceil(todas.length / PAGE_SIZE))
        setResumen({
          cantidadFacturas: todas.length,
          totalVenta: todas.reduce((sum, f) => sum + (f.total ?? 0), 0),
        })

        // Paginación en cliente
        setFacturas(todas.slice(paginaActual * PAGE_SIZE, (paginaActual + 1) * PAGE_SIZE))
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message)
      } finally {
        if (!signal.aborted) setCargando(false)
      }
    }
    cargarFacturas()
    return () => controller.abort()
  }, [filtroAplicado])

  // Re-paginar en cliente cuando cambia la página (sin re-fetch)
  useEffect(() => {
    setFacturas(todasFacturas.slice(paginaActual * PAGE_SIZE, (paginaActual + 1) * PAGE_SIZE))
  }, [paginaActual])

  const handleBuscar = () => {
    setPaginaActual(0)
    setFiltroAplicado({ inicio: fechaInicio, fin: fechaFin, estado: estadoFiltro })
  }

  const handleLimpiar = () => {
    setFechaInicio(HOY)
    setFechaFin(HOY)
    setEstadoFiltro('')
    setPaginaActual(0)
    setFiltroAplicado({ inicio: HOY, fin: HOY, estado: '' })
  }

  // Filtro inmediato al cambiar el estado (select)
  const handleEstadoChange = (valor) => {
    setEstadoFiltro(valor)
    setPaginaActual(0)
    setFiltroAplicado((prev) => ({
      ...prev,
      inicio: fechaInicio,
      fin: fechaFin,
      estado: valor,
    }))
  }

  const exportarExcel = async () => {
    const periodo =
      filtroAplicado.inicio && filtroAplicado.fin
        ? filtroAplicado.inicio === filtroAplicado.fin
          ? formatFecha(filtroAplicado.inicio)
          : `${formatFecha(filtroAplicado.inicio)} al ${formatFecha(filtroAplicado.fin)}`
        : 'Todos'

    const fillAzul  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A6B' } }
    const fillGris  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
    const fillVerde = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }
    const borderThin = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }

    const aplicarEstiloEncabezado = (fila) => {
      fila.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = fillAzul
        cell.border = borderThin
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })
      fila.height = 20
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Detalle por Factura')
    ws.columns = [
      { width: 6 }, { width: 18 }, { width: 22 }, { width: 14 }, { width: 32 },
      { width: 18 }, { width: 13 }, { width: 11 }, { width: 13 }, { width: 13 },
    ]

    // ── Título del reporte ──
    const filaTitulo = ws.addRow(['Reporte: Detalle por Factura'])
    filaTitulo.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    filaTitulo.getCell(1).fill = fillAzul
    filaTitulo.getCell(1).alignment = { vertical: 'middle' }
    filaTitulo.height = 22

    // ── Resumen en 3 filas — fila vacía superior + solo bordes externos ──
    ws.addRow([])

    const thin = { style: 'thin' }
    const filaResumen = ws.addRow([
      `Período consultado:  ${periodo}`,
      `Cantidad de Facturas:  ${resumen.cantidadFacturas}`,
      `Total de Venta:  ${formatMoneda(resumen.totalVenta)}`,
    ])
    ;[1, 2, 3].forEach((col) => {
      filaResumen.getCell(col).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      filaResumen.getCell(col).fill = fillAzul
      filaResumen.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' }
      filaResumen.getCell(col).border = { top: thin, bottom: thin, left: thin, right: thin }
    })
    filaResumen.height = 20

    ws.addRow([])

    // ── Encabezados de columna ──
    const filaEncabezado = ws.addRow([
      '#', 'No. Factura', 'Referencia', 'Fecha Emisión', 'Cliente',
      'Tipo Documento', 'Subtotal', 'IVA', 'Total', 'Estado',
    ])
    aplicarEstiloEncabezado(filaEncabezado)
    filaEncabezado.height = 20

    // ── Datos ──
    todasFacturas.forEach((f, idx) => {
      const fila = ws.addRow([
        idx + 1,
        f.preimpresoResAPI ?? '',
        f.referencia ?? '',
        f.FechaFactura ? formatFecha(f.FechaFactura) : '',
        f.idCliente?.nombreCliente ?? '',
        tiposDocumento[String(f.tipoDocumento)] ?? f.tipoDocumento ?? '',
        f.totalNeto ?? 0,
        f.iva ?? 0,
        f.total ?? 0,
        f.facturaProcesada === 'S' ? 'Procesada' : 'Pendiente',
      ])
      fila.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = borderThin
        cell.alignment = { vertical: 'middle' }
      })
      ;[7, 8, 9].forEach((col) => {
        fila.getCell(col).numFmt = '"Q"#,##0.00'
      })
      fila.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      fila.getCell(9).font = { bold: true, color: { argb: 'FF1E7E34' } }
      const celdaEstado = fila.getCell(10)
      celdaEstado.fill = f.facturaProcesada === 'S' ? fillVerde : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } }
    })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `facturas_${filtroAplicado.inicio}_${filtroAplicado.fin}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const imprimirResumen = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const periodo =
      filtroAplicado.inicio && filtroAplicado.fin
        ? filtroAplicado.inicio === filtroAplicado.fin
          ? formatFecha(filtroAplicado.inicio)
          : `${formatFecha(filtroAplicado.inicio)} al ${formatFecha(filtroAplicado.fin)}`
        : 'Sin filtro'

    const titulo = 'Reporte: Detalle por Factura'
    const cantidad = resumen.cantidadFacturas
    const labelCantidad = 'Cantidad de Facturas:'
    const totalVenta = formatMoneda(resumen.totalVenta)

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

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong className="fs-4">Reporte de Ventas</strong>
          </CCardHeader>
          <CCardBody className="p-4">
            {/* ── Fila: Filtros y acciones ── */}
            <CRow className="mb-4 align-items-end g-2">
              <CCol md={2}>
                <CFormLabel htmlFor="fechaInicio" className="fw-bold">Fecha Inicio</CFormLabel>
                <CFormInput
                  type="date"
                  id="fechaInicio"
                  value={fechaInicio}
                  max={fechaFin || undefined}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel htmlFor="fechaFin" className="fw-bold">Fecha Fin</CFormLabel>
                <CFormInput
                  type="date"
                  id="fechaFin"
                  value={fechaFin}
                  min={fechaInicio || undefined}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="estadoFactura" className="fw-bold">Estado</CFormLabel>
                <CFormSelect
                  id="estadoFactura"
                  value={estadoFiltro}
                  onChange={(e) => handleEstadoChange(e.target.value)}
                  disabled={cargando}
                >
                  <option value="">Todos</option>
                  <option value="S">Procesadas</option>
                  <option value="N">No Procesadas</option>
                </CFormSelect>
              </CCol>
              <CCol className="d-flex align-items-end justify-content-end gap-2 flex-wrap">
                <CButton color="primary" onClick={handleBuscar} disabled={cargando}>
                  {cargando ? <CSpinner size="sm" /> : 'Buscar'}
                </CButton>
                <CButton color="secondary" className="text-white" onClick={handleLimpiar} disabled={cargando}>
                  Limpiar
                </CButton>
                <CButton
                  style={{ backgroundColor: '#1e8449', borderColor: '#1e8449', color: '#fff' }}
                  onClick={exportarExcel}
                  disabled={cargando || todasFacturas.length === 0}
                >
                  Exportar Excel
                </CButton>
                <CButton
                  style={{ backgroundColor: '#1a3a6b', borderColor: '#1a3a6b', color: '#fff' }}
                  onClick={imprimirResumen}
                  disabled={cargando || resumen.cantidadFacturas === 0}
                >
                 Imprimir Resumen
                </CButton>
              </CCol>
            </CRow>

            {/* ── Resumen del período ── */}
            {!error && (
              <CRow className="mb-4 g-3">
                <CCol md={4}>
                  <div className="border rounded p-3 text-center" style={{ borderColor: '#1a3a6b' }}>
                    <div className="text-muted small mb-1">Período consultado</div>
                    <div className="fs-5 fw-bold" style={{ color: '#1a8fd1' }}>
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
                    <div className="fs-5 fw-bold text-primary">
                      {cargando ? <CSpinner size="sm" /> : resumen.cantidadFacturas}
                    </div>
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="border rounded p-3 text-center" style={{ borderColor: '#2eb85c' }}>
                    <div className="text-muted small mb-1">Total de Venta</div>
                    <div className="fs-5 fw-bold text-success">
                      {cargando ? <CSpinner size="sm" /> : formatMoneda(resumen.totalVenta)}
                    </div>
                  </div>
                </CCol>
              </CRow>
            )}

            {/* ── Spinner ── */}
            {cargando && (
              <div className="text-center py-5">
                <CSpinner color="primary" />
                <div className="mt-2 text-muted small">Cargando información...</div>
              </div>
            )}

            {/* ── Error ── */}
            {!cargando && error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {/* ── Tabla: Detalle por Factura ── */}
            {!cargando && !error && (
              <>
                <CTable striped hover bordered responsive>
                  <CTableHead style={{ '--cui-table-bg': '#1a3a6b', '--cui-table-color': '#fff', '--cui-table-border-color': '#2a4a8b', backgroundColor: '#1a3a6b', color: '#fff' }}>
                    <CTableRow>
                      <CTableHeaderCell className="text-center">#</CTableHeaderCell>
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
                        <CTableDataCell colSpan={10} className="text-center py-4 text-muted">
                          No hay facturas para mostrar.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      facturas.map((factura, index) => (
                        <CTableRow key={factura.preimpresoResAPI || index}>
                          <CTableDataCell className="text-center">{paginaActual * PAGE_SIZE + index + 1}</CTableDataCell>
                          <CTableDataCell className="text-center">{factura.preimpresoResAPI || '—'}</CTableDataCell>
                          <CTableDataCell>{factura.referencia || '—'}</CTableDataCell>
                          <CTableDataCell>{factura.FechaFactura || '—'}</CTableDataCell>
                          <CTableDataCell>{factura.idCliente?.nombreCliente || '—'}</CTableDataCell>
                          <CTableDataCell>{tiposDocumento[String(factura.tipoDocumento)] ?? factura.tipoDocumento ?? '—'}</CTableDataCell>
                          <CTableDataCell className="text-end">Q{(factura.totalNeto ?? 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-end">Q{(factura.iva ?? 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-end fw-bold text-success">Q{(factura.total ?? 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <span className={`badge bg-${factura.facturaProcesada === 'S' ? 'success' : 'secondary'}`}>
                              {factura.facturaProcesada === 'S' ? 'Procesada' : 'Pendiente'}
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

          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ConsultaFacturas
