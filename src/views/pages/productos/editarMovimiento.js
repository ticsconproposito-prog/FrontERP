import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import {
  CButton,
  CButtonGroup,
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
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import { useNavigate, useParams } from 'react-router-dom'

const EditarMovimiento = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [tipoMovimiento, setTipoMovimiento] = useState([])
  const [tipoOrden, setTipoOrden] = useState([])
  const [estadoFactura, setEstadoFactura] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [productosDisponibles, setProductosDisponibles] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])

  const [formData, setFormData] = useState({
    numeroDocumento: '',
    fechaIngreso: '',
    proveedor: '',
    tipoMovimiento: '',
    tipoOrden: '',
    estadoFactura: '',
    valorCancelado: '',
    comentarios: ''
  })

  const [detalles, setDetalles] = useState([])
  const [detallesEliminados, setDetallesEliminados] = useState([])
  const [sugerenciasProductos, setSugerenciasProductos] = useState([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [proveedorTexto, setProveedorTexto] = useState('')
  const [sugerenciasProveedores, setSugerenciasProveedores] = useState([])
  const [mostrarSugerenciasProveedor, setMostrarSugerenciasProveedor] = useState(false)
  const [productoTemp, setProductoTemp] = useState({ idProducto: null, cantidad: 0, precioCompra: 0 })
  const [ubicacionAgregarTexto, setUbicacionAgregarTexto] = useState('')
  const [idUbicacionAgregar, setIdUbicacionAgregar] = useState('')
  const [sugerenciasUbicaciones, setSugerenciasUbicaciones] = useState([])
  const [mostrarSugerenciasUbicacion, setMostrarSugerenciasUbicacion] = useState(false)
  const [modalExito, setModalExito] = useState(false)
  const [modalError, setModalError] = useState(false)
  const [mensajeError, setMensajeError] = useState('')
  const returnFocusRef = useRef(null)
  const tablaDetallesRef = useRef(null)

  // Estados modal agregar producto
  const [visibleModalProducto, setVisibleModalProducto] = useState(false)
  const [productosModal, setProductosModal] = useState([])
  const [ubicacionModalTexto, setUbicacionModalTexto] = useState({})
  const [ubicacionModalSugerencias, setUbicacionModalSugerencias] = useState({})
  const [ubicacionModalMostrar, setUbicacionModalMostrar] = useState({})
  // Filas con cantidad y precio habilitados para editar (por índice)
  const [filasEditables, setFilasEditables] = useState(new Set())

  const obtenerNombreUbicacion = (idUbicacion) => {
    if (!idUbicacion) return 'N/A'
    const ubic = ubicaciones.find(u => (u.idUbicacion ?? u.id) == idUbicacion)
    return ubic ? (ubic.nombre || ubic.nombreUbicacion || ubic.descripcion) : `ID: ${idUbicacion}`
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDetalleChange = (index, field, value) => {
    setDetalles(prev => {
      const next = [...prev]
      const parsed = (field === 'cantidad' || field === 'precioCompra')
        ? (value === '' ? '' : (Number(value) || 0))
        : value
      next[index] = { ...next[index], [field]: parsed }
      return next
    })
  }

  const habilitarEdicionFila = (index) => {
    setFilasEditables(prev => new Set([...prev, index]))
  }

  const bloquearEdicionFila = (index) => {
    setFilasEditables(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }

  const eliminarDetalle = (index) => {
    setFilasEditables(prev => {
      const next = new Set()
      prev.forEach(i => {
        if (i < index) next.add(i)
        if (i > index) next.add(i - 1)
      })
      return next
    })
    const det = detalles[index]
    if (det.idMovimientoProducto) {
      setDetallesEliminados(prev => [...prev, det.idMovimientoProducto])
    }
    setDetalles(prev => prev.filter((_, i) => i !== index))
  }

  const handleProveedorChange = (e) => {
    const value = (e.target.value || '').toString()
    setProveedorTexto(value)
    setFormData(prev => ({ ...prev, proveedor: '' }))

    const valorLimpio = value.trim()
    if (valorLimpio.length >= 2) {
      const valorLower = valorLimpio.toLowerCase()
      const encontrados = proveedores.filter((p) => {
        const nombre = (p.nombre || p.nombreProveedor || '').toString().toLowerCase()
        return nombre.includes(valorLower)
      })
      setSugerenciasProveedores(encontrados.slice(0, 10))
      setMostrarSugerenciasProveedor(encontrados.length > 0)
    } else {
      setSugerenciasProveedores([])
      setMostrarSugerenciasProveedor(false)
    }
  }

  const seleccionarProveedorSugerencia = (proveedor) => {
    setFormData(prev => ({ ...prev, proveedor: String(proveedor.idProveedor) }))
    setProveedorTexto(proveedor.nombre || proveedor.nombreProveedor || '')
    setSugerenciasProveedores([])
    setMostrarSugerenciasProveedor(false)
  }

  const handleBusquedaProducto = (e) => {
    const value = e.target.value
    setBusquedaProducto(value)
    buscarProductos(value)
  }

  const seleccionarProductoAgregar = (producto) => {
    setProductoTemp({
      idProducto: producto.idProducto,
      cantidad: 0,
      precioCompra: 0
    })
    setBusquedaProducto((producto.descripcionProducto || producto.codigoProducto || '').toString().substring(0, 40))
    setSugerenciasProductos([])
    setMostrarSugerencias(false)
  }

  const handleUbicacionAgregarChange = (e) => {
    const value = (e.target.value || '').toString()
    setUbicacionAgregarTexto(value)
    setIdUbicacionAgregar('')
    const valorLimpio = value.trim()
    if (valorLimpio.length >= 2) {
      const valorLower = valorLimpio.toLowerCase()
      const encontrados = ubicaciones.filter((u) => {
        const nombre = (u.nombre || u.nombreUbicacion || u.descripcion || '').toString().toLowerCase()
        return nombre.includes(valorLower)
      })
      setSugerenciasUbicaciones(encontrados.slice(0, 10))
      setMostrarSugerenciasUbicacion(encontrados.length > 0)
    } else {
      setSugerenciasUbicaciones([])
      setMostrarSugerenciasUbicacion(false)
    }
  }

  const seleccionarUbicacionAgregarSugerencia = (ubicacion) => {
    const id = ubicacion.idUbicacion ?? ubicacion.id
    const texto = ubicacion.nombre || ubicacion.nombreUbicacion || ubicacion.descripcion || ''
    setIdUbicacionAgregar(id != null ? String(id) : '')
    setUbicacionAgregarTexto(texto)
    setSugerenciasUbicaciones([])
    setMostrarSugerenciasUbicacion(false)
  }

  const agregarProductoALista = () => {
    if (!productoTemp.idProducto) {
      setMensajeError('Seleccione un producto de la búsqueda')
      setModalError(true)
      return
    }
    if (detalles.some(d => d.idProducto === productoTemp.idProducto)) {
      setMensajeError('El producto ya está en la lista')
      setModalError(true)
      setProductoTemp({ idProducto: null, cantidad: 0, precioCompra: 0 })
      setBusquedaProducto('')
      setIdUbicacionAgregar('')
      setUbicacionAgregarTexto('')
      return
    }
    const cantidad = Number(productoTemp.cantidad) || 0
    const precio = Number(productoTemp.precioCompra) || 0
    if (cantidad <= 0 || precio < 0) {
      setMensajeError('Cantidad y precio deben ser válidos')
      setModalError(true)
      return
    }
    const idUbic = idUbicacionAgregar ? parseInt(idUbicacionAgregar, 10) : 1
    setDetalles(prev => [...prev, {
      idMovimientoProducto: null,
      idOrdenProducto: parseInt(id, 10),
      idProducto: productoTemp.idProducto,
      cantidad,
      precioCompra: precio,
      idUbicacion: Number.isNaN(idUbic) ? 1 : idUbic
    }])
    setProductoTemp({ idProducto: null, cantidad: 0, precioCompra: 0 })
    setBusquedaProducto('')
    setIdUbicacionAgregar('')
    setUbicacionAgregarTexto('')
  }

  // ── Funciones del modal de agregar productos ──────────────────────────────
  const abrirModalAgregarProducto = () => {
    setProductosModal([])
    setUbicacionModalTexto({})
    setUbicacionModalSugerencias({})
    setUbicacionModalMostrar({})
    setBusquedaProducto('')
    setSugerenciasProductos([])
    setMostrarSugerencias(false)
    setVisibleModalProducto(true)
  }

  const agregarProductoAlModal = (producto) => {
    const existe = productosModal.find(
      (p) => p.idProducto === (producto.idProducto ?? null)
    )
    if (existe) return
    setProductosModal((prev) => [
      ...prev,
      {
        id: Date.now(),
        idProducto: producto.idProducto ?? null,
        codigoProducto: (producto.codigoProducto ?? '').toString(),
        codigoProductoProveedor: (producto.codigoProductoProveedor ?? '').toString(),
        descripcion: (producto.descripcionProducto ?? '').toString(),
        cantidad: 1,
        precio: 0,
        idUbicacion: '',
        ubicacionTexto: '',
      },
    ])
    setSugerenciasProductos([])
    setMostrarSugerencias(false)
    setBusquedaProducto('')
  }

  const actualizarCantidadModal = (index, valor) => {
    setProductosModal((prev) => {
      const lista = [...prev]
      lista[index] = { ...lista[index], cantidad: valor === '' ? '' : Number(valor) || 0 }
      return lista
    })
  }

  const actualizarPrecioModal = (index, valor) => {
    setProductosModal((prev) => {
      const lista = [...prev]
      lista[index] = { ...lista[index], precio: valor === '' ? '' : Number(valor) || 0 }
      return lista
    })
  }

  const eliminarProductoModal = (index) => {
    setProductosModal((prev) => prev.filter((_, i) => i !== index))
    setUbicacionModalTexto((prev) => { const n = { ...prev }; delete n[index]; return n })
    setUbicacionModalSugerencias((prev) => { const n = { ...prev }; delete n[index]; return n })
    setUbicacionModalMostrar((prev) => { const n = { ...prev }; delete n[index]; return n })
  }

  const handleUbicacionModalChange = (index, valor) => {
    setUbicacionModalTexto((prev) => ({ ...prev, [index]: valor }))
    setProductosModal((prev) => {
      const lista = [...prev]
      lista[index] = { ...lista[index], idUbicacion: '', ubicacionTexto: valor }
      return lista
    })
    const valorLimpio = valor.trim()
    if (valorLimpio.length >= 2) {
      const valorLower = valorLimpio.toLowerCase()
      const encontrados = ubicaciones.filter((u) => {
        const nombre = (u.nombre || u.nombreUbicacion || u.descripcion || '').toString().toLowerCase()
        return nombre.includes(valorLower)
      })
      setUbicacionModalSugerencias((prev) => ({ ...prev, [index]: encontrados.slice(0, 10) }))
      setUbicacionModalMostrar((prev) => ({ ...prev, [index]: encontrados.length > 0 }))
    } else {
      setUbicacionModalSugerencias((prev) => ({ ...prev, [index]: [] }))
      setUbicacionModalMostrar((prev) => ({ ...prev, [index]: false }))
    }
  }

  const seleccionarUbicacionModal = (index, ubicacion) => {
    const id = ubicacion.idUbicacion ?? ubicacion.id
    const texto = ubicacion.nombre || ubicacion.nombreUbicacion || ubicacion.descripcion || ''
    setUbicacionModalTexto((prev) => ({ ...prev, [index]: texto }))
    setProductosModal((prev) => {
      const lista = [...prev]
      lista[index] = { ...lista[index], idUbicacion: id != null ? String(id) : '', ubicacionTexto: texto }
      return lista
    })
    setUbicacionModalSugerencias((prev) => ({ ...prev, [index]: [] }))
    setUbicacionModalMostrar((prev) => ({ ...prev, [index]: false }))
  }

  const confirmarProductosModal = () => {
    const sinUbicacion = productosModal.find((p) => !p.idUbicacion)
    if (sinUbicacion) {
      setMensajeError(`El producto "${sinUbicacion.descripcion || sinUbicacion.codigoProducto}" no tiene una ubicación seleccionada.`)
      setModalError(true)
      return
    }

    const cantidadInvalida = productosModal.find((p) => parseFloat(p.cantidad) < 0 || isNaN(parseFloat(p.cantidad)))
    if (cantidadInvalida) {
      setMensajeError(`El producto "${cantidadInvalida.descripcion || cantidadInvalida.codigoProducto}" tiene una cantidad negativa o inválida.`)
      setModalError(true)
      return
    }

    const precioInvalido = productosModal.find((p) => parseFloat(p.precio) <= 0 || isNaN(parseFloat(p.precio)))
    if (precioInvalido) {
      setMensajeError(`El producto "${precioInvalido.descripcion || precioInvalido.codigoProducto}" debe tener un precio de compra mayor a 0.`)
      setModalError(true)
      return
    }

    const nuevosDetalles = productosModal.map((prod) => ({
      idMovimientoProducto: null,
      idOrdenProducto: parseInt(id, 10),
      idProducto: {
        idProducto: prod.idProducto,
        codigoProducto: prod.codigoProducto ?? '',
        codigoProductoProveedor: prod.codigoProductoProveedor ?? '',
        descripcionProducto: prod.descripcion ?? '',
      },
      cantidad: Number(prod.cantidad) || 0,
      precioCompra: Number(prod.precio) || 0,
      idUbicacion: prod.idUbicacion ? parseInt(prod.idUbicacion, 10) : 1,
    }))
    setDetalles((prev) => [...prev, ...nuevosDetalles])
    setVisibleModalProducto(false)
    setProductosModal([])
    setUbicacionModalTexto({})
    setUbicacionModalSugerencias({})
    setUbicacionModalMostrar({})
    setBusquedaProducto('')
    setSugerenciasProductos([])
    setMostrarSugerencias(false)
  }
  // ── Fin funciones modal ────────────────────────────────────────────────────

  const cargarDiccionario = async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/diccionarios?diccionario=TIPODEMOVIMIENTO&estado=1'),
        fetch('/api/diccionarios?diccionario=TIPODEORDEN&estado=1'),
        fetch('/api/diccionarios?diccionario=ESTADOFATURAORDEN&estado=1')
      ])
      const data1 = await r1.json()
      const data2 = await r2.json()
      const data3 = await r3.json()
      const arr = (d) => Array.isArray(d) ? d : (d?.content || [])
      setTipoMovimiento(arr(data1))
      setTipoOrden(arr(data2))
      setEstadoFactura(arr(data3))
    } catch (e) {
      console.error(e)
    }
  }

  const cargarProveedores = async () => {
    try {
      const r = await fetch('/api/proveedores?size=1000')
      const data = await r.json()
      setProveedores(Array.isArray(data) ? data : (data?.content || []))
    } catch (e) {
      console.error(e)
    }
  }

  // Búsqueda server-side paralela por campo en /api/productos (igual que agregarMovimiento.js)
  const buscarProductos = async (termino) => {
    const t = (termino || '').trim()
    if (t.length < 2) {
      setSugerenciasProductos([])
      setMostrarSugerencias(false)
      return
    }
    try {
      const SIZE_BUSQUEDA = 500
      const palabras = t.split(/\s+/).filter(Boolean)

      const fetchDesc = (palabra) =>
        fetch(`/api/productos?descripcionProducto=${encodeURIComponent(palabra)}&page=0&size=${SIZE_BUSQUEDA}`)
          .then(r => r.json()).then(d => d.content || [])

      const [rCodigo, rProveedor, ...rDescPalabras] = await Promise.all([
        fetch(`/api/productos?codigoProducto=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
        fetch(`/api/productos?codigoProductoProveedor=${encodeURIComponent(t)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
        ...palabras.map(fetchDesc),
      ])

      // Intersección por descripción (el producto debe aparecer en TODAS las palabras)
      let porDescripcion = rDescPalabras[0] || []
      for (let i = 1; i < rDescPalabras.length; i++) {
        const ids = new Set(rDescPalabras[i].map(p => p.idProducto))
        porDescripcion = porDescripcion.filter(p => ids.has(p.idProducto))
      }

      const combinados = [
        ...(rCodigo.content || []),
        ...(rProveedor.content || []),
        ...porDescripcion,
      ]
      const unicos = combinados.filter((p, idx, arr) =>
        arr.findIndex(x => x.idProducto === p.idProducto) === idx
      )

      setProductosDisponibles(unicos)
      setSugerenciasProductos(unicos.slice(0, 15))
      setMostrarSugerencias(unicos.length > 0)
    } catch (e) {
      console.error('Error al buscar productos:', e)
      setSugerenciasProductos([])
      setMostrarSugerencias(false)
    }
  }

  const cargarUbicaciones = async () => {
    try {
      const r = await fetch('/api/ubicaciones?size=1000')
      const data = await r.json()
      setUbicaciones(Array.isArray(data) ? data : (data?.content || []))
    } catch (e) {
      console.error(e)
    }
  }

  const cargarOrden = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const r = await fetch(`/api/ordenProductos?id=${id}`)
      if (!r.ok) throw new Error('Error al cargar la orden')
      const data = await r.json()
      const orden = data?.content?.[0]
      if (!orden) throw new Error('Orden no encontrada')
      const idProv = orden.idProveedor ?? null
      setFormData({
        numeroDocumento: orden.numeroDeDocumento || '',
        fechaIngreso: (orden.fechaOrden || '').toString().substring(0, 10),
        proveedor: String(idProv ?? ''),
        tipoMovimiento: String(orden.tipoDeMovimiento ?? ''),
        tipoOrden: String(orden.tipoDeOrden ?? ''),
        estadoFactura: String(orden.estadoFactura ?? ''),
        valorCancelado: orden.valorCancelado != null ? String(orden.valorCancelado) : '',
        comentarios: orden.comentario || ''
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const cargarDetalles = async () => {
    if (!id) return
    try {
      const r = await fetch(`/api/movimientosProductos?idOrdenProducto=${id}`)
      if (!r.ok) throw new Error('Error al cargar detalles')
      const data = await r.json()
      const arr = Array.isArray(data) ? data : (data?.content || [])
      setDetalles(arr.map(det => ({
        ...det,
        idProducto: det.idProducto,
        precioCompra: det.precioCompra ?? 0,
      })))
    } catch (e) {
      console.error(e)
      setDetalles([])
    }
  }

  useEffect(() => {
    cargarDiccionario()
    cargarProveedores()
    cargarUbicaciones()
  }, [])

  useEffect(() => {
    if (formData.proveedor && proveedores.length > 0) {
      const prov = proveedores.find(p => String(p.idProveedor) === formData.proveedor)
      if (prov && !proveedorTexto) {
        setProveedorTexto(prov.nombre || prov.nombreProveedor || '')
      }
    }
  }, [formData.proveedor, proveedores])

  useEffect(() => {
    if (id) {
      cargarOrden()
      cargarDetalles()
    }
  }, [id])

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (filasEditables.size === 0) return
      if (tablaDetallesRef.current && !tablaDetallesRef.current.contains(e.target)) {
        setFilasEditables(new Set())
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [filasEditables])

  const totalOrden = detalles.reduce((sum, d) => sum + (d.cantidad || 0) * (d.precioCompra || 0), 0)

  const handleGuardar = async (e) => {
    e.preventDefault()
    const invalido = detalles.find(d => {
      const c = Number(d.cantidad)
      const p = Number(d.precioCompra)
      return d.cantidad === '' || d.precioCompra === '' || !Number.isFinite(c) || !Number.isFinite(p) || c <= 0 || p < 0
    })
    if (invalido) {
      setMensajeError('Cantidad y precio deben ser válidos en todos los productos')
      setModalError(true)
      return
    }
    setSaving(true)
    setModalError(false)
    try {
      const ordenPayload = {
        idOrdenProducto: parseInt(id, 10),
        idSucursal: 1,
        fechaOrden: formData.fechaIngreso,
        idProveedor: parseInt(formData.proveedor, 10),
        numeroDeDocumento: formData.numeroDocumento.trim(),
        tipoDeMovimiento: parseInt(formData.tipoMovimiento, 10),
        tipoDeOrden: parseInt(formData.tipoOrden, 10),
        estadoFactura: parseInt(formData.estadoFactura, 10),
        precioTotalOrden: totalOrden,
        valorCancelado: formData.valorCancelado ? parseFloat(formData.valorCancelado) : 0,
        comentario: formData.comentarios || '',
        idUsuarioModificacion: idUsuarioActual
      }
      const resOrden = await fetch(`/api/editarOrdenProducto/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordenPayload)
      })
      if (!resOrden.ok) {
        const errText = await resOrden.text()
        throw new Error(errText || 'Error al actualizar la orden')
      }
      for (const idElim of detallesEliminados) {
        const resDel = await fetch(`/api/eliminarMovimientosProductos/${idElim}`, { method: 'DELETE' })
        if (!resDel.ok) {
          const errText = await resDel.text()
          let errMsg = `Error al eliminar detalle (${resDel.status})`
          if (errText) {
            try {
              const errJson = JSON.parse(errText)
              if (errJson.message) errMsg = errJson.message
              else if (errJson.error) errMsg = `${errJson.error} - ${errJson.path || ''}`
              else errMsg = errText
            } catch {
              errMsg = errText
            }
          }
          throw new Error(errMsg)
        }
      }
      for (const det of detalles) {
        const idProd = (typeof det.idProducto === 'object' && det.idProducto !== null)
          ? det.idProducto.idProducto
          : parseInt(det.idProducto, 10)

        if (det.idMovimientoProducto) {
          const body = {
            idMovimientoProducto: det.idMovimientoProducto,
            idOrdenProducto: parseInt(id, 10),
            idProducto: { idProducto: idProd },
            cantidad: parseInt(det.cantidad, 10) || 0,
            precioCompra: parseFloat(det.precioCompra) || 0,
            idUbicacion: det.idUbicacion || 1,
            idUsuarioModificacion: idUsuarioActual
          }
          const resDet = await fetch(`/api/editarMovimientosProductos/${det.idMovimientoProducto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          if (!resDet.ok) throw new Error('Error al actualizar detalle')
        } else {
          const body = {
            idOrdenProducto: parseInt(id, 10),
            idProducto: { idProducto: idProd },
            cantidad: parseInt(det.cantidad, 10) || 0,
            precioCompra: parseFloat(det.precioCompra) || 0,
            idUbicacion: det.idUbicacion || 1,
            idUsuarioModificacion: idUsuarioActual
          }
          console.log('[grabarMovimientosProductos] Enviando:', JSON.stringify(body, null, 2))
          const resNew = await fetch(`/api/grabarMovimientosProductos?tipoDeMovimiento=${parseInt(formData.tipoMovimiento, 10)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          if (!resNew.ok) throw new Error('Error al agregar detalle')
        }
      }
      setModalExito(true)
    } catch (err) {
      setMensajeError(err.message || 'Error al guardar')
      setModalError(true)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-3">Cargando...</p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  if (error) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <p className="text-danger">{error}</p>
              <CButton color="secondary" onClick={() => navigate('/pages/productos/movimientos')}>
                Volver
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong className="fs-4">Editar Movimiento - Orden #{id}</strong>
              <CButton ref={returnFocusRef} color="secondary" onClick={() => navigate('/pages/productos/movimientos')}>
                Volver
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={handleGuardar}>
                <h6 className="text-primary mb-3">Información de la orden</h6>
                <CRow className="mb-3">
                  <CCol md={4}>
                    <CFormLabel>Número de documento</CFormLabel>
                    <CFormInput name="numeroDocumento" value={formData.numeroDocumento} onChange={handleChange} />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Fecha de orden</CFormLabel>
                    <CFormInput type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange} />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Proveedor</CFormLabel>
                    <div style={{ position: 'relative' }}>
                      <CFormInput
                        type="text"
                        placeholder="Escriba el nombre del proveedor..."
                        value={proveedorTexto}
                        onChange={handleProveedorChange}
                        autoComplete="off"
                      />
                      {mostrarSugerenciasProveedor && sugerenciasProveedores.length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 1050,
                            maxHeight: '220px',
                            overflowY: 'auto',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }}
                          className="list-group"
                        >
                          <div className="list-group-item list-group-item-secondary py-2">
                            <small><strong>Proveedores encontrados:</strong> haga clic para seleccionar</small>
                          </div>
                          {sugerenciasProveedores.map((prov) => (
                            <button
                              key={prov.idProveedor}
                              type="button"
                              className="list-group-item list-group-item-action text-start"
                              onClick={() => seleccionarProveedorSugerencia(prov)}
                              style={{ cursor: 'pointer' }}
                            >
                              {prov.nombre || prov.nombreProveedor}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {formData.proveedor && (
                      <small className="text-success">Proveedor seleccionado</small>
                    )}
                  </CCol>
                </CRow>
                <CRow className="mb-3">
                  <CCol md={4}>
                    <CFormLabel>Tipo de movimiento</CFormLabel>
                    <CFormSelect name="tipoMovimiento" value={formData.tipoMovimiento} onChange={handleChange}>
                      <option value="">Seleccione</option>
                      {tipoMovimiento.map(t => (
                        <option key={t.indice} value={t.indice}>{t.valor}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Tipo de orden</CFormLabel>
                    <CFormSelect name="tipoOrden" value={formData.tipoOrden} onChange={handleChange}>
                      <option value="">Seleccione</option>
                      {tipoOrden.map(t => (
                        <option key={t.indice} value={t.indice}>{t.valor}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Estado de factura</CFormLabel>
                    <CFormSelect name="estadoFactura" value={formData.estadoFactura} onChange={handleChange}>
                      <option value="">Seleccione</option>
                      {estadoFactura.map(t => (
                        <option key={t.indice} value={t.indice}>{t.valor}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
                <CRow className="mb-3">
                  <CCol md={4}>
                    <CFormLabel>Valor cancelado</CFormLabel>
                    <CFormInput type="number" step="0.01" name="valorCancelado" value={formData.valorCancelado} onChange={handleChange} />
                  </CCol>
                  <CCol md={8}>
                    <CFormLabel>Comentarios</CFormLabel>
                    <CFormTextarea name="comentarios" value={formData.comentarios} onChange={handleChange} rows={2} />
                  </CCol>
                </CRow>

                <div className="d-flex justify-content-between align-items-center mb-3 mt-4">
                  <h6 className="text-primary mb-0">Detalle de productos</h6>
                  <CButton
                    color="success"
                    size="sm"
                    className="text-light"
                    onClick={abrirModalAgregarProducto}
                  >
                    + Agregar Producto
                  </CButton>
                </div>

                <div ref={tablaDetallesRef}>
                <CTable striped hover bordered responsive>
                  <CTableHead style={{ '--cui-table-bg': '#6c757d', '--cui-table-color': '#fff', '--cui-table-border-color': '#7d868e', backgroundColor: '#6c757d', color: '#fff' }}>
                    <CTableRow>
                      <CTableHeaderCell>No.</CTableHeaderCell>
                      <CTableHeaderCell>Código</CTableHeaderCell>
                      <CTableHeaderCell>Cód. Proveedor</CTableHeaderCell>
                      <CTableHeaderCell>Descripción</CTableHeaderCell>
                      <CTableHeaderCell>Ubicación</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Cantidad</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Precio compra</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Subtotal</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Acciones</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {detalles.map((det, index) => {
                      const prod = (typeof det.idProducto === 'object' && det.idProducto !== null)
                        ? det.idProducto
                        : { codigoProducto: 'N/A', codigoProductoProveedor: 'N/A', descripcionProducto: 'N/A' }
                      const subtotal = (det.cantidad || 0) * (det.precioCompra || 0)
                      const editable = filasEditables.has(index)
                      return (
                        <CTableRow key={det.idMovimientoProducto != null ? det.idMovimientoProducto : 'n-' + index}>
                          <CTableDataCell>{index + 1}</CTableDataCell>
                          <CTableDataCell>{prod.codigoProducto ?? 'N/A'}</CTableDataCell>
                          <CTableDataCell>{prod.codigoProductoProveedor ?? 'N/A'}</CTableDataCell>
                          <CTableDataCell>{prod.descripcionProducto ?? 'N/A'}</CTableDataCell>
                          <CTableDataCell>{obtenerNombreUbicacion(det.idUbicacion)}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            {editable ? (
                              <CFormInput type="number" min="0" value={det.cantidad === '' ? '' : det.cantidad} onChange={e => handleDetalleChange(index, 'cantidad', e.target.value)} className="text-center" style={{ maxWidth: '80px' }} />
                            ) : (
                              det.cantidad
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {editable ? (
                              <CFormInput type="number" step="0.01" min="0" value={det.precioCompra === '' ? '' : (det.precioCompra ?? '')} onChange={e => handleDetalleChange(index, 'precioCompra', e.target.value)} className="text-end" style={{ maxWidth: '100px' }} />
                            ) : (
                              `Q${(det.precioCompra === '' || det.precioCompra == null ? 0 : det.precioCompra).toFixed(2)}`
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">Q{(subtotal || 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-center text-nowrap">
                            <CButtonGroup size="sm" role="group" aria-label="Acciones del producto">
                              {editable ? (
                                <CButton type="button" color="success" className="text-white" onClick={() => bloquearEdicionFila(index)} title="Confirmar y bloquear">
                                  🔒
                                </CButton>
                              ) : (
                                <CButton type="button" color="warning" className="text-dark" onClick={() => habilitarEdicionFila(index)} title="Editar cantidad y precio">
                                  ✏️
                                </CButton>
                              )}
                              <CButton type="button" color="danger" className="text-white" onClick={() => eliminarDetalle(index)} title="Eliminar">
                                🗑️
                              </CButton>
                            </CButtonGroup>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
                </div>
                {detalles.length > 0 && (
                  <div className="d-flex justify-content-end mt-2">
                    <strong>Total orden: Q{totalOrden.toFixed(2)}</strong>
                  </div>
                )}

                <div className="d-flex gap-2 mt-4">
                  <CButton type="submit" color="primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </CButton>
                  <CButton type="button" color="secondary" onClick={() => navigate('/pages/productos/movimientos')}>
                    Cancelar
                  </CButton>
                </div>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Modal Agregar Producto */}
      <CModal
        visible={visibleModalProducto}
        onClose={() => setVisibleModalProducto(false)}
        size="xl"
        backdrop="static"
        keyboard={false}
      >
        <CModalHeader className="bg-primary text-white">
          <CModalTitle className="d-flex align-items-center gap-2">
            <span>🛒</span> Agregar Producto al Movimiento
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          {/* Búsqueda */}
          <div className="mb-3">
            <h6 className="mb-3">🔍 Buscar Producto</h6>
            <CFormInput
              type="text"
              placeholder="Buscar por código, código proveedor o descripción..."
              value={busquedaProducto}
              onChange={handleBusquedaProducto}
              autoComplete="off"
              className="form-control-lg mb-3"
            />
            {mostrarSugerencias && sugerenciasProductos.length > 0 && (
              <div className="list-group" style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '6px' }}>
                <div className="list-group-item list-group-item-primary py-2" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <small><strong>Productos encontrados ({sugerenciasProductos.length}):</strong> Haga clic para agregar</small>
                </div>
                {sugerenciasProductos.map((producto, index) => (
                  <button
                    key={producto.idProducto || index}
                    type="button"
                    className="list-group-item list-group-item-action text-start"
                    onClick={() => agregarProductoAlModal(producto)}
                    style={{ cursor: 'pointer' }}
                  >
                    <strong className="text-primary">{producto.codigoProducto}</strong>
                    {producto.codigoProductoProveedor && <span className="text-muted ms-2">| Prov: {producto.codigoProductoProveedor}</span>}
                    <div><small className="text-muted">{producto.descripcionProducto}</small></div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabla de productos en el modal */}
          <div className="mt-4">
            <h6 className="text-primary mb-3">Detalle de Productos</h6>
            <CTable striped bordered hover responsive>
              <CTableHead style={{ '--cui-table-bg': '#6c757d', '--cui-table-color': '#fff', '--cui-table-border-color': '#7d868e', backgroundColor: '#6c757d', color: '#fff' }}>
                <CTableRow>
                  <CTableHeaderCell className="py-2">No.</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Código</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Cód. Proveedor</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Descripción</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Ubicación</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Cantidad</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Precio Compra</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-end">Subtotal</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-center">Eliminar</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {productosModal.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={9} className="text-center py-4 text-muted">
                      No hay productos agregados. Busque y seleccione productos arriba.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  productosModal.map((prod, index) => (
                    <CTableRow key={prod.id || index}>
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell><strong>{prod.codigoProducto}</strong></CTableDataCell>
                      <CTableDataCell>{prod.codigoProductoProveedor || '—'}</CTableDataCell>
                      <CTableDataCell>{prod.descripcion}</CTableDataCell>
                      <CTableDataCell style={{ minWidth: '150px', position: 'relative' }}>
                        <CFormInput
                          type="text"
                          size="sm"
                          placeholder="Buscar ubicación..."
                          value={ubicacionModalTexto[index] ?? prod.ubicacionTexto ?? ''}
                          onChange={(e) => handleUbicacionModalChange(index, e.target.value)}
                          autoComplete="off"
                        />
                        {ubicacionModalMostrar[index] && (ubicacionModalSugerencias[index] || []).length > 0 && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            zIndex: 1060, maxHeight: '180px', overflowY: 'auto',
                            border: '1px solid #dee2e6', borderRadius: '4px',
                            backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }} className="list-group">
                            {(ubicacionModalSugerencias[index] || []).map((u) => (
                              <button
                                key={u.idUbicacion ?? u.id}
                                type="button"
                                className="list-group-item list-group-item-action text-start py-1"
                                onClick={() => seleccionarUbicacionModal(index, u)}
                                style={{ cursor: 'pointer', fontSize: '0.85rem' }}
                              >
                                {u.nombre || u.nombreUbicacion || u.descripcion || '—'}
                              </button>
                            ))}
                          </div>
                        )}
                      </CTableDataCell>
                      <CTableDataCell style={{ width: '90px' }}>
                        <CFormInput
                          type="number"
                          size="sm"
                          min="1"
                          value={prod.cantidad}
                          onChange={(e) => actualizarCantidadModal(index, e.target.value)}
                          placeholder="0"
                        />
                      </CTableDataCell>
                      <CTableDataCell style={{ width: '120px' }}>
                        <CFormInput
                          type="number"
                          size="sm"
                          min="0"
                          step="0.01"
                          value={prod.precio}
                          onChange={(e) => actualizarPrecioModal(index, e.target.value)}
                          placeholder="0.00"
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        Q{((Number(prod.cantidad) || 0) * (Number(prod.precio) || 0)).toFixed(2)}
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CButton color="danger" size="sm" onClick={() => eliminarProductoModal(index)}>
                          🗑️
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
            {productosModal.length > 0 && (
              <div className="d-flex justify-content-end mt-2">
                <div className="border rounded p-2" style={{ minWidth: '220px' }}>
                  <div className="d-flex justify-content-between">
                    <strong>Total general:</strong>
                    <strong className="text-primary">
                      Q{productosModal.reduce((sum, p) => sum + (Number(p.cantidad) || 0) * (Number(p.precio) || 0), 0).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton
            color="light"
            className="border d-flex align-items-center gap-2"
            onClick={() => setVisibleModalProducto(false)}
          >
            <span>✖️</span> Cancelar
          </CButton>
          <CButton
            color="primary"
            className="text-light d-flex align-items-center gap-2"
            onClick={confirmarProductosModal}
            disabled={productosModal.length === 0}
          >
            <span>✔️</span> Confirmar Productos
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={modalExito}
        onClose={() => {
          returnFocusRef.current?.focus()
          setModalExito(false)
          navigate('/pages/productos/movimientos')
        }}
      >
        <CModalHeader>Cambios guardados</CModalHeader>
        <CModalBody>La orden se actualizó correctamente.</CModalBody>
        <CModalFooter>
          <CButton
            color="primary"
            onClick={() => {
              returnFocusRef.current?.focus()
              setModalExito(false)
              navigate('/pages/productos/movimientos')
            }}
          >
            Aceptar
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={modalError}
        onClose={() => {
          returnFocusRef.current?.focus()
          setModalError(false)
        }}
      >
        <CModalHeader>Error</CModalHeader>
        <CModalBody>{mensajeError}</CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              returnFocusRef.current?.focus()
              setModalError(false)
            }}
          >
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default EditarMovimiento
