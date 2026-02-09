import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormSelect,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from 'xlsx';

const Layout = () => {
  const [visible, setVisible] = useState(false);
  const [productos, setProductos] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [estados, setEstado] = useState([]);
  const [form, setForm] = useState({
    codigoProducto: '',
    codigoProductoProveedor: '',
    descripcionProducto: '',
    unidadDeMedida: '',
    estado: '',

  });
  const [modalMsgVisible, setModalMsgVisible] = useState(false);
  const [modalMsgTitle, setModalMsgTitle] = useState('');
  const [modalMsgBody, setModalMsgBody] = useState('');
  const [modalMsgColor, setModalMsgColor] = useState('info');
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEliminar, setIdEliminar] = useState(null)

  // Función para obtener el nombre de la unidad de medida por su ID
  const obtenerNombreUnidad = (idUnidad) => {
    const unidad = unidadesMedida.find(u => u.indice === idUnidad)
    return unidad ? unidad.valor : idUnidad
  }

  // Función para obtener el nombre de los estados del producto
  const obtenerNombreEstado = (idEstado) => {
    const estadodefinicion = estados.find(u => u.indice === idEstado)
    return estadodefinicion ? estadodefinicion.valor : idEstado
  }

  const cargarDiccionario = async () => {
    try {
      const responseUnidadMedida = await fetch('/api/diccionarios?diccionario=UNIDADDEMEDIDA')
      const responseEstado = await fetch('/api/diccionarios?diccionario=ESTADO')

      if (!responseUnidadMedida.ok || !responseEstado.ok) {
        throw new Error('Error al cargar diccionarios')
      }

      const dataUnidadMedida = await responseUnidadMedida.json()
      const dataEstado = await responseEstado.json()

      // Extraer arrays de unidades de medida (puede venir como array directo o en content)
      const unidades = Array.isArray(dataUnidadMedida) 
        ? dataUnidadMedida 
        : Array.isArray(dataUnidadMedida?.content) 
          ? dataUnidadMedida.content 
          : []
     
      // Extraer arrays de estados (puede venir como array directo o en content)
      const nombreEstado = Array.isArray(dataEstado) 
        ? dataEstado 
        : Array.isArray(dataEstado?.content) 
          ? dataEstado.content 
          : []

      console.log('Estados filtrados:', nombreEstado)
      setEstado(nombreEstado)

      console.log('Unidades filtradas:', unidades)
      setUnidadesMedida(unidades)

    } catch (error) {
      console.error('Error al cargar:', error)
      setUnidadesMedida([])
      setEstado([])
    }
  }

  const validarFormulario = () => {
    const nuevosErrores = {}

    if (!form.codigoProducto.trim()) {
      nuevosErrores.codigoProducto = 'El código es obligatorio'
    }

    if (!form.descripcionProducto.trim()) {
      nuevosErrores.descripcionProducto = 'La descripción es obligatoria'
    }

    if (!form.unidadDeMedida) {
      nuevosErrores.unidadDeMedida = 'Seleccione una unidad de medida'
    }


    setErrors(nuevosErrores)

    return Object.keys(nuevosErrores).length === 0
  }

  const abrirEditar = (producto) => {
    console.log('Producto a editar:', producto)
    console.log('Unidad de medida del producto (ID):', producto.unidadDeMedida)

    // Buscar el valor correspondiente al ID de la unidad de medida
    const unidadEncontrada = unidadesMedida.find(
      unidad => unidad.indice === producto.unidadDeMedida
    )

    const valorUnidad = unidadEncontrada ? unidadEncontrada.valor : producto.unidadDeMedida

    console.log('Unidad encontrada:', unidadEncontrada)
    console.log('Valor de la unidad:', valorUnidad)

    setForm({
      idProducto: producto.idProducto,
      codigoProducto: producto.codigoProducto,
      codigoProductoProveedor: producto.codigoProductoProveedor,
      descripcionProducto: producto.descripcionProducto,
      unidadDeMedida: valorUnidad,
    })

    setModoEdicion(true)
    setVisible(true)
  }

  const confirmarEliminar = (id) => {
    if (!id) {
      console.error('ID de producto inválido')
      return
    }
    setIdEliminar(id)
    setModalMsgTitle('Confirmar eliminación')
    setModalMsgBody('¿Está seguro que desea eliminar este producto?')
    setModalMsgColor('danger')
    setModalMsgVisible(true)
  }

  const eliminarProducto = async () => {
    // Validación: verificar que hay un ID válido
    if (!idEliminar) {
      setModalMsgTitle('Error')
      setModalMsgBody('No se ha seleccionado ningún producto para eliminar')
      setModalMsgColor('danger')
      return
    }

    try {
      // Realizar la petición DELETE
      const response = await fetch(
        `/api/eliminarProducto/${idEliminar}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      // Manejo de diferentes códigos de respuesta
      if (!response.ok) {
        let errorMessage = 'No se pudo eliminar el producto'

        // Intentar obtener el mensaje de error del servidor
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          // Si no hay JSON, usar mensaje por defecto
        }

        // Mensajes específicos según el código de estado
        if (response.status === 404) {
          errorMessage = 'El producto no existe o ya fue eliminado'
        } else if (response.status === 403) {
          errorMessage = 'No tiene permisos para eliminar este producto'
        } else if (response.status === 409) {
          errorMessage = 'No se puede eliminar el producto porque está siendo utilizado'
        } else if (response.status === 500) {
          errorMessage = 'Error del servidor. Por favor, intente más tarde'
        }

        throw new Error(errorMessage)
      }

      // Cerrar modal de confirmación
      setModalMsgVisible(false)
      setIdEliminar(null)

      // Verificar si debemos cambiar de página (si eliminamos el último elemento de la página actual)
      const nuevaPagina = productos.length === 1 && page > 0 ? page - 1 : page

      // Recargar productos
      await cargarProductos(nuevaPagina)

      // Mostrar mensaje de éxito
      setModalMsgTitle('Éxito')
      setModalMsgBody(`Producto eliminado correctamente`)
      setModalMsgColor('success')
      setModalMsgVisible(true)

    } catch (error) {
      // Manejo de errores
      console.error('Error al eliminar producto:', error)

      let mensajeError = error.message || 'Error desconocido al eliminar el producto'

      // Si es un error de red
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        mensajeError = 'Error de conexión. Verifique su conexión a internet e intente nuevamente'
      }

      setModalMsgTitle('Error al eliminar')
      setModalMsgBody(mensajeError)
      setModalMsgColor('danger')
      setModalMsgVisible(true)
      setIdEliminar(null)
    }
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async () => {
    if (!validarFormulario()) return

    const url = modoEdicion
      ? `/api/editarProducto/${form.idProducto}`
      : '/api/grabarProducto'

    const method = modoEdicion ? 'PUT' : 'POST'

    try {
      // Buscar el ID de la unidad de medida basado en el valor seleccionado
      const unidadEncontrada = unidadesMedida.find(
        unidad => unidad.valor === form.unidadDeMedida
      )

      // Preparar los datos para enviar al backend
      const datosAEnviar = {
        ...form,
        unidadDeMedida: unidadEncontrada ? unidadEncontrada.indice : form.unidadDeMedida
      }

      console.log('Datos a enviar al backend:', datosAEnviar)

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosAEnviar),
      })

      if (!response.ok) throw new Error('Error al guardar')

      //refrescar tabla
      await cargarProductos(page)

      setVisible(false)
      setModoEdicion(false)

      setModalMsgTitle('Éxito')
      setModalMsgBody(modoEdicion ? 'Producto actualizado' : 'Producto registrado')
      setModalMsgColor('success')
      setModalMsgVisible(true)

      setForm({
        codigoProducto: '',
        codigoProductoProveedor: '',
        descripcionProducto: '',
        unidadDeMedida: '',
        estado: ''
      })


    } catch (error) {
      setModalMsgTitle('Error')
      setModalMsgBody(error.message)
      setModalMsgColor('danger')
      setModalMsgVisible(true)
    }
  }
  const [filtros, setFiltros] = useState({
    codigoProducto: '',
    codigoProductoProveedor: '',
    descripcionProducto: '',
  })

  const pageSize = 20

  const cargarProductos = async (pagina = 0, filtrosActuales = filtros) => {
    
    const params = new URLSearchParams({
      ...filtrosActuales,
      page: pagina,
   
    })

    const response = await fetch(
      `/api/productos?${params.toString()}`
    )

    const data = await response.json()

    setProductos(data.content)
    setPage(data.number)
    setTotalPages(data.totalPages)
  }

  // Función para exportar productos a Excel
  const exportarAExcel = async () => {
    try {
      // Obtener TODOS los productos sin paginación
      const params = new URLSearchParams({
        ...filtros,
        page: 0,
        size: 10000, // Obtener todos los registros
      })

      const response = await fetch(
        `/api/productos?${params.toString()}`
      )

      if (!response.ok) throw new Error('Error al obtener los productos')

      const data = await response.json()
      const todosLosProductos = data.content

      if (!todosLosProductos || todosLosProductos.length === 0) {
        setModalMsgTitle('Información')
        setModalMsgBody('No hay productos para exportar')
        setModalMsgColor('info')
        setModalMsgVisible(true)
        return
      }

      // Preparar los datos para el Excel
      const datosExcel = todosLosProductos.map((producto, index) => ({
        'No.': index + 1,
        'Código Producto': producto.codigoProducto || '',
        'Código Producto Proveedor': producto.codigoProductoProveedor || '',
        'Descripción': producto.descripcionProducto || '',
        'Unidad de Medida': obtenerNombreUnidad(producto.unidadDeMedida),
        'Estado': obtenerNombreEstado(producto.estado)
      }))

      // Crear el libro de trabajo
      const ws = XLSX.utils.json_to_sheet(datosExcel)

      // Ajustar el ancho de las columnas
      const columnWidths = [
        { wch: 5 },  // No.
        { wch: 20 }, // Código Producto
        { wch: 25 }, // Código Producto Proveedor
        { wch: 50 }, // Descripción
        { wch: 20 }, // Unidad de Medida
        { wch: 15 }, // Estado
      ]
      ws['!cols'] = columnWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Productos')

      // Generar el nombre del archivo con fecha y hora
      const fecha = new Date()
      const nombreArchivo = `Productos_${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}_${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}.xlsx`

      // Descargar el archivo
      XLSX.writeFile(wb, nombreArchivo)

      // Mostrar mensaje de éxito
      setModalMsgTitle('Éxito')
      setModalMsgBody(`Se exportaron ${todosLosProductos.length} productos correctamente`)
      setModalMsgColor('success')
      setModalMsgVisible(true)

    } catch (error) {
      console.error('Error al exportar:', error)
      setModalMsgTitle('Error')
      setModalMsgBody('No se pudo exportar el archivo. ' + error.message)
      setModalMsgColor('danger')
      setModalMsgVisible(true)
    }
  }

  const handleFiltroChange = (e) => {
    const { name, value } = e.target

    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {

      if (
        filtros.codigoProducto.length < 2 &&
        filtros.codigoProductoProveedor.length < 2 &&
        filtros.descripcionProducto.length < 2
      ) {
        cargarProductos(0)
        return
      } else {

        cargarProductos(0, filtros)

      }

    }, 500)

    return () => clearTimeout(delayDebounce)

  }, [filtros])

  // Cargar diccionario para unidades de medida y Estado
  useEffect(() => {
    cargarDiccionario()
  }, [])

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="w-100 shadow-sm border-0" >
          <CCardHeader>
            <strong className="fs-4">Gestión de Productos</strong>
          </CCardHeader>
          <CCardBody className="p-4">

            <div className="mt-2 ms-auto me-2"  >
              <CCol className="d-flex justify-content-end gap-2" >
                <CButton color="success" className="text-light" onClick={() => {
                  setModoEdicion(false)
                  setForm({
                    codigoProducto: '',
                    codigoProductoProveedor: '',
                    descripcionProducto: '',
                    unidadDeMedida: '',
                  })
                  setErrors({})
                  setVisible(true)
                }}> + Agregar</CButton>
                <CButton color="info" className="text-light" onClick={exportarAExcel}>Exportar</CButton>
              </CCol>
            </div>

            <CForm>
              <CRow className="gy-3" >
                <CCol md={4} >
                  <CFormLabel>Código Producto: </CFormLabel>
                  <CFormInput name="codigoProducto"
                    placeholder='Código producto'
                    value={filtros.codigoProducto}
                    onChange={handleFiltroChange} />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Código Producto Proveedor: </CFormLabel>
                  <CFormInput name="codigoProductoProveedor"
                    placeholder='Código proveedor'
                    value={filtros.codigoProductoProveedor}
                    onChange={handleFiltroChange} />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Descripción Producto: </CFormLabel>
                  <CFormInput name="descripcionProducto"
                    placeholder='Buscar por descripción producto'
                    value={filtros.descripcionProducto}
                    onChange={handleFiltroChange} />
                </CCol>
              </CRow>
            </CForm >

            <CModal visible={visible} onClose={() => setVisible(false)} size="lg" backdrop="static">
              <CModalHeader>
                <CModalTitle>{modoEdicion ? 'Editar Producto' : 'Agregar Producto'}</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CForm>
                  <CRow className="mb-3">
                    <CCol xs={12} md={8}>
                      <CFormLabel htmlFor="AgregarCodigo">Código Producto</CFormLabel>
                      <CFormInput
                        name="codigoProducto"
                        value={form.codigoProducto}
                        onChange={handleChange}
                        invalid={!!errors.codigoProducto} />
                      {errors.codigoProducto && (
                        <div className="invalid-feedback d-block">
                          {errors.codigoProducto}
                        </div>
                      )}
                    </CCol>
                    {!modoEdicion && (
                      <CCol className="d-flex justify-content-end">
                        <div className="mt-auto">
                          <CButton className="text-dark" color="warning">
                            Carga Masiva
                          </CButton>
                        </div>
                      </CCol>
                    )}
                  </CRow>
                  <CRow className="mb-3">
                    <CCol xs={12} md={8}>
                      <CFormLabel htmlFor="AgregarCodigoProveedor">Código Producto Proveedor</CFormLabel>
                      <CFormInput
                        name="codigoProductoProveedor"
                        value={form.codigoProductoProveedor}
                        onChange={handleChange}
                        required />
                    </CCol>
                  </CRow>
                  <CRow className="mb-3">
                    <CCol xs={8}>
                      <CFormLabel htmlFor="AgregarDescripcion">Descripción</CFormLabel>
                      <CFormTextarea
                        name="descripcionProducto"
                        value={form.descripcionProducto}
                        onChange={handleChange}
                        rows={4}
                        invalid={!!errors.descripcionProducto} />
                      {errors.descripcionProducto && (
                        <div className="invalid-feedback d-block">
                          {errors.descripcionProducto}
                        </div>
                      )}
                    </CCol>
                  </CRow>
                  <CRow className="mb-3">
                    <CCol xs={12} md={8}>
                      <CFormLabel htmlFor="unidadDeMedida">Unidad de Medida</CFormLabel>
                      <CFormSelect
                        name="unidadDeMedida"
                        value={form.unidadDeMedida}
                        onChange={handleChange}
                        invalid={!!errors.unidadDeMedida}>

                        <option value="">Seleccione una opción</option>
                        {unidadesMedida.map((unidad) => {
                          return (
                            <option key={unidad.indice} value={unidad.valor}>
                              {unidad.valor}
                            </option>
                          )
                        })}
                      </CFormSelect>
                      {errors.unidadDeMedida && (
                        <div className="invalid-feedback d-block">
                          {errors.unidadDeMedida}
                        </div>
                      )}
                    </CCol>
                  </CRow>
                </CForm>
              </CModalBody>
              <CModalFooter>
                <CButton className="text-light" color="danger" onClick={() => setVisible(false)}>
                  Cerrar
                </CButton>
                <CButton className="text-light" color="info" onClick={handleSubmit}>
                  Guardar
                </CButton>
              </CModalFooter>
            </CModal>
            <CModal
              visible={modalMsgVisible}
              onClose={() => setModalMsgVisible(false)}
              backdrop="static">
              <CModalHeader className={`bg-${modalMsgColor} text-white`}>
                <CModalTitle>{modalMsgTitle}</CModalTitle>
              </CModalHeader>
              <CModalBody>
                {modalMsgBody}
              </CModalBody>
              <CModalFooter>
                {modalMsgColor === 'danger' && idEliminar ? (
                  <>
                    <CButton
                      color="secondary"
                      onClick={() => {
                        setModalMsgVisible(false)
                        setIdEliminar(null)
                      }}>
                      Cancelar
                    </CButton>
                    <CButton
                      color="danger"
                      className="text-white"
                      onClick={eliminarProducto}>
                      Eliminar
                    </CButton>
                  </>
                ) : (
                  <CButton
                    color={modalMsgColor}
                    className="text-white"
                    onClick={() => setModalMsgVisible(false)}>
                    Aceptar
                  </CButton>
                )}
              </CModalFooter>
            </CModal>

            <CTable bordered hover responsive="md" className="mt-4">
              <CTableHead className="bg-light text-dark border-bottom">
                <CTableRow>
                  <CTableHeaderCell>No.</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Código Producto</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Código Producto Proveedor</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Descripción</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Unidad de Medida</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Estado</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {productos.map((producto, index) => (
                  <CTableRow key={`prod-${producto.idProducto ?? index}`}>
                    <CTableDataCell>{page * pageSize + index + 1}</CTableDataCell>
                    <CTableDataCell>{producto.codigoProducto}</CTableDataCell>
                    <CTableDataCell>{producto.codigoProductoProveedor}</CTableDataCell>
                    <CTableDataCell>{producto.descripcionProducto}</CTableDataCell>
                    <CTableDataCell>{obtenerNombreUnidad(producto.unidadDeMedida)}</CTableDataCell>
                    <CTableDataCell>
                      <span className={`badge ${producto.estado === 1 ? 'bg-success' : 'bg-secondary'}`}>
                        {obtenerNombreEstado(producto.estado)}
                      </span>
                    </CTableDataCell>
                    <CTableDataCell className="py-2 text-nowrap">
                      <CButton
                        color="warning"
                        size="sm"
                        className="me-2"
                        onClick={() => abrirEditar(producto)}>
                        ✏️
                      </CButton>
                      <CButton
                        color="danger"
                        size="sm"
                        onClick={() => confirmarEliminar(producto.idProducto)}>
                        🗑️
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
            <CPagination className="justify-content-end mt-3">
              <CPaginationItem
                disabled={page === 0}
                onClick={() => cargarProductos(page - 1)}
              >
                Anterior
              </CPaginationItem>

              {[...Array(totalPages)].map((_, index) => (
                <CPaginationItem
                  key={index}
                  active={index === page}
                  onClick={() => cargarProductos(index)}
                >
                  {index + 1}
                </CPaginationItem>
              ))}

              <CPaginationItem
                disabled={page === totalPages - 1}
                onClick={() => cargarProductos(page + 1)}
              >
                Siguiente
              </CPaginationItem>
            </CPagination>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

  )
}
export default Layout
