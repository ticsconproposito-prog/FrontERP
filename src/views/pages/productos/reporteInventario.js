import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CSpinner,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import * as XLSX from 'xlsx'

const ReporteInventario = () => {
  const navigate = useNavigate()

  // Estados
  const [inventario, setInventario] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    codigoProducto: '',
    codigoProductoProveedor: '',
    descripcion: '',
  })

  // Función para formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A'
    const [year, month, day] = fecha.split('-')
    return `${day}-${month}-${year}`
  }

  // Cargar inventario
  const cargarInventario = async (pagina = 0, filtrosActuales = filtros) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('page', pagina)
      params.append('size', '20')

      // Agregar filtros solo si tienen valor
      if (filtrosActuales.codigoProducto?.trim()) {
        params.append('codigoProducto', filtrosActuales.codigoProducto.trim())
      }
      if (filtrosActuales.codigoProductoProveedor?.trim()) {
        params.append('codigoProductoProveedor', filtrosActuales.codigoProductoProveedor.trim())
      }
      if (filtrosActuales.descripcion?.trim()) {
        params.append('descripcion', filtrosActuales.descripcion.trim())
      }

      const url = `http://127.0.0.1:8080/inventario?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      // Procesar los datos según la estructura de respuesta
      const inventarioArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
        ? data.content
        : []

      // Formatear los datos para incluir información del producto
      const inventarioFormateado = inventarioArray.map((item) => ({
        idProductoInventario: item.idProductoInventario,
        codigoProducto: item.idProducto?.codigoProducto || 'N/A',
        descripcionProducto: item.idProducto?.descripcionProducto || 'N/A',
        codigoProductoProveedor: item.idProducto?.codigoProductoProveedor || 'N/A',
        cantidadExistencias: item.cantidadExistencias || 0,
        cantidadDanados: item.cantidadDanados || 0,
        precioCompra: item.precioCompra || 0,
        precioVenta: item.precioVenta || 0,
        fechaModificacion: item.fechaModificacion || null,
        horaModificacion: item.horaModificacion || null,
      }))

      setInventario(inventarioFormateado)
      setPage(data.number || 0)
      setTotalPages(data.totalPages || 0)
    } catch (error) {
      console.error('❌ Error al cargar inventario:', error)
      setError(error.message)
      setInventario([])
    } finally {
      setLoading(false)
    }
  }

  // Manejar cambios en filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Limpiar filtros
  const limpiarFiltros = () => {
    const nuevosFiltros = {
      codigoProducto: '',
      codigoProductoProveedor: '',
      descripcion: '',
    }
    setFiltros(nuevosFiltros)
    cargarInventario(0, nuevosFiltros)
  }

  // Exportar a Excel
  const exportarAExcel = () => {
    const datosExcel = inventario.map((item, index) => ({
      '#': (page * 20) + index + 1,
      'Código Producto': item.codigoProducto,
      'Código Proveedor': item.codigoProductoProveedor,
      'Descripción': item.descripcionProducto,
      'Existencias': item.cantidadExistencias,
      'Dañados': item.cantidadDanados,
      'Precio Compra': item.precioCompra,
      'Precio Venta': item.precioVenta,
      'Fecha Modificación': formatearFecha(item.fechaModificacion),
      'Hora Modificación': item.horaModificacion || 'N/A',
    }))

    const worksheet = XLSX.utils.json_to_sheet(datosExcel)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario')

    // Ajustar ancho de columnas
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 20 }, // Código Producto
      { wch: 20 }, // Código Proveedor
      { wch: 40 }, // Descripción
      { wch: 12 }, // Existencias
      { wch: 12 }, // Dañados
      { wch: 15 }, // Precio Compra
      { wch: 15 }, // Precio Venta
      { wch: 18 }, // Fecha Modificación
      { wch: 18 }, // Hora Modificación
    ]

    XLSX.writeFile(workbook, 'ReporteInventario.xlsx')
  }

  // Cargar datos iniciales
  useEffect(() => {
    cargarInventario(0)
  }, [])

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarInventario(0, filtros)
    }, 500)

    return () => clearTimeout(timer)
  }, [filtros])

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
              <CRow className="mb-3">
                <CCol md={3}>
                  <CFormInput
                    type="text"
                    label="Código Producto"
                    placeholder="Buscar por código..."
                    name="codigoProducto"
                    value={filtros.codigoProducto}
                    onChange={handleFiltroChange}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormInput
                    type="text"
                    label="Código Proveedor"
                    placeholder="Buscar por código proveedor..."
                    name="codigoProductoProveedor"
                    value={filtros.codigoProductoProveedor}
                    onChange={handleFiltroChange}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormInput
                    type="text"
                    label="Descripción"
                    placeholder="Buscar por descripción..."
                    name="descripcion"
                    value={filtros.descripcion}
                    onChange={handleFiltroChange}
                  />
                </CCol>
                <CCol md={2} className="d-flex align-items-end gap-2">
                  <CButton color="secondary" onClick={limpiarFiltros}>
                    Limpiar
                  </CButton>
                  <CButton color="success" onClick={exportarAExcel}>
                    Exportar
                  </CButton>
                </CCol>
              </CRow>

              {/* Tabla */}
              {loading ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                  <p className="mt-2">Cargando inventario...</p>
                </div>
              ) : error ? (
                <div className="alert alert-danger" role="alert">
                  Error al cargar inventario: {error}
                </div>
              ) : inventario.length === 0 ? (
                <div className="alert alert-info" role="alert">
                  No se encontraron registros de inventario.
                </div>
              ) : (
                <>
                  <CTable striped hover bordered responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                        <CTableHeaderCell>Código Producto</CTableHeaderCell>
                        <CTableHeaderCell>Código Proveedor</CTableHeaderCell>
                        <CTableHeaderCell>Descripción</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Existencias</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Dañados</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Precio Compra</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Precio Venta</CTableHeaderCell>
                        <CTableHeaderCell>Fecha Modificación</CTableHeaderCell>
                        <CTableHeaderCell>Hora Modificación</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {inventario.map((item, index) => (
                        <CTableRow key={item.idProductoInventario || index}>
                          <CTableDataCell className="text-center">
                            {(page * 20) + index + 1}
                          </CTableDataCell>
                          <CTableDataCell>{item.codigoProducto}</CTableDataCell>
                          <CTableDataCell>{item.codigoProductoProveedor}</CTableDataCell>
                          <CTableDataCell>{item.descripcionProducto}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            {item.cantidadExistencias}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {item.cantidadDanados}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            Q{item.precioCompra.toFixed(2)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            Q{item.precioVenta.toFixed(2)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatearFecha(item.fechaModificacion)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {item.horaModificacion || 'N/A'}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <CPagination align="center" aria-label="Paginación de inventario">
                      <CPaginationItem
                        disabled={page === 0}
                        onClick={() => cargarInventario(page - 1)}
                      >
                        Anterior
                      </CPaginationItem>
                      {[...Array(totalPages)].map((_, idx) => (
                        <CPaginationItem
                          key={idx}
                          active={idx === page}
                          onClick={() => cargarInventario(idx)}
                        >
                          {idx + 1}
                        </CPaginationItem>
                      ))}
                      <CPaginationItem
                        disabled={page === totalPages - 1}
                        onClick={() => cargarInventario(page + 1)}
                      >
                        Siguiente
                      </CPaginationItem>
                    </CPagination>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default ReporteInventario
