import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { mapConLimite, fetchConCache } from '../../../utils/fetchHelpers'
import logoFerreteria from 'src/assets/images/logo-ferreteria-agmner.png'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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

const PAGE_SIZE = 20
const _d = new Date()
const HOY = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`

const formatFecha = (f) => {
  if (!f) return '—'
  if (f.includes('T')) f = f.split('T')[0]
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}

const formatearFechaFactura = (fecha) => {
  if (!fecha) return '—'
  try {
    const [yyyy, mm, dd] = fecha.split('-')
    return `${dd}-${mm}-${yyyy}`
  } catch (_) {
    return fecha
  }
}

const formatMoneda = (n) => `Q${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`

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

const calcularReferencia = (f) => {
  if (f.referencia && f.referencia !== '0') return f.referencia
  const t = String(f.tipoDocumento || '')
  const p = t === '1' ? 'FACT' : t === '2' ? 'NCRE' : t === '3' ? 'NDEB' : t === '4' ? 'CONS' : ''
  return p ? `${p}${f.idEncabezadoFactura}` : '—'
}

const Paginador = ({ paginaActual, totalPaginas, totalElementos, onCambiar }) => {
  if (totalPaginas <= 1) return null
  return (
    <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
      <small className="text-muted">
        Página {paginaActual + 1} de {totalPaginas} — {totalElementos} registros
      </small>
      <div className="d-flex gap-1">
        <CButton size="sm" color="secondary" disabled={paginaActual === 0} onClick={() => onCambiar(0)}>«</CButton>
        <CButton size="sm" color="secondary" disabled={paginaActual === 0} onClick={() => onCambiar(paginaActual - 1)}>‹</CButton>
        <CButton size="sm" color="secondary" disabled={paginaActual >= totalPaginas - 1} onClick={() => onCambiar(paginaActual + 1)}>›</CButton>
        <CButton size="sm" color="secondary" disabled={paginaActual >= totalPaginas - 1} onClick={() => onCambiar(totalPaginas - 1)}>»</CButton>
      </div>
    </div>
  )
}

const headerStyle = {
  '--cui-table-bg': '#1a3a6b',
  '--cui-table-color': '#fff',
  '--cui-table-border-color': '#2a4a8b',
  backgroundColor: '#1a3a6b',
  color: '#fff',
}

const ReporteConsignaciones = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)

  const [fechaInicio, setFechaInicio] = useState(HOY)
  const [fechaFin, setFechaFin] = useState(HOY)
  const [buscarCliente, setBuscarCliente] = useState('')
  const [filtroAplicado, setFiltroAplicado] = useState({ inicio: '', fin: '', cliente: '' })
  const debounceCliente = useRef(null)

  const [consignaciones, setConsignaciones] = useState([])
  const [todasConsignaciones, setTodasConsignaciones] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [paginaActual, setPaginaActual] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [totalElementos, setTotalElementos] = useState(0)
  const [resumen, setResumen] = useState({ cantidad: 0, total: 0 })

  const [tiposDocumento, setTiposDocumento] = useState({})
  const [reimprimiendo, setReimprimiendo] = useState(false)

  // ── Modal Ver ──────────────────────────────────────────────────────────────
  const [modalVer, setModalVer] = useState(false)
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [detalleFactura, setDetalleFactura] = useState([])
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState(null)

  // ── Modal Abonar ───────────────────────────────────────────────────────────
  const [modalAbonar, setModalAbonar] = useState(false)
  const [consignacionAbonar, setConsignacionAbonar] = useState(null)
  const [detalleAbonar, setDetalleAbonar] = useState([])
  const [cargandoAbonar, setCargandoAbonar] = useState(false)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [confirmandoAbono, setConfirmandoAbono] = useState(false)
  const [msgAbono, setMsgAbono] = useState({ visible: false, ok: false, texto: '' })

  // ── Diccionarios ───────────────────────────────────────────────────────────
  useEffect(() => {
    const cargarDiccionarios = async () => {
      try {
        const res = await fetch('/api/diccionarios?diccionario=TIPODOCUMENTO&estado=1')
        if (res.ok) {
          const data = await res.json()
          const lista = Array.isArray(data) ? data : data.content ?? []
          const mapa = {}
          lista.forEach((item) => { mapa[String(item.indice)] = item.valor })
          setTiposDocumento(mapa)
        }
      } catch { /* silencioso */ }
    }
    cargarDiccionarios()
  }, [])

  // ── Cargar consignaciones ──────────────────────────────────────────────────
  // Siempre se traen todos los registros del rango de fechas y se filtra
  // client-side por tipoDocumento=4, luego se pagina localmente.
  const abortConsignacionesRef = useRef(null)
  const cargarConsignaciones = useCallback(async (pagina, filtros) => {
    // Cancelar petición previa si todavía estaba en curso
    if (abortConsignacionesRef.current) {
      abortConsignacionesRef.current.abort()
    }
    const controller = new AbortController()
    abortConsignacionesRef.current = controller
    const { signal } = controller

    setCargando(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: 0, size: 10000 })
      if (filtros.inicio) params.append('fechaInicio', filtros.inicio)
      if (filtros.fin) params.append('fechaFin', filtros.fin)

      const res = await fetch(`/api/erpEncabezadoFacturas?${params}`, { signal })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()

      const todasFiltradas = (Array.isArray(data) ? data : data.content ?? [])
        .filter((f) => String(f.tipoDocumento) === '4')
        .filter((f) => {
          if (!filtros.cliente) return true
          const term = filtros.cliente.toLowerCase()
          return String(f.idCliente?.nombreCliente ?? f.nombreResAPI ?? '').toLowerCase().includes(term)
        })

      setTodasConsignaciones(todasFiltradas)

      // Calcular total pendiente: suma de ImpTotal del detalle donde consignacionFacturada=0
      // Limitamos a 6 peticiones simultáneas para no saturar el navegador
      const totalesPendientes = await mapConLimite(todasFiltradas, 6, async (enc) => {
        if (signal.aborted) return 0
        try {
          const rd = await fetch(`/api/detalleFactura?idEncabezadoFactura=${enc.idEncabezadoFactura}`, { signal })
          if (!rd.ok) return 0
          const dd = await rd.json()
          const lineas = Array.isArray(dd) ? dd : dd.content ?? []
          return lineas
            .filter((d) => String(d.consignacionFacturada) !== '1')
            .reduce((s, d) => s + (Number(d.ImpTotal) || 0), 0)
        } catch (_) {
          return 0
        }
      })
      if (signal.aborted) return
      const totalPendiente = totalesPendientes.reduce((s, t) => s + (t || 0), 0)

      setResumen({
        cantidad: todasFiltradas.length,
        total: totalPendiente,
      })

      const totalElems = todasFiltradas.length
      const totalPags  = Math.max(1, Math.ceil(totalElems / PAGE_SIZE))
      const inicio     = pagina * PAGE_SIZE
      const paginadas  = todasFiltradas.slice(inicio, inicio + PAGE_SIZE)

      setConsignaciones(paginadas)
      setPaginaActual(pagina)
      setTotalPaginas(totalPags)
      setTotalElementos(totalElems)
    } catch (e) {
      // Si la petición fue cancelada (cambio de filtros o desmontaje) no es un error real
      if (e.name === 'AbortError') return
      setError(e.message)
      setConsignaciones([])
      setTodasConsignaciones([])
    } finally {
      if (!controller.signal.aborted) {
        setCargando(false)
      }
    }
  }, [])

  useEffect(() => {
    cargarConsignaciones(0, filtroAplicado)
    // Cancelar peticiones pendientes al desmontar para evitar memory leaks
    return () => {
      if (abortConsignacionesRef.current) {
        abortConsignacionesRef.current.abort()
      }
    }
  }, [cargarConsignaciones])

  const handleBuscar = () => {
    const filtros = { inicio: fechaInicio, fin: fechaFin, cliente: buscarCliente.trim() }
    setFiltroAplicado(filtros)
    setPaginaActual(0)
    cargarConsignaciones(0, filtros)
  }

  const handleLimpiar = () => {
    setFechaInicio(HOY)
    setFechaFin(HOY)
    setBuscarCliente('')
    const filtros = { inicio: '', fin: '', cliente: '' }
    setFiltroAplicado(filtros)
    setPaginaActual(0)
    cargarConsignaciones(0, filtros)
  }

  // Filtro en tiempo real por nombre de cliente (debounce 400ms)
  const handleClienteChange = (valor) => {
    setBuscarCliente(valor)
    clearTimeout(debounceCliente.current)
    debounceCliente.current = setTimeout(() => {
      setPaginaActual(0)
      setFiltroAplicado((prev) => ({ ...prev, cliente: valor.trim() }))
    }, 400)
  }

  // ── Ver detalle ────────────────────────────────────────────────────────────
  const handleVer = async (factura) => {
    setFacturaSeleccionada(factura)
    setDetalleFactura([])
    setErrorDetalle(null)
    setModalVer(true)
    setCargandoDetalle(true)
    try {
      const idEnc = factura.idEncabezadoFactura

      const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${idEnc}`)
      if (!res.ok) throw new Error(`Error ${res.status} al cargar detalle`)
      const data = await res.json()
      const lineas = Array.isArray(data) ? data : data.content ?? []

      // Cachear cada producto por idProducto durante 60s para evitar volver a pedirlo
      // Limitar a 6 fetch simultáneos
      const lineasEnriquecidas = await mapConLimite(lineas, 6, async (item) => {
        const idProd = item.idProducto
        let descripcionProducto = `Producto ${idProd || '?'}`
        if (idProd) {
          try {
            const lista = await fetchConCache(`producto:${idProd}`, async () => {
              const rp = await fetch(`/api/productos?idProducto=${idProd}&page=0&size=1`)
              if (!rp.ok) return []
              const prod = await rp.json()
              return Array.isArray(prod) ? prod : prod.content ?? []
            })
            if (lista.length > 0) descripcionProducto = lista[0].descripcionProducto || descripcionProducto
          } catch (_) { /* silencioso */ }
        }
        return {
          idDetalleFactura:      item.idDetalleFactura,
          idProducto:            item.idProducto,
          cantidad:              Number(item.cantidad)            || 0,
          precioVenta:           Number(item.precioVenta         ?? item.PrecioVenta)         || 0,
          cantidadDeDescuento:   Number(item.cantidadDeDescuento ?? item.CantidadDeDescuento) || 0,
          ImpTotal:              Number(item.ImpTotal            ?? item.impTotal)             || 0,
          consignacionFacturada: item.consignacionFacturada,
          descripcionProducto,
        }
      })
      setDetalleFactura(lineasEnriquecidas)
    } catch (e) {
      console.error('[Ver] Error:', e)
      setErrorDetalle(e.message)
      setDetalleFactura([])
    } finally {
      setCargandoDetalle(false)
    }
  }

  // ── Abonar ────────────────────────────────────────────────────────────────
  const handleAbonar = async (factura) => {
    setConsignacionAbonar(factura)
    setDetalleAbonar([])
    setSeleccionados(new Set())
    setMsgAbono({ visible: false, ok: false, texto: '' })
    setModalAbonar(true)
    setCargandoAbonar(true)
    try {
      const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${factura.idEncabezadoFactura}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const lineas = Array.isArray(data) ? data : data.content ?? []

      const enriquecidas = await mapConLimite(lineas, 6, async (item) => {
        let descripcionProducto = `Producto ${item.idProducto || '?'}`
        let codigoProducto = String(item.idProducto || '')
        if (item.idProducto) {
          try {
            const lista = await fetchConCache(`producto:${item.idProducto}`, async () => {
              const rp = await fetch(`/api/productos?idProducto=${item.idProducto}&page=0&size=1`)
              if (!rp.ok) return []
              const prod = await rp.json()
              return Array.isArray(prod) ? prod : prod.content ?? []
            })
            if (lista.length > 0) {
              descripcionProducto = lista[0].descripcionProducto || descripcionProducto
              codigoProducto      = lista[0].codigoProducto      || codigoProducto
            }
          } catch (_) { /* silencioso */ }
        }
        return {
          ...item,
          idDetalleFactura:      item.idDetalleFactura,
          idProducto:            item.idProducto,
          codigoProducto,
          cantidad:              Number(item.cantidad)            || 0,
          precioVenta:           Number(item.precioVenta         ?? item.PrecioVenta)         || 0,
          cantidadDeDescuento:   Number(item.cantidadDeDescuento ?? item.CantidadDeDescuento) || 0,
          ImpTotal:              Number(item.ImpTotal            ?? item.impTotal)             || 0,
          consignacionFacturada: item.consignacionFacturada,
          descripcionProducto,
        }
      })
      setDetalleAbonar(enriquecidas)
    } catch (e) {
      console.error('[Abonar] Error:', e)
      setDetalleAbonar([])
    } finally {
      setCargandoAbonar(false)
    }
  }

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    const pendientes = detalleAbonar
      .filter((d) => String(d.consignacionFacturada) !== '1')
      .map((d) => d.idDetalleFactura)
    const todosMarcados = pendientes.every((id) => seleccionados.has(id))
    setSeleccionados(todosMarcados ? new Set() : new Set(pendientes))
  }

  // ── Reimprimir ─────────────────────────────────────────────────────────────
  const handleReimprimir = async (factura) => {
    setReimprimiendo(true)
    try {
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

      const enc = factura
      const cliente = (typeof enc.idCliente === 'object' && enc.idCliente !== null) ? enc.idCliente : {}

      let detalle = []
      try {
        const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${enc.idEncabezadoFactura}`)
        if (res.ok) {
          const data = await res.json()
          const lineas = Array.isArray(data) ? data : data.content ?? []
          const lineasConDesc = await mapConLimite(lineas, 6, async (item) => {
            const idProd = item.idProducto
            let descripcion = ''
            if (idProd) {
              try {
                const lista = await fetchConCache(`producto:${idProd}`, async () => {
                  const rp = await fetch(`/api/productos?idProducto=${idProd}&page=0&size=1`)
                  if (!rp.ok) return []
                  const prod = await rp.json()
                  return Array.isArray(prod) ? prod : prod.content ?? []
                })
                descripcion = lista[0]?.descripcionProducto || ''
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
          detalle = lineasConDesc
        }
      } catch (_) { detalle = [] }

      const referenciaRes    = calcularReferencia(enc)
      const preimpresoRes    = enc.preimpresoResAPI || ''
      const fechaFactura     = enc.FechaFactura || enc.fechaFactura || enc.fecha || ''
      const nombreCliente    = enc.nombreResAPI || cliente.nombreCliente || 'Consumidor Final'
      const direccionCliente = cliente.direccionFisica || '—'
      const direccionEntrega = enc.direccionEntrega || '—'
      const moneda           = 'Q'
      const hayDescuento     = detalle.some((i) => i.cantidadDeDescuento !== 0)
      const totalCols        = 4 + (hayDescuento ? 1 : 0)
      const iva              = Number(enc.iva   || 0)
      const total            = Number(enc.total || 0)

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
      const filasVacias   = Math.max(0, FILAS_MINIMAS - detalle.length)
      const filasRelleno  = Array.from({ length: filasVacias }, () =>
        `<tr>${Array(totalCols).fill('<td>&nbsp;</td>').join('')}</tr>`
      ).join('')

      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Consignación - ${referenciaRes || preimpresoRes || 'SinReferencia'}</title>
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
            <div class="header-empresa">
              <div class="logo">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
                <div class="telefonos">📞 7888-9138 / 5203-0726</div>
              </div>
              <div class="empresa-info">
                <div style="font-size:13px;font-weight:bold;margin-bottom:3px;">CONSIGNACIÓN</div>
                <div class="empresa-nombre">Blockera Agmner</div>
                <div class="empresa-linea">JUAN ALBERTO, ARREDONDO GARCIA</div>
                <div class="empresa-linea">CALLE PRINCIPAL SECTOR PALIN NUEVA SANTA ROSA</div>
                <div class="empresa-linea">SANTA ROSA</div>
                <div class="empresa-linea">NIT: 16949447</div>
              </div>
              <div class="factura-id">
                <div class="factura-titulo">CONSIGNACIÓN</div>
                <div class="factura-linea"><strong>Referencia:</strong> ${referenciaRes || '—'}</div>
                <div class="factura-linea" style="margin-top:5px;"><strong>Fecha de Emisión:</strong> ${formatearFechaFactura(fechaFactura)}</div>
              </div>
            </div>
            <div class="cliente-box">
              <div class="field"><label>Nombre: </label>${nombreCliente}</div>
              <div class="field"><label>NIT: </label>${cliente.nit || 'CF'}</div>
              <div class="field"><label>Dirección: </label>${direccionCliente}</div>
              <div class="field"><label>Dirección de entrega: </label>${direccionEntrega}</div>
            </div>
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
            <div class="footer">Gracias por su compra — Ferretería y Blockera Agmner</div>
            <div style="font-weight:bold;margin-bottom:6px;text-align:center;font-size:14px;">No se aceptan cambios, Ni devoluciones.</div>
            <div style="font-weight:bold;text-align:center;font-size:13px;">**Productos pendientes de Pago**</div>
            <div style="margin-top:30px;text-align:center;">
              <div style="font-size:13px;">f._____________________</div>
              <div style="font-size:12px;margin-top:4px;">${nombreCliente}</div>
            </div>
          </div>
        </body>
        </html>
      `

      const iframeId = 'print-frame-cons'
      let iframe = document.getElementById(iframeId)
      if (iframe) iframe.remove()
      iframe = document.createElement('iframe')
      iframe.id = iframeId
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
      document.body.appendChild(iframe)
      iframe.contentDocument.open()
      iframe.contentDocument.write(html)
      iframe.contentDocument.close()

      const nombrePDF = `Consignación - ${referenciaRes || preimpresoRes || 'SinReferencia'}`
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

  // ── Imprimir factura de abono (PDF) ────────────────────────────────────────
  const imprimirFacturaAbono = async (itemsSeleccionados, responseDte, totalNeto, totalIva, totalFinal) => {
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

    const enc = consignacionAbonar
    const cliente = (typeof enc.idCliente === 'object' && enc.idCliente !== null) ? enc.idCliente : {}
    const fel = responseDte?.fel ?? responseDte ?? {}
    const numeroAutorizacion = fel.numeroAutorizacion || '—'
    const serieRes           = fel.serie || '—'
    const preimpresoRes      = String(fel.Preimpreso || fel.preimpreso || '—')
    const referenciaAbono    = fel.referencia || `FACT${enc.idEncabezadoFactura}`

    const hoy = new Date()
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

    const tipoRec = String(enc.tipoReceptor ?? '1')
    let labelReceptor = 'NIT'
    let docReceptor   = cliente.nit || 'CF'
    if (tipoRec === '2') { labelReceptor = 'DPI';       docReceptor = cliente.documentoIdentificacion || '—' }
    if (tipoRec === '3') { labelReceptor = 'PASAPORTE'; docReceptor = cliente.documentoIdentificacion || '—' }

    const nombreCliente    = enc.nombreResAPI || cliente.nombreCliente || 'Consumidor Final'
    const direccionCliente = cliente.direccionFisica || '—'
    const moneda           = 'Q'
    const hayDescuento     = itemsSeleccionados.some((i) => (i.cantidadDeDescuento || 0) !== 0)
    const totalCols        = 4 + (hayDescuento ? 1 : 0)

    const filasProducto = itemsSeleccionados.map((item) => {
      const cant      = Number(item.cantidad) || 0
      const precio    = Number(item.precioVenta) || 0
      const descuento = Number(item.cantidadDeDescuento) || 0
      const totalFila = parseFloat((cant * precio - descuento).toFixed(2))
      return `
      <tr>
        <td style="text-align:center;">${cant}</td>
        <td>${item.descripcionProducto || ''}</td>
        <td style="text-align:right;">${moneda}${precio.toFixed(2)}</td>
        ${hayDescuento ? `<td style="text-align:right;">${moneda}${descuento.toFixed(2)}</td>` : ''}
        <td style="text-align:right;">${moneda}${totalFila.toFixed(2)}</td>
      </tr>
    `}).join('')

    const FILAS_MINIMAS = 20
    const filasVacias  = Math.max(0, FILAS_MINIMAS - itemsSeleccionados.length)
    const filasRelleno = Array.from({ length: filasVacias }, () =>
      `<tr>${Array(totalCols).fill('<td>&nbsp;</td>').join('')}</tr>`
    ).join('')

    const numAutoStr = String(numeroAutorizacion)
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Factura Abono - ${referenciaAbono}</title>
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
          <div class="header-empresa">
            <div class="logo">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
              <div class="telefonos">📞 7888-9138 / 5203-0726</div>
            </div>
            <div class="empresa-info">
              <div style="font-size:13px;font-weight:bold;margin-bottom:3px;letter-spacing:0.5px;">DOCUMENTO TRIBUTARIO ELECTRÓNICO</div>
              <div class="empresa-nombre">Blockera Agmner</div>
              <div class="empresa-linea">JUAN ALBERTO, ARREDONDO GARCIA</div>
              <div class="empresa-linea">CALLE PRINCIPAL SECTOR PALIN NUEVA SANTA ROSA</div>
              <div class="empresa-linea">SANTA ROSA</div>
              <div class="empresa-linea">NIT: 16949447</div>
            </div>
            <div class="factura-id">
              <div class="factura-titulo">FACTURA</div>
              <div class="factura-linea"><strong>NÚMERO DE AUTORIZACIÓN</strong></div>
              <div class="factura-linea" style="font-size:10px;line-height:1.4;">${numAutoStr.slice(0, 26) || '—'}</div>
              ${numAutoStr.length > 26 ? `<div class="factura-linea" style="font-size:10px;line-height:1.4;">${numAutoStr.slice(26)}</div>` : ''}
              <div class="factura-linea"><strong>Serie:</strong> ${serieRes}</div>
              <div class="factura-linea"><strong>Número:</strong> ${preimpresoRes}</div>
              <div class="factura-linea" style="margin-top:5px;"><strong>Fecha de Emisión:</strong> ${formatearFechaFactura(fechaHoy)}</div>
            </div>
          </div>
          <div class="cliente-box">
            <div class="field"><label>Nombre: </label>${nombreCliente}</div>
            <div class="field"><label>${labelReceptor}: </label>${docReceptor}</div>
            <div class="field"><label>Dirección: </label>${direccionCliente}</div>
            <div class="field"><label>Dirección de entrega: </label>${enc.direccionEntrega || '—'}</div>
          </div>
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
                  <strong>TOTAL EN QUETZALES:</strong> ${numeroALetras(totalFinal)}
                </td>
                <td colspan="${hayDescuento ? 2 : 1}" style="text-align:left;padding:5px 8px;border-left:1px solid #000;border-top:1px solid #000;">IVA:</td>
                <td style="text-align:right;padding:5px 8px;border-top:1px solid #000;">${moneda}${totalIva.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="${hayDescuento ? 2 : 1}" style="text-align:left;padding:5px 8px;font-weight:bold;font-size:13px;border-left:1px solid #000;border-top:1px solid #000;">TOTAL:</td>
                <td style="text-align:right;padding:5px 8px;font-weight:bold;font-size:13px;border-top:1px solid #000;">${moneda}${totalFinal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:10px;padding:6px 10px;border:1px solid #000;border-radius:4px;font-size:10px;text-align:center;">
            <div><strong>Sujeto a pagos trimestrales ISR</strong></div>
            <div><strong>Agente de Retención de IVA</strong></div>
          </div>
          <div style="margin-top:10px;padding:6px 10px;border:1px solid #000;border-radius:4px;font-size:10px;text-align:center;">
            <div style="font-weight:bold;margin-bottom:4px;">DATOS DEL CERTIFICADOR</div>
            <div>
              <span><strong>NIT del contribuyente:</strong> 5640773-4</span>
              &nbsp;&nbsp;
              <span><strong>Nombre, razón o denominación social:</strong> AINNOVA, SOCIEDAD ANÓNIMA</span>
            </div>
          </div>
          <div class="footer">Gracias por su compra — Ferretería y Blockera Agmner</div>
          <div style="font-weight:bold;margin-bottom:6px;text-align:center;font-size:14px;">No se aceptan cambios, Ni devoluciones.</div>
        </div>
      </body>
      </html>
    `

    const iframeId = 'print-frame-abono'
    let iframe = document.getElementById(iframeId)
    if (iframe) iframe.remove()
    iframe = document.createElement('iframe')
    iframe.id = iframeId
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
    document.body.appendChild(iframe)
    iframe.contentDocument.open()
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()

    const nombrePDF = `Factura Abono - ${referenciaAbono}`
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
  }

  // ── Confirmar Abono (envía DTE y genera factura PDF) ───────────────────────
  const confirmarAbono = async () => {
    const itemsSeleccionados = detalleAbonar.filter((d) => seleccionados.has(d.idDetalleFactura))
    if (itemsSeleccionados.length === 0) return

    const enc     = consignacionAbonar
    const cliente = (typeof enc.idCliente === 'object' && enc.idCliente !== null) ? enc.idCliente : {}

    setConfirmandoAbono(true)
    setMsgAbono({ visible: false, ok: false, texto: '' })

    try {
      const hoy      = new Date()
      const fechaDte = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`

      // Construir items DTE a partir de los productos seleccionados
      const r2 = (n) => parseFloat(n.toFixed(2))
      const itemsDte = itemsSeleccionados.map((item) => {
        const impBruto     = r2(item.cantidad * item.precioVenta)
        const impDescuento = r2(item.cantidadDeDescuento || 0)
        const totalConDesc = r2(impBruto - impDescuento)
        const impNeto      = r2(totalConDesc / 1.12)
        const impIva       = r2(totalConDesc - impNeto)
        const impTotal     = totalConDesc
        return {
          producto:     item.codigoProducto || String(item.idProducto || ''),
          descripcion:  item.descripcionProducto || '',
          medida:       Number(item.idUnidadDeMedida) || 1,
          cantidad:     item.cantidad,
          precio:       item.precioVenta,
          porcDesc:     0.00,
          impBruto,
          impDescuento,
          impExento:    0,
          impOtros:     0,
          impNeto,
          impIsr:       0,
          impIva,
          impTotal,
          TipoVentaDet: 'B',
        }
      })

      // Calcular totales de los ítems seleccionados
      const totalBruto     = r2(itemsDte.reduce((s, i) => s + i.impBruto, 0))
      const totalDescuento = r2(itemsDte.reduce((s, i) => s + i.impDescuento, 0))
      const totalNeto      = r2(itemsDte.reduce((s, i) => s + i.impNeto, 0))
      const totalIva       = r2(itemsDte.reduce((s, i) => s + i.impIva, 0))
      const totalFinal     = r2(itemsDte.reduce((s, i) => s + i.impTotal, 0))

      // Receptor según tipoReceptor
      const tipoRec = String(enc.tipoReceptor ?? '1')
      let nitReceptor = cliente.nit || 'CF'
      if (tipoRec === '2' || tipoRec === '3') nitReceptor = cliente.documentoIdentificacion || 'CF'

      const bodyDte = {
        tipoDoc:      1,
        tipoVenta:    'B',
        destinoVenta: 1,
        fecha:        fechaDte,
        moneda:       Number(enc.idMoneda || 1),
        tasa:         parseFloat(Number(enc.tasaDeCambio || 1).toFixed(2)),
        referencia:   `FACT${enc.idEncabezadoFactura}`,
        items:        itemsDte,
        receptor: {
          nitReceptor,
          nombre:    enc.nombreResAPI || cliente.nombreCliente || cliente.nombreFacturacion || 'Consumidor Final',
          direccion: cliente.direccionFisica || 'Ciudad',
        },
        totales: {
          bruto:     totalBruto,
          descuento: totalDescuento,
          exento:    0,
          otros:     0,
          neto:      totalNeto,
          isr:       0,
          iva:       totalIva,
          total:     totalFinal,
        },
        datosAdicionales: {
          tipoReceptor: tipoRec,
          email:        cliente.correoElectronico || '',
          enviar:       'N',
        },
      }

      // ── 1. Crear encabezado de la nueva factura ──────────────────────────────
      const fechaHoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
      const idClienteEnc = enc.idCliente?.idCliente ?? enc.idCliente ?? null

      const bodyEnc = {
        tipoDocumento:          1,
        idCliente:              { idCliente: idClienteEnc },
        tipoVenta:              'B',
        destinoVenta:           '1',
        FechaFactura:           fechaHoyISO,
        moneda:                 String(enc.idMoneda || 1),
        tasaDeCambio:           parseFloat(Number(enc.tasaDeCambio || 1).toFixed(2)),
        referencia:             '0',
        numeroAcceso:           '0',
        serieAdmin:             '',
        numeroAdmin:            '0',
        totalBruto:             totalBruto.toFixed(2),
        cantidadDeDescuento:    totalDescuento.toFixed(2),
        porcentajeDeDescuento:  0,
        exento:                 '0.00',
        otro:                   '0.00',
        totalNeto:              totalNeto,
        isr:                    '0.00',
        iva:                    totalIva.toFixed(2),
        total:                  totalFinal.toFixed(2),
        facturaProcesada:       '',
        direccionEntrega:       enc.direccionEntrega || '',
        enviarCorreo:           'N',
        tipoReceptor:           tipoRec,
        idUsuarioModificacion:  idUsuarioActual,
      }

      console.log('[Abono] Creando encabezado:', bodyEnc)
      const resEnc = await fetch('/api/grabarEncabezadoFacturas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(bodyEnc),
      })
      if (!resEnc.ok) throw new Error(`Error ${resEnc.status} al crear encabezado de factura`)
      const idEncabezadoNuevo = (await resEnc.text()).trim()
      console.log('[Abono] Encabezado creado, id:', idEncabezadoNuevo)

      // ── 2. Crear detalle de la nueva factura ─────────────────────────────────
      const detallePromises = itemsSeleccionados.map((item) => {
        const cant         = r2(Number(item.cantidad) || 0)
        const precio       = r2(Number(item.precioVenta) || 0)
        const descuento    = r2(Number(item.cantidadDeDescuento) || 0)
        const impBrutoDet  = r2(cant * precio)
        const totalConDescDet = r2(impBrutoDet - descuento)
        const impNetoDet   = r2(totalConDescDet / 1.12)
        const impIvaDet    = r2(totalConDescDet - impNetoDet)

        const bodyDet = {
          idEncabezadoFactura:    String(idEncabezadoNuevo),
          idProducto:             String(item.idProducto),
          idUnidadDeMedida:       String(item.idUnidadDeMedida ?? '1'),
          cantidad:               String(cant),
          precioVenta:            precio.toFixed(2),
          cantidadDeDescuento:    descuento.toFixed(2),
          porcentajeDeDescuento:  '0.00',
          ImpBruto:               impBrutoDet.toFixed(2),
          ImpExento:              '0.00',
          ImpOtros:               '0.00',
          ImpNeto:                impNetoDet.toFixed(2),
          iva:                    impIvaDet.toFixed(2),
          isr:                    '0.00',
          ImpTotal:               totalConDescDet.toFixed(2),
          consignacionFacturada:  '1',
          idUsuarioModificacion:  String(idUsuarioActual),
        }
        return fetch('/api/grabarDetalleFactura', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(bodyDet),
        })
      })

      const resultadosDet = await Promise.all(detallePromises)
      const erroresDet = resultadosDet.filter((r) => !r.ok)
      if (erroresDet.length > 0) throw new Error('El encabezado se creó pero algunos productos del detalle fallaron')
      console.log('[Abono] Detalle creado correctamente')

      // ── 3. Marcar items originales de la consignación como facturados ─────────
      const updatePromises = itemsSeleccionados
        .filter((item) => item.idDetalleFactura)
        .map((item) =>
          fetch('/api/grabarDetalleFactura', {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              idDetalleFactura:      item.idDetalleFactura,
              consignacionFacturada: '1',
            }),
          })
        )
      await Promise.all(updatePromises)
      console.log('[Abono] Registros originales marcados como consignacionFacturada=1')

      // ── 4. Enviar DTE con la referencia de la nueva factura ──────────────────
      bodyDte.referencia = `FACT${idEncabezadoNuevo}`

      console.log('[Abono DTE] Items:', JSON.stringify(itemsDte, null, 2))
      console.log('[Abono DTE] Enviando:', JSON.stringify(bodyDte, null, 2))
      const resDte = await fetch('/api/fel/dtes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(bodyDte),
      })
      const rawDte = await resDte.text()
      let responseDte = null
      try { responseDte = JSON.parse(rawDte) } catch (_) { responseDte = rawDte }
      console.log('[Abono DTE] Respuesta:', responseDte)

      const fel = responseDte?.fel ?? responseDte
      if (fel?.ok === false) {
        setMsgAbono({ visible: true, ok: false, texto: fel.error || 'Error al emitir el DTE' })
      } else {
        setMsgAbono({ visible: true, ok: true, texto: `Abono procesado correctamente. Referencia: ${fel?.referencia || '—'}` })
        await imprimirFacturaAbono(itemsSeleccionados, responseDte, totalNeto, totalIva, totalFinal)
        cargarConsignaciones(paginaActual, filtroAplicado)
      }
    } catch (e) {
      setMsgAbono({ visible: true, ok: false, texto: `Error al confirmar abono: ${e.message}` })
    } finally {
      setConfirmandoAbono(false)
    }
  }

  // ── Exportar Excel ─────────────────────────────────────────────────────────
  const exportarExcel = async () => {
    const periodo = filtroAplicado.inicio === filtroAplicado.fin
      ? filtroAplicado.inicio
      : `${filtroAplicado.inicio} al ${filtroAplicado.fin}`

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Consignaciones')

    const fillAzul   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A6B' } }
    const fillGris   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
    const fillVerde  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }
    const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }

    ws.columns = [
      { width: 5 },  // #
      { width: 20 }, // Referencia
      { width: 14 }, // Fecha Emisión
      { width: 32 }, // Cliente
      { width: 18 }, // Tipo Documento
      { width: 13 }, // Subtotal
      { width: 11 }, // IVA
      { width: 13 }, // Total
      { width: 13 }, // Estado
    ]

    const filaTitulo = ws.addRow(['Reporte: Consignaciones'])
    filaTitulo.getCell(1).font = { bold: true, size: 11 }
    filaTitulo.getCell(1).fill = fillGris
    filaTitulo.height = 22

    ws.addRow([])
    const thin = { style: 'thin' }
    const agregarFila = (etiqueta, valor, esPrimera, esUltima) => {
      const fila = ws.addRow([etiqueta, valor])
      fila.getCell(1).border = { top: esPrimera ? thin : undefined, bottom: esUltima ? thin : undefined, left: thin }
      fila.getCell(2).border = { top: esPrimera ? thin : undefined, bottom: esUltima ? thin : undefined, right: thin }
      fila.getCell(1).font = { bold: true }
      fila.getCell(1).fill = fillGris
      fila.getCell(2).fill = fillGris
      fila.height = 18
    }
    agregarFila('Período consultado:', periodo, true, false)
    agregarFila('Cantidad de Consignaciones:', resumen.cantidad, false, false)
    agregarFila('Total:', formatMoneda(resumen.total), false, true)
    ws.addRow([])

    const filaEnc = ws.addRow(['#', 'Referencia', 'Fecha Emisión', 'Cliente', 'Tipo Documento', 'Subtotal', 'IVA', 'Total', 'Estado'])
    filaEnc.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = fillAzul
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = borderThin
    })
    filaEnc.height = 20

    todasConsignaciones.forEach((f, idx) => {
      const ref = calcularReferencia(f)
      const tipoDoc = tiposDocumento[String(f.tipoDocumento)] ?? `Tipo ${f.tipoDocumento}`
      const fila = ws.addRow([
        idx + 1,
        ref,
        formatFecha(f.FechaFactura || f.fechaFactura || f.fecha),
        f.idCliente?.nombreCliente ?? '',
        tipoDoc,
        f.totalNeto ?? 0,
        f.iva ?? 0,
        f.total ?? 0,
        f.facturaProcesada === 'S' ? 'Procesada' : 'Pendiente',
      ])
      fila.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = borderThin
        cell.alignment = { vertical: 'middle' }
      })
      ;[6, 7, 8].forEach((col) => { fila.getCell(col).numFmt = '"Q"#,##0.00' })
      fila.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      fila.getCell(8).font = { bold: true, color: { argb: 'FF1E7E34' } }
      const celdaEstado = fila.getCell(9)
      celdaEstado.fill = f.facturaProcesada === 'S'
        ? fillVerde
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } }
    })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consignaciones_${filtroAplicado.inicio}_${filtroAplicado.fin}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong className="fs-5">Reporte de Consignaciones</strong>
            </CCardHeader>
            <CCardBody>

              {/* Filtros */}
              <CRow className="gy-2 align-items-end mb-3 justify-content-end">
                <CCol md="auto">
                  <CFormLabel className="fw-bold mb-1">Fecha Inicio</CFormLabel>
                  <CFormInput type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </CCol>
                <CCol md="auto">
                  <CFormLabel className="fw-bold mb-1">Fecha Fin</CFormLabel>
                  <CFormInput type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="fw-bold mb-1">Cliente</CFormLabel>
                  <CFormInput
                    type="text"
                    placeholder="Buscar por nombre de cliente..."
                    value={buscarCliente}
                    onChange={(e) => handleClienteChange(e.target.value)}
                  />
                </CCol>
                <CCol md="auto" className="d-flex gap-2">
                  <CButton color="primary" onClick={handleBuscar} disabled={cargando}>
                    {cargando ? <CSpinner size="sm" /> : 'Buscar'}
                  </CButton>
                  <CButton color="secondary" onClick={handleLimpiar} disabled={cargando}>Limpiar</CButton>
                  <CButton
                    style={{ backgroundColor: '#1e8449', borderColor: '#1e8449', color: '#fff' }}
                    onClick={exportarExcel}
                    disabled={cargando || todasConsignaciones.length === 0}
                  >
                    Exportar Excel
                  </CButton>
                </CCol>
              </CRow>

              {/* Resumen */}
              {!cargando && !error && (
                <CRow className="mb-4 g-3">
                  <CCol md={4}>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#1a3a6b' }}>
                      <div className="text-muted small mb-1">Período Consultado</div>
                      <div className="fs-5 fw-bold" style={{ color: '#1a8fd1' }}>
                        {!filtroAplicado.inicio && !filtroAplicado.fin
                          ? 'Todas las fechas'
                          : filtroAplicado.inicio === filtroAplicado.fin
                            ? formatFecha(filtroAplicado.inicio)
                            : `${formatFecha(filtroAplicado.inicio)} — ${formatFecha(filtroAplicado.fin)}`}
                      </div>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#321fdb' }}>
                      <div className="text-muted small mb-1">Consignaciones</div>
                      <div className="fs-5 fw-bold text-primary">
                        {cargando ? <CSpinner size="sm" /> : resumen.cantidad}
                      </div>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#2eb85c' }}>
                      <div className="text-muted small mb-1">Total Pendiente</div>
                      <div className="fs-5 fw-bold text-success">
                        {cargando ? <CSpinner size="sm" /> : formatMoneda(resumen.total)}
                      </div>
                    </div>
                  </CCol>
                </CRow>
              )}

              {/* Estado */}
              {cargando && (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                  <div className="mt-2 text-muted">Cargando consignaciones...</div>
                </div>
              )}
              {error && <div className="alert alert-danger">Error: {error}</div>}

              {/* Tabla */}
              {!cargando && !error && (
                <>
                  <CTable striped hover bordered responsive>
                    <CTableHead style={headerStyle}>
                      <CTableRow>
                        <CTableHeaderCell className="text-center">#</CTableHeaderCell>
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
                      {consignaciones.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={11} className="text-center py-4 text-muted">
                            No hay consignaciones para mostrar.
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        consignaciones.map((f, index) => {
                          const ref = calcularReferencia(f)
                          return (
                            <CTableRow key={f.idEncabezadoFactura ?? index}>
                              <CTableDataCell className="text-center">{paginaActual * PAGE_SIZE + index + 1}</CTableDataCell>
                              <CTableDataCell>{ref}</CTableDataCell>
                              <CTableDataCell>{formatFecha(f.FechaFactura || f.fechaFactura || f.fecha)}</CTableDataCell>
                              <CTableDataCell>{f.idCliente?.nombreCliente || '—'}</CTableDataCell>
                              <CTableDataCell>
                                {tiposDocumento[String(f.tipoDocumento)] ?? f.tipoDocumento ?? '—'}
                              </CTableDataCell>
                              <CTableDataCell className="text-end">{formatMoneda(f.totalNeto)}</CTableDataCell>
                              <CTableDataCell className="text-end">{formatMoneda(f.iva)}</CTableDataCell>
                              <CTableDataCell className="text-end fw-bold text-success">{formatMoneda(f.total)}</CTableDataCell>
                              <CTableDataCell className="text-center">
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: f.facturaProcesada === 'S' ? '#198754' : '#6c757d',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                  }}
                                >
                                  {f.facturaProcesada === 'S' ? 'Procesada' : 'Pendiente'}
                                </span>
                              </CTableDataCell>
                              <CTableDataCell className="text-nowrap">
                                <CButton
                                  color="info"
                                  size="sm"
                                  className="text-white me-1"
                                  onClick={() => handleVer(f)}
                                >
                                  Ver
                                </CButton>
                                <CButton
                                  size="sm"
                                  className="text-white me-1"
                                  style={{ backgroundColor: '#e8680a', borderColor: '#e8680a' }}
                                  onClick={() => handleAbonar(f)}
                                >
                                  Abonar
                                </CButton>
                                <CButton
                                  color="secondary"
                                  size="sm"
                                  className="text-white"
                                  onClick={() => handleReimprimir(f)}
                                  disabled={reimprimiendo}
                                >
                                  {reimprimiendo ? <CSpinner size="sm" /> : 'Reimprimir'}
                                </CButton>
                              </CTableDataCell>
                            </CTableRow>
                          )
                        })
                      )}
                    </CTableBody>
                  </CTable>
                  <Paginador
                    paginaActual={paginaActual}
                    totalPaginas={totalPaginas}
                    totalElementos={totalElementos}
                    onCambiar={(p) => { setPaginaActual(p); cargarConsignaciones(p, filtroAplicado) }}
                  />
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ── Modal Ver detalle ────────────────────────────────────────────────── */}
      <CModal size="lg" visible={modalVer} onClose={() => setModalVer(false)}>
        <CModalHeader>
          <CModalTitle>
            Detalle — Consignación {facturaSeleccionada ? calcularReferencia(facturaSeleccionada) : ''}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {facturaSeleccionada && (
            <>
              <CRow className="mb-3">
                <CCol md={6}>
                  <div><strong>Referencia:</strong> {calcularReferencia(facturaSeleccionada)}</div>
                  <div><strong>Fecha Emisión:</strong> {formatFecha(facturaSeleccionada.FechaFactura || facturaSeleccionada.fechaFactura || facturaSeleccionada.fecha)}</div>
                </CCol>
                <CCol md={6}>
                  <div><strong>Cliente:</strong> {facturaSeleccionada.idCliente?.nombreCliente || '—'}</div>
                  <div><strong>Tipo Documento:</strong> {tiposDocumento[String(facturaSeleccionada.tipoDocumento)] ?? facturaSeleccionada.tipoDocumento ?? '—'}</div>
                  <div>
                    <strong>Estado:</strong>{' '}
                    <span
                      className="badge"
                      style={{
                        backgroundColor: facturaSeleccionada.facturaProcesada === 'S' ? '#198754' : '#6c757d',
                        color: '#fff',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {facturaSeleccionada.facturaProcesada === 'S' ? 'Procesada' : 'Pendiente'}
                    </span>
                  </div>
                </CCol>
              </CRow>

              <hr />

              {cargandoDetalle ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                  <div className="mt-2 text-muted small">Cargando productos desde /api/detalleFactura...</div>
                </div>
              ) : errorDetalle ? (
                <div className="alert alert-danger py-2">{errorDetalle}</div>
              ) : detalleFactura.length === 0 ? (
                <div className="alert alert-info py-2">Sin líneas de detalle.</div>
              ) : (
                <CTable striped bordered responsive size="sm">
                  <CTableHead style={headerStyle}>
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: 70 }}>Cantidad</CTableHeaderCell>
                      <CTableHeaderCell>Descripción</CTableHeaderCell>
                      <CTableHeaderCell className="text-end" style={{ width: 110 }}>Precio</CTableHeaderCell>
                      <CTableHeaderCell className="text-end" style={{ width: 110 }}>Descuento</CTableHeaderCell>
                      <CTableHeaderCell className="text-end" style={{ width: 110 }}>Total</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 140 }}>Estado</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {detalleFactura.map((d, i) => {
                      const pagado = String(d.consignacionFacturada) === '1'
                      return (
                        <CTableRow key={d.idDetalleFactura ?? i}>
                          <CTableDataCell className="text-center">{d.cantidad}</CTableDataCell>
                          <CTableDataCell>{d.descripcionProducto || '—'}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatMoneda(d.precioVenta)}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatMoneda(d.cantidadDeDescuento)}</CTableDataCell>
                          <CTableDataCell className="text-end fw-bold">{formatMoneda(d.ImpTotal)}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <span
                              className="badge"
                              style={{
                                backgroundColor: pagado ? '#198754' : '#fd7e14',
                                color: '#fff',
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                borderRadius: 6,
                              }}
                            >
                              {pagado ? 'Facturado' : 'Pendiente de Pago'}
                            </span>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
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

      {/* ── Modal Abonar ─────────────────────────────────────────────────────── */}
      <CModal size="xl" visible={modalAbonar} onClose={() => setModalAbonar(false)}>
        <CModalHeader>
          <CModalTitle>
            Abonar — {consignacionAbonar ? calcularReferencia(consignacionAbonar) : ''}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {consignacionAbonar && (
            <>
              <CRow className="mb-3">
                <CCol md={6}>
                  <div><strong>Referencia:</strong> {calcularReferencia(consignacionAbonar)}</div>
                  <div><strong>Fecha Emisión:</strong> {formatFecha(consignacionAbonar.FechaFactura || consignacionAbonar.fechaFactura || consignacionAbonar.fecha)}</div>
                </CCol>
                <CCol md={6}>
                  <div><strong>Cliente:</strong> {consignacionAbonar.idCliente?.nombreCliente || '—'}</div>
                  <div><strong>Tipo Documento:</strong> {tiposDocumento[String(consignacionAbonar.tipoDocumento)] ?? consignacionAbonar.tipoDocumento ?? '—'}</div>
                  <div>
                    <strong>Estado:</strong>{' '}
                    <span
                      className="badge"
                      style={{
                        backgroundColor: consignacionAbonar.facturaProcesada === 'S' ? '#198754' : '#6c757d',
                        color: '#fff',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {consignacionAbonar.facturaProcesada === 'S' ? 'Procesada' : 'Pendiente'}
                    </span>
                  </div>
                </CCol>
              </CRow>

              {seleccionados.size > 0 && (
                <CRow className="mb-2">
                  <CCol className="text-end">
                    <span className="text-success fw-bold">
                      Seleccionados: {seleccionados.size} producto{seleccionados.size !== 1 ? 's' : ''}
                    </span>
                  </CCol>
                </CRow>
              )}

              <hr />

              {cargandoAbonar ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                  <div className="mt-2 text-muted small">Cargando productos...</div>
                </div>
              ) : detalleAbonar.length === 0 ? (
                <div className="alert alert-info py-2">Sin líneas de detalle.</div>
              ) : (
                <CTable striped bordered responsive size="sm">
                  <CTableHead style={headerStyle}>
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: 80 }}>Cantidad</CTableHeaderCell>
                      <CTableHeaderCell>Descripción</CTableHeaderCell>
                      <CTableHeaderCell className="text-end" style={{ width: 110 }}>Precio</CTableHeaderCell>
                      <CTableHeaderCell className="text-end" style={{ width: 110 }}>Descuento</CTableHeaderCell>
                      <CTableHeaderCell className="text-end" style={{ width: 110 }}>Total</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 140 }}>Estado</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 110 }}>
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <span style={{ fontSize: '0.8rem' }}>Seleccione</span>
                          {detalleAbonar.some((d) => String(d.consignacionFacturada) !== '1') && (
                            <CFormCheck
                              checked={
                                detalleAbonar
                                  .filter((d) => String(d.consignacionFacturada) !== '1')
                                  .every((d) => seleccionados.has(d.idDetalleFactura))
                              }
                              onChange={toggleTodos}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                        </div>
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {detalleAbonar.map((d, i) => {
                      const pendiente = String(d.consignacionFacturada) !== '1'
                      const marcado   = seleccionados.has(d.idDetalleFactura)
                      return (
                        <CTableRow
                          key={d.idDetalleFactura ?? i}
                          style={marcado ? { backgroundColor: '#fff3cd' } : {}}
                        >
                          <CTableDataCell className="text-center">{d.cantidad}</CTableDataCell>
                          <CTableDataCell>{d.descripcionProducto || '—'}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatMoneda(d.precioVenta)}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatMoneda(d.cantidadDeDescuento)}</CTableDataCell>
                          <CTableDataCell className="text-end fw-bold">{formatMoneda(d.ImpTotal)}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <span
                              className="badge"
                              style={{
                                backgroundColor: pendiente ? '#e8680a' : '#198754',
                                color: '#fff',
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                borderRadius: 6,
                              }}
                            >
                              {pendiente ? 'Pendiente de Pago' : 'Facturado'}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {pendiente ? (
                              <CFormCheck
                                checked={marcado}
                                onChange={() => toggleSeleccion(d.idDetalleFactura)}
                                style={{ cursor: 'pointer' }}
                              />
                            ) : (
                              <span title="Ya facturado">—</span>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              )}

              {!cargandoAbonar && consignacionAbonar && (
                <div className="text-end mt-3">
                  <div><strong>Subtotal:</strong> {formatMoneda(consignacionAbonar.totalNeto)}</div>
                  <div><strong>IVA:</strong> {formatMoneda(consignacionAbonar.iva)}</div>
                  <div className="fs-5 fw-bold"><strong>Total:</strong> {formatMoneda(consignacionAbonar.total)}</div>
                </div>
              )}

              {msgAbono.visible && (
                <div
                  className={`alert mt-3 py-2 ${msgAbono.ok ? 'alert-success' : 'alert-danger'}`}
                  style={{ fontSize: '0.9rem' }}
                >
                  {msgAbono.texto}
                </div>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModalAbonar(false)}>Cerrar</CButton>
          <CButton
            style={{ backgroundColor: '#e8680a', borderColor: '#e8680a', color: '#fff' }}
            disabled={seleccionados.size === 0 || confirmandoAbono}
            onClick={confirmarAbono}
          >
            {confirmandoAbono
              ? <><CSpinner size="sm" className="me-1" />Procesando...</>
              : `Confirmar Abono (${seleccionados.size})`
            }
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ReporteConsignaciones
