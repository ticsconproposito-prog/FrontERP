import React, { useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
} from '@coreui/react'
import { useNavigate, useParams } from 'react-router-dom'

const VerMovimiento = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  // Estados para la orden
  const [orden, setOrden] = useState(null)
  const [detalles, setDetalles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados para diccionarios
  const [tipoMovimiento, setTipoMovimiento] = useState([])
  const [tipoOrden, setTipoOrden] = useState([])
  const [estadoFactura, setEstadoFactura] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])

  // Funciones helper para obtener nombres
  const obtenerNombreTipoMovimiento = (idMovimiento) => {
    if (!idMovimiento && idMovimiento !== 0) return 'Sin tipo'
    const tipo = tipoMovimiento.find(u => u.indice === idMovimiento)
    return tipo ? tipo.valor : idMovimiento
  }

  const obtenerNombreTipoOrden = (idTipoOrden) => {
    if (!idTipoOrden && idTipoOrden !== 0) return 'Sin tipo'
    const tipo = tipoOrden.find(u => u.indice === idTipoOrden)
    return tipo ? tipo.valor : idTipoOrden
  }

  const obtenerNombreTipoEstadoFactura = (idEstadoFactura) => {
    if (!idEstadoFactura && idEstadoFactura !== 0) return 'Sin estado'
    const estado = estadoFactura.find(u => u.indice === idEstadoFactura)
    return estado ? estado.valor : idEstadoFactura
  }

  const obtenerNombreProveedor = (idProveedor) => {
    if (!idProveedor) return 'Sin proveedor'
    const proveedor = proveedores.find(p => p.idProveedor === idProveedor)
    return proveedor ? (proveedor.nombre || proveedor.nombreProveedor) : `ID: ${idProveedor} (No encontrado)`
  }

  const obtenerProducto = (idProducto) => {
    if (!idProducto) {
      return { codigoProducto: 'N/A', codigoProductoProveedor: 'N/A', descripcionProducto: 'N/A' }
    }
    const producto = productos.find(p => p.idProducto === idProducto)
    return producto || { codigoProducto: 'N/A', codigoProductoProveedor: 'N/A', descripcionProducto: `Producto ID: ${idProducto} (No encontrado)` }
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A'
    const [year, month, day] = fecha.split('-')
    return `${day}-${month}-${year}`
  }

  // Cargar diccionarios
  const cargarDiccionario = async () => {
    try {
      const response = await fetch('/api/diccionarios')

      const responseTipoMovimiento = await fetch('/api/diccionarios?diccionario=TIPODEMOVIMIENTO')
      const responseTipoOrden = await fetch('/api/diccionarios?diccionario=TIPODEORDEN')
      const responseEstadoFactura = await fetch('/api/diccionarios?diccionario=ESTADOFATURAORDEN')
      if (!response.ok) throw new Error('Error al cargar diccionarios')
      
     
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

      setTipoMovimiento(tipoMov)
      setTipoOrden(tipoOrd)
      setEstadoFactura(tipoEstadoFactura)
    } catch (error) {
      console.error('Error al cargar diccionarios:', error)
    }
  }

  // Cargar proveedores
  const cargarProveedores = async () => {
    try {
      const response = await fetch('/api/proveedores')
      if (!response.ok) throw new Error('Error al cargar proveedores')
      
      const data = await response.json()
      const proveedoresArray = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []
      setProveedores(proveedoresArray)
    } catch (error) {
      console.error('❌ Error al cargar proveedores:', error)
      setProveedores([])
    }
  }

  // Cargar productos
  const cargarProductos = async () => {
    try {
      const url = '/api/productos?size=1000'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Error al cargar productos')
      
      const data = await response.json()
      const productosArray = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []
      setProductos(productosArray)
    } catch (error) {
      console.error('❌ Error al cargar productos:', error)
      setProductos([])
    }
  }

  // Cargar la orden específica
  const cargarOrden = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/ordenProductos?id=${id}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar la orden')
      }
      
      const data = await response.json()
      
      let ordenData = null
      if (data.content && Array.isArray(data.content) && data.content.length > 0) {
        ordenData = data.content[0]
      } else {
        console.error('La API no devolvió ninguna orden con id:', id)
      }
      
      setOrden(ordenData)
    } catch (error) {
      console.error('❌ Error al cargar orden:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Cargar los detalles de movimientos
  const cargarDetalles = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/movimientosProductos?idOrdenProducto=${id}`)
      
      if (!response.ok) throw new Error('Error al cargar detalles')
      
      const data = await response.json()
      const detallesArray = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []
      setDetalles(detallesArray)
    } catch (error) {
      console.error('❌ Error al cargar detalles:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Cargar todo al montar el componente
  useEffect(() => {
    cargarDiccionario()
    cargarProveedores()
    cargarProductos()
  }, [])

  useEffect(() => {
    if (id) {
      const cargar = async () => {
        await cargarOrden()
        await cargarDetalles()
      }
      cargar()
    }
  }, [id])

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-3">Cargando información...</p>
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
              <p className="text-danger">Error: {error}</p>
              <CButton color="primary" onClick={() => navigate('/pages/productos/movimientos')}>
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
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <strong className="fs-4">Detalle de Orden #{orden?.idOrdenProducto}</strong>
              <CButton color="secondary" onClick={() => navigate('/pages/productos/movimientos')}>
                Volver
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {/* Información General de la Orden */}
            <h5 className="text-primary mb-3">Información General</h5>
            <CRow className="mb-4">
              <CCol md={6}>
                <table className="table table-borderless">
                  <tbody>
                    <tr>
                      <td className="fw-bold">Número de Documento:</td>
                      <td>{orden?.numeroDeDocumento || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Fecha de Orden:</td>
                      <td>{formatearFecha(orden?.fechaOrden)}</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Proveedor:</td>
                      <td>{obtenerNombreProveedor(orden?.idProveedor)}</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Tipo de Movimiento:</td>
                      <td>{obtenerNombreTipoMovimiento(orden?.tipoDeMovimiento)}</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Comentarios:</td>
                      <td>{orden?.comentario || 'Sin comentarios'}</td>
                    </tr>
                  </tbody>
                </table>
              </CCol>
              <CCol md={6}>
                <table className="table table-borderless">
                  <tbody>
                    <tr>
                      <td className="fw-bold">Tipo de Orden:</td>
                      <td>{obtenerNombreTipoOrden(orden?.tipoDeOrden)}</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Estado de Factura:</td>
                      <td>{obtenerNombreTipoEstadoFactura(orden?.estadoFactura)}</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Precio Total:</td>
                      <td className="text-success fw-bold">Q{orden?.precioTotalOrden?.toFixed(2) || '0.00'}</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Valor Cancelado:</td>
                      <td>Q{(orden?.valorCancelado ?? 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </CCol>
            </CRow>

            {/* Detalle de Productos */}
            <h5 className="text-primary mb-3">Detalle de Productos</h5>
            <CTable striped hover bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                  <CTableHeaderCell>Código Producto</CTableHeaderCell>
                  <CTableHeaderCell>Código Proveedor Producto</CTableHeaderCell>
                  <CTableHeaderCell>Descripción</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Cantidad</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Precio Compra</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Subtotal</CTableHeaderCell>
                  <CTableHeaderCell>Ubicación</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {detalles.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan="8" className="text-center py-4 text-muted">
                      No hay detalles de productos para esta orden.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  detalles.map((detalle, index) => {
                    const producto = obtenerProducto(detalle.idProducto)
                    return (
                      <CTableRow key={detalle.idMovimientoProducto || index}>
                        <CTableDataCell className="text-center">{index + 1}</CTableDataCell>
                        <CTableDataCell>{producto.codigoProducto}</CTableDataCell>
                        <CTableDataCell>{producto.codigoProductoProveedor ?? 'N/A'}</CTableDataCell>
                        <CTableDataCell>{producto.descripcionProducto}</CTableDataCell>
                        <CTableDataCell className="text-center">{detalle.cantidad}</CTableDataCell>
                        <CTableDataCell className="text-end">Q{detalle.precioCompra?.toFixed(2)}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          Q{(detalle.cantidad * detalle.precioCompra)?.toFixed(2)}
                        </CTableDataCell>
                        <CTableDataCell>{detalle.idUbicacion || 'N/A'}</CTableDataCell>
                      </CTableRow>
                    )
                  })
                )}
              </CTableBody>
            </CTable>

            {/* Resumen Total */}
            {detalles.length > 0 && (
              <div className="d-flex justify-content-end mt-3">
                <div className="border rounded p-3" style={{ minWidth: '300px' }}>
                  <div className="d-flex justify-content-between mb-2">
                    <strong>Total de productos:</strong>
                    <span>{detalles.reduce((sum, d) => sum + d.cantidad, 0)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <strong>Total general:</strong>
                    <strong className="text-success">
                      Q{detalles.reduce((sum, d) => sum + (d.cantidad * d.precioCompra), 0).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
    </>
  )
}

export default VerMovimiento
