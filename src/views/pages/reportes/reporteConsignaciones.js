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
  CFormSelect,
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

const getNombreCliente = (f) => {
  const esCF = (f.idCliente?.nit || '').toString().toUpperCase() === 'CF'
  return esCF
    ? (f.nombreFactura || 'Consumidor Final')
    : (f.idCliente?.nombreCliente || f.nombreResAPI || '—')
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
  const [filtroEstado, setFiltroEstado]   = useState('')
  const [filtroAplicado, setFiltroAplicado] = useState({ inicio: '', fin: '', cliente: '', estado: '' })
  const debounceCliente = useRef(null)

  const [consignaciones, setConsignaciones] = useState([])
  const [todasConsignaciones, setTodasConsignaciones] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [paginaActual, setPaginaActual] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [totalElementos, setTotalElementos] = useState(0)
  const [resumen, setResumen] = useState({ cantidad: 0, montoTotal: 0, totalPagado: 0, saldoPendiente: 0, total: 0 })

  const [tiposDocumento, setTiposDocumento] = useState({})
  const [reimprimiendo, setReimprimiendo] = useState(new Set())

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
  const [pagosList, setPagosList]           = useState([])
  const [cargandoPagos, setCargandoPagos]   = useState(false)
  const [montoPago, setMontoPago]           = useState('')
  const [fechaPago, setFechaPago]           = useState('')
  const [observacionesAbono, setObservacionesAbono] = useState('')
  const [confirmandoAbono, setConfirmandoAbono] = useState(false)
  const [msgAbono, setMsgAbono] = useState({ visible: false, ok: false, texto: '' })

  // ── Modal Agregar productos ────────────────────────────────────────────────
  const [modalAgregar, setModalAgregar] = useState(false)
  const [consignacionAgregar, setConsignacionAgregar] = useState(null)
  const [lineasAgregar, setLineasAgregar] = useState([])
  const [busquedaAgregar, setBusquedaAgregar] = useState('')
  const [sugerenciasAgregar, setSugerenciasAgregar] = useState([])
  const [mostrarSugerenciasAgregar, setMostrarSugerenciasAgregar] = useState(false)
  const [cargandoBusquedaAgregar, setCargandoBusquedaAgregar] = useState(false)
  const [guardandoAgregar, setGuardandoAgregar] = useState(false)
  const [msgAgregar, setMsgAgregar] = useState({ visible: false, ok: false, texto: '' })
  const debounceAgregar = useRef(null)
  const abortAgregarRef = useRef(null)
  const [visibleSubModalBuscar, setVisibleSubModalBuscar] = useState(false)
  const [cargandoExistentes, setCargandoExistentes] = useState(false)
  const [errorCantidadSubModal, setErrorCantidadSubModal] = useState(false)
  const [errorStockSubModal, setErrorStockSubModal]       = useState('')
  const [alertaSinStockAgregar, setAlertaSinStockAgregar] = useState({ visible: false, descripcion: '', stock: 0 })
  const [alertaSinPrecioAgregar, setAlertaSinPrecioAgregar] = useState({ visible: false, productos: [] })
  const [alertaExcedeStockAgregar, setAlertaExcedeStockAgregar] = useState({ visible: false, descripcion: '', stock: 0, cantidad: 0 })
  const [modalFacturar, setModalFacturar] = useState(false)
  const [seleccionadosFacturar, setSeleccionadosFacturar] = useState(new Set())
  const [confirmandoFacturar, setConfirmandoFacturar] = useState(false)
  const [msgFacturar, setMsgFacturar] = useState({ visible: false, ok: false, texto: '' })

  const confirmarFacturacion = async () => {
    const itemsSeleccionados = lineasAgregar.filter(
      l => l._existente && seleccionadosFacturar.has(l.idDetalleFactura)
    )
    if (itemsSeleccionados.length === 0) return
    if (!consignacionAgregar) {
      setMsgFacturar({ visible: true, ok: false, texto: 'No hay consignación seleccionada.' })
      return
    }

    const enc     = consignacionAgregar
    const cliente = (enc.idCliente && typeof enc.idCliente === 'object') ? enc.idCliente : {}

    // ── Validar inventario antes de facturar ─────────────────────────────────
    setConfirmandoFacturar(true)
    setMsgFacturar({ visible: false, ok: false, texto: '' })
    try {
      const stockChecks = await Promise.all(
        itemsSeleccionados.map(async (item) => {
          try {
            const res = await fetch(`/api/inventario?idProducto=${item.idProducto}&page=0&size=1`)
            if (!res.ok) return null
            const data = await res.json()
            const lista = Array.isArray(data) ? data : data.content ?? []
            const stock = Number(lista[0]?.cantidadExistencias ?? 0)
            return { descripcion: item.descripcionProducto || `Producto ${item.idProducto}`, stock }
          } catch { return null }
        })
      )
      const sinStock = stockChecks.filter(s => s !== null && s.stock <= 0)
      if (sinStock.length > 0) {
        const nombres = sinStock.map(s => `• ${s.descripcion} (stock: ${s.stock})`).join('\n')
        setMsgFacturar({ visible: true, ok: false, texto: `No se puede facturar. Los siguientes productos no tienen existencias:\n${nombres}` })
        setConfirmandoFacturar(false)
        return
      }
    } catch (e) {
      console.warn('[Facturar] Error al verificar inventario:', e)
    }
    // ─────────────────────────────────────────────────────────────────────────

    try {
      const hoy      = new Date()
      const fechaDte = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`
      const r2       = (n) => parseFloat(parseFloat(n || 0).toFixed(2))
      console.log('[Facturar] enc:', enc, '| cliente:', cliente, '| items:', itemsSeleccionados.length)

      // Normalizar campos y calcular lineasDetalle una sola vez (igual que facturacion.js)
      const monedaStr          = String(enc.moneda ?? enc.idMoneda ?? '1')
      const tipoRec            = String(enc.tipoReceptor ?? '1')
      const idClienteEnc       = enc.idCliente?.idCliente ?? enc.idCliente ?? null
      const esConsumidorFinalF = (cliente.nit || '').toUpperCase() === 'CF'
                                 || Number(idClienteEnc) === 1
      const nombreFactura      = esConsumidorFinalF
        ? (enc.nombreFactura || cliente.nombreCliente || cliente.nombreFacturacion || 'Consumidor Final')
        : ''
      let nitReceptor = cliente.nit || 'CF'
      if (tipoRec === '2' || tipoRec === '3') nitReceptor = cliente.documentoIdentificacion || 'CF'

      const lineasDetalle = itemsSeleccionados.map((item) => {
        const cantItem     = Number(item.cantidad) || 0
        const descItem     = r2(Number(item.cantidadDeDescuento ?? item.descuento ?? 0))
        const precioItem   = r2(Number(item.precioVenta ?? item.precioUnitario ?? 0))
        const impBruto     = r2(cantItem * precioItem)
        const totalConDesc = r2(impBruto - descItem)
        const impNeto      = r2(totalConDesc / 1.12)
        const impIva       = r2(totalConDesc - impNeto)
        return { item, cantItem, descItem, precioItem, impBruto, totalConDesc, impNeto, impIva }
      })

      const totalesDetalle = lineasDetalle.reduce((acc, l) => ({
        totalBruto:          r2(acc.totalBruto          + l.impBruto),
        cantidadDeDescuento: r2(acc.cantidadDeDescuento + l.descItem),
        totalNeto:           r2(acc.totalNeto           + l.impNeto),
        iva:                 r2(acc.iva                 + l.impIva),
        total:               r2(acc.total               + l.totalConDesc),
      }), { totalBruto: 0, cantidadDeDescuento: 0, totalNeto: 0, iva: 0, total: 0 })

      // ── 1. Crear encabezado de la nueva factura ───────────────────────────────
      const fechaHoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

      const bodyEnc = {
        tipoDocumento:          1,
        idCliente:              { idCliente: idClienteEnc },
        tipoVenta:              'B',
        destinoVenta:           '1',
        FechaFactura:           fechaHoyISO,
        moneda:                 monedaStr,
        tasaDeCambio:           monedaStr === '1' ? '1.00' : '2.00',
        referencia:             '0',
        numeroAcceso:           '0',
        serieAdmin:             '',
        numeroAdmin:            '0',
        totalBruto:             totalesDetalle.totalBruto.toFixed(2),
        cantidadDeDescuento:    totalesDetalle.cantidadDeDescuento.toFixed(2),
        porcentajeDeDescuento:  0,
        exento:                 '0.00',
        otro:                   '0.00',
        totalNeto:              totalesDetalle.totalNeto.toFixed(2),
        isr:                    '0.00',
        iva:                    totalesDetalle.iva.toFixed(2),
        total:                  totalesDetalle.total.toFixed(2),
        facturaProcesada:       '',
        direccionEntrega:       enc.direccionEntrega || '',
        enviarCorreo:           'N',
        tipoReceptor:           tipoRec,
        idUsuarioModificacion:  idUsuarioActual,
        nombreFactura,
      }

      console.log('[Facturar] Creando encabezado:', bodyEnc)
      const resEnc = await fetch('/api/grabarEncabezadoFacturas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(bodyEnc),
      })
      if (!resEnc.ok) throw new Error(`Error ${resEnc.status} al crear encabezado de factura`)
      const idEncabezadoNuevo = (await resEnc.text()).trim()
      console.log('[Facturar] Encabezado creado, id:', idEncabezadoNuevo)

      // ── 2. Crear detalle de la nueva factura (valores de lineasDetalle ya calculados) ─
      const detallePromises = lineasDetalle.map(({ item, cantItem, descItem, precioItem, impBruto, totalConDesc, impNeto, impIva }, index) => {
        const bodyDetalle = {
          idEncabezadoFactura:   String(idEncabezadoNuevo),
          idProducto:            String(item.idProducto),
          idUnidadDeMedida:      String(item.idUnidadDeMedida ?? item.idUnidadMedida ?? '1'),
          cantidad:              String(cantItem),
          precioVenta:           precioItem.toFixed(2),
          cantidadDeDescuento:   descItem.toFixed(2),
          porcentajeDeDescuento: '0.00',
          impBruto:              impBruto.toFixed(2),
          impExento:             '0.00',
          impOtros:              '0.00',
          impNeto:               impNeto.toFixed(2),
          iva:                   impIva.toFixed(2),
          isr:                   '0.00',
          impTotal:              totalConDesc.toFixed(2),
          consignacionFacturada: '1',
          idUsuarioModificacion: String(idUsuarioActual),
          ordenDetalleFactura:   index + 1,
        }
        console.log(`[grabarDetalleFactura] item ${index + 1}:`, bodyDetalle)
        return fetch('/api/grabarDetalleFactura?rebajarInventario=N', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(bodyDetalle),
        })
      })
      const resultadosDet = await Promise.all(detallePromises)
      if (resultadosDet.some(r => !r.ok)) throw new Error('El encabezado se creó pero algunos productos del detalle fallaron')
      console.log('[Facturar] Detalle creado correctamente')

      // ── 3. Marcar items de la consignación como facturados (PATCH) ────────────
      const patchPromises = itemsSeleccionados
        .filter(item => item.idDetalleFactura)
        .map(item =>
          fetch(`/api/actualizarConsignacionFacturada/${item.idDetalleFactura}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ consignacionFacturada: 1, idUsuarioModificacion: Number(idUsuarioActual) }),
          })
        )
      await Promise.all(patchPromises)
      console.log('[Facturar] Items marcados como facturados')

      // ── Verificar si todos los items están facturados → marcar encabezado como procesado ──
      await verificarYActualizarFacturaProcesada(Number(enc.idEncabezadoFactura))

      // ── 4. Enviar DTE (construido desde lineasDetalle) ────────────────────────
      const referenciaCalculada = `FACT${idEncabezadoNuevo}`
      const itemsDte = lineasDetalle.map(({ item, cantItem, descItem, precioItem, impBruto, totalConDesc, impNeto, impIva }) => ({
        producto:     item.codigoProducto || item.codigo || String(item.idProducto || ''),
        descripcion:  item.descripcionProducto || item.descripcion || '',
        medida:       Number(item.idUnidadDeMedida ?? item.idUnidadMedida) || 1,
        cantidad:     cantItem,
        precio:       precioItem,
        porcDesc:     0.00,
        impBruto:     parseFloat(impBruto.toFixed(2)),
        impDescuento: parseFloat(descItem.toFixed(2)),
        impExento:    0.00,
        impOtros:     0.00,
        impNeto:      parseFloat(impNeto.toFixed(2)),
        impIsr:       0.00,
        impIva:       parseFloat(impIva.toFixed(2)),
        impTotal:     parseFloat(totalConDesc.toFixed(2)),
        TipoVentaDet: 'B',
      }))

      const bodyDte = {
        tipoDoc:      1,
        tipoVenta:    'B',
        destinoVenta: 1,
        fecha:        fechaDte,
        moneda:       Number(monedaStr),
        tasa:         monedaStr === '1' ? 1.0 : 2.0,
        referencia:   referenciaCalculada,
        items:        itemsDte,
        receptor: {
          nitReceptor,
          nombre:    esConsumidorFinalF ? 'Consumidor Final' : (enc.nombreResAPI || nombreFactura || cliente.nombreCliente || cliente.nombreFacturacion || 'Consumidor Final'),
          direccion: cliente.direccionFisica || 'Ciudad',
        },
        totales: {
          bruto:     parseFloat(totalesDetalle.totalBruto.toFixed(2)),
          descuento: parseFloat(totalesDetalle.cantidadDeDescuento.toFixed(2)),
          exento:    0.00,
          otros:     0.00,
          neto:      parseFloat(totalesDetalle.totalNeto.toFixed(2)),
          isr:       0.00,
          iva:       parseFloat(totalesDetalle.iva.toFixed(2)),
          total:     parseFloat(totalesDetalle.total.toFixed(2)),
        },
        datosAdicionales: {
          tipoReceptor: tipoRec,
          email:        cliente.correoElectronico || '',
          enviar:       'N',
        },
      }

      console.log('[Facturar DTE] Enviando:', JSON.stringify(bodyDte, null, 2))
      const resDte = await fetch('/api/fel/dtes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(bodyDte),
      })
      const rawDte = await resDte.text()
      let responseDte = null
      try { responseDte = JSON.parse(rawDte) } catch (_) { responseDte = rawDte }
      console.log('[Facturar DTE] Respuesta:', responseDte)

      const fel = responseDte?.fel ?? responseDte
      if (fel?.ok === false) {
        setMsgFacturar({ visible: true, ok: false, texto: fel.error || 'Error al emitir el DTE' })
      } else {
        const referenciaFinal = fel?.referencia || referenciaCalculada
        setMsgFacturar({ visible: true, ok: true, texto: `Facturación procesada correctamente. Referencia: ${referenciaFinal}` })
        setSeleccionadosFacturar(new Set())
        await imprimirFacturaAbono(itemsSeleccionados, responseDte, totalesDetalle.totalNeto, totalesDetalle.iva, totalesDetalle.total, enc)
        const idEnc = Number(enc.idEncabezadoFactura)
        if (idEnc) await cargarLineasExistentes(idEnc)
        cargarConsignaciones(paginaActual, filtroAplicado)
      }
    } catch (e) {
      setMsgFacturar({ visible: true, ok: false, texto: `Error al confirmar facturación: ${e.message}` })
    } finally {
      setConfirmandoFacturar(false)
    }
  }

  // Verifica si todos los items del encabezado están facturados y actualiza facturaProcesada='S'
  const verificarYActualizarFacturaProcesada = async (idEncabezado) => {
    try {
      const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${idEncabezado}`)
      if (!res.ok) return
      const data = await res.json()
      const lineas = Array.isArray(data) ? data : data.content ?? []
      if (lineas.length === 0) return
      const todosFacturados = lineas.every(l => String(l.consignacionFacturada) === '1')
      if (todosFacturados) {
        await fetch(`/api/actualizarFacturaProcesada/${idEncabezado}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ facturaProcesada: 'S', idUsuarioModificacion: Number(idUsuarioActual) }),
        })
        console.log(`[FacturaProcesada] Encabezado ${idEncabezado} marcado como procesado (S)`)
      }
    } catch (e) {
      console.warn('[FacturaProcesada] Error al verificar:', e.message)
    }
  }

  const toggleSeleccionFacturar = (idDetalle) => {
    setSeleccionadosFacturar(prev => {
      const next = new Set(prev)
      next.has(idDetalle) ? next.delete(idDetalle) : next.add(idDetalle)
      return next
    })
  }

  const toggleTodosFacturar = () => {
    const pendientes = lineasAgregar
      .filter(l => l._existente && String(l.consignacionFacturada) !== '1' && l.idDetalleFactura)
      .map(l => l.idDetalleFactura)
    const todosMarcados = pendientes.length > 0 && pendientes.every(id => seleccionadosFacturar.has(id))
    setSeleccionadosFacturar(todosMarcados ? new Set() : new Set(pendientes))
  }

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
          return getNombreCliente(f).toLowerCase().includes(term)
        })
        .filter((f) => {
          if (!filtros.estado) return true
          const raw = String(f.facturaProcesada ?? '').toUpperCase().trim()
          if (filtros.estado === 'S') return raw === 'S'
          if (filtros.estado === 'N') return !f.facturaProcesada || raw !== 'S'
          return true
        })

      setTodasConsignaciones(todasFiltradas)

      // Calcular total pendiente: suma de ImpTotal del detalle donde consignacionFacturada=0
      // Limitamos a 6 peticiones simultáneas para no saturar el navegador
      const totalesPendientes = await mapConLimite(todasFiltradas, 6, async (enc) => {
        if (signal.aborted) return 0
        const idEnc = Number(enc.idEncabezadoFactura)
        if (!idEnc || !Number.isFinite(idEnc) || idEnc <= 0) return 0
        try {
          const rd = await fetch(`/api/detalleFactura?idEncabezadoFactura=${idEnc}`, { signal })
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

      const montoTotal = todasFiltradas.reduce((s, f) => s + (Number(f.total) || 0), 0)
      const totalPagado = todasFiltradas.reduce((s, f) => s + (Number(f.totalPagado) || 0), 0)
      const saldoPendiente = todasFiltradas.reduce((s, f) => s + (Number(f.saldoPendiente) || 0), 0)

      setResumen({
        cantidad: todasFiltradas.length,
        montoTotal,
        totalPagado,
        saldoPendiente,
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
    const filtros = { inicio: fechaInicio, fin: fechaFin, cliente: buscarCliente.trim(), estado: filtroEstado }
    setFiltroAplicado(filtros)
    setPaginaActual(0)
    cargarConsignaciones(0, filtros)
  }

  const handleLimpiar = () => {
    setFechaInicio(HOY)
    setFechaFin(HOY)
    setBuscarCliente('')
    setFiltroEstado('')
    const filtros = { inicio: HOY, fin: HOY, cliente: '', estado: '' }
    setFiltroAplicado(filtros)
    setPaginaActual(0)
    cargarConsignaciones(0, filtros)
  }

  // Filtro inmediato al cambiar estado (igual que reporteVentas.js)
  const handleEstadoChange = (valor) => {
    setFiltroEstado(valor)
    setPaginaActual(0)
    const filtros = { inicio: fechaInicio, fin: fechaFin, cliente: buscarCliente.trim(), estado: valor }
    setFiltroAplicado(filtros)
    cargarConsignaciones(0, filtros)
  }

  // Filtro en tiempo real por nombre de cliente (debounce 400ms)
  const handleClienteChange = (valor) => {
    setBuscarCliente(valor)
    clearTimeout(debounceCliente.current)
    debounceCliente.current = setTimeout(() => {
      setPaginaActual(0)
      const filtros = { inicio: fechaInicio, fin: fechaFin, cliente: valor.trim(), estado: filtroEstado }
      setFiltroAplicado(filtros)
      cargarConsignaciones(0, filtros)
    }, 400)
  }

  // ── Carga (o recarga) el detalle existente de una consignación en lineasAgregar ──
  const cargarLineasExistentes = async (idEnc) => {
    setCargandoExistentes(true)
    try {
      const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${idEnc}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const lineas = Array.isArray(data) ? data : data.content ?? []

      const enriquecidas = await mapConLimite(lineas, 6, async (item) => {
        const idProd = item.idProducto
        let codigoProducto = String(idProd || '')
        let descripcion = `Producto ${idProd || '?'}`
        if (idProd) {
          try {
            const lista = await fetchConCache(`producto:${idProd}`, async () => {
              const rp = await fetch(`/api/productos?idProducto=${idProd}&page=0&size=1`)
              if (!rp.ok) return []
              const prod = await rp.json()
              return Array.isArray(prod) ? prod : prod.content ?? []
            })
            if (lista.length > 0) {
              codigoProducto = lista[0].codigoProducto || codigoProducto
              descripcion    = lista[0].descripcionProducto || descripcion
            }
          } catch (_) { /* silencioso */ }
        }
        return {
          _existente:            true,
          _key:                  `existente_${item.idDetalleFactura ?? idProd}`,
          idDetalleFactura:      item.idDetalleFactura ?? null,
          consignacionFacturada: String(item.consignacionFacturada ?? item.ConsignacionFacturada ?? '0'),
          idInventario:          null,
          idProducto:            idProd,
          idUnidadMedida:        item.idUnidadDeMedida ?? '1',
          codigo:                codigoProducto,
          descripcion,
          cantidad:              Number(item.cantidad)            || 0,
          precioUnitario:        Number(item.precioVenta ?? item.PrecioVenta) || 0,
          precio:                (Number(item.cantidad) || 0) * (Number(item.precioVenta ?? item.PrecioVenta) || 0),
          descuento:             Number(item.cantidadDeDescuento ?? item.CantidadDeDescuento) || 0,
          total:                 ((Number(item.cantidad) || 0) * (Number(item.precioVenta ?? item.PrecioVenta) || 0)) - (Number(item.cantidadDeDescuento ?? item.CantidadDeDescuento) || 0),
          stock:                 null,
          precioVenta:           Number(item.precioVenta ?? item.PrecioVenta) || 0,
          cantidadDeDescuento:   Number(item.cantidadDeDescuento ?? item.CantidadDeDescuento) || 0,
          ImpTotal:              Number(item.ImpTotal ?? item.impTotal ?? 0) || 0,
          descripcionProducto:   descripcion,
          codigoProducto,
          idUnidadDeMedida:      item.idUnidadDeMedida ?? '1',
        }
      })
      setLineasAgregar(enriquecidas)
    } catch (_) {
      // Si falla la carga, deja la lista como está
    } finally {
      setCargandoExistentes(false)
    }
  }

  // ── Agregar productos a consignación existente ─────────────────────────────
  const handleAgregarProductos = async (factura) => {
    setConsignacionAgregar(factura)
    setLineasAgregar([])
    setBusquedaAgregar('')
    setSugerenciasAgregar([])
    setMostrarSugerenciasAgregar(false)
    setMsgAgregar({ visible: false, ok: false, texto: '' })
    setModalAgregar(true)

    // Cargar las líneas existentes de la consignación
    const idEnc = Number(factura.idEncabezadoFactura)
    if (!idEnc) return
    await cargarLineasExistentes(idEnc)
  }

  const buscarProductoAgregar = async (termino) => {
    const t = (termino || '').trim()
    if (t.length < 1) {
      setSugerenciasAgregar([])
      setMostrarSugerenciasAgregar(false)
      return
    }
    if (abortAgregarRef.current) abortAgregarRef.current.abort()
    const controller = new AbortController()
    abortAgregarRef.current = controller
    const { signal } = controller
    try {
      setCargandoBusquedaAgregar(true)
      const SIZE = 200
      const [rCod, rProv, rDesc] = await Promise.all([
        fetch(`/api/inventario?codigoProducto=${encodeURIComponent(t)}&page=0&size=${SIZE}`, { signal }).then(r => r.json()).catch(() => []),
        fetch(`/api/inventario?codigoProductoProveedor=${encodeURIComponent(t)}&page=0&size=${SIZE}`, { signal }).then(r => r.json()).catch(() => []),
        fetch(`/api/inventario?descripcion=${encodeURIComponent(t)}&page=0&size=${SIZE}`, { signal }).then(r => r.json()).catch(() => []),
      ])
      const combinados = [
        ...(Array.isArray(rCod)  ? rCod  : rCod.content  || []),
        ...(Array.isArray(rProv) ? rProv : rProv.content || []),
        ...(Array.isArray(rDesc) ? rDesc : rDesc.content || []),
      ]
      const unicos = combinados.filter((p, idx, arr) =>
        arr.findIndex(x => x.idInventario === p.idInventario) === idx
      )
      setSugerenciasAgregar(unicos)
      setMostrarSugerenciasAgregar(unicos.length > 0)
    } catch (e) {
      if (e.name === 'AbortError') return
      setSugerenciasAgregar([])
      setMostrarSugerenciasAgregar(false)
    } finally {
      if (!signal.aborted) setCargandoBusquedaAgregar(false)
    }
  }

  const seleccionarProductoAgregar = (producto) => {
    const idInventario = producto.idInventario ?? producto.idProductoInventario
    const idProducto   = producto.idProducto?.idProducto ?? producto.idProducto ?? producto.id
    if (lineasAgregar.some(l => l.idInventario === idInventario)) return

    const stock = Number(producto.cantidadExistencias ?? producto.stock ?? 0)
    console.log('[seleccionarProductoAgregar] stock:', stock, '| producto:', producto)
    if (stock <= 0) {
      setAlertaSinStockAgregar({
        visible: true,
        descripcion: producto.idProducto?.descripcionProducto || producto.descripcionProducto || 'Producto',
        stock,
      })
      return
    }
    const codigo       = producto.idProducto?.codigoProducto || producto.codigoProducto || ''
    const descripcion  = producto.idProducto?.descripcionProducto || producto.descripcionProducto || ''
    const precioVenta  = Number(producto.idProducto?.precioVenta ?? producto.precioVenta ?? 0)
    if (!precioVenta || precioVenta <= 0) {
      setAlertaSinPrecioAgregar({ visible: true, productos: [{ codigo, descripcion }] })
      return
    }
    setErrorStockSubModal('')
    const cantidad     = 1
    const precio       = precioVenta * cantidad
    const descuento    = 0
    const total        = precio - descuento
    setLineasAgregar(prev => [...prev, {
      _existente: false,
      _key: `nuevo_${idInventario ?? idProducto}_${Date.now()}`,
      idInventario,
      idProducto,
      idUnidadMedida: producto.idProducto?.unidadDeMedida ?? producto.unidadDeMedida ?? '1',
      codigo,
      descripcion,
      cantidad,
      precioUnitario: precioVenta,
      precio,
      descuento,
      total,
      stock: producto.cantidadExistencias ?? producto.stock ?? 0,
    }])
    setBusquedaAgregar('')
    setSugerenciasAgregar([])
    setMostrarSugerenciasAgregar(false)
  }

  const actualizarCantidadAgregar = (index, cantidad) => {
    const valor = Number(cantidad)
    if (cantidad !== '' && (isNaN(valor) || valor < 0)) return
    const linea = lineasAgregar[index]
    if (linea && linea._existente === false && cantidad !== '') {
      const stockDisponible = Number(linea.stock ?? 0)
      if (valor > stockDisponible) {
        setAlertaExcedeStockAgregar({ visible: true, descripcion: linea.descripcion, stock: stockDisponible, cantidad: valor })
        return
      }
    }
    setLineasAgregar(prev => prev.map((l, i) => {
      if (i !== index) return l
      const cant  = cantidad === '' ? '' : valor
      const desc  = Number(l.descuento) || 0
      const precio = (Number(cant) || 0) * l.precioUnitario
      return { ...l, cantidad: cant, precio, total: precio - desc }
    }))
  }

  const actualizarDescuentoAgregar = (index, descuento) => {
    if (descuento !== '' && !/^\d*\.?\d*$/.test(descuento)) return
    setLineasAgregar(prev => prev.map((l, i) => {
      if (i !== index) return l
      const cant  = Number(l.cantidad) || 0
      const desc  = Number(descuento) || 0
      const precio = cant * l.precioUnitario
      return { ...l, descuento, precio, total: precio - desc }
    }))
  }

  const actualizarLineaAgregar = (idx, campo, valor) => {
    setLineasAgregar(prev => prev.map((l, i) =>
      i === idx ? { ...l, [campo]: Number(valor) || 0 } : l
    ))
  }

  const eliminarLineaAgregar = (idx) => {
    setLineasAgregar(prev => prev.filter((_, i) => i !== idx))
  }

  const guardarNuevosProductos = async () => {
    const lineasNuevas = lineasAgregar.filter(l => l._existente === false)
    if (!consignacionAgregar || lineasNuevas.length === 0) return
    setGuardandoAgregar(true)
    setMsgAgregar({ visible: false, ok: false, texto: '' })
    try {
      const idEnc = Number(consignacionAgregar.idEncabezadoFactura)
      const r2 = (n) => parseFloat(parseFloat(n || 0).toFixed(2))

      // Obtener detalle existente para calcular el orden correcto
      let ordenBase = 0
      try {
        const resExistente = await fetch(`/api/detalleFactura?idEncabezadoFactura=${idEnc}`)
        if (resExistente.ok) {
          const dataExistente = await resExistente.json()
          const lineasExistentes = Array.isArray(dataExistente) ? dataExistente : dataExistente.content ?? []
          ordenBase = lineasExistentes.length
        }
      } catch (_) { /* continuar con ordenBase=0 */ }

      // Guardar cada línea nueva con /api/grabarDetalleFactura
      const promesas = lineasNuevas.map((linea, idx) => {
        const cantItem     = Number(linea.cantidad)       || 0
        const descItem     = r2(linea.descuento           || 0)
        const precioItem   = r2(linea.precioUnitario      || 0)
        const impBruto     = r2(cantItem * precioItem)
        const totalConDesc = r2(impBruto - descItem)
        const impNeto      = r2(totalConDesc / 1.12)
        const impIva       = r2(totalConDesc - impNeto)
        const bodyDetalle = {
          idEncabezadoFactura:   String(idEnc),
          idProducto:            String(linea.idProducto),
          idUnidadDeMedida:      String(linea.idUnidadMedida ?? '1'),
          cantidad:              String(cantItem),
          precioVenta:           precioItem.toFixed(2),
          cantidadDeDescuento:   descItem.toFixed(2),
          porcentajeDeDescuento: '0.00',
          impBruto:              impBruto.toFixed(2),
          impExento:             '0.00',
          impOtros:              '0.00',
          impNeto:               impNeto.toFixed(2),
          iva:                   impIva.toFixed(2),
          isr:                   '0.00',
          impTotal:              totalConDesc.toFixed(2),
          consignacionFacturada: '0',
          idUsuarioModificacion: String(idUsuarioActual),
          ordenDetalleFactura:   ordenBase + idx + 1,
        }
        console.log(`[grabarDetalleFactura] item ${idx + 1}:`, bodyDetalle)
        return fetch('/api/grabarDetalleFactura', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyDetalle),
        })
      })

      const resultados = await Promise.all(promesas)
      const errores = resultados.filter(r => !r.ok)
      if (errores.length > 0) throw new Error(`${errores.length} producto(s) no se pudieron guardar`)

      // Calcular totales de TODAS las líneas (existentes + nuevas) para actualizar el encabezado
      // Misma lógica que facturacion.js: cálculo por línea y acumulación
      const todasLineas = lineasAgregar
      const lineasConCalculo = todasLineas.map((l) => {
        const cantItem     = Number(l.cantidad)        || 0
        const descItem     = r2(l.descuento            || 0)
        const precioItem   = r2(l.precioUnitario       || 0)
        const impBruto     = r2(cantItem * precioItem)
        const totalConDesc = r2(impBruto - descItem)
        const impNeto      = r2(totalConDesc / 1.12)
        const impIva       = r2(totalConDesc - impNeto)
        return { cantItem, descItem, impBruto, totalConDesc, impNeto, impIva }
      })

      const totalesDetalle = lineasConCalculo.reduce((acc, l) => ({
        totalBruto:          r2(acc.totalBruto          + l.impBruto),
        cantidadDeDescuento: r2(acc.cantidadDeDescuento + l.descItem),
        totalNeto:           r2(acc.totalNeto           + l.impNeto),
        iva:                 r2(acc.iva                 + l.impIva),
        total:               r2(acc.total               + l.totalConDesc),
      }), { totalBruto: 0, cantidadDeDescuento: 0, totalNeto: 0, iva: 0, total: 0 })

      const bodyMonto = {
        totalBruto:            parseFloat(totalesDetalle.totalBruto.toFixed(2)),
        porcentajeDeDescuento: 0,
        cantidadDeDescuento:   parseFloat(totalesDetalle.cantidadDeDescuento.toFixed(2)),
        totalNeto:             parseFloat(totalesDetalle.totalNeto.toFixed(2)),
        iva:                   parseFloat(totalesDetalle.iva.toFixed(2)),
        total:                 parseFloat(totalesDetalle.total.toFixed(2)),
        idUsuarioModificacion: Number(idUsuarioActual),
      }
      console.log(`[actualizarMontosFactura] id=${idEnc}:`, bodyMonto)

      const resMonto = await fetch(`/api/actualizarMontosFactura/${idEnc}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyMonto),
      })
      if (!resMonto.ok) throw new Error(`Error ${resMonto.status} al actualizar montos del encabezado`)

      setMsgAgregar({ visible: true, ok: true, texto: `${lineasNuevas.length} producto(s) agregado(s) y montos actualizados correctamente.` })
      // Recargar detalle actualizado en el modal y la lista principal
      await cargarLineasExistentes(idEnc)
      cargarConsignaciones(paginaActual, filtroAplicado)
    } catch (e) {
      setMsgAgregar({ visible: true, ok: false, texto: e.message || 'Error al guardar productos' })
    } finally {
      setGuardandoAgregar(false)
    }
  }

  // ── Ver detalle ────────────────────────────────────────────────────────────
  const handleVer = async (factura) => {
    setFacturaSeleccionada(factura)
    setDetalleFactura([])
    setErrorDetalle(null)
    setModalVer(true)
    setCargandoDetalle(true)
    try {
      const idEnc = Number(factura.idEncabezadoFactura)
      if (!idEnc || !Number.isFinite(idEnc) || idEnc <= 0) throw new Error('ID de factura inválido')

      const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${idEnc}`)
      if (!res.ok) throw new Error(`Error ${res.status} al cargar detalle`)
      const data = await res.json()
      const lineas = Array.isArray(data) ? data : data.content ?? []

      const lineasEnriquecidas = await mapConLimite(lineas, 6, async (item) => {
        const idProd = item.idProducto
        let codigoProducto = '—'
        let codigoProductoProveedor = '—'
        let descripcionProducto = '—'
        if (idProd) {
          try {
            const lista = await fetchConCache(`producto:${idProd}`, async () => {
              const rp = await fetch(`/api/productos?idProducto=${idProd}&page=0&size=1`)
              if (!rp.ok) return []
              const prod = await rp.json()
              return Array.isArray(prod) ? prod : prod.content ?? []
            })
            if (lista.length > 0) {
              codigoProducto          = lista[0].codigoProducto          || '—'
              codigoProductoProveedor = lista[0].codigoProductoProveedor || '—'
              descripcionProducto     = lista[0].descripcionProducto     || '—'
            }
          } catch (_) { /* silencioso */ }
        }
        const totalLinea =
          Number(item.impTotal ?? item.ImpTotal ?? 0) ||
          Number(item.cantidad || 0) * Number(item.precioVenta || 0) - Number(item.cantidadDeDescuento || 0)
        return { ...item, codigoProducto, codigoProductoProveedor, descripcionProducto, ImpTotal: totalLinea }
      })
      setDetalleFactura(lineasEnriquecidas)
    } catch (e) {
      console.error('[Ver] Error al cargar detalle:', e)
      setErrorDetalle(e.message || 'Error al cargar el detalle')
      setDetalleFactura([])
    } finally {
      setCargandoDetalle(false)
    }
  }

  // ── Abonar ────────────────────────────────────────────────────────────────
  const imprimirConstanciaPagos = () => {
    if (!consignacionAbonar) return
    const cliente = (typeof consignacionAbonar.idCliente === 'object' && consignacionAbonar.idCliente !== null)
      ? consignacionAbonar.idCliente : {}
    const ref        = calcularReferencia(consignacionAbonar)
    const nombre     = getNombreCliente(consignacionAbonar)
    const nit        = cliente.nit || 'CF'
    const fecha      = formatFecha(consignacionAbonar.FechaFactura || consignacionAbonar.fechaFactura)
    const montoTotal = Number(consignacionAbonar.total || 0)
    const saldo      = Number(consignacionAbonar.saldoPendiente || 0)
    const pagado     = Number(consignacionAbonar.totalPagado || 0)
    const hoy        = new Date()
    const fechaImpresion = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`

    const filasPagos = pagosList.length === 0
      ? `<tr><td colspan="3" style="text-align:center;padding:8px;color:#666;">Sin abonos registrados</td></tr>`
      : pagosList.map((p, i) => `
        <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;">${p.fechaPago ? formatFecha(p.fechaPago) : '—'}</td>
          <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:bold;">Q${Number(p.montoPago ?? p.monto ?? 0).toFixed(2)}</td>
        </tr>
      `).join('')

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Constancia de Pagos</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; }
          .titulo { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 4px; }
          .subtitulo { text-align: center; font-size: 11px; color: #555; margin-bottom: 16px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 16px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa; }
          .info-grid label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          thead tr { background: #343a40; color: #fff; }
          th { padding: 6px 8px; text-align: left; font-size: 11px; }
          .totales { text-align: right; margin-top: 8px; }
          .totales div { margin-bottom: 3px; }
          .totales .total-final { font-size: 13px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #777; border-top: 1px solid #ddd; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="titulo">Ferretería y Blockera Agmner</div>
        <div class="subtitulo">Constancia de Pagos — ${ref}</div>
        <div class="info-grid">
          <div><label>Referencia:</label> ${ref}</div>
          <div><label>Fecha Emisión:</label> ${fecha}</div>
          <div><label>Cliente:</label> ${nombre}</div>
          <div><label>NIT:</label> ${nit}</div>
          <div><label>Monto Total:</label> Q${montoTotal.toFixed(2)}</div>
          <div><label>Fecha Impresión:</label> ${fechaImpresion}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:35px;">#</th>
              <th>Fecha Pago</th>
              <th style="text-align:right;">Monto</th>
            </tr>
          </thead>
          <tbody>${filasPagos}</tbody>
        </table>
        <div class="totales">
          <div>Total Pagado: <strong>Q${pagado.toFixed(2)}</strong></div>
          <div class="total-final" style="color:${saldo === 0 ? '#198754' : '#dc3545'};">
            Saldo Pendiente: Q${saldo.toFixed(2)}
          </div>
        </div>
        <div class="footer">Generado el ${fechaImpresion} — Ferretería y Blockera Agmner</div>
      </body>
      </html>
    `
    const iframeId = 'print-constancia-pagos'
    let iframe = document.getElementById(iframeId)
    if (iframe) iframe.remove()
    iframe = document.createElement('iframe')
    iframe.id = iframeId
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
    document.body.appendChild(iframe)
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.print()
        setTimeout(() => iframe.remove(), 1000)
      }, 200)
    }
    iframe.contentDocument.open()
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()
  }

  const cargarPagos = async (idEnc) => {
    setCargandoPagos(true)
    try {
      const res = await fetch(`/api/consignacionPagos?idEncabezadoFactura=${idEnc}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setPagosList(Array.isArray(data) ? data : data.content ?? [])
    } catch (e) {
      console.error('[cargarPagos]', e)
      setPagosList([])
    } finally {
      setCargandoPagos(false)
    }
  }

  const handleAbonar = async (factura) => {
    setConsignacionAbonar(factura)
    setDetalleAbonar([])
    setPagosList([])
    setMontoPago('')
    setFechaPago(new Date().toISOString().split('T')[0])
    setObservacionesAbono('')
    setMsgAbono({ visible: false, ok: false, texto: '' })
    setModalAbonar(true)
    setCargandoAbonar(true)
    try {
      const idEncAbonar = Number(factura.idEncabezadoFactura)
      if (!idEncAbonar || !Number.isFinite(idEncAbonar) || idEncAbonar <= 0) throw new Error('ID de factura inválido')

      const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${idEncAbonar}`)
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
    cargarPagos(Number(factura.idEncabezadoFactura))
  }

  // ── Reimprimir ─────────────────────────────────────────────────────────────
  const handleReimprimir = async (factura) => {
    const rowId = factura.idEncabezadoFactura
    setReimprimiendo(prev => new Set(prev).add(rowId))
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
      const idEncReimprimir = Number(enc.idEncabezadoFactura)
      try {
        if (!idEncReimprimir || !Number.isFinite(idEncReimprimir) || idEncReimprimir <= 0) throw new Error('ID inválido')
        const res = await fetch(`/api/detalleFactura?idEncabezadoFactura=${idEncReimprimir}`)
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
              cantidad:              Number(item.cantidad)                                        || 0,
              precioVenta:           Number(item.precioVenta         ?? item.PrecioVenta)         || 0,
              cantidadDeDescuento:   Number(item.cantidadDeDescuento ?? item.CantidadDeDescuento) || 0,
              ImpTotal:              Number(item.ImpTotal            ?? item.impTotal)             || 0,
              consignacionFacturada: item.consignacionFacturada,
              descripcion,
            }
          })
          detalle = lineasConDesc
        }
      } catch (_) { detalle = [] }

      const referenciaRes    = calcularReferencia(enc)
      const preimpresoRes    = enc.preimpresoResAPI || ''
      const fechaFactura     = enc.FechaFactura || enc.fechaFactura || enc.fecha || ''
      const nombreCliente    = getNombreCliente(enc)
      const direccionCliente = cliente.direccionFisica || '—'
      const direccionEntrega = enc.direccionEntrega || '—'
      const moneda           = 'Q'
      const hayDescuento     = detalle.some((i) => i.cantidadDeDescuento !== 0)
      const totalCols        = 5 + (hayDescuento ? 1 : 0)
      const iva              = Number(enc.iva   || 0)
      const total            = Number(enc.total || 0)

      const filasProducto = detalle.map((item) => {
        const facturado = String(item.consignacionFacturada) === '1'
        return `
        <tr>
          <td style="text-align:center;">${item.cantidad}</td>
          <td>${item.descripcion || ''}</td>
          <td style="text-align:center;font-size:10px;white-space:nowrap;width:1%;">
            ${facturado ? 'Facturado' : 'No Facturado'}
          </td>
          <td style="text-align:right;">${moneda}${item.precioVenta.toFixed(2)}</td>
          ${hayDescuento ? `<td style="text-align:right;">${moneda}${item.cantidadDeDescuento.toFixed(2)}</td>` : ''}
          <td style="text-align:right;">${moneda}${item.ImpTotal.toFixed(2)}</td>
        </tr>
      `}).join('')

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

            .detalle-table col.col-cant   { width: 55px; }
            .detalle-table col.col-desc   { width: auto; min-width: 200px; }
            .detalle-table col.col-estado { width: 85px; }
            .detalle-table col.col-precio { width: 90px; }
            .detalle-table col.col-total  { width: 70px; }

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
                <col class="col-estado" />
                <col class="col-precio" />
                ${hayDescuento ? '<col class="col-precio" />' : ''}
                <col class="col-total" />
              </colgroup>
              <thead>
                <tr>
                  <th>Cantidad</th>
                  <th>Descripción</th>
                  <th style="white-space:nowrap;">Estado</th>
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
                  <td colspan="3" rowspan="2" style="font-size:10px;color:#000;vertical-align:middle;padding:6px 8px;border-top:1px solid #000;">
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

      iframe.contentDocument.open()
      iframe.contentDocument.write(html)
      iframe.contentDocument.close()
    } finally {
      setReimprimiendo(prev => { const s = new Set(prev); s.delete(rowId); return s })
    }
  }

  // ── Imprimir factura de abono (PDF) ────────────────────────────────────────
  const imprimirFacturaAbono = async (itemsSeleccionados, responseDte, totalNeto, totalIva, totalFinal, encParam = null) => {
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

    const enc = encParam ?? consignacionAbonar
    if (!enc) return
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

    const esCF           = (cliente.nit || '').toUpperCase() === 'CF' || Number(enc.idCliente?.idCliente ?? enc.idCliente) === 1
    const nombreDte      = fel.nombreResAPI || fel.nombre || null
    const nombreCliente  = (!esCF && nombreDte) ? nombreDte : getNombreCliente(enc)
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

  // ── Confirmar Abono ────────────────────────────────────────────────────────
  const confirmarAbono = async () => {
    if (!consignacionAbonar) return
    const monto = parseFloat(montoPago)
    if (!monto || monto <= 0) {
      setMsgAbono({ visible: true, ok: false, texto: 'El monto de pago debe ser mayor a 0.' })
      return
    }
    const saldo = Number(consignacionAbonar.saldoPendiente ?? 0)
    if (monto > saldo) {
      setMsgAbono({ visible: true, ok: false, texto: `El monto no puede ser mayor al saldo pendiente (${formatMoneda(saldo)}).` })
      return
    }
    setConfirmandoAbono(true)
    setMsgAbono({ visible: false, ok: false, texto: '' })
    try {
      const bodyPago = {
        idEncabezadoFactura:   Number(consignacionAbonar.idEncabezadoFactura),
        montoPago:             monto,
        fechaPago:             fechaPago,
        observaciones:         observacionesAbono.trim(),
        idUsuarioModificacion: Number(idUsuarioActual),
      }
      console.log('[grabarConsignacionPago] Body enviado:', bodyPago)
      const res = await fetch('/api/consignacionPagos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(bodyPago),
      })
      if (!res.ok) throw new Error(`Error ${res.status} al guardar el pago`)
      setMsgAbono({ visible: true, ok: true, texto: '✅ Pago guardado correctamente.' })
      setMontoPago('')
      setObservacionesAbono('')
      setFechaPago(new Date().toISOString().split('T')[0])
      cargarPagos(Number(consignacionAbonar.idEncabezadoFactura))
      // Recargar encabezado para actualizar saldoPendiente y totalPagado
      try {
        const idEnc = Number(consignacionAbonar.idEncabezadoFactura)
        const params = new URLSearchParams({ page: 0, size: 10000 })
        if (filtroAplicado.inicio) params.append('fechaInicio', filtroAplicado.inicio)
        if (filtroAplicado.fin)    params.append('fechaFin',    filtroAplicado.fin)
        const resEnc = await fetch(`/api/erpEncabezadoFacturas?${params}`)
        if (resEnc.ok) {
          const dataEnc = await resEnc.json()
          const lista = Array.isArray(dataEnc) ? dataEnc : dataEnc.content ?? []
          const encActualizado = lista.find(e => Number(e.idEncabezadoFactura) === idEnc)
          if (encActualizado) setConsignacionAbonar(encActualizado)
        }
      } catch (_) {}
      cargarConsignaciones(paginaActual, filtroAplicado)
    } catch (e) {
      setMsgAbono({ visible: true, ok: false, texto: `❌ Ocurrió un error al guardar el pago: ${e.message}` })
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
      { width: 13 }, // Saldo Pendiente
      { width: 11 }, // Total Pagado
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

    const filaEnc = ws.addRow(['#', 'Referencia', 'Fecha Emisión', 'Cliente', 'Tipo Documento', 'Monto Total', 'Saldo Pendiente', 'Total Pagado', 'Estado'])
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
        getNombreCliente(f),
        tipoDoc,
        f.total ?? 0,
        f.saldoPendiente ?? 0,
        f.totalPagado ?? 0,
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
              <CRow className="gy-2 align-items-end mb-3">
                <CCol md="auto">
                  <CFormLabel className="fw-bold mb-1">Fecha Inicio</CFormLabel>
                  <CFormInput
                    type="date"
                    value={fechaInicio}
                    max={fechaFin || undefined}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    style={{ minWidth: '160px' }}
                  />
                </CCol>
                <CCol md="auto">
                  <CFormLabel className="fw-bold mb-1">Fecha Fin</CFormLabel>
                  <CFormInput
                    type="date"
                    value={fechaFin}
                    min={fechaInicio || undefined}
                    onChange={(e) => setFechaFin(e.target.value)}
                    style={{ minWidth: '160px' }}
                  />
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
                <CCol md={2}>
                  <CFormLabel className="fw-bold mb-1">Estado</CFormLabel>
                  <CFormSelect
                    value={filtroEstado}
                    onChange={(e) => handleEstadoChange(e.target.value)}
                    disabled={cargando}
                    style={{ minWidth: '160px' }}
                  >
                    <option value="">Todos</option>
                    <option value="S">Procesadas</option>
                    <option value="N">No Procesadas</option>
                  </CFormSelect>
                </CCol>
                <CCol md="auto" className="d-flex gap-2 ms-auto">
                  <CButton color="primary" onClick={handleBuscar} disabled={cargando}>
                    {cargando ? <CSpinner size="sm" /> : 'Buscar'}
                  </CButton>
                  <CButton color="secondary" className="text-white" onClick={handleLimpiar} disabled={cargando}>Limpiar</CButton>
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
                  <CCol>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#1a3a6b' }}>
                      <div className="text-muted small mb-1">Período Consultado</div>
                      <div className="fw-bold" style={{ color: '#1a8fd1', fontSize: '0.95rem' }}>
                        {!filtroAplicado.inicio && !filtroAplicado.fin
                          ? 'Todas las fechas'
                          : filtroAplicado.inicio === filtroAplicado.fin
                            ? formatFecha(filtroAplicado.inicio)
                            : `${formatFecha(filtroAplicado.inicio)} — ${formatFecha(filtroAplicado.fin)}`}
                      </div>
                    </div>
                  </CCol>
                  <CCol>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#321fdb' }}>
                      <div className="text-muted small mb-1">Consignaciones</div>
                      <div className="fs-5 fw-bold text-primary">
                        {resumen.cantidad}
                      </div>
                    </div>
                  </CCol>
                  <CCol>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#2eb85c' }}>
                      <div className="text-muted small mb-1">Monto Total</div>
                      <div className="fs-5 fw-bold text-success">
                        {formatMoneda(resumen.montoTotal)}
                      </div>
                    </div>
                  </CCol>
                  <CCol>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#e68a00' }}>
                      <div className="text-muted small mb-1">Total Pagado</div>
                      <div className="fs-5 fw-bold" style={{ color: resumen.totalPagado >= resumen.montoTotal && resumen.montoTotal > 0 ? '#2eb85c' : '#e68a00' }}>
                        {formatMoneda(resumen.totalPagado)}
                      </div>
                    </div>
                  </CCol>
                  <CCol>
                    <div className="border rounded p-3 text-center" style={{ borderColor: '#dc3545' }}>
                      <div className="text-muted small mb-1">Saldo Pendiente</div>
                      <div className="fs-5 fw-bold" style={{ color: resumen.saldoPendiente <= 0 ? '#2eb85c' : '#dc3545' }}>
                        {formatMoneda(resumen.saldoPendiente)}
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
                        <CTableHeaderCell className="text-end">Monto Total</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Saldo Pendiente</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Total Pagado</CTableHeaderCell>
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
                              <CTableDataCell>{getNombreCliente(f)}</CTableDataCell>
                              <CTableDataCell>
                                {tiposDocumento[String(f.tipoDocumento)] ?? f.tipoDocumento ?? '—'}
                              </CTableDataCell>
                              <CTableDataCell className="text-end fw-bold text-success">{formatMoneda(f.total)}</CTableDataCell>
                              <CTableDataCell className="text-end fw-bold" style={{ color: Number(f.saldoPendiente) === 0 ? '#198754' : '#dc3545' }}>{formatMoneda(f.saldoPendiente)}</CTableDataCell>
                              <CTableDataCell className="text-end fw-bold" style={{ color: Number(f.totalPagado) === Number(f.total) ? '#198754' : '#e8680a' }}>{formatMoneda(f.totalPagado)}</CTableDataCell>
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
                                  color="success"
                                  size="sm"
                                  className="text-white me-1"
                                  onClick={() => handleAgregarProductos(f)}
                                >
                                  Agregar
                                </CButton>
                                <CButton
                                  color="secondary"
                                  size="sm"
                                  className="text-white"
                                  onClick={() => handleReimprimir(f)}
                                  disabled={reimprimiendo.has(f.idEncabezadoFactura)}
                                >
                                  {reimprimiendo.has(f.idEncabezadoFactura) ? <CSpinner size="sm" /> : 'Reimprimir'}
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
      <CModal size="lg" visible={modalVer} onClose={() => { document.activeElement?.blur(); setModalVer(false) }}>
        <CModalHeader>
          <CModalTitle>
            Detalle — Consignación {facturaSeleccionada?.preimpresoResAPI || ''}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {facturaSeleccionada && (
            <>
              <CRow className="mb-3">
                <CCol md={6}>
                  <div><strong>Referencia:</strong> {calcularReferencia(facturaSeleccionada)}</div>
                  <div><strong>Fecha Emisión:</strong> {formatFecha(facturaSeleccionada.FechaFactura || facturaSeleccionada.fechaFactura || facturaSeleccionada.fecha)}</div>
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
                <CCol md={6}>
                  <div><strong>Cliente:</strong> {
                    (facturaSeleccionada.idCliente?.nit || '').toString().toUpperCase() === 'CF'
                      ? (facturaSeleccionada.nombreFactura || 'Consumidor Final')
                      : (facturaSeleccionada.idCliente?.nombreCliente || '—')
                  }</div>
                  <div>
                    {(() => {
                      const tipoRec = String(facturaSeleccionada.tipoReceptor ?? '1')
                      const label = tipoRec === '2' ? 'DPI' : tipoRec === '3' ? 'Pasaporte' : 'NIT'
                      const valor =
                        tipoRec === '1'
                          ? (facturaSeleccionada.idCliente?.nit || '—')
                          : (facturaSeleccionada.idCliente?.documentoIdentificacion || facturaSeleccionada.idCliente?.dpiPasaporte || '—')
                      return <><strong>{label}:</strong> {valor}</>
                    })()}
                  </div>
                  <div><strong>Dirección Cliente:</strong> {facturaSeleccionada.idCliente?.direccionFisica || '—'}</div>
                  <div><strong>Dirección Entrega:</strong> {facturaSeleccionada.direccionEntrega || '—'}</div>
                </CCol>
              </CRow>

              <hr />

              {cargandoDetalle ? (
                <div className="text-center py-3"><CSpinner color="primary" size="sm" /> Cargando detalle...</div>
              ) : errorDetalle ? (
                <div className="alert alert-danger py-2">{errorDetalle}</div>
              ) : detalleFactura.length === 0 ? (
                <div className="alert alert-info py-2">Sin líneas de detalle.</div>
              ) : (
                <CTable striped bordered responsive size="sm">
                  <CTableHead style={headerStyle}>
                    <CTableRow>
                      <CTableHeaderCell className="text-center">Cantidad</CTableHeaderCell>
                      <CTableHeaderCell>Descripción</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Precio</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Descuento</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 140 }}>Estado</CTableHeaderCell>
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
                        <CTableDataCell className="text-center">
                          <span
                            className="badge"
                            style={{
                              backgroundColor: String(d.consignacionFacturada) === '1' ? '#198754' : '#e8680a',
                              color: '#fff',
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {String(d.consignacionFacturada) === '1' ? 'Facturado' : 'No Facturado'}
                          </span>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}

              <div className="text-end mt-3">
                <div><strong>Saldo Pendiente:</strong> {formatMoneda(facturaSeleccionada.saldoPendiente)}</div>
                <div><strong>Total Pagado:</strong> {formatMoneda(facturaSeleccionada.totalPagado)}</div>
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
      <CModal size="xl" visible={modalAbonar} backdrop="static" onClose={() => { if (!confirmandoAbono) setModalAbonar(false) }}>
        <CModalHeader style={{ backgroundColor: '#1a3a6b', color: '#fff' }}>
          <CModalTitle className="d-flex align-items-center gap-2">
            💳 Registrar Pago — {consignacionAbonar ? calcularReferencia(consignacionAbonar) : ''}
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          {consignacionAbonar && (
            <>
              {/* Info de la consignación */}
              <div className="rounded-3 border p-3 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                <h6 className="fw-bold text-primary mb-2">Información de la consignación</h6>
                <CRow className="g-2">
                  <CCol md={6}>
                    <small className="text-muted d-block">Referencia</small>
                    <strong>{calcularReferencia(consignacionAbonar)}</strong>
                  </CCol>
                  <CCol md={6}>
                    <small className="text-muted d-block">Cliente</small>
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <strong>{getNombreCliente(consignacionAbonar)}</strong>
                      <CButton color="secondary" className="text-white" style={{ fontSize: '0.8rem' }} onClick={imprimirConstanciaPagos} disabled={pagosList.length === 0}>
                        🖨️ Imprimir Constancia
                      </CButton>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <small className="text-muted d-block">Fecha Emisión</small>
                    <strong>{formatFecha(consignacionAbonar.FechaFactura || consignacionAbonar.fechaFactura)}</strong>
                  </CCol>
                  <CCol md={6}>
                    <small className="text-muted d-block">Estado</small>
                    <span className="badge" style={{
                      backgroundColor: consignacionAbonar.facturaProcesada === 'S' ? '#198754' : '#fd7e14',
                      color: '#fff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6,
                    }}>
                      {consignacionAbonar.facturaProcesada === 'S' ? 'Procesada' : 'Pendiente'}
                    </span>
                  </CCol>
                  <CCol md={6}>
                    <small className="text-muted d-block">Monto Total</small>
                    <strong className="text-success">{formatMoneda(consignacionAbonar.total)}</strong>
                  </CCol>
                  <CCol md={3}>
                    <small className="text-muted d-block">Saldo Pendiente</small>
                    <strong style={{ color: Number(consignacionAbonar.saldoPendiente) === 0 ? '#198754' : '#dc3545' }}>
                      {formatMoneda(consignacionAbonar.saldoPendiente)}
                    </strong>
                  </CCol>
                  <CCol md={3}>
                    <small className="text-muted d-block">Total Pagado</small>
                    <div className="d-flex justify-content-between align-items-center">
                      <strong style={{ color: Number(consignacionAbonar.totalPagado) === Number(consignacionAbonar.total) ? '#198754' : '#e8680a' }}>
                        {formatMoneda(consignacionAbonar.totalPagado)}
                      </strong>
                      {consignacionAbonar.facturaProcesada === 'S' && (
                        <span className="badge bg-danger ms-auto" style={{ fontSize: '0.7rem' }}>Consignación procesada</span>
                      )}
                    </div>
                  </CCol>
                </CRow>
              </div>

              {/* Formulario de pago */}
              <CRow className="g-3 align-items-end">
                <CCol md={3}>
                  <CFormLabel className="fw-bold">Monto del Pago <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={montoPago}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || parseFloat(val) > 0) setMontoPago(val)
                    }}
                    disabled={confirmandoAbono || Number(consignacionAbonar.saldoPendiente) === 0}
                    style={{ MozAppearance: 'textfield', borderColor: montoPago !== '' && (parseFloat(montoPago) <= 0 || parseFloat(montoPago) > Number(consignacionAbonar.saldoPendiente ?? 0)) ? '#dc3545' : undefined }}
                  />
                  {montoPago !== '' && (isNaN(parseFloat(montoPago)) || parseFloat(montoPago) <= 0) && (
                    <small className="text-danger">El monto debe ser mayor a 0</small>
                  )}
                  {montoPago !== '' && !isNaN(parseFloat(montoPago)) && parseFloat(montoPago) > Number(consignacionAbonar.saldoPendiente ?? 0) && (
                    <small className="text-danger">Supera el saldo pendiente ({formatMoneda(consignacionAbonar.saldoPendiente)})</small>
                  )}
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="fw-bold">Fecha de Pago <span className="text-danger">*</span></CFormLabel>
                  <CFormInput
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    disabled={confirmandoAbono || Number(consignacionAbonar.saldoPendiente) === 0}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel className="fw-bold">Observaciones</CFormLabel>
                  <CFormInput
                    type="text"
                    placeholder="Ej. Pago realizado con tarjeta..."
                    value={observacionesAbono}
                    onChange={(e) => setObservacionesAbono(e.target.value)}
                    disabled={confirmandoAbono || Number(consignacionAbonar.saldoPendiente) === 0}
                  />
                </CCol>
                <CCol md={2}>
                  <CButton
                    className="w-100"
                    style={{ backgroundColor: '#1a3a6b', borderColor: '#1a3a6b', color: '#fff' }}
                    disabled={Number(consignacionAbonar.saldoPendiente) === 0 || !montoPago || parseFloat(montoPago) <= 0 || parseFloat(montoPago) > Number(consignacionAbonar.saldoPendiente ?? 0) || !fechaPago || confirmandoAbono}
                    onClick={confirmarAbono}
                  >
                    {confirmandoAbono
                      ? <CSpinner size="sm" />
                      : '💳 Registrar Pago'
                    }
                  </CButton>
                </CCol>
              </CRow>

              {/* Grid de abonos registrados */}
              <div className="mt-4">
                <h6 className="fw-bold text-secondary mb-2">Abonos registrados</h6>
                {cargandoPagos ? (
                  <div className="text-center py-3">
                    <CSpinner color="primary" size="sm" />
                    <span className="ms-2 text-muted small">Cargando abonos...</span>
                  </div>
                ) : pagosList.length === 0 ? (
                  <div className="alert alert-info py-2 small mb-0">Sin abonos registrados.</div>
                ) : (
                  <CTable striped bordered responsive size="sm" className="mb-0">
                    <CTableHead style={{ backgroundColor: '#343a40', color: '#fff' }}>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: 50 }}>#</CTableHeaderCell>
                        <CTableHeaderCell className="text-end" style={{ width: 140 }}>Monto</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: 130 }}>Fecha Pago</CTableHeaderCell>
                        <CTableHeaderCell>Observaciones</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {pagosList.map((p, i) => (
                        <CTableRow key={p.idConsignacionPago ?? i}>
                          <CTableDataCell className="text-center text-muted small">{i + 1}</CTableDataCell>
                          <CTableDataCell className="text-end fw-bold">{formatMoneda(p.montoPago ?? p.monto)}</CTableDataCell>
                          <CTableDataCell>{p.fechaPago ? formatFecha(p.fechaPago) : '—'}</CTableDataCell>
                          <CTableDataCell className="text-muted small">{p.observaciones || '—'}</CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </div>

              {msgAbono.visible && (
                <div className={`alert mt-3 py-2 ${msgAbono.ok ? 'alert-success' : 'alert-danger'}`} style={{ fontSize: '0.9rem' }}>
                  {msgAbono.texto}
                </div>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton color="secondary" onClick={() => setModalAbonar(false)} disabled={confirmandoAbono}>
            Cancelar
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── Modal Agregar productos ──────────────────────────────────────────── */}
      <CModal size="xl" visible={modalAgregar} backdrop="static" keyboard={false} onClose={() => { if (!guardandoAgregar) setModalAgregar(false) }}>
        <CModalHeader className="bg-primary text-white">
          <CModalTitle className="d-flex align-items-center gap-2">
            <span>🛒</span> Agregar Productos a Consignación
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          {consignacionAgregar && (
            <>
              {/* ── Información de la consignación ── */}
              <div className="rounded-3 border p-3 mb-3" style={{ backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }}>
                <h6 className="text-primary fw-bold mb-3">Información de la consignación</h6>
                <CRow className="g-3">
                  <CCol md={4}>
                    <div className="d-flex flex-column">
                      <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Referencia</small>
                      <span className="fw-semibold">{calcularReferencia(consignacionAgregar)}</span>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="d-flex flex-column">
                      <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Fecha Emisión</small>
                      <span className="fw-semibold">{formatFecha(consignacionAgregar.FechaFactura || consignacionAgregar.fechaFactura || consignacionAgregar.fecha)}</span>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="d-flex flex-column">
                      <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Tipo Documento</small>
                      <span className="fw-semibold">{tiposDocumento[String(consignacionAgregar.tipoDocumento)] ?? consignacionAgregar.tipoDocumento ?? '—'}</span>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="d-flex flex-column">
                      <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Cliente</small>
                      <span className="fw-semibold">
                        {(consignacionAgregar.idCliente?.nit || '').toString().toUpperCase() === 'CF'
                          ? (consignacionAgregar.nombreFactura || 'Consumidor Final')
                          : (consignacionAgregar.idCliente?.nombreCliente || '—')}
                      </span>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="d-flex flex-column">
                      <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>NIT</small>
                      <span className="fw-semibold">{consignacionAgregar.idCliente?.nit || '—'}</span>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="d-flex flex-column">
                      <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Estado</small>
                      <div className="mt-1">
                        <span
                          className="badge rounded-pill"
                          style={{
                            backgroundColor: consignacionAgregar.facturaProcesada === 'S' ? '#198754' : consignacionAgregar.facturaProcesada === 'A' ? '#dc3545' : '#fd7e14',
                            color: '#fff', fontSize: '0.75rem', padding: '4px 10px',
                          }}
                        >
                          {consignacionAgregar.facturaProcesada === 'S' ? '✔ Procesada' : consignacionAgregar.facturaProcesada === 'A' ? '✖ Anulada' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="d-flex flex-column">
                      <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Dirección Cliente</small>
                      <span className="fw-semibold">{consignacionAgregar.idCliente?.direccionFisica || '—'}</span>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="d-flex flex-column">
                      <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Dirección Entrega</small>
                      <span className="fw-semibold">{consignacionAgregar.direccionEntrega || '—'}</span>
                    </div>
                  </CCol>
                </CRow>
              </div>

              <hr />

              {/* ── Tabla de productos a agregar ── */}
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 mt-2">
                  <h6 className="text-primary mb-0">Detalle de Productos</h6>
                  <div className="d-flex gap-2">
                    <CButton
                      style={{ backgroundColor: '#e8680a', borderColor: '#e8680a', color: '#fff' }}
                      size="sm"
                      onClick={() => { setSeleccionadosFacturar(new Set()); setModalFacturar(true) }}
                    >
                      🧾 Facturar
                    </CButton>
                    <span
                      title={consignacionAgregar?.facturaProcesada === 'S' ? 'No se pueden agregar productos a una consignación procesada' : ''}
                      style={{ cursor: consignacionAgregar?.facturaProcesada === 'S' ? 'not-allowed' : 'auto' }}
                    >
                      <CButton
                        color="success"
                        size="sm"
                        className="text-light"
                        disabled={consignacionAgregar?.facturaProcesada === 'S'}
                        style={{ pointerEvents: consignacionAgregar?.facturaProcesada === 'S' ? 'none' : 'auto' }}
                        onClick={() => {
                          setBusquedaAgregar('')
                          setSugerenciasAgregar([])
                          setMostrarSugerenciasAgregar(false)
                          setVisibleSubModalBuscar(true)
                        }}
                      >
                        + Agregar Producto
                      </CButton>
                    </span>
                  </div>
                </div>

                {cargandoExistentes ? (
                  <div className="text-center py-4">
                    <CSpinner size="sm" className="me-2" />
                    <span className="text-muted">Cargando productos de la consignación...</span>
                  </div>
                ) : (
                  <CTable striped bordered hover responsive>
                    <CTableHead style={{ '--cui-table-bg': '#6c757d', '--cui-table-color': '#fff', '--cui-table-border-color': '#7d868e', backgroundColor: '#6c757d', color: '#fff' }}>
                      <CTableRow>
                        <CTableHeaderCell className="py-2">No.</CTableHeaderCell>
                        <CTableHeaderCell className="py-2">Descripción</CTableHeaderCell>
                        <CTableHeaderCell className="py-2 text-center">Cantidad</CTableHeaderCell>
                        <CTableHeaderCell className="py-2 text-end">Precio Unit.</CTableHeaderCell>
                        <CTableHeaderCell className="py-2 text-end">Descuento</CTableHeaderCell>
                        <CTableHeaderCell className="py-2 text-end">Total</CTableHeaderCell>
                        <CTableHeaderCell className="py-2 text-center" style={{ width: 130 }}>Estado</CTableHeaderCell>
                        {lineasAgregar.some(l => l._existente === false) && <CTableHeaderCell className="py-2 text-center">Eliminar</CTableHeaderCell>}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {lineasAgregar.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={lineasAgregar.some(l => l._existente === false) ? 8 : 7} className="text-center py-4 text-muted">
                            No hay productos en esta consignación. Haga clic en &quot;+ Agregar Producto&quot; para añadir.
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        lineasAgregar.map((linea, idx) => {
                          const cant   = Number(linea.cantidad)       || 0
                          const precio = Number(linea.precioUnitario) || 0
                          const desc   = Number(linea.descuento)      || 0
                          const total  = cant * precio - desc
                          if (linea._existente) {
                            // Fila existente — solo lectura en el modal principal
                            return (
                              <CTableRow key={linea._key ?? idx} className="table-light">
                                <CTableDataCell>{idx + 1}</CTableDataCell>
                                <CTableDataCell>
                                  <strong>{linea.descripcion}</strong>
                                  <br />
                                  <small className="text-muted">Código: {linea.codigo}</small>
                                </CTableDataCell>
                                <CTableDataCell className="text-center">{Number(linea.cantidad) || 0}</CTableDataCell>
                                <CTableDataCell className="text-end">Q{precio.toFixed(2)}</CTableDataCell>
                                <CTableDataCell className="text-end">Q{desc.toFixed(2)}</CTableDataCell>
                                <CTableDataCell className="text-end fw-bold">Q{Number(linea.total).toFixed(2)}</CTableDataCell>
                                <CTableDataCell className="text-center">
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor: String(linea.consignacionFacturada) === '1' ? '#198754' : '#e8680a',
                                      color: '#fff',
                                      fontSize: '0.75rem',
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                    }}
                                  >
                                    {String(linea.consignacionFacturada) === '1' ? 'Facturado' : 'No Facturado'}
                                  </span>
                                </CTableDataCell>
                                {lineasAgregar.some(l => l._existente === false) && <CTableDataCell className="text-center text-muted">—</CTableDataCell>}
                              </CTableRow>
                            )
                          }
                          // Fila nueva — solo lectura en el modal principal
                          return (
                            <CTableRow key={linea._key ?? linea.idInventario ?? idx} className="table-warning bg-opacity-25">
                              <CTableDataCell>{idx + 1}</CTableDataCell>
                              <CTableDataCell>
                                <strong>{linea.descripcion}</strong>
                                <span className="badge bg-success ms-2" style={{ fontSize: '0.7rem' }}>Nuevo</span>
                                <br />
                                <small className="text-muted">Código: {linea.codigo}</small>
                              </CTableDataCell>
                              <CTableDataCell className="text-center">{Number(linea.cantidad) || 0}</CTableDataCell>
                              <CTableDataCell className="text-end">Q{Number(linea.precioUnitario).toFixed(2)}</CTableDataCell>
                              <CTableDataCell className="text-end">Q{Number(linea.descuento).toFixed(2)}</CTableDataCell>
                              <CTableDataCell className="text-end fw-bold">Q{Number(linea.total).toFixed(2)}</CTableDataCell>
                              <CTableDataCell className="text-center">
                                <span
                                  className="badge"
                                  style={{ backgroundColor: '#e8680a', color: '#fff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: 6 }}
                                >
                                  No Facturado
                                </span>
                              </CTableDataCell>
                              <CTableDataCell className="text-center">
                                <CButton color="danger" size="sm" className="text-white" onClick={() => eliminarLineaAgregar(idx)}>
                                  🗑️
                                </CButton>
                              </CTableDataCell>
                            </CTableRow>
                          )
                        })
                      )}
                    </CTableBody>
                  </CTable>
                )}

                {lineasAgregar.length > 0 && (() => {
                  const totalBruto = lineasAgregar.reduce((s, l) => s + (Number(l.total) || 0), 0)
                  const subtotal   = totalBruto / 1.12
                  const descuento  = lineasAgregar.reduce((s, l) => s + (Number(l.descuento) || 0), 0)
                  const iva        = totalBruto * 0.12 / 1.12
                  return (
                    <div className="d-flex justify-content-end mt-2">
                      <div className="border rounded p-3" style={{ minWidth: 280 }}>
                        <CRow className="mb-1">
                          <CCol xs={6}><small className="fw-semibold">SubTotal:</small></CCol>
                          <CCol xs={6}><CFormInput type="text" value={`Q${subtotal.toFixed(2)}`} readOnly disabled size="sm" className="text-end" style={{ backgroundColor: '#e9ecef' }} /></CCol>
                        </CRow>
                        <CRow className="mb-1">
                          <CCol xs={6}><small className="fw-semibold">Total Descuento:</small></CCol>
                          <CCol xs={6}><CFormInput type="text" value={`Q${descuento.toFixed(2)}`} readOnly disabled size="sm" className="text-end" style={{ backgroundColor: '#e9ecef' }} /></CCol>
                        </CRow>
                        <CRow className="mb-1">
                          <CCol xs={6}><small className="fw-semibold">Impuesto IVA:</small></CCol>
                          <CCol xs={6}><CFormInput type="text" value={`Q${iva.toFixed(2)}`} readOnly disabled size="sm" className="text-end" style={{ backgroundColor: '#e9ecef' }} /></CCol>
                        </CRow>
                        <CRow className="pt-1 border-top">
                          <CCol xs={6}><small className="fw-bold">Total:</small></CCol>
                          <CCol xs={6}><CFormInput type="text" value={`Q${totalBruto.toFixed(2)}`} readOnly disabled size="sm" className="text-end fw-bold text-success" style={{ backgroundColor: '#e9ecef' }} /></CCol>
                        </CRow>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {msgAgregar.visible && (
                <div className={`alert mt-3 py-2 ${msgAgregar.ok ? 'alert-success' : 'alert-danger'}`}>
                  {msgAgregar.texto}
                </div>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton
            color="light"
            className="border d-flex align-items-center gap-2"
            onClick={() => setModalAgregar(false)}
            disabled={guardandoAgregar}
          >
            <span>✖️</span> Cancelar
          </CButton>
          <CButton
            color="primary"
            className="text-light d-flex align-items-center gap-2"
            disabled={lineasAgregar.length === 0 || guardandoAgregar}
            onClick={guardarNuevosProductos}
          >
            {guardandoAgregar
              ? <><CSpinner size="sm" className="me-1" />Guardando...</>
              : <><span>✔️</span> Confirmar ({lineasAgregar.filter(l => l._existente === false).length} nuevos)</>
            }
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── Sub-modal: Buscar y seleccionar producto ── */}
      <CModal
        visible={visibleSubModalBuscar}
        onClose={() => {
          // Al cerrar con X, eliminar nuevos con cantidad 0 sin advertir
          setLineasAgregar(prev => prev.filter(l => l._existente || (Number(l.cantidad) || 0) > 0))
          setErrorCantidadSubModal('')
          setErrorStockSubModal('')
          setVisibleSubModalBuscar(false)
        }}
        size="xl"
        backdrop="static"
        keyboard={false}
      >
        <CModalHeader className="bg-primary text-white">
          <CModalTitle className="d-flex align-items-center gap-2">
            <span>🛒</span> Agregar Productos a la Consignación
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          {/* Buscador */}
          <div className="mb-4">
            <h6 className="mb-3">🔍 Buscar Producto</h6>
            <CRow>
              <CCol xs={12}>
                <div style={{ position: 'relative' }}>
                  <CFormInput
                    type="text"
                    placeholder="Buscar por código, código proveedor o descripción..."
                    value={busquedaAgregar}
                    onChange={(e) => {
                      setBusquedaAgregar(e.target.value)
                      clearTimeout(debounceAgregar.current)
                      debounceAgregar.current = setTimeout(() => buscarProductoAgregar(e.target.value), 400)
                    }}
                    autoComplete="off"
                    className="form-control-lg"
                  />
                  {cargandoBusquedaAgregar && (
                    <small className="text-muted">Cargando inventario...</small>
                  )}
                  {mostrarSugerenciasAgregar && sugerenciasAgregar.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1050,
                        maxHeight: '250px',
                        overflowY: 'auto',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                      className="list-group"
                    >
                      <div className="list-group-item list-group-item-primary py-2">
                        <small><strong>Productos encontrados:</strong> Haga clic para agregar</small>
                      </div>
                      {sugerenciasAgregar.map((p, idx) => {
                        const codigo  = p.idProducto?.codigoProducto  || p.codigoProducto  || ''
                        const codProv = p.idProducto?.codigoProductoProveedor || p.codigoProductoProveedor || ''
                        const desc    = p.idProducto?.descripcionProducto || p.descripcionProducto || ''
                        const precio  = Number(p.idProducto?.precioVenta ?? p.precioVenta ?? 0)
                        const stock   = p.cantidadExistencias ?? p.stock ?? 0
                        return (
                          <button
                            key={p.idInventario ?? idx}
                            type="button"
                            className="list-group-item list-group-item-action text-start"
                            onClick={() => seleccionarProductoAgregar(p)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex justify-content-between">
                              <div>
                                <strong>{codigo}</strong>
                                {codProv && <span className="text-muted ms-2">| Prov: {codProv}</span>}
                                {' '}- {desc}
                              </div>
                              <div>
                                <span className="badge bg-success">Q {precio.toFixed(2)}</span>
                              </div>
                            </div>
                            <small className="text-muted">
                              Stock: {stock}
                            </small>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CCol>
            </CRow>
          </div>

          {/* Detalle de productos seleccionados */}
          <div className="mb-3">
            <h6 className="text-primary mb-3">Detalle de Productos</h6>
            <CTable bordered hover responsive>
              <CTableHead style={{ '--cui-table-bg': '#6c757d', '--cui-table-color': '#fff', '--cui-table-border-color': '#7d868e', backgroundColor: '#6c757d', color: '#fff' }}>
                <CTableRow>
                  <CTableHeaderCell className="py-2">No.</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Descripción Producto</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Unidades</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Precio Unidad</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Precio</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Descuento</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Total</CTableHeaderCell>
                  {lineasAgregar.some(l => l._existente === false) && <CTableHeaderCell className="py-2 text-center">Eliminar</CTableHeaderCell>}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {lineasAgregar.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={lineasAgregar.some(l => l._existente === false) ? 8 : 7} className="text-center py-4 text-muted">
                      No hay productos agregados. Busque y seleccione productos arriba.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  lineasAgregar.map((item, index) => {
                    const cant   = Number(item.cantidad)       || 0
                    const precio = Number(item.precioUnitario) || 0
                    const desc   = Number(item.descuento)      || 0
                    const total  = cant * precio - desc
                    return (
                      <CTableRow key={item._key ?? item.idInventario ?? index}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <div>
                            <strong>{item.descripcion}</strong>
                            <br />
                            <small className="text-muted">Código: {item.codigo}</small>
                            {!item._existente && (
                              <>
                                <br />
                                <small className="text-muted">Stock: {item.stock ?? 0}</small>
                              </>
                            )}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          {item._existente ? (
                            <span>{Number(item.cantidad) || 0}</span>
                          ) : (
                            <CFormInput
                              type="text"
                              inputMode="numeric"
                              value={item.cantidad === '' ? '' : item.cantidad}
                              onChange={(e) => {
                                if (e.target.value !== '' && !/^\d+$/.test(e.target.value)) return
                                actualizarCantidadAgregar(index, e.target.value)
                              }}
                              placeholder="0"
                              size="sm"
                            />
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">Q{Number(item.precioUnitario).toFixed(2)}</CTableDataCell>
                        <CTableDataCell className="text-end">Q{Number(item.precio).toFixed(2)}</CTableDataCell>
                        <CTableDataCell>
                          {item._existente ? (
                            <span className="d-block text-end">Q{Number(item.descuento).toFixed(2)}</span>
                          ) : (
                            <CFormInput
                              type="text"
                              inputMode="decimal"
                              value={item.descuento === '' ? '' : item.descuento}
                              onChange={(e) => actualizarDescuentoAgregar(index, e.target.value)}
                              placeholder="0"
                              size="sm"
                            />
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">Q{Number(item.total).toFixed(2)}</CTableDataCell>
                        {item._existente ? (
                          lineasAgregar.some(l => l._existente === false) && <CTableDataCell className="text-center text-muted">—</CTableDataCell>
                        ) : (
                          <CTableDataCell className="text-center">
                            <CButton
                              color="danger"
                              size="sm"
                              onClick={() => eliminarLineaAgregar(index)}
                              title="Eliminar producto"
                            >
                              🗑️ Eliminar
                            </CButton>
                          </CTableDataCell>
                        )}
                      </CTableRow>
                    )
                  })
                )}
              </CTableBody>
            </CTable>

            {lineasAgregar.length > 0 && (() => {
              const totalBruto = lineasAgregar.reduce((s, p) => s + (Number(p.total) || 0), 0)
              const subtotal   = totalBruto / 1.12
              const descuento  = lineasAgregar.reduce((s, p) => s + (Number(p.descuento) || 0), 0)
              return (
                <div className="d-flex justify-content-end mt-3">
                  <div className="border rounded p-3" style={{ minWidth: '300px' }}>
                    <CRow className="mb-1">
                      <CCol xs={6}><small className="fw-semibold">SubTotal:</small></CCol>
                      <CCol xs={6}><CFormInput type="text" value={`Q${subtotal.toFixed(2)}`} readOnly disabled size="sm" className="text-end" style={{ backgroundColor: '#e9ecef' }} /></CCol>
                    </CRow>
                    <CRow className="mb-1">
                      <CCol xs={6}><small className="fw-semibold">Total Descuento:</small></CCol>
                      <CCol xs={6}><CFormInput type="text" value={`Q${descuento.toFixed(2)}`} readOnly disabled size="sm" className="text-end" style={{ backgroundColor: '#e9ecef' }} /></CCol>
                    </CRow>
                    <CRow className="pt-1 border-top">
                      <CCol xs={6}><small className="fw-bold">Total:</small></CCol>
                      <CCol xs={6}><CFormInput type="text" value={`Q${totalBruto.toFixed(2)}`} readOnly disabled size="sm" className="text-end fw-bold text-success" style={{ backgroundColor: '#e9ecef' }} /></CCol>
                    </CRow>
                  </div>
                </div>
              )
            })()}
          </div>
        </CModalBody>
        <CModalFooter className="bg-light">
          <div className="d-flex justify-content-end gap-2">
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => {
                setLineasAgregar(prev => prev.filter(l => l._existente || (Number(l.cantidad) || 0) > 0))
                setErrorCantidadSubModal(false)
                setVisibleSubModalBuscar(false)
              }}
            >
              Cancelar
            </CButton>
            <CButton
              color="primary"
              onClick={() => {
                const sinCantidad = lineasAgregar.filter(l => l._existente === false && (Number(l.cantidad) || 0) === 0)
                if (sinCantidad.length > 0) {
                  setErrorCantidadSubModal(true)
                  return
                }
                setErrorCantidadSubModal(false)
                setVisibleSubModalBuscar(false)
              }}
              disabled={lineasAgregar.filter(l => l._existente === false).length === 0}
            >
              <span>✅</span> Confirmar Productos
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      {/* ── Modal Facturar ─────────────────────────────────────────────────── */}
      <CModal
        size="xl"
        visible={modalFacturar}
        onClose={() => setModalFacturar(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader style={{ backgroundColor: '#f8f9fa', color: '#212529' }}>
          <CModalTitle className="d-flex align-items-center gap-2">
            <span>🧾</span> Facturar Consignación
          </CModalTitle>
        </CModalHeader>        <CModalBody>
          {consignacionAgregar && (
            <>
              {/* Información de la consignación */}
              <CRow className="mb-3 g-2">
                <CCol md={4}>
                  <div><strong>Referencia:</strong> {calcularReferencia(consignacionAgregar)}</div>
                  <div><strong>Fecha Emisión:</strong> {formatFecha(consignacionAgregar.FechaFactura || consignacionAgregar.fechaFactura || consignacionAgregar.fecha)}</div>
                </CCol>
                <CCol md={4}>
                  <div><strong>Cliente:</strong> {getNombreCliente(consignacionAgregar)}</div>
                  <div><strong>Tipo Documento:</strong> {tiposDocumento[String(consignacionAgregar.tipoDocumento)] ?? consignacionAgregar.tipoDocumento ?? '—'}</div>
                </CCol>
                <CCol md={4}>
                  <div>
                    <strong>Estado:</strong>{' '}
                    <span
                      className="badge"
                      style={{
                        backgroundColor: consignacionAgregar.facturaProcesada === 'S' ? '#198754' : '#6c757d',
                        color: '#fff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: 6,
                      }}
                    >
                      {consignacionAgregar.facturaProcesada === 'S' ? 'Procesada' : 'Pendiente'}
                    </span>
                  </div>
                </CCol>
              </CRow>

              <hr className="my-2" />

              {/* Tabla de productos */}
              {lineasAgregar.filter(l => l._existente).length === 0 ? (
                <div className="alert alert-info py-2">Sin líneas de detalle.</div>
              ) : (
                <CTable striped bordered responsive size="sm">
                  <CTableHead style={headerStyle}>
                    <CTableRow>
                      <CTableHeaderCell className="py-2">No.</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Descripción Producto</CTableHeaderCell>
                      <CTableHeaderCell className="py-2 text-center">Cantidad</CTableHeaderCell>
                      <CTableHeaderCell className="py-2 text-end">Precio Unit.</CTableHeaderCell>
                      <CTableHeaderCell className="py-2 text-end">Descuento</CTableHeaderCell>
                      <CTableHeaderCell className="py-2 text-end">Total</CTableHeaderCell>
                      <CTableHeaderCell className="py-2 text-center" style={{ width: 140 }}>Estado</CTableHeaderCell>
                      <CTableHeaderCell className="py-2 text-center" style={{ width: 110 }}>
                        <div className="d-flex flex-column align-items-center justify-content-center gap-1">
                          <span style={{ fontSize: '0.8rem' }}>Seleccione</span>
                          {lineasAgregar.some(l => l._existente && String(l.consignacionFacturada) !== '1') && (
                            <CFormCheck
                              checked={
                                lineasAgregar
                                  .filter(l => l._existente && String(l.consignacionFacturada) !== '1' && l.idDetalleFactura)
                                  .every(l => seleccionadosFacturar.has(l.idDetalleFactura))
                              }
                              onChange={toggleTodosFacturar}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                        </div>
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {lineasAgregar.filter(l => l._existente).map((item, i) => {
                      const pendiente = String(item.consignacionFacturada) !== '1'
                      const marcado   = seleccionadosFacturar.has(item.idDetalleFactura)
                      return (
                        <CTableRow key={item._key ?? i} style={marcado ? { backgroundColor: '#fff3cd' } : {}}>
                          <CTableDataCell>{i + 1}</CTableDataCell>
                          <CTableDataCell>
                            <strong>{item.descripcion}</strong>
                            <br />
                            <small className="text-muted">Código: {item.codigo}</small>
                          </CTableDataCell>
                          <CTableDataCell className="text-center">{Number(item.cantidad) || 0}</CTableDataCell>
                          <CTableDataCell className="text-end">Q{Number(item.precioUnitario).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-end">Q{Number(item.descuento).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-end fw-bold">Q{Number(item.total).toFixed(2)}</CTableDataCell>
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
                              {pendiente ? 'No Facturado' : 'Facturado'}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {pendiente && item.idDetalleFactura ? (
                              <CFormCheck
                                checked={marcado}
                                onChange={() => toggleSeleccionFacturar(item.idDetalleFactura)}
                                style={{ cursor: 'pointer' }}
                              />
                            ) : (
                              <span
                                className="badge"
                                style={{ backgroundColor: '#198754', color: '#fff', fontSize: '0.7rem', padding: '3px 6px', borderRadius: 4 }}
                              >
                                Facturado
                              </span>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              )}

              {/* Totales */}
              {lineasAgregar.filter(l => l._existente).length > 0 && (() => {
                const items = lineasAgregar.filter(l => l._existente)
                const subtotal = items.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0)
                const totalDesc = items.reduce((s, l) => s + (Number(l.descuento) || 0), 0)
                const base = subtotal - totalDesc
                const iva = parseFloat((base - base / 1.12).toFixed(2))
                const total = base
                return (
                  <div className="text-end mt-3">
                    <div><strong>Subtotal:</strong> {formatMoneda(subtotal)}</div>
                    <div><strong>Total Descuento:</strong> {formatMoneda(totalDesc)}</div>
                    <div><strong>Impuesto IVA:</strong> {formatMoneda(iva)}</div>
                    <div className="fs-5 fw-bold"><strong>Total:</strong> {formatMoneda(total)}</div>
                  </div>
                )
              })()}
            </>
          )}
        </CModalBody>
        <CModalFooter className="bg-light d-flex flex-column align-items-stretch gap-2">
          {msgFacturar.visible && (
            <div className={`alert ${msgFacturar.ok ? 'alert-success' : 'alert-danger'} py-2 mb-0`}>
              {msgFacturar.texto}
            </div>
          )}
          <div className="d-flex justify-content-end gap-2">
            <CButton color="secondary" onClick={() => { setModalFacturar(false); setMsgFacturar({ visible: false, ok: false, texto: '' }) }}>Cerrar</CButton>
            <CButton
              style={{ backgroundColor: '#e8680a', borderColor: '#e8680a', color: '#fff' }}
              disabled={seleccionadosFacturar.size === 0 || confirmandoFacturar}
              onClick={confirmarFacturacion}
            >
              {confirmandoFacturar
                ? <><CSpinner size="sm" className="me-1" />Procesando...</>
                : `Confirmar Facturación (${seleccionadosFacturar.size})`
              }
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      {/* ── Modal alerta: cantidad excede stock (agregar producto) ── */}
      <CModal
        visible={alertaExcedeStockAgregar.visible}
        onClose={() => setAlertaExcedeStockAgregar({ visible: false, descripcion: '', stock: 0, cantidad: 0 })}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader style={{ backgroundColor: '#ffe5d0', borderBottom: '1px solid #ffbc8a' }}>
          <CModalTitle style={{ color: '#7a2e00', fontSize: '1rem', fontWeight: 'bold' }}>Cantidad excede el inventario</CModalTitle>
        </CModalHeader>
        <CModalBody className="py-4 px-4">
          <div className="d-flex align-items-start gap-3">
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>⚠️</span>
            <div>
              <p className="mb-2 text-muted" style={{ fontSize: '0.9rem' }}>
                La cantidad ingresada supera el stock disponible del producto:
              </p>
              <ul className="mb-2 ps-3">
                <li style={{ fontSize: '0.95rem' }}><strong>{alertaExcedeStockAgregar.descripcion || '—'}</strong></li>
              </ul>
              <p className="mb-0 text-muted small">
                Stock disponible: <strong style={{ color: '#dc3545' }}>{alertaExcedeStockAgregar.stock}</strong> — Cantidad ingresada: <strong>{alertaExcedeStockAgregar.cantidad}</strong>
              </p>
            </div>
          </div>
        </CModalBody>
        <CModalFooter style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6' }}>
          <CButton style={{ backgroundColor: '#7a2e00', borderColor: '#7a2e00', color: '#fff' }} onClick={() => setAlertaExcedeStockAgregar({ visible: false, descripcion: '', stock: 0, cantidad: 0 })}>
            Entendido
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── Modal alerta: sin existencias en inventario (agregar producto) ── */}
      <CModal
        visible={alertaSinStockAgregar.visible}
        onClose={() => setAlertaSinStockAgregar({ visible: false, descripcion: '', stock: 0 })}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader style={{ backgroundColor: '#ffe5d0', borderBottom: '1px solid #ffbc8a' }}>
          <CModalTitle style={{ color: '#7a2e00', fontSize: '1rem', fontWeight: 'bold' }}>Sin existencias de inventario</CModalTitle>
        </CModalHeader>
        <CModalBody className="py-4 px-4">
          <div className="d-flex align-items-start gap-3">
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>⚠️</span>
            <div>
              <p className="mb-2 text-muted" style={{ fontSize: '0.9rem' }}>
                No se puede agregar el producto porque no tiene <strong>existencias disponibles</strong>:
              </p>
              <ul className="mb-2 ps-3">
                <li style={{ fontSize: '0.95rem' }}>
                  <strong>{alertaSinStockAgregar.descripcion || '—'}</strong>
                </li>
              </ul>
              <p className="mb-0 text-muted small">
                Stock actual: <strong style={{ color: '#dc3545' }}>{alertaSinStockAgregar.stock}</strong>. Actualice el inventario antes de continuar.
              </p>
            </div>
          </div>
        </CModalBody>
        <CModalFooter style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6' }}>
          <CButton style={{ backgroundColor: '#7a2e00', borderColor: '#7a2e00', color: '#fff' }} onClick={() => setAlertaSinStockAgregar({ visible: false, descripcion: '', stock: 0 })}>
            Entendido
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── Modal alerta: producto sin precio de venta (agregar producto) ── */}
      <CModal
        visible={alertaSinPrecioAgregar.visible}
        onClose={() => setAlertaSinPrecioAgregar({ visible: false, productos: [] })}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader style={{ backgroundColor: '#f8d7da', borderBottom: '1px solid #f5c2c7' }}>
          <CModalTitle style={{ color: '#842029', fontSize: '1rem', fontWeight: 'bold' }}>Producto sin precio de venta</CModalTitle>
        </CModalHeader>
        <CModalBody className="py-4 px-4">
          <div className="d-flex align-items-start gap-3">
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>🚫</span>
            <div>
              <p className="mb-2 text-muted" style={{ fontSize: '0.9rem' }}>
                No se puede agregar el producto porque no tiene un <strong>precio de venta</strong> válido:
              </p>
              <ul className="mb-2 ps-3">
                {alertaSinPrecioAgregar.productos.map((p, i) => (
                  <li key={i} style={{ fontSize: '0.95rem' }}>
                    <strong>{p.codigo || '—'}</strong> — {p.descripcion || 'Sin descripción'}
                  </li>
                ))}
              </ul>
              <p className="mb-0 text-muted small">
                Actualice el precio de venta en el inventario antes de continuar.
              </p>
            </div>
          </div>
        </CModalBody>
        <CModalFooter style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6' }}>
          <CButton style={{ backgroundColor: '#842029', borderColor: '#842029', color: '#fff' }} onClick={() => setAlertaSinPrecioAgregar({ visible: false, productos: [] })}>
            Entendido
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── Modal alerta: productos nuevos con cantidad 0 ── */}
      <CModal
        visible={errorCantidadSubModal}
        onClose={() => setErrorCantidadSubModal(false)}
        alignment="center"
        size="lg"
      >
        <CModalHeader className="bg-warning text-dark py-2">
          <CModalTitle className="d-flex align-items-center gap-2">
            <span>⚠️</span> Cantidad inválida
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="py-3 px-4">
          <p className="mb-0">
            Hay productos nuevos con cantidad <strong>0</strong>.
            Ingrese una cantidad mayor a 0 o elimínelos antes de confirmar.
          </p>
        </CModalBody>
        <CModalFooter className="py-2 justify-content-end">
          <CButton color="warning" onClick={() => setErrorCantidadSubModal(false)}>
            Aceptar
          </CButton>
        </CModalFooter>
      </CModal>

    </>
  )
}

export default ReporteConsignaciones
