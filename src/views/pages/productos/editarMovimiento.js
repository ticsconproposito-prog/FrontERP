import React, { useState, useEffect, useRef } from 'react'
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
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import { useNavigate, useParams } from 'react-router-dom'

const EditarMovimiento = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [tipoMovimiento, setTipoMovimiento] = useState([])
  const [tipoOrden, setTipoOrden] = useState([])
  const [estadoFactura, setEstadoFactura] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])

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
  const [productoTemp, setProductoTemp] = useState({ idProducto: null, cantidad: 1, precioCompra: 0 })
  const [modalExito, setModalExito] = useState(false)
  const [modalError, setModalError] = useState(false)
  const [mensajeError, setMensajeError] = useState('')
  const returnFocusRef = useRef(null)

  const obtenerProducto = (idProducto) => {
    if (!idProducto) return { codigoProducto: 'N/A', codigoProductoProveedor: 'N/A', descripcionProducto: 'N/A' }
    const p = productos.find(x => x.idProducto === idProducto)
    return p || { codigoProducto: 'N/A', codigoProductoProveedor: 'N/A', descripcionProducto: 'N/A' }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDetalleChange = (index, field, value) => {
    setDetalles(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: field === 'cantidad' || field === 'precioCompra' ? Number(value) || 0 : value }
      return next
    })
  }

  const eliminarDetalle = (index) => {
    const det = detalles[index]
    if (det.idMovimientoProducto) {
      setDetallesEliminados(prev => [...prev, det.idMovimientoProducto])
    }
    setDetalles(prev => prev.filter((_, i) => i !== index))
  }

  const handleBusquedaProducto = (e) => {
    const value = e.target.value
    setBusquedaProducto(value)
    const v = value.trim().toLowerCase()
    if (v.length >= 2) {
      const filtrados = productos.filter(p => {
        const cod = (p.codigoProducto || '').toString().toLowerCase()
        const prov = (p.codigoProductoProveedor || '').toString().toLowerCase()
        const desc = (p.descripcionProducto || '').toString().toLowerCase()
        return cod.includes(v) || prov.includes(v) || desc.includes(v)
      })
      setSugerenciasProductos(filtrados.slice(0, 15))
      setMostrarSugerencias(filtrados.length > 0)
    } else {
      setSugerenciasProductos([])
      setMostrarSugerencias(false)
    }
  }

  const seleccionarProductoAgregar = (producto) => {
    setProductoTemp({
      idProducto: producto.idProducto,
      cantidad: 1,
      precioCompra: 0
    })
    setBusquedaProducto((producto.descripcionProducto || producto.codigoProducto || '').toString().substring(0, 40))
    setSugerenciasProductos([])
    setMostrarSugerencias(false)
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
      return
    }
    const cantidad = Number(productoTemp.cantidad) || 1
    const precio = Number(productoTemp.precioCompra) || 0
    if (cantidad <= 0 || precio < 0) {
      setMensajeError('Cantidad y precio deben ser válidos')
      setModalError(true)
      return
    }
    setDetalles(prev => [...prev, {
      idMovimientoProducto: null,
      idOrdenProducto: parseInt(id, 10),
      idProducto: productoTemp.idProducto,
      cantidad,
      precioCompra: precio,
      idUbicacion: 1
    }])
    setProductoTemp({ idProducto: null, cantidad: 1, precioCompra: 0 })
    setBusquedaProducto('')
  }

  const cargarDiccionario = async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/diccionarios?diccionario=TIPODEMOVIMIENTO'),
        fetch('/api/diccionarios?diccionario=TIPODEORDEN'),
        fetch('/api/diccionarios?diccionario=ESTADOFATURAORDEN')
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

  const cargarProductos = async () => {
    try {
      const r = await fetch('/api/productos?size=1000')
      const data = await r.json()
      setProductos(Array.isArray(data) ? data : (data?.content || []))
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
      setFormData({
        numeroDocumento: orden.numeroDeDocumento || '',
        fechaIngreso: (orden.fechaOrden || '').toString().substring(0, 10),
        proveedor: String(orden.idProveedor ?? ''),
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
      setDetalles(arr)
    } catch (e) {
      console.error(e)
      setDetalles([])
    }
  }

  useEffect(() => {
    cargarDiccionario()
    cargarProveedores()
    cargarProductos()
  }, [])

  useEffect(() => {
    if (id) {
      cargarOrden()
      cargarDetalles()
    }
  }, [id])

  const totalOrden = detalles.reduce((sum, d) => sum + (d.cantidad || 0) * (d.precioCompra || 0), 0)

  const handleGuardar = async (e) => {
    e.preventDefault()
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
        idUsuarioModificacion: 1
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
        if (det.idMovimientoProducto) {
          const body = {
            idMovimientoProducto: det.idMovimientoProducto,
            idOrdenProducto: parseInt(id, 10),
            idProducto: det.idProducto,
            cantidad: parseInt(det.cantidad, 10),
            precioCompra: parseFloat(det.precioCompra),
            idUbicacion: det.idUbicacion || 1,
            idUsuarioModificacion: 1
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
            idProducto: parseInt(det.idProducto, 10),
            cantidad: parseInt(det.cantidad, 10),
            precioCompra: parseFloat(det.precioCompra),
            idUbicacion: det.idUbicacion || 1,
            idUsuarioModificacion: 1
          }
          const resNew = await fetch('/api/grabarMovimientosProductos', {
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
                    <CFormSelect name="proveedor" value={formData.proveedor} onChange={handleChange}>
                      <option value="">Seleccione</option>
                      {proveedores.map(p => (
                        <option key={p.idProveedor} value={p.idProveedor}>{p.nombre || p.nombreProveedor}</option>
                      ))}
                    </CFormSelect>
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

                <h6 className="text-primary mb-3 mt-4">Detalle de productos</h6>

                <div className="mb-3 p-3 border rounded bg-light">
                  <CFormLabel className="fw-bold">Agregar producto</CFormLabel>
                  <CRow className="g-2 align-items-end">
                    <CCol md={4}>
                      <CFormLabel className="small">Buscar (código o descripción)</CFormLabel>
                      <div style={{ position: 'relative' }}>
                        <CFormInput placeholder="Escriba al menos 2 caracteres..." value={busquedaProducto} onChange={handleBusquedaProducto} autoComplete="off" />
                        {mostrarSugerencias && sugerenciasProductos.length > 0 && (
                          <div className="list-group position-absolute w-100 mt-1 shadow" style={{ zIndex: 1050, maxHeight: '220px', overflowY: 'auto' }}>
                            {sugerenciasProductos.map(p => (
                              <button key={p.idProducto} type="button" className="list-group-item list-group-item-action text-start" onClick={() => seleccionarProductoAgregar(p)}>
                                <strong>{p.codigoProducto}</strong> {p.codigoProductoProveedor && `| ${p.codigoProductoProveedor}`} — {String(p.descripcionProducto || '').substring(0, 50)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </CCol>
                    <CCol md={2}>
                      <CFormLabel className="small">Cantidad</CFormLabel>
                      <CFormInput type="number" min="1" value={productoTemp.cantidad} onChange={e => setProductoTemp(prev => ({ ...prev, cantidad: Number(e.target.value) || 0 }))} />
                    </CCol>
                    <CCol md={2}>
                      <CFormLabel className="small">Precio compra</CFormLabel>
                      <CFormInput type="number" step="0.01" min="0" value={productoTemp.precioCompra || ''} onChange={e => setProductoTemp(prev => ({ ...prev, precioCompra: Number(e.target.value) || 0 }))} />
                    </CCol>
                    <CCol md={2}>
                      <CButton type="button" color="success" onClick={agregarProductoALista}>Agregar producto</CButton>
                    </CCol>
                  </CRow>
                </div>

                <CTable striped hover bordered responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>#</CTableHeaderCell>
                      <CTableHeaderCell>Código</CTableHeaderCell>
                      <CTableHeaderCell>Cód. Proveedor</CTableHeaderCell>
                      <CTableHeaderCell>Descripción</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Cantidad</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Precio compra</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Subtotal</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Acciones</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {detalles.map((det, index) => {
                      const prod = obtenerProducto(det.idProducto)
                      const subtotal = (det.cantidad || 0) * (det.precioCompra || 0)
                      return (
                        <CTableRow key={det.idMovimientoProducto != null ? det.idMovimientoProducto : 'n-' + index}>
                          <CTableDataCell>{index + 1}</CTableDataCell>
                          <CTableDataCell>{prod.codigoProducto}</CTableDataCell>
                          <CTableDataCell>{prod.codigoProductoProveedor}</CTableDataCell>
                          <CTableDataCell>{prod.descripcionProducto}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CFormInput type="number" min="0" value={det.cantidad || ''} onChange={e => handleDetalleChange(index, 'cantidad', e.target.value)} className="text-center" style={{ maxWidth: '80px' }} />
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            <CFormInput type="number" step="0.01" min="0" value={det.precioCompra ?? ''} onChange={e => handleDetalleChange(index, 'precioCompra', e.target.value)} className="text-end" style={{ maxWidth: '100px' }} />
                          </CTableDataCell>
                          <CTableDataCell className="text-end">Q{(subtotal || 0).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton type="button" color="danger" size="sm" onClick={() => eliminarDetalle(index)} title="Eliminar">
                              Eliminar
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
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
