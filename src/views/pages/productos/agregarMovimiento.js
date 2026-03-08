import React, { useState, useEffect } from 'react'
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
  CFormTextarea,
  CRow,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'

const AgregarMovimiento = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    proveedor: '',
    tipoMovimiento: '',
    tipoOrden: '',

    numeroDocumento: '',
    fechaIngreso: '',
    estadoFactura: '',
    totalOrden: '',
    valorCancelado: '',
    comentarios: ''
  })

  // Estados para los diccionarios
  const [tipoMovimiento, setTipoMovimiento] = useState([])
  const [tipoOrden, setTipoOrden] = useState([])
  const [estadoFactura, setEstadoFactura] = useState([])
  const [proveedores, setProveedores] = useState([])

  // Estado para productos disponibles
  const [productosDisponibles, setProductosDisponibles] = useState([])

  // Estados para las sugerencias de productos
  const [sugerenciasProductos, setSugerenciasProductos] = useState([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)

  // Estados para ubicación en detalle de productos
  const [ubicaciones, setUbicaciones] = useState([])
  const [ubicacionDetalleTexto, setUbicacionDetalleTexto] = useState('')
  const [sugerenciasUbicaciones, setSugerenciasUbicaciones] = useState([])
  const [mostrarSugerenciasUbicacion, setMostrarSugerenciasUbicacion] = useState(false)
  const [idUbicacionDetalle, setIdUbicacionDetalle] = useState('')
  const [filaEditandoUbicacion, setFilaEditandoUbicacion] = useState(null) // índice de la fila cuyo ubicación se está editando

  // Estados para búsqueda de proveedor por nombre
  const [proveedorTexto, setProveedorTexto] = useState('')
  const [sugerenciasProveedores, setSugerenciasProveedores] = useState([])
  const [mostrarSugerenciasProveedor, setMostrarSugerenciasProveedor] = useState(false)

  // Estados para los modales
  const [visibleModalProducto, setVisibleModalProducto] = useState(false)
  const [productosModal, setProductosModal] = useState([])
  const [ubicacionModalTexto, setUbicacionModalTexto] = useState({}) // { [index]: texto }
  const [ubicacionModalSugerencias, setUbicacionModalSugerencias] = useState({}) // { [index]: [] }
  const [ubicacionModalMostrar, setUbicacionModalMostrar] = useState({}) // { [index]: bool }
  const [modalExito, setModalExito] = useState(false)
  const [numeroOrdenGuardada, setNumeroOrdenGuardada] = useState(null)
  const [modalAdvertencia, setModalAdvertencia] = useState(false)
  const [mensajeAdvertencia, setMensajeAdvertencia] = useState('')
  const [modalConfirmacion, setModalConfirmacion] = useState(false)

  // Estado para la lista de productos en el movimiento
  const [productos, setProductos] = useState([])

  // Estado para controlar si hay una fila en modo edición
  const [filaEditando, setFilaEditando] = useState(null)
  const [productoTemp, setProductoTemp] = useState({
    idProducto: null,
    codigoProducto: '',
    codigoProductoProveedor: '',
    descripcion: '',
    cantidad: 0,
    precio: 0
  })

  // Función para agregar una nueva fila editable
  const abrirModalAgregarProducto = () => {
    setFilaEditando('nuevo')
    setProductoTemp({
      idProducto: null,
      codigoProducto: '',
      codigoProductoProveedor: '',
      descripcion: '',
      cantidad: 0,
      precio: 0
    })
    setSugerenciasProductos([])
    setMostrarSugerencias(false)
    setUbicacionDetalleTexto('')
    setIdUbicacionDetalle('')
    setProductosModal([...productos])
    setVisibleModalProducto(true)
  }

  const agregarProductoAlModal = (producto) => {
    const existe = productosModal.find(
      (p) => p.idProducto === (producto.idProducto ?? null) &&
             p.codigoProducto === (producto.codigoProducto ?? '')
    )
    if (existe) {
      mostrarAdvertencia(`El producto "${producto.descripcionProducto || producto.codigoProducto}" ya se encuentra agregado en el detalle.`)
      return
    }

    const nuevoProducto = {
      id: Date.now(),
      idProducto: producto.idProducto ?? null,
      codigoProducto: (producto.codigoProducto ?? '').toString(),
      codigoProductoProveedor: (producto.codigoProductoProveedor ?? '').toString(),
      descripcion: (producto.descripcionProducto ?? '').toString(),
      cantidad: 1,
      precio: 0,
      idUbicacion: '',
      ubicacionTexto: '',
    }
    setProductosModal((prev) => [...prev, nuevoProducto])
    setSugerenciasProductos([])
    setMostrarSugerencias(false)
    setProductoTemp((prev) => ({ ...prev, codigoProducto: '', codigoProductoProveedor: '', descripcion: '' }))
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
      mostrarAdvertencia(`El producto "${sinUbicacion.descripcion || sinUbicacion.codigoProducto}" no tiene una ubicación seleccionada.`)
      return
    }

    const cantidadInvalida = productosModal.find((p) => parseFloat(p.cantidad) < 0 || isNaN(parseFloat(p.cantidad)))
    if (cantidadInvalida) {
      mostrarAdvertencia(`El producto "${cantidadInvalida.descripcion || cantidadInvalida.codigoProducto}" tiene una cantidad inválida. La cantidad no puede ser negativa.`)
      return
    }

    setProductos(productosModal.map((p) => ({
      ...p,
      cantidad: parseFloat(p.cantidad) || 0,
      precio: parseFloat(p.precio) || 0,
    })))
    setVisibleModalProducto(false)
    cancelarEdicion()
  }

  const agregarNuevaFila = () => {
    setFilaEditando('nuevo')
    setProductoTemp({
      idProducto: null,
      codigoProducto: '',
      codigoProductoProveedor: '',
      descripcion: '',
      cantidad: 0,
      precio: 0
    })
  }

  // Función para manejar cambios en la fila editable
  const handleProductoChange = (e) => {
    const { name, value } = e.target
    const valorLimpio = typeof value === 'string' ? value.trim() : value

    // Actualizar el valor que está cambiando
    setProductoTemp((prev) => ({
      ...prev,
      [name]: value
    }))

    // Buscar producto cuando se escribe (mínimo 2 caracteres) en código, código proveedor o descripción
    if ((name === 'codigoProducto' || name === 'codigoProductoProveedor' || name === 'descripcion') && valorLimpio.length >= 2) {
      const valorLower = valorLimpio.toLowerCase()

      // Buscar en los tres campos: cualquier coincidencia muestra el producto
      const productosEncontrados = productosDisponibles.filter((producto) => {
        const codigo = (producto.codigoProducto || '').toString().toLowerCase()
        const codigoProv = (producto.codigoProductoProveedor || '').toString().toLowerCase()
        const desc = (producto.descripcionProducto || '').toString().toLowerCase()
        return codigo.includes(valorLower) || codigoProv.includes(valorLower) || desc.includes(valorLower)
      })

      setSugerenciasProductos(productosEncontrados.slice(0, 15))
      setMostrarSugerencias(productosEncontrados.length > 0)
    } else {
      setSugerenciasProductos([])
      setMostrarSugerencias(false)
    }
  }

  // Función para seleccionar un producto de las sugerencias
  const seleccionarProductoSugerencia = (producto) => {
    setProductoTemp((prev) => ({
      ...prev,
      idProducto: producto.idProducto ?? null,
      codigoProducto: (producto.codigoProducto ?? '').toString(),
      codigoProductoProveedor: (producto.codigoProductoProveedor ?? '').toString(),
      descripcion: (producto.descripcionProducto ?? '').toString(),
    }))
    setSugerenciasProductos([])
    setMostrarSugerencias(false)
  }

  // Buscar proveedor tecleando el nombre
  const handleProveedorChange = (e) => {
    const value = (e.target.value || '').toString()
    setProveedorTexto(value)
    setFormData((prev) => ({ ...prev, proveedor: '' }))

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
    setFormData((prev) => ({ ...prev, proveedor: String(proveedor.idProveedor) }))
    setProveedorTexto(proveedor.nombre || proveedor.nombreProveedor || '')
    setSugerenciasProveedores([])
    setMostrarSugerenciasProveedor(false)
  }

  // Búsqueda de ubicación en detalle de productos
  const handleUbicacionDetalleChange = (e) => {
    const value = (e.target.value || '').toString()
    setUbicacionDetalleTexto(value)
    if (filaEditandoUbicacion === null) setIdUbicacionDetalle('')

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

  const seleccionarUbicacionDetalleSugerencia = (ubicacion) => {
    const id = ubicacion.idUbicacion ?? ubicacion.id
    const texto = ubicacion.nombre || ubicacion.nombreUbicacion || ubicacion.descripcion || ''

    if (filaEditandoUbicacion !== null) {
      setProductos((prev) => {
        const next = [...prev]
        const idx = filaEditandoUbicacion
        if (next[idx]) {
          next[idx] = { ...next[idx], idUbicacion: id != null ? String(id) : '', ubicacionTexto: texto }
        }
        return next
      })
      setFilaEditandoUbicacion(null)
    } else {
      setIdUbicacionDetalle(id != null ? String(id) : '')
      setUbicacionDetalleTexto(texto)
      const v = (productoTemp.descripcion || productoTemp.codigoProducto || productoTemp.codigoProductoProveedor || '').trim()
      if (v.length >= 2 && id != null) {
        const valorLower = v.toLowerCase()
        let encontrados = productosDisponibles.filter((p) => {
          const codigo = (p.codigoProducto || '').toString().toLowerCase()
          const codigoProv = (p.codigoProductoProveedor || '').toString().toLowerCase()
          const desc = (p.descripcionProducto || '').toString().toLowerCase()
          return codigo.includes(valorLower) || codigoProv.includes(valorLower) || desc.includes(valorLower)
        })
        encontrados = encontrados.filter((prod) => (prod.idUbicacion ?? prod.ubicacion?.idUbicacion ?? prod.ubicacion?.id) == id)
        setSugerenciasProductos(encontrados.slice(0, 15))
        setMostrarSugerencias(encontrados.length > 0)
      }
    }

    setSugerenciasUbicaciones([])
    setMostrarSugerenciasUbicacion(false)
  }

  const iniciarEditarUbicacion = (index) => {
    const p = productos[index]
    setFilaEditandoUbicacion(index)
    setUbicacionDetalleTexto(p?.ubicacionTexto || '')
    setIdUbicacionDetalle(p?.idUbicacion || '')
    setSugerenciasUbicaciones([])
    setMostrarSugerenciasUbicacion(false)
  }

  // Función para guardar el producto
  const guardarProducto = () => {
    if (!productoTemp.codigoProducto || productoTemp.cantidad <= 0 || productoTemp.precio <= 0) {
      mostrarAdvertencia('Por favor complete todos los campos requeridos')
      return
    }

    const nuevoProducto = {
      id: productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1,
      ...productoTemp,
      cantidad: parseFloat(productoTemp.cantidad),
      precio: parseFloat(productoTemp.precio),
      idUbicacion: idUbicacionDetalle || '',
      ubicacionTexto: ubicacionDetalleTexto || ''
    }

    setProductos([...productos, nuevoProducto])
    setFilaEditando(null)
    setProductoTemp({
      idProducto: null,
      codigoProducto: '',
      codigoProductoProveedor: '',
      descripcion: '',
      cantidad: 0,
      precio: 0
    })
  }

  // Función para cancelar la edición
  const cancelarEdicion = () => {
    setFilaEditando(null)
    setProductoTemp({
      idProducto: null,
      codigoProducto: '',
      codigoProductoProveedor: '',
      descripcion: '',
      cantidad: 0,
      precio: 0
    })
  }

  // Función para eliminar un producto
  const eliminarProducto = (id) => {
    setProductos(productos.filter(p => p.id !== id))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validar que haya al menos un producto
    if (productos.length === 0) {
      mostrarAdvertencia('Debe agregar al menos un producto a la orden')
      return
    }

    // Validar que todos los productos tengan idProducto
    const productosSinId = productos.filter(p => !p.idProducto)
    if (productosSinId.length > 0) {
      mostrarAdvertencia('Todos los productos deben ser seleccionados de la lista de sugerencias')
      return
    }

    // Validar campos requeridos del formulario
    if (!formData.proveedor) {
      mostrarAdvertencia('Debe buscar y seleccionar un proveedor')
      return
    }
    if (!formData.tipoMovimiento) {
      mostrarAdvertencia('Debe seleccionar un tipo de movimiento')
      return
    }
    if (!formData.tipoOrden) {
      mostrarAdvertencia('Debe seleccionar un tipo de orden')
      return
    }
    if (!formData.numeroDocumento || formData.numeroDocumento.trim() === '') {
      mostrarAdvertencia('Debe ingresar el número de documento')
      return
    }
    if (!formData.fechaIngreso) {
      mostrarAdvertencia('Debe seleccionar la fecha de ingreso')
      return
    }
    if (!formData.estadoFactura) {
      mostrarAdvertencia('Debe seleccionar el estado de factura')
      return
    }

    // Si pasa todas las validaciones, mostrar modal de confirmación
    setModalConfirmacion(true)
  }

  const confirmarGuardado = async () => {
    setModalConfirmacion(false)

    let totalPrecioCompra = 0
    for (const producto of productos) {
      totalPrecioCompra += producto.cantidad * producto.precio
    }

    const datosOrden = {
      idSucursal: 1,
      fechaOrden: formData.fechaIngreso,
      idProveedor: parseInt(formData.proveedor, 10),
      numeroDeDocumento: formData.numeroDocumento.trim(),
      tipoMovimiento: parseInt(formData.tipoMovimiento, 10),
      tipoOrden: parseInt(formData.tipoOrden, 10),
      estadoFactura: parseInt(formData.estadoFactura, 10),
      precioTotalOrden: totalPrecioCompra,
      valorCancelado: formData.valorCancelado ? parseFloat(formData.valorCancelado) : 0,
      comentario: formData.comentarios || '',
      idUsuario: idUsuarioActual,
      idUsuarioModificacion: idUsuarioActual,
    }

    try {
      const idOrdenProducto = await grabarOrdenProducto(datosOrden)
      const idOrdenNum = parseInt(idOrdenProducto, 10)
      if (Number.isNaN(idOrdenNum) || idOrdenNum <= 0) {
        mostrarAdvertencia('No se obtuvo el ID de la orden. No se pueden guardar los productos.')
        return
      }
      await grabarMovimientosProductos(idOrdenNum, productos, parseInt(formData.tipoMovimiento, 10))
      setNumeroOrdenGuardada(idOrdenNum)
      setModalExito(true)
    } catch (error) {
      mostrarAdvertencia('Error al guardar la orden: ' + error.message)
    }
  }

  const handleCancel = () => {
    navigate('/pages/productos/movimientos')
  }

  const cerrarModalYRegresar = () => {
    setModalExito(false)
    navigate('/pages/productos/movimientos')
  }

  const mostrarAdvertencia = (mensaje) => {
    setMensajeAdvertencia(mensaje)
    setModalAdvertencia(true)
  }

  // Función para grabar la orden de productos
  const grabarOrdenProducto = async (datosOrden) => {
    try {
      console.log('[grabarOrdenProducto] Enviando:', JSON.stringify(datosOrden, null, 2))
      const response = await fetch('/api/grabarOrdenProducto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosOrden)
      })

      console.log('Status de respuesta:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error de la API:', errorText)
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      // La API puede retornar un número, string o objeto con idOrdenProducto/id
      const raw = await response.json()
      let idOrdenProducto = null
      if (typeof raw === 'number' && !Number.isNaN(raw)) {
        idOrdenProducto = parseInt(raw, 10)
      } else if (typeof raw === 'string') {
        const parsed = parseInt(raw, 10)
        idOrdenProducto = Number.isNaN(parsed) ? null : parsed
      } else if (raw && typeof raw === 'object') {
        const val = raw.idOrdenProducto ?? raw.id ?? null
        idOrdenProducto = val != null ? parseInt(val, 10) : null
      }
      if (idOrdenProducto == null || Number.isNaN(idOrdenProducto) || idOrdenProducto <= 0) {
        console.error('La API no retornó un idOrdenProducto válido:', raw)
        throw new Error('La API no retornó un número de orden válido')
      }
      return idOrdenProducto

    } catch (error) {
      console.error('❌ Error al grabar orden:', error)
      throw error
    }
  }

  // Función para grabar los movimientos de productos
  const grabarMovimientosProductos = async (idOrdenProducto, productosLista, tipoMovimiento) => {
    try {
      const idOrden = parseInt(idOrdenProducto, 10)
      if (Number.isNaN(idOrden) || idOrden <= 0) {
        throw new Error('idOrdenProducto inválido: ' + idOrdenProducto)
      }

      const movimientos = productosLista.map((producto) => {
        const idUbic = producto.idUbicacion ? parseInt(producto.idUbicacion, 10) : 1
        return {
          idOrdenProducto: idOrden,
          idProducto: { idProducto: parseInt(producto.idProducto, 10) },
          cantidad: parseInt(producto.cantidad, 10),
          precioCompra: parseFloat(producto.precio),
          idUbicacion: Number.isNaN(idUbic) ? 1 : idUbic,
          idUsuarioModificacion: idUsuarioActual
        }
      })

      // La API guarda un movimiento por request
      const resultados = []
      for (const movimiento of movimientos) {
        console.log('[grabarMovimientosProductos] Enviando:', JSON.stringify(movimiento, null, 2))
        const response = await fetch(`/api/grabarMovimientosProductos?tipoDeMovimiento=${tipoMovimiento}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movimiento)
        })

        if (!response.ok) {
          let errorDetail = ''
          try {
            const errorJson = await response.json()
            errorDetail = JSON.stringify(errorJson)
          } catch (e) {
            errorDetail = await response.text()
          }
          throw new Error(`Error al guardar movimiento: ${response.status} - ${errorDetail}`)
        }

        const respClone = response.clone()
        try {
          resultados.push(await response.json())
        } catch (e) {
          resultados.push(await respClone.text())
        }
      }

      return resultados

    } catch (error) {
      console.error('❌ Error al grabar movimientos de productos:', error)
      throw error
    }
  }

  // Función para cargar los diccionarios
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
      // Extraer arrays de tipo de movimiento (puede venir como array directo o en content)
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

      // Extraer arrays de Estado Factura (puede venir como array directo o en content)
      const tipoEstadoFactura = Array.isArray(dataEstadoFactura)
        ? dataEstadoFactura
        : Array.isArray(dataEstadoFactura?.content)
          ? dataEstadoFactura.content
          : []

      console.log('Tipos de movimientos cargados:', tipoMov)
      setTipoMovimiento(tipoMov)

      console.log('Tipos de ordenes cargados:', tipoOrd)
      setTipoOrden(tipoOrd)

      console.log('Estados Factura cargados:', tipoEstadoFactura)
      setEstadoFactura(tipoEstadoFactura)

    } catch (error) {
      console.error('Error al cargar diccionarios:', error)
      setTipoMovimiento([])
      setTipoOrden([])
      setEstadoFactura([])
    }
  }

  // Función para cargar proveedores (todos para búsqueda por nombre)
  const cargarProveedores = async () => {
    try {
      const response = await fetch('/api/proveedores?size=1000')

      if (!response.ok) {
        throw new Error('Error al cargar proveedores')
      }

      const data = await response.json()

      const proveedoresArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
          ? data.content
          : []

      setProveedores(proveedoresArray)
    } catch (error) {
      console.error('Error al cargar proveedores:', error)
      setProveedores([])
    }
  }

  // Función para cargar ubicaciones
  const cargarUbicaciones = async () => {
    try {
      const response = await fetch('/api/ubicaciones?size=1000')
      if (!response.ok) throw new Error('Error al cargar ubicaciones')
      const data = await response.json()
      const arr = Array.isArray(data) ? data : (data?.content || [])
      setUbicaciones(arr)
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error)
      setUbicaciones([])
    }
  }

  // Función para cargar productos disponibles (todos para búsqueda local)
  const cargarProductosDisponibles = async () => {
    try {
      const response = await fetch('/api/productos?size=1000')

      if (!response.ok) {
        throw new Error('Error al cargar productos')
      }

      const data = await response.json()

      // Extraer array de productos (puede venir como array directo o en content)
      const productosArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
          ? data.content
          : []

      setProductosDisponibles(productosArray)
    } catch (error) {
      console.error('Error al cargar productos:', error)
      setProductosDisponibles([])
    }
  }

  // Cargar diccionarios, proveedores, ubicaciones y productos al montar el componente
  useEffect(() => {
    cargarDiccionario()
    cargarProveedores()
    cargarUbicaciones()
    cargarProductosDisponibles()
  }, [])

  return (
    <>
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong className="fs-4">Agregar Nuevo Movimiento</strong>
          </CCardHeader>
          <CCardBody className="p-4">
            <CForm onSubmit={handleSubmit}>
              {/* SECCIÓN 1: Información General del Movimiento */}
              <div className="mb-4">
                <h6 className="text-primary mb-3">Información del Movimiento</h6>
                <CRow className="mb-3">
                  <CCol xs={12} md={4}>
                    <CFormLabel htmlFor="proveedor">Proveedor</CFormLabel>
                    <div style={{ position: 'relative' }}>
                      <CFormInput
                        id="proveedor"
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

                  <CCol xs={12} md={4}>
                    <CFormLabel htmlFor="tipoMovimiento">Tipo de Movimiento</CFormLabel>
                    <CFormSelect
                      id="tipoMovimiento"
                      name="tipoMovimiento"
                      value={formData.tipoMovimiento}
                      onChange={handleChange}
                      required>
                      <option value="">Seleccione</option>
                      {tipoMovimiento.map((tipo) => (
                        <option key={tipo.indice} value={tipo.indice}>
                          {tipo.valor}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12} md={4}>
                    <CFormLabel htmlFor="tipoOrden">Tipo de Orden</CFormLabel>
                    <CFormSelect
                      id="tipoOrden"
                      name="tipoOrden"
                      value={formData.tipoOrden}
                      onChange={handleChange}
                      required>
                      <option value="">Seleccione</option>
                      {tipoOrden.map((tipo) => (
                        <option key={tipo.indice} value={tipo.indice}>
                          {tipo.valor}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="mb-3">


                  <CCol xs={12} md={4}>
                    <CFormLabel htmlFor="numeroDocumento">Número de Documento</CFormLabel>
                    <CFormInput
                      type="text"
                      id="numeroDocumento"
                      name="numeroDocumento"
                      value={formData.numeroDocumento}
                      onChange={handleChange}
                      placeholder="Ej: FAC-2025-001"
                      required
                    />
                  </CCol>

                  <CCol xs={12} md={4}>
                    <CFormLabel htmlFor="fechaIngreso">Fecha de Ingreso</CFormLabel>
                    <CFormInput
                      type="date"
                      id="fechaIngreso"
                      name="fechaIngreso"
                      value={formData.fechaIngreso}
                      onChange={handleChange}
                      required
                    />
                  </CCol>

                  <CCol xs={12} md={4}>
                    <CFormLabel htmlFor="estadoFactura">Estado de Factura</CFormLabel>
                    <CFormSelect
                      id="estadoFactura"
                      name="estadoFactura"
                      value={formData.estadoFactura}
                      onChange={handleChange}
                      required>
                      <option value="">Seleccione estado</option>
                      {estadoFactura.map((estado) => (
                        <option key={estado.indice} value={estado.indice}>
                          {estado.valor}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
              </div>

              {/* SECCIÓN 2: Información de Facturación */}
              <div className="mb-4">
                <CRow className="mb-3">

                  <CCol xs={12} md={4}>
                    <CFormLabel htmlFor="valorCancelado">Valor Cancelado de la Orden</CFormLabel>
                    <CFormInput
                      type="number"
                      id="valorCancelado"
                      name="valorCancelado"
                      value={formData.valorCancelado}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </CCol>

                  <CCol xs={12} md={8}>
                    <CFormLabel htmlFor="comentarios">Comentarios</CFormLabel>
                    <CFormTextarea
                      id="comentarios"
                      name="comentarios"
                      value={formData.comentarios}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Ingrese comentarios adicionales sobre este movimiento..."
                    />
                  </CCol>
                </CRow>
              </div>

              {/* SECCIÓN 3: Detalle de Productos */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-primary mb-0">Detalle de Productos</h6>
                  <CButton
                    color="success"
                    size="sm"
                    className="text-light"
                    onClick={abrirModalAgregarProducto}
                  >
                    + Agregar Producto
                  </CButton>
                </div>

                <CTable bordered hover responsive>
                  <CTableHead className="bg-light text-dark">
                    <CTableRow>
                      <CTableHeaderCell className="py-2">No.</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Código Producto</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Código Producto Proveedor</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Descripción</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Ubicación</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Cantidad</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Precio</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Subtotal</CTableHeaderCell>
                      <CTableHeaderCell className="py-2 text-center">Eliminar</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                    <CTableBody>
                      {/* Productos existentes */}
                      {productos.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan="10" className="text-center py-4 text-muted">
                            No hay productos agregados. Haga clic en "+ Agregar Producto" para añadir productos.
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        productos.map((producto, index) => (
                          <CTableRow key={producto.id}>
                            <CTableDataCell>{index + 1}</CTableDataCell>
                            <CTableDataCell>{producto.codigoProducto}</CTableDataCell>
                            <CTableDataCell>{producto.codigoProductoProveedor}</CTableDataCell>
                            <CTableDataCell>{producto.descripcion}</CTableDataCell>
                            <CTableDataCell>
                              {filaEditandoUbicacion === index ? (
                                <span className="d-flex align-items-center gap-1">
                                  <CFormInput
                                    type="text"
                                    placeholder="Escriba al menos 2 caracteres..."
                                    value={ubicacionDetalleTexto}
                                    onChange={handleUbicacionDetalleChange}
                                    autoComplete="off"
                                    size="sm"
                                    className="flex-grow-1"
                                  />
                                  <CButton
                                    type="button"
                                    color="secondary"
                                    size="sm"
                                    className="p-1"
                                    onClick={() => setFilaEditandoUbicacion(null)}
                                    title="Cancelar"
                                  >
                                    ✗
                                  </CButton>
                                </span>
                              ) : (
                                <span className="d-flex align-items-center gap-1">
                                  {producto.ubicacionTexto || '—'}
                                  <CButton
                                    type="button"
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() => iniciarEditarUbicacion(index)}
                                    title="Cambiar ubicación"
                                  >
                                    ✏️
                                  </CButton>
                                </span>
                              )}
                            </CTableDataCell>
                            <CTableDataCell className="text-center">{producto.cantidad}</CTableDataCell>
                            <CTableDataCell className="text-end">
                              Q{producto.precio.toFixed(2)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              Q{(producto.cantidad * producto.precio).toFixed(2)}
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CButton
                                color="danger"
                                size="sm"
                                onClick={() => eliminarProducto(producto.id)}
                                title="Eliminar producto">
                                🗑️ Eliminar
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                </CTable>

                {/* Lista de sugerencias de ubicaciones (igual que descripcionProducto/codigo) */}
                {mostrarSugerenciasUbicacion && sugerenciasUbicaciones.length > 0 && (
                  <div className="mb-3" style={{ 
                    maxHeight: '250px', 
                    overflowY: 'auto', 
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    position: 'relative',
                    zIndex: 1000
                  }}>
                    <div className="p-2 bg-light border-bottom">
                      <small className="text-muted">
                        <strong>Ubicaciones encontradas ({sugerenciasUbicaciones.length}):</strong> Haga clic para seleccionar
                      </small>
                    </div>
                    <div className="list-group list-group-flush">
                      {sugerenciasUbicaciones.map((u) => (
                        <button
                          key={u.idUbicacion ?? u.id}
                          type="button"
                          className="list-group-item list-group-item-action text-start"
                          onClick={() => seleccionarUbicacionDetalleSugerencia(u)}
                          style={{ cursor: 'pointer' }}
                        >
                          {u.nombre || u.nombreUbicacion || u.descripcion || '—'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totales */}
                {productos.length > 0 && (
                  <div className="d-flex justify-content-end mt-3">
                    <div className="border rounded p-3" style={{ minWidth: '300px' }}>
                      <div className="d-flex justify-content-between mb-2">
                        <strong>Total de productos:</strong>
                        <span>{productos.reduce((sum, p) => sum + p.cantidad, 0)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <strong>Total general:</strong>
                        <strong className="text-primary">
                          Q{productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <CRow className="mt-4">
                <CCol xs={12} className="d-flex justify-content-end gap-2">
                  <CButton
                    color="danger"
                    className="text-light"
                    onClick={handleCancel}>
                    Cancelar
                  </CButton>
                  <CButton
                    color="success"
                    className="text-light"
                    type="submit">
                    Guardar Movimiento
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

      {/* Modal de confirmación */}
      {/* Modal Agregar Producto */}
      <CModal visible={visibleModalProducto} onClose={() => { setVisibleModalProducto(false); cancelarEdicion(); }} size="xl" backdrop="static" keyboard={false}>
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
              value={productoTemp.descripcion || productoTemp.codigoProducto || ''}
              onChange={handleProductoChange}
              name="descripcion"
              autoComplete="off"
              className="form-control-lg mb-3"
            />

            {/* Sugerencias desplegables */}
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

          {/* Tabla de productos agregados en el modal */}
          <div className="mt-4">
            <h6 className="text-primary mb-3">Detalle de Productos</h6>
            <CTable bordered hover responsive>
              <CTableHead className="bg-light text-dark">
                <CTableRow>
                  <CTableHeaderCell className="py-2">No.</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Código</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Cód. Proveedor</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Descripción</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Ubicación</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Cantidad</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Precio</CTableHeaderCell>
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
                      <CTableDataCell style={{ width: '110px' }}>
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
          <CButton color="light" className="border d-flex align-items-center gap-2" onClick={() => { setVisibleModalProducto(false); cancelarEdicion(); }}>
            <span>✖️</span> Cancelar
          </CButton>
          <CButton
            color="primary"
            className="text-light d-flex align-items-center gap-2"
            onClick={confirmarProductosModal}
            disabled={productosModal.length === 0}
          >
            <span>✔️</span> Confirmar Productos ({productosModal.length})
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={modalConfirmacion} onClose={() => setModalConfirmacion(false)} alignment="center">
        <CModalHeader>
          <CModalTitle>💾 Confirmar Guardado</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="text-center">
            <p className="mb-3">¿Está seguro que desea guardar este movimiento de productos?</p>
            <div className="alert alert-info">
              <strong>Total de productos:</strong> {productos.length}<br />
              <strong>Total general:</strong> Q{productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0).toFixed(2)}
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModalConfirmacion(false)}>
            Cancelar
          </CButton>
          <CButton color="success" onClick={confirmarGuardado}>
            Sí, Guardar
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal de éxito */}
      <CModal visible={modalExito} onClose={cerrarModalYRegresar} alignment="center">
        <CModalHeader>
          <CModalTitle>✅ Orden Guardada Exitosamente</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="text-center">
            <p className="mb-3">La orden de productos se ha guardado correctamente.</p>
            <div className="alert alert-success">
              <strong>Número de orden:</strong> {numeroOrdenGuardada}
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={cerrarModalYRegresar}>
            Aceptar
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal de advertencia */}
      <CModal visible={modalAdvertencia} onClose={() => setModalAdvertencia(false)} alignment="center">
        <CModalHeader>
          <CModalTitle>⚠️ Atención</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="text-center">
            <p className="mb-0">{mensajeAdvertencia}</p>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="warning" onClick={() => setModalAdvertencia(false)}>
            Entendido
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AgregarMovimiento
