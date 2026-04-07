import React, { useState, useEffect, useRef } from 'react'
import logoFerreteria from 'src/assets/images/logo-ferreteria-agmner.png'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

const PAGE_SIZE = 20

const _d = new Date()
const HOY = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
const MES_ACTUAL   = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}`
const _mesSig      = new Date(_d.getFullYear(), _d.getMonth() + 1, 1)
const MES_SIGUIENTE = `${_mesSig.getFullYear()}-${String(_mesSig.getMonth() + 1).padStart(2, '0')}`

const formatFecha = (fecha) => {
  if (!fecha) return ''
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

const formatMoneda = (valor) =>
  `Q${Number(valor || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatearFechaFactura = (fecha) => {
  if (!fecha) return '—'
  try {
    const [yyyy, mm, dd] = fecha.split('-')
    return `${dd}-${mm}-${yyyy}`
  } catch (_) {
    return fecha
  }
}

const numeroALetras = (num) => {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
    'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']
  const grupo = (n) => {
    if (n === 0) return ''
    if (n === 100) return 'CIEN'
    let s = ''
    if (n >= 100) { s += centenas[Math.floor(n / 100)] + ' '; n %= 100 }
    if (n >= 20) { s += decenas[Math.floor(n / 10)]; if (n % 10) s += ' Y ' + unidades[n % 10] }
    else if (n > 0) s += unidades[n]
    return s.trim()
  }
  const entero = Math.floor(num)
  const centavos = Math.round((num - entero) * 100)
  let resultado = ''
  if (entero >= 1000000) {
    const mill = Math.floor(entero / 1000000)
    resultado += (mill === 1 ? 'UN MILLÓN' : grupo(mill) + ' MILLONES') + ' '
  }
  const miles = Math.floor((entero % 1000000) / 1000)
  if (miles > 0) resultado += (miles === 1 ? 'MIL' : grupo(miles) + ' MIL') + ' '
  const resto = entero % 1000
  if (resto > 0) resultado += grupo(resto)
  return (resultado.trim() || 'CERO') + ' QUETZALES CON ' + String(centavos).padStart(2, '0') + '/100'
}

const Paginador = ({ paginaActual, totalPaginas, totalElementos, onCambiar }) => {
  if (totalPaginas <= 1) return null
  return (
    <CRow className="mt-3 align-items-center">
      <CCol xs="auto" className="text-muted small">
        Página {paginaActual + 1} de {totalPaginas} &mdash; {totalElementos} registros
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

const MntFacturacion = () => {
  const [fechaInicio, setFechaInicio] = useState(HOY)
  const [fechaFin, setFechaFin] = useState(HOY)
  const [preimpreso, setPreimpreso] = useState('')
  const [buscarCliente, setBuscarCliente] = useState('')
  const [filtroAplicado, setFiltroAplicado] = useState({ inicio: HOY, fin: HOY, preimpreso: '', cliente: '' })

  const [facturas, setFacturas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [paginaActual, setPaginaActual] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [totalElementos, setTotalElementos] = useState(0)

  const [tiposDocumento, setTiposDocumento] = useState({})
  const [tiposReceptor, setTiposReceptor] = useState({})
  const [reimprimiendo, setReimprimiendo] = useState(false)

  // ── Modal Ver ────────────────────────────────────────────────────────────
  const [modalVer, setModalVer] = useState(false)
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [detalleFactura, setDetalleFactura] = useState([])
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // ── Modal Procesar ───────────────────────────────────────────────────────
  const [modalProcesar, setModalProcesar] = useState(false)
  const [facturaProcesando, setFacturaProcesando] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [msgProcesar, setMsgProcesar] = useState({ visible: false, ok: true, texto: '' })

  // ── Modal Anular ─────────────────────────────────────────────────────────
  const [modalAnular, setModalAnular] = useState(false)
  const [facturaAnulando, setFacturaAnulando] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [anulando, setAnulando] = useState(false)
  const [msgAnular, setMsgAnular] = useState({ visible: false, ok: true, texto: '' })

  // ── Diccionarios ─────────────────────────────────────────────────────────
  useEffect(() => {
    const cargarDiccionarios = async () => {
      try {
        const [resDoc, resRec] = await Promise.all([
          fetch('/api/diccionarios?diccionario=TIPODOCUMENTO&estado=1'),
          fetch('/api/diccionarios?diccionario=TIPORECEPTOR&estado=1'),
        ])
        if (resDoc.ok) {
          const data = await resDoc.json()
          const lista = Array.isArray(data) ? data : data.content ?? []
          const mapa = {}
          lista.forEach((item) => { mapa[String(item.indice)] = item.valor })
          setTiposDocumento(mapa)
        }
        if (resRec.ok) {
          const data = await resRec.json()
          const lista = Array.isArray(data) ? data : data.content ?? []
          const mapa = {}
          lista.forEach((item) => { mapa[String(item.indice)] = item.valor })
          setTiposReceptor(mapa)
        }
      } catch { /* silencioso */ }
    }
    cargarDiccionarios()
  }, [])

  // ── Cargar facturas ──────────────────────────────────────────────────────
  const cargarFacturas = async (pagina = 0, filtro = filtroAplicado) => {
    setCargando(true)
    setError(null)
    try {
      let todasLasFacturas = []
      let numPagina = 0
      let totalPags = 0
      let totalElems = 0

      if (filtro.preimpreso || filtro.cliente) {
        // Búsqueda por texto: usar fechas en la API y filtrar client-side
        const params = new URLSearchParams({ page: 0, size: 1000 })
        if (filtro.inicio) params.append('fechaInicio', filtro.inicio)
        if (filtro.fin)    params.append('fechaFin', filtro.fin)
        const res = await fetch(`/api/erpEncabezadoFacturas?${params}`)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        let todas = Array.isArray(data) ? data : data.content ?? []

        if (filtro.preimpreso) {
          const term = filtro.preimpreso.toLowerCase()
          todas = todas.filter((f) => String(f.preimpresoResAPI ?? '').toLowerCase().includes(term))
        }
        if (filtro.cliente) {
          const term = filtro.cliente.toLowerCase()
          todas = todas.filter((f) =>
            String(f.idCliente?.nombreCliente ?? f.nombreResAPI ?? '').toLowerCase().includes(term)
          )
        }

        todasLasFacturas = todas.filter((f) => String(f.tipoDocumento) !== '4')
        numPagina  = 0
        totalElems = todasLasFacturas.length
        totalPags  = Math.max(1, Math.ceil(totalElems / PAGE_SIZE))
        const inicio = pagina * PAGE_SIZE
        todasLasFacturas = todasLasFacturas.slice(inicio, inicio + PAGE_SIZE)
      } else {
        const params = new URLSearchParams({ page: pagina, size: PAGE_SIZE })
        if (filtro.inicio) params.append('fechaInicio', filtro.inicio)
        if (filtro.fin)    params.append('fechaFin', filtro.fin)
        const res = await fetch(`/api/erpEncabezadoFacturas?${params}`)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        todasLasFacturas = (Array.isArray(data) ? data : data.content ?? []).filter((f) => String(f.tipoDocumento) !== '4')
        numPagina  = data.number ?? 0
        totalPags  = data.totalPages ?? 0
        totalElems = data.totalElements ?? todasLasFacturas.length
      }

      setFacturas(todasLasFacturas)
      setPaginaActual(numPagina)
      setTotalPaginas(totalPags)
      setTotalElementos(totalElems)
    } catch (e) {
      setError(e.message)
      setFacturas([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarFacturas(0, filtroAplicado) }, [filtroAplicado])

  const handleBuscar = () => {
    setPaginaActual(0)
    setFiltroAplicado({ inicio: fechaInicio, fin: fechaFin, preimpreso: preimpreso.trim(), cliente: buscarCliente.trim() })
  }

  const handleLimpiar = () => {
    setFechaInicio(HOY)
    setFechaFin(HOY)
    setPreimpreso('')
    setBuscarCliente('')
    setPaginaActual(0)
    setFiltroAplicado({ inicio: HOY, fin: HOY, preimpreso: '', cliente: '' })
  }

  // Filtro en tiempo real al escribir No. Factura (debounce 400ms)
  const debouncePreimpreso = useRef(null)
  const handlePreimpresoChange = (valor) => {
    setPreimpreso(valor)
    clearTimeout(debouncePreimpreso.current)
    debouncePreimpreso.current = setTimeout(() => {
      setPaginaActual(0)
      setFiltroAplicado((prev) => ({ ...prev, preimpreso: valor.trim() }))
    }, 300)
  }

  // Filtro en tiempo real al escribir el nombre del cliente (debounce 400ms)
  const debounceCliente = useRef(null)
  const handleClienteChange = (valor) => {
    setBuscarCliente(valor)
    clearTimeout(debounceCliente.current)
    debounceCliente.current = setTimeout(() => {
      setPaginaActual(0)
      setFiltroAplicado((prev) => ({ ...prev, cliente: valor.trim() }))
    }, 300)
  }

  // ── Ver detalle ──────────────────────────────────────────────────────────
  const handleVer = async (factura) => {
    setFacturaSeleccionada(factura)
    setDetalleFactura([])
    setModalVer(true)
    setCargandoDetalle(true)
    try {
      const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${factura.idEncabezadoFactura}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const lineas = Array.isArray(data) ? data : data.content ?? []

      // Enriquecer cada línea con datos del producto en paralelo
      const lineasEnriquecidas = await Promise.all(
        lineas.map(async (item) => {
          const idProd = item.idProducto
          let codigoProducto = '—'
          let codigoProductoProveedor = '—'
          let descripcionProducto = '—'
          if (idProd) {
            try {
              const rp = await fetch(`/api/productos?idProducto=${idProd}&page=0&size=1`)
              if (rp.ok) {
                const prod = await rp.json()
                const lista = Array.isArray(prod) ? prod : prod.content ?? []
                if (lista.length > 0) {
                  codigoProducto          = lista[0].codigoProducto          || '—'
                  codigoProductoProveedor = lista[0].codigoProductoProveedor || '—'
                  descripcionProducto     = lista[0].descripcionProducto     || '—'
                }
              }
            } catch (_) { /* silencioso */ }
          }
          return { ...item, codigoProducto, codigoProductoProveedor, descripcionProducto }
        })
      )
      setDetalleFactura(lineasEnriquecidas)
    } catch {
      setDetalleFactura([])
    } finally {
      setCargandoDetalle(false)
    }
  }

  // ── Reimprimir ───────────────────────────────────────────────────────────
  const handleReimprimir = async (factura) => {
    setReimprimiendo(true)
    try {
      // 1. Logo en base64
      let logoBase64 = ''
      try {
        const resp = await fetch(logoFerreteria)
        const blob = await resp.blob()
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
      } catch (_) { logoBase64 = '' }

      // 2. Encabezado: usar datos del listado directamente (no hay endpoint por ID)
      const enc = factura

      // 3. Datos del cliente — usar directamente desde el objeto factura
      const cliente = (typeof enc.idCliente === 'object' && enc.idCliente !== null)
        ? enc.idCliente
        : {}

      // 4. Detalle de líneas + descripción de producto con query param
      let detalle = []
      try {
        const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${enc.idEncabezadoFactura}`)
        if (res.ok) {
          const data = await res.json()
          const lineas = Array.isArray(data) ? data : data.content ?? []

          // idProducto llega como número plano; buscar descripción con query param
          const lineasConDesc = await Promise.all(
            lineas.map(async (item) => {
              const idProd = item.idProducto
              let descripcion = ''

              if (idProd) {
                try {
                  const rp = await fetch(`/api/productos?idProducto=${idProd}&page=0&size=1`)
                  if (rp.ok) {
                    const prod = await rp.json()
                    const lista = Array.isArray(prod) ? prod : prod.content ?? []
                    descripcion = lista[0]?.descripcionProducto || ''
                  }
                } catch (_) { /* silencioso */ }
              }

              return {
                cantidad:            Number(item.cantidad)            || 0,
                precioVenta:         Number(item.precioVenta)         || 0,
                cantidadDeDescuento: Number(item.cantidadDeDescuento) || 0,
                ImpTotal:            Number(item.ImpTotal)            || 0,
                descripcion,
              }
            })
          )
          detalle = lineasConDesc
        }
      } catch (_) { detalle = [] }

      // 5. Campos del encabezado
      const esFactura          = enc.facturaProcesada === 'S'
      const numeroAutorizacion = enc.numeroAutorizacionResAPI || ''
      const serieRes           = enc.serieResAPI || ''
      const preimpresoRes      = enc.preimpresoResAPI || ''
      const referenciaRes      = enc.referencia || ''
      const fechaFactura       = enc.FechaFactura || ''
      const nombreCliente    = enc.nombreResAPI || cliente.nombreCliente || cliente.nombreFacturacion || 'Consumidor Final'
      const direccionCliente = cliente.direccionFisica || '—'
      const direccionEntrega = enc.direccionEntrega || '—'

      // 6. Documento según tipoReceptor
      const tipoRec = String(enc.tipoReceptor ?? '1')
      let labelReceptor = 'NIT'
      let docReceptor   = cliente.nit || 'CF'
      if (tipoRec === '2') { labelReceptor = 'DPI';      docReceptor = cliente.documentoIdentificacion || '—' }
      if (tipoRec === '3') { labelReceptor = 'PASAPORTE'; docReceptor = cliente.documentoIdentificacion || '—' }

      const moneda       = 'Q'
      const hayDescuento = detalle.some((i) => i.cantidadDeDescuento !== 0)
      const totalCols    = 4 + (hayDescuento ? 1 : 0)  // cant + desc + precio [+ descuento] + total

      const filasProducto = detalle.map((item) => `
        <tr>
          <td style="text-align:center;">${item.cantidad}</td>
          <td>${item.descripcion || ''}</td>
          <td style="text-align:right;">${moneda}${item.precioVenta.toFixed(2)}</td>
          ${hayDescuento ? `<td style="text-align:right;">${moneda}${item.cantidadDeDescuento.toFixed(2)}</td>` : ''}
          <td style="text-align:right;">${moneda}${item.ImpTotal.toFixed(2)}</td>
        </tr>
      `).join('')

      const FILAS_MINIMAS = 25
      const filasVacias  = Math.max(0, FILAS_MINIMAS - detalle.length)
      const filasRelleno = Array.from({ length: filasVacias }, () =>
        `<tr>${Array(totalCols).fill('<td>&nbsp;</td>').join('')}</tr>`
      ).join('')

      const iva   = Number(enc.iva   || 0)
      const total = Number(enc.total || 0)

      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>${esFactura ? 'Factura' : 'Comprobante'} - ${referenciaRes || preimpresoRes || 'SinReferencia'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #222; }

            @page { size: A4; margin: 8mm 10mm; }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }

            .page { width: 100%; min-height: 277mm; padding: 6mm 8mm; }

            /* ── Encabezado ── */
            .header-empresa {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              border-bottom: 2px solid #555;
              padding-bottom: 10px;
              margin-bottom: 10px;
              width: 100%;
            }
            .logo { min-width: 140px; text-align: center; }
            .logo img { width: 140px; height: auto; display: block; margin: 0 auto; }
            .logo .telefonos { font-size: 12px; font-weight: bold; color: #222; margin-top: 6px; }
            .empresa-info { flex: 1; text-align: center; }
            .empresa-nombre { font-size: 15px; font-weight: bold; margin-bottom: 3px; }
            .empresa-linea { font-size: 11px; margin-bottom: 2px; }
            .factura-id { text-align: right; min-width: 185px; }
            .factura-id .factura-titulo { font-size: 17px; font-weight: bold; margin-bottom: 4px; }
            .factura-id .factura-linea { font-size: 11px; margin-bottom: 3px; color: #333; }

            /* ── Datos cliente ── */
            .cliente-box {
              border: 1px solid #555;
              border-radius: 3px;
              padding: 7px 10px;
              margin-bottom: 10px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px 24px;
              font-size: 11.5px;
            }
            .cliente-box .field label { font-weight: bold; color: #000; }

            /* ── Tabla detalle ── */
            .detalle-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-bottom: 10px;
              font-size: 11.5px;
              table-layout: fixed;
              border: 1px solid #555;
              border-radius: 6px;
              overflow: hidden;
            }

            .detalle-table th {
              background: #fff;
              color: #000;
              padding: 6px 8px;
              font-weight: bold;
              text-align: left;
              border-top: none;
              border-bottom: 1px solid #000;
              border-left: none;
              border-right: none;
            }

            .detalle-table td {
              padding: 5px 8px;
              border: none;
              vertical-align: top;
              height: 22px;
            }

            .detalle-table th + th,
            .detalle-table td + td {
              border-left: 1px solid #000;
            }

            .detalle-table tr:first-child th:first-child { border-top-left-radius: 6px; }
            .detalle-table tr:first-child th:last-child  { border-top-right-radius: 6px; }
            .detalle-table tr:last-child td:first-child  { border-bottom-left-radius: 6px; }
            .detalle-table tr:last-child td:last-child   { border-bottom-right-radius: 6px; }

            .detalle-table col.col-cant   { width: 60px; }
            .detalle-table col.col-desc   { width: auto; }
            .detalle-table col.col-precio { width: 110px; }
            .detalle-table col.col-total  { width: 110px; }

            .detalle-table th:nth-child(1),
            .detalle-table td:nth-child(1) { text-align: center; }

            .detalle-table th:nth-child(3),
            .detalle-table td:nth-child(3),
            .detalle-table th:nth-child(4),
            .detalle-table td:nth-child(4) { text-align: right; }

            /* ── Pie ── */
            .footer {
              text-align: center;
              font-size: 10px;
              color: #777;
              border-top: 1px solid #ccc;
              padding-top: 7px;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="page">

            <!-- Encabezado empresa -->
            <div class="header-empresa">
              <div class="logo">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
                <div class="telefonos">📞 7888-9138 / 5203-0726</div>
              </div>
              <div class="empresa-info">
                <div style="font-size:13px;font-weight:bold;margin-bottom:3px;letter-spacing:0.5px;">
                  ${esFactura ? 'DOCUMENTO TRIBUTARIO ELECTRÓNICO' : 'COMPROBANTE DE PAGO'}
                </div>
                <div class="empresa-nombre">Blockera Agmner</div>
                <div class="empresa-linea">JUAN ALBERTO, ARREDONDO GARCIA</div>
                <div class="empresa-linea">CALLE PRINCIPAL SECTOR PALIN NUEVA SANTA ROSA</div>
                <div class="empresa-linea">SANTA ROSA</div>
                <div class="empresa-linea">NIT: 16949447</div>
              </div>
              <div class="factura-id">
                ${esFactura ? `
                  <div class="factura-titulo">FACTURA</div>
                  <div class="factura-linea"><strong>NÚMERO DE AUTORIZACIÓN</strong></div>
                  <div class="factura-linea" style="font-size:10px;line-height:1.4;">${numeroAutorizacion ? numeroAutorizacion.slice(0, 26) : '—'}</div>
                  ${numeroAutorizacion && numeroAutorizacion.length > 26 ? `<div class="factura-linea" style="font-size:10px;line-height:1.4;">${numeroAutorizacion.slice(26)}</div>` : ''}
                  <div class="factura-linea"><strong>Serie:</strong> ${serieRes || '—'}</div>
                  <div class="factura-linea"><strong>Número:</strong> ${preimpresoRes || '—'}</div>
                  <div class="factura-linea" style="margin-top:5px;"><strong>Fecha de Emisión:</strong> ${formatearFechaFactura(fechaFactura)}</div>
                ` : `
                  <div class="factura-linea"><strong>Referencia:</strong> ${referenciaRes || '—'}</div>
                  <div class="factura-linea" style="margin-top:5px;"><strong>Fecha de Emisión:</strong> ${formatearFechaFactura(fechaFactura)}</div>
                `}
              </div>
            </div>

            <!-- Datos del cliente -->
            <div class="cliente-box">
              <div class="field"><label>Nombre: </label>${nombreCliente}</div>
              <div class="field"><label>${labelReceptor}: </label>${docReceptor}</div>
              <div class="field"><label>Dirección: </label>${direccionCliente}</div>
              <div class="field"><label>Dirección de entrega: </label>${direccionEntrega}</div>
            </div>

            <!-- Tabla de detalle -->
            <table class="detalle-table">
              <colgroup>
                <col class="col-cant" />
                <col class="col-desc" />
                <col class="col-precio" />
                ${hayDescuento ? '<col class="col-precio" />' : ''}
                <col class="col-total" />
              </colgroup>
              <thead>
                <tr>
                  <th>Cantidad</th>
                  <th>Descripción</th>
                  <th>Precio Unitario</th>
                  ${hayDescuento ? '<th>Descuento</th>' : ''}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${filasProducto}
                ${filasRelleno}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" rowspan="2" style="font-size:10px;color:#000;vertical-align:middle;padding:6px 8px;border-top:1px solid #000;">
                    <strong>TOTAL EN QUETZALES:</strong> ${numeroALetras(total)}
                  </td>
                  <td colspan="${hayDescuento ? 2 : 1}" style="text-align:left;padding:5px 8px;border-left:1px solid #000;border-top:1px solid #000;">IVA:</td>
                  <td style="text-align:right;padding:5px 8px;border-top:1px solid #000;">${moneda}${iva.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="${hayDescuento ? 2 : 1}" style="text-align:left;padding:5px 8px;font-weight:bold;font-size:13px;border-left:1px solid #000;border-top:1px solid #000;">TOTAL:</td>
                  <td style="text-align:right;padding:5px 8px;font-weight:bold;font-size:13px;border-top:1px solid #000;">${moneda}${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            ${esFactura ? `
              <div style="margin-top:10px;padding:6px 10px;border:1px solid #000;border-radius:4px;font-size:10px;text-align:center;">
                <div><strong>Sujeto a pagos trimestrales ISR</strong></div>
                <div><strong>Agente de Retención de IVA</strong></div>
              </div>
              <div style="margin-top:10px;padding:6px 10px;border:1px solid #000;border-radius:4px;font-size:10px;text-align:center;">
                <div style="font-weight:bold;margin-bottom:4px;">DATOS DEL CERTIFICADOR</div>
                <div style="text-align:center;">
                  <span><strong>NIT del contribuyente:</strong> 5640773-4</span>
                  &nbsp;&nbsp;
                  <span><strong>Nombre, razón o denominación social:</strong> AINNOVA, SOCIEDAD ANÓNIMA</span>
                </div>
              </div>
            ` : ''}

            <div class="footer">Gracias por su compra — Ferretería y Blockera Agmner</div>
            <div style="font-weight:bold;margin-bottom:6px;text-align:center;font-size:14px;">No se aceptan cambios, Ni devoluciones.</div>
          </div>
        </body>
        </html>
      `

      // Imprimir usando iframe oculto para evitar mostrar about:blank
      const iframeId = 'print-frame-factura'
      let iframe = document.getElementById(iframeId)
      if (iframe) iframe.remove()

      iframe = document.createElement('iframe')
      iframe.id = iframeId
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
      document.body.appendChild(iframe)

      iframe.contentDocument.open()
      iframe.contentDocument.write(html)
      iframe.contentDocument.close()

      const nombrePDF = `${esFactura ? 'Factura' : 'Comprobante'} - ${referenciaRes || preimpresoRes || 'SinReferencia'}`
      iframe.onload = () => {
        const tituloOriginal = document.title
        document.title = nombrePDF
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => {
          document.title = tituloOriginal
          iframe.remove()
        }, 1000)
      }
    } finally {
      setReimprimiendo(false)
    }
  }

  // ── Procesar ─────────────────────────────────────────────────────────────
  const handleProcesar = (factura) => {
    setFacturaProcesando(factura)
    setMsgProcesar({ visible: false, ok: true, texto: '' })
    setModalProcesar(true)
  }

  const confirmarProcesar = async () => {
    if (!facturaProcesando) return
    setProcesando(true)
    try {
      const enc = facturaProcesando
      const cliente = (typeof enc.idCliente === 'object' && enc.idCliente !== null) ? enc.idCliente : {}

      // Fecha actual en formato dd/mm/yyyy
      const hoy = new Date()
      const fechaDte = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`

      // Obtener detalle de factura
      const resDetalle = await fetch(`/api/detalleFactura?idEncabezadoFactura=${enc.idEncabezadoFactura}`)
      const lineas = resDetalle.ok ? await resDetalle.json() : []

      // Enriquecer con descripción y código de producto en paralelo
      const itemsDte = await Promise.all(
        lineas.map(async (item) => {
          let descripcion = ''
          let codigoProducto = String(item.idProducto || '')
          if (item.idProducto) {
            try {
              const rp = await fetch(`/api/productos?idProducto=${item.idProducto}&page=0&size=1`)
              if (rp.ok) {
                const prod = await rp.json()
                const lista = Array.isArray(prod) ? prod : prod.content ?? []
                descripcion    = lista[0]?.descripcionProducto || ''
                codigoProducto = lista[0]?.codigoProducto || codigoProducto
              }
            } catch (_) { /* silencioso */ }
          }
          return {
            producto:     codigoProducto,
            descripcion,
            medida:       Number(item.idUnidadDeMedida) || 1,
            cantidad:     Number(item.cantidad) || 0,
            precio:       Number(item.precioVenta) || 0,
            porcDesc:     0.00,
            impBruto:     parseFloat((Number(item.ImpBruto)  || 0).toFixed(2)),
            impDescuento: parseFloat((Number(item.cantidadDeDescuento) || 0).toFixed(2)),
            impExento:    parseFloat((Number(item.ImpExento) || 0).toFixed(2)),
            impOtros:     parseFloat((Number(item.ImpOtros) || 0).toFixed(2)),
            impNeto:      parseFloat((Number(item.ImpNeto)  || 0).toFixed(2)),
            impIsr:       parseFloat((Number(item.isr)      || 0).toFixed(2)),
            impIva:       parseFloat((Number(item.iva)      || 0).toFixed(2)),
            impTotal:     parseFloat((Number(item.ImpTotal) || 0).toFixed(2)),
            TipoVentaDet: 'B',
          }
        })
      )

      // Calcular referencia igual que en facturacion.js
      const tipoDocRef  = String(enc.tipoDocumento || enc.idTipoDocumento || '1')
      const prefijoRef  = tipoDocRef === '1' ? 'FACT' : tipoDocRef === '2' ? 'NCRE' : tipoDocRef === '3' ? 'NDEB' : tipoDocRef === '4' ? 'CONS' : ''
      const idFactura   = String(enc.idEncabezadoFactura || '').trim()
      const referenciaCalculada = prefijoRef ? `${prefijoRef}${idFactura}` : idFactura

      // Documento receptor según tipoReceptor
      const tipoRec = String(enc.tipoReceptor ?? '1')
      let nitReceptor = cliente.nit || 'CF'
      if (tipoRec === '2' || tipoRec === '3') nitReceptor = cliente.documentoIdentificacion || 'CF'

      const bodyDte = {
        tipoDoc:      Number(enc.idTipoDocumento || enc.tipoDocumento || 1),
        tipoVenta:    'B',
        destinoVenta: 1,
        fecha:        fechaDte,
        moneda:       Number(enc.idMoneda || 1),
        tasa:         parseFloat(Number(enc.tasaDeCambio || 1).toFixed(2)),
        referencia:   referenciaCalculada,
        items:        itemsDte,
        receptor: {
          nitReceptor,
          nombre:    enc.nombreResAPI || cliente.nombreCliente || cliente.nombreFacturacion || 'Consumidor Final',
          direccion: cliente.direccionFisica || 'Ciudad',
        },
        totales: {
          bruto:     parseFloat((Number(enc.totalBruto)           || 0).toFixed(2)),
          descuento: parseFloat((Number(enc.cantidadDeDescuento)  || 0).toFixed(2)),
          exento:    parseFloat((Number(enc.totalExento)  || 0).toFixed(2)),
          otros:     parseFloat((Number(enc.totalOtros)   || 0).toFixed(2)),
          neto:      parseFloat((Number(enc.totalNeto)    || 0).toFixed(2)),
          isr:       parseFloat((Number(enc.totalIsr)     || 0).toFixed(2)),
          iva:       parseFloat((Number(enc.iva)                  || 0).toFixed(2)),
          total:     parseFloat((Number(enc.total)                || 0).toFixed(2)),
        },
        datosAdicionales: {
          tipoReceptor: tipoRec,
          email:        cliente.correoElectronico || '',
          enviar:       'N',
        },
      }

      console.log('[DTE] Enviando a /api/fel/dtes:', JSON.stringify(bodyDte, null, 2))
      const resDte = await fetch('/api/fel/dtes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyDte),
      })
      const rawDte = await resDte.text()
      let responseDte = null
      try { responseDte = JSON.parse(rawDte) } catch (_) { responseDte = rawDte }
      console.log('[DTE] Respuesta:', responseDte)

      const fel = responseDte?.fel ?? responseDte
      if (fel?.ok === false) {
        setMsgProcesar({ visible: true, ok: false, texto: fel.error || 'Error desconocido al emitir el DTE' })
      } else {
        setMsgProcesar({ visible: true, ok: true, texto: `DTE enviado correctamente. Referencia: ${fel?.referencia || '—'}` })
        await cargarFacturas(paginaActual, filtroAplicado)
      }
    } catch (e) {
      setMsgProcesar({ visible: true, ok: false, texto: `Error al enviar DTE: ${e.message}` })
    } finally {
      setProcesando(false)
    }
  }

  // ── Anular ───────────────────────────────────────────────────────────────
  const handleAnular = (factura) => {
    setFacturaAnulando(factura)
    setMotivoAnulacion('')
    setMsgAnular({ visible: false, ok: true, texto: '' })
    setModalAnular(true)
  }

  const confirmarAnular = async () => {
    if (!facturaAnulando) return
    if (!motivoAnulacion.trim()) {
      setMsgAnular({ visible: true, ok: false, texto: 'Debe ingresar el motivo de anulación.' })
      return
    }
    setAnulando(true)
    try {
      const enc = facturaAnulando
      const cliente = (typeof enc.idCliente === 'object' && enc.idCliente !== null) ? enc.idCliente : {}
      const tipoRec = String(enc.tipoReceptor ?? '1')

      // Fecha de hoy en formato YYYYmmdd
      const hoy = new Date()
      const fechaAnulacion = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`

      let nitComprador = 'CF'
      if (tipoRec === '1') nitComprador = cliente.nit                      || 'CF'
      if (tipoRec === '2') nitComprador = cliente.documentoIdentificacion  || ''
      if (tipoRec === '3') nitComprador = cliente.documentoIdentificacion  || ''

      const paramObj = {
        idEncabezadoFactura: enc.idEncabezadoFactura || '',
        serie:               enc.serieResAPI          || '',
        preimpreso:          enc.preimpresoResAPI      || '',
        nitComprador,
        fechaAnulacion,
        motivo:              motivoAnulacion.trim(),
      }

      const params = new URLSearchParams(paramObj)
      console.log('[Anular Factura] POST /api/fel/anularFactura?' + params.toString())
      const res = await fetch(`/api/fel/anularFactura?${params}`, {
        method: 'POST',
      })
      const raw = await res.text()
      let data = null
      try { data = JSON.parse(raw) } catch (_) { data = raw }

      if (!res.ok) {
        const msg = data?.message || data?.error || `Error ${res.status}`
        setMsgAnular({ visible: true, ok: false, texto: msg })
      } else {
        setMsgAnular({ visible: true, ok: true, texto: `Factura ${enc.preimpresoResAPI || enc.idEncabezadoFactura} anulada correctamente.` })
        await cargarFacturas(paginaActual, filtroAplicado)
      }
    } catch (e) {
      setMsgAnular({ visible: true, ok: false, texto: `Error al anular: ${e.message}` })
    } finally {
      setAnulando(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong className="fs-4">Detalle de Facturas</strong>
            </CCardHeader>
            <CCardBody>

              {/* Filtros */}
              <CRow className="mb-3 align-items-end g-2 flex-nowrap">
                <CCol>
                  <CFormLabel className="fw-semibold mb-1">No. Factura</CFormLabel>
                  <CFormInput
                    type="text"
                    placeholder="No. factura"
                    value={preimpreso}
                    onChange={(e) => handlePreimpresoChange(e.target.value)}
                  />
                </CCol>
                <CCol>
                  <CFormLabel className="fw-semibold mb-1">Cliente</CFormLabel>
                  <CFormInput
                    type="text"
                    placeholder="Nombre de cliente"
                    value={buscarCliente}
                    onChange={(e) => handleClienteChange(e.target.value)}
                  />
                </CCol>
                <CCol>
                  <CFormLabel className="fw-semibold mb-1">Fecha Inicio</CFormLabel>
                  <CFormInput type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </CCol>
                <CCol>
                  <CFormLabel className="fw-semibold mb-1">Fecha Fin</CFormLabel>
                  <CFormInput type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </CCol>
                <CCol xs="auto" className="d-flex gap-2">
                  <CButton color="primary" onClick={handleBuscar}>Buscar</CButton>
                  <CButton color="secondary" className="text-white" onClick={handleLimpiar}>Limpiar</CButton>
                </CCol>
              </CRow>

              {/* Tabla */}
              {cargando ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <p className="mt-2 text-muted">Cargando facturas...</p>
                </div>
              ) : error ? (
                <div className="alert alert-danger">Error al cargar facturas: {error}</div>
              ) : facturas.length === 0 ? (
                <div className="alert alert-info">No se encontraron facturas para el período seleccionado.</div>
              ) : (
                <>
                  <small className="text-muted d-block mb-2">
                    Mostrando {paginaActual * PAGE_SIZE + 1}–{Math.min((paginaActual + 1) * PAGE_SIZE, totalElementos)} de {totalElementos} registros
                  </small>
                  <CTable striped hover bordered responsive>
                    <CTableHead style={{ '--cui-table-bg': '#1a3a6b', '--cui-table-color': '#fff', '--cui-table-border-color': '#2a4a8b', backgroundColor: '#1a3a6b', color: '#fff' }}>
                      <CTableRow>
                        <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                        <CTableHeaderCell>No. Factura</CTableHeaderCell>
                        <CTableHeaderCell>Referencia</CTableHeaderCell>
                        <CTableHeaderCell>Fecha Emisión</CTableHeaderCell>
                        <CTableHeaderCell>Cliente</CTableHeaderCell>
                        <CTableHeaderCell>Tipo Documento</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Subtotal</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">IVA</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Estado</CTableHeaderCell>
                        <CTableHeaderCell>Acciones</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {facturas.map((f, idx) => (
                        <CTableRow key={f.idEncabezadoFactura ?? idx}>
                          <CTableDataCell className="text-center">{paginaActual * PAGE_SIZE + idx + 1}</CTableDataCell>
                          <CTableDataCell>{f.preimpresoResAPI || '—'}</CTableDataCell>
                          <CTableDataCell>{(f.referencia && f.referencia !== '0') ? f.referencia : (() => { const t = String(f.tipoDocumento || ''); const p = t === '1' ? 'FACT' : t === '2' ? 'NCRE' : t === '3' ? 'NDEB' : t === '4' ? 'CONS' : ''; return p ? `${p}${f.idEncabezadoFactura}` : '—'; })()}</CTableDataCell>
                          <CTableDataCell>{formatFecha(f.FechaFactura)}</CTableDataCell>
                          <CTableDataCell>{f.idCliente?.nombreCliente || '—'}</CTableDataCell>
                          <CTableDataCell>
                            {tiposDocumento[String(f.tipoDocumento)] ?? f.tipoDocumento ?? '—'}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">{formatMoneda(f.totalNeto)}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatMoneda(f.iva)}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatMoneda(f.total)}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <span
                              className="badge"
                              style={{
                                backgroundColor: f.facturaProcesada === 'S' ? '#198754' : f.facturaProcesada === 'A' ? '#dc3545' : '#6c757d',
                                color: '#fff',
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                borderRadius: 6,
                              }}
                            >
                              {f.facturaProcesada || 'N'}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell className="text-nowrap">
                            <CButton
                              color="info"
                              size="sm"
                              className="text-white me-1"
                              title="Ver detalle"
                              onClick={() => handleVer(f)}
                            >
                              Ver
                            </CButton>
                            {f.facturaProcesada !== 'A' && (
                              <CButton
                                color="secondary"
                                size="sm"
                                className="text-white me-1"
                                title={f.facturaProcesada === 'N' || !f.facturaProcesada ? 'Solo se puede reimprimir cuando la factura está procesada (S)' : 'Reimprimir factura'}
                                onClick={() => handleReimprimir(f)}
                                disabled={reimprimiendo || f.facturaProcesada === 'N' || !f.facturaProcesada}
                              >
                                {reimprimiendo ? <CSpinner size="sm" /> : 'Reimprimir'}
                              </CButton>
                            )}
                            {f.facturaProcesada === 'S' &&
                              (f.FechaFactura?.slice(0, 7) === MES_ACTUAL || f.FechaFactura?.slice(0, 7) === MES_SIGUIENTE) && (
                              <CButton
                                color="danger"
                                size="sm"
                                className="text-white me-1"
                                title="Anular factura"
                                onClick={() => handleAnular(f)}
                              >
                                Anular
                              </CButton>
                            )}
                            {f.facturaProcesada !== 'S' && f.facturaProcesada !== 'A' && (
                              <CButton
                                color="success"
                                size="sm"
                                className="text-white"
                                title="Procesar factura"
                                onClick={() => handleProcesar(f)}
                              >
                                Procesar
                              </CButton>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                  <Paginador
                    paginaActual={paginaActual}
                    totalPaginas={totalPaginas}
                    totalElementos={totalElementos}
                    onCambiar={(p) => { setPaginaActual(p); cargarFacturas(p, filtroAplicado) }}
                  />
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ── Modal Ver detalle ─────────────────────────────────────────────── */}
      <CModal size="lg" visible={modalVer} onClose={() => setModalVer(false)}>
        <CModalHeader>
          <CModalTitle>
            Detalle — Factura {facturaSeleccionada?.preimpresoResAPI || ''}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {facturaSeleccionada && (
            <>
              <CRow className="mb-3">
                <CCol md={6}>
                  <div><strong>No. Factura:</strong> {facturaSeleccionada.preimpresoResAPI || '—'}</div>
                  <div><strong>Referencia:</strong> {(facturaSeleccionada.referencia && facturaSeleccionada.referencia !== '0') ? facturaSeleccionada.referencia : (() => { const t = String(facturaSeleccionada.tipoDocumento || ''); const p = t === '1' ? 'FACT' : t === '2' ? 'NCRE' : t === '3' ? 'NDEB' : t === '4' ? 'CONS' : ''; return p ? `${p}${facturaSeleccionada.idEncabezadoFactura}` : '—'; })()}</div>
                  <div><strong>Fecha Emisión:</strong> {formatFecha(facturaSeleccionada.FechaFactura)}</div>
                </CCol>
                <CCol md={6}>
                  <div><strong>Cliente:</strong> {facturaSeleccionada.idCliente?.nombreCliente || '—'}</div>
                  <div><strong>Tipo Documento:</strong> {tiposDocumento[String(facturaSeleccionada.tipoDocumento)] ?? facturaSeleccionada.tipoDocumento ?? '—'}</div>
                  <div>
                    <strong>Estado:</strong>{' '}
                    <span
                      className="badge"
                      style={{
                        backgroundColor: facturaSeleccionada.facturaProcesada === 'S' ? '#198754' : facturaSeleccionada.facturaProcesada === 'A' ? '#dc3545' : '#6c757d',
                        color: '#fff',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {facturaSeleccionada.facturaProcesada === 'S' ? 'Procesada' : facturaSeleccionada.facturaProcesada === 'A' ? 'Anulada' : 'No Procesada'}
                    </span>
                  </div>
                </CCol>
              </CRow>

              <hr />

              {cargandoDetalle ? (
                <div className="text-center py-3"><CSpinner color="primary" size="sm" /> Cargando detalle...</div>
              ) : detalleFactura.length === 0 ? (
                <div className="alert alert-info py-2">Sin líneas de detalle.</div>
              ) : (
                <CTable striped bordered responsive size="sm">
                  <CTableHead style={{ '--cui-table-bg': '#1a3a6b', '--cui-table-color': '#fff', '--cui-table-border-color': '#2a4a8b', backgroundColor: '#1a3a6b', color: '#fff' }}>
                    <CTableRow>
                      <CTableHeaderCell className="text-center">Cantidad</CTableHeaderCell>
                      <CTableHeaderCell>Descripción</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Precio</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Descuento</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {detalleFactura.map((d, i) => (
                      <CTableRow key={d.idDetalleFactura ?? i}>
                        <CTableDataCell className="text-center">{d.cantidad}</CTableDataCell>
                        <CTableDataCell>{d.descripcionProducto || '—'}</CTableDataCell>
                        <CTableDataCell className="text-end">{formatMoneda(d.precioVenta)}</CTableDataCell>
                        <CTableDataCell className="text-end">{formatMoneda(d.cantidadDeDescuento)}</CTableDataCell>
                        <CTableDataCell className="text-end">{formatMoneda(d.ImpTotal)}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}

              <div className="text-end mt-3">
                <div><strong>Subtotal:</strong> {formatMoneda(facturaSeleccionada.totalNeto)}</div>
                <div><strong>IVA:</strong> {formatMoneda(facturaSeleccionada.iva)}</div>
                <div className="fs-5 fw-bold"><strong>Total:</strong> {formatMoneda(facturaSeleccionada.total)}</div>
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModalVer(false)}>Cerrar</CButton>
        </CModalFooter>
      </CModal>

      {/* ── Modal Anular ──────────────────────────────────────────────────── */}
      <CModal visible={modalAnular} onClose={() => { if (!anulando) setModalAnular(false) }}>
        <CModalHeader>
          <CModalTitle>Anular Factura</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {msgAnular.visible && msgAnular.ok ? (
            <div className="alert alert-success mb-0">{msgAnular.texto}</div>
          ) : (
            <>
              <p className="mb-3">
                ¿Está seguro que desea <strong>anular</strong> la factura{' '}
                <strong>{facturaAnulando?.preimpresoResAPI || facturaAnulando?.idEncabezadoFactura}</strong>?
                <br />
                <span className="text-danger small">Esta acción no se puede deshacer.</span>
              </p>
              <CFormLabel className="fw-semibold">Motivo de anulación <span className="text-danger">*</span></CFormLabel>
              <CFormTextarea
                rows={3}
                placeholder="Ingrese el motivo de anulación..."
                value={motivoAnulacion}
                onChange={(e) => {
                  setMotivoAnulacion(e.target.value)
                  if (msgAnular.visible) setMsgAnular({ visible: false, ok: true, texto: '' })
                }}
                disabled={anulando}
              />
              {msgAnular.visible && !msgAnular.ok && (
                <div className="alert alert-danger mt-2 mb-0 py-2">{msgAnular.texto}</div>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          {msgAnular.visible && msgAnular.ok ? (
            <CButton color="primary" onClick={() => setModalAnular(false)}>Aceptar</CButton>
          ) : (
            <>
              <CButton color="secondary" onClick={() => setModalAnular(false)} disabled={anulando}>
                Cancelar
              </CButton>
              <CButton color="danger" className="text-white" onClick={confirmarAnular} disabled={anulando}>
                {anulando ? <><CSpinner size="sm" className="me-1" />Anulando...</> : 'Confirmar Anulación'}
              </CButton>
            </>
          )}
        </CModalFooter>
      </CModal>

      {/* ── Modal Procesar ────────────────────────────────────────────────── */}
      <CModal visible={modalProcesar} onClose={() => { if (!procesando) setModalProcesar(false) }}>
        <CModalHeader>
          <CModalTitle>Procesar Factura</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {msgProcesar.visible ? (
            <div className={`alert ${msgProcesar.ok ? 'alert-success' : 'alert-danger'} mb-0`}>
              {msgProcesar.texto}
            </div>
          ) : (
            <p className="mb-0">
              ¿Confirma que desea enviar el DTE de la factura <strong>{facturaProcesando?.referencia}</strong>?
            </p>
          )}
        </CModalBody>
        <CModalFooter>
          {!msgProcesar.visible ? (
            <>
              <CButton color="secondary" onClick={() => setModalProcesar(false)} disabled={procesando}>
                Cancelar
              </CButton>
              <CButton color="success" className="text-white" onClick={confirmarProcesar} disabled={procesando}>
                {procesando ? <><CSpinner size="sm" className="me-1" />Procesando...</> : 'Confirmar'}
              </CButton>
            </>
          ) : (
            <CButton color="primary" tabIndex={-1} onClick={() => setModalProcesar(false)}>Aceptar</CButton>
          )}
        </CModalFooter>
      </CModal>
    </>
  )
}

export default MntFacturacion
