import React, { useEffect, useState } from 'react'
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
  CSpinner,
} from '@coreui/react'
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from 'xlsx';

const PAGE_SIZE = 20

const Layout = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)

  const quitarFoco = () => document.activeElement?.blur()

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
    precioCompra: '',
    precioVenta: '',
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

  // Edición masiva de Precio Venta
  const [modoEditarPrecio, setModoEditarPrecio] = useState(false)
  const [preciosEditados, setPreciosEditados] = useState({})  // { idProducto: 'valor' }
  const [guardandoPrecios, setGuardandoPrecios] = useState(false)

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

    const regexDecimal = /^\d+(\.\d{1,2})?$/
    if (form.precioCompra !== '' && !regexDecimal.test(form.precioCompra)) {
      nuevosErrores.precioCompra = 'Ingrese un número válido (ej: 10.50)'
    }
    if (form.precioVenta !== '' && !regexDecimal.test(form.precioVenta)) {
      nuevosErrores.precioVenta = 'Ingrese un número válido (ej: 15.00)'
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
      precioCompra: producto.precioCompra != null ? String(producto.precioCompra) : '',
      precioVenta: producto.precioVenta != null ? String(producto.precioVenta) : '',
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idUsuarioModificacion: idUsuarioActual }),
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
        unidadDeMedida: unidadEncontrada ? unidadEncontrada.indice : form.unidadDeMedida,
        idUsuarioModificacion: idUsuarioActual,
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

      quitarFoco()
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
        estado: '',
        precioCompra: '',
        precioVenta: '',
      })


    } catch (error) {
      setModalMsgTitle('Error')
      setModalMsgBody(error.message)
      setModalMsgColor('danger')
      setModalMsgVisible(true)
    }
  }
  const [busqueda, setBusqueda] = useState('')
  const [todosProductos, setTodosProductos] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [errorProductos, setErrorProductos] = useState(null)

  const cargarProductos = async (pagina = 0, busquedaActual = busqueda) => {
    try {
      setLoadingProductos(true)
      setErrorProductos(null)
      const termino = (busquedaActual || '').trim()

      if (!termino) {
        const params = new URLSearchParams({ page: pagina })
        const response = await fetch(`/api/productos?${params.toString()}`)
        if (!response.ok) throw new Error(`Error ${response.status}`)
        const data = await response.json()
        setProductos(Array.isArray(data) ? data : data.content || [])
        setTodosProductos([])
        setPage(data.number ?? pagina)
        setTotalPages(data.totalPages ?? 1)
        return
      }

      const SIZE_BUSQUEDA = 500
      const palabras = termino.split(/\s+/).filter(Boolean)

      const fetchDesc = (palabra) =>
        fetch(`/api/productos?descripcionProducto=${encodeURIComponent(palabra)}&page=0&size=${SIZE_BUSQUEDA}`)
          .then(r => r.json()).then(d => (Array.isArray(d) ? d : d.content || []))

      const [rCodigo, rProveedor, ...rDescPalabras] = await Promise.all([
        fetch(`/api/productos?codigoProducto=${encodeURIComponent(termino)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
        fetch(`/api/productos?codigoProductoProveedor=${encodeURIComponent(termino)}&page=0&size=${SIZE_BUSQUEDA}`).then(r => r.json()),
        ...palabras.map(fetchDesc),
      ])

      let porDescripcion = rDescPalabras[0] || []
      for (let i = 1; i < rDescPalabras.length; i++) {
        const ids = new Set(rDescPalabras[i].map(p => p.idProducto))
        porDescripcion = porDescripcion.filter(p => ids.has(p.idProducto))
      }

      const combinados = [
        ...(Array.isArray(rCodigo) ? rCodigo : rCodigo.content || []),
        ...(Array.isArray(rProveedor) ? rProveedor : rProveedor.content || []),
        ...porDescripcion,
      ]
      const unicos = combinados.filter((p, idx, arr) =>
        arr.findIndex(x => x.idProducto === p.idProducto) === idx
      )
      const inicio = pagina * PAGE_SIZE
      setTodosProductos(unicos)
      setProductos(unicos.slice(inicio, inicio + PAGE_SIZE))
      setPage(pagina)
      setTotalPages(Math.ceil(unicos.length / PAGE_SIZE))
    } catch (err) {
      setErrorProductos(err.message)
    } finally {
      setLoadingProductos(false)
    }
  }

  // Función para exportar productos a Excel
  const exportarAExcel = async () => {
    try {
      // Obtener TODOS los productos sin paginación
      let todosLosProductos = []
      const termino = busqueda.trim()
      if (termino) {
        const SIZE_BUSQUEDA = 10000
        const [r1, r2, r3] = await Promise.all([
          fetch(`/api/productos?codigoProducto=${encodeURIComponent(termino)}&page=0&size=${SIZE_BUSQUEDA}`),
          fetch(`/api/productos?codigoProductoProveedor=${encodeURIComponent(termino)}&page=0&size=${SIZE_BUSQUEDA}`),
          fetch(`/api/productos?descripcionProducto=${encodeURIComponent(termino)}&page=0&size=${SIZE_BUSQUEDA}`),
        ])
        const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()])
        const combinados = [...(d1.content || []), ...(d2.content || []), ...(d3.content || [])]
        todosLosProductos = combinados.filter((p, idx, arr) =>
          arr.findIndex(x => x.idProducto === p.idProducto) === idx
        )
      } else {
        const params = new URLSearchParams({ page: 0, size: 10000 })
        const response = await fetch(`/api/productos?${params.toString()}`)
        if (!response.ok) throw new Error('Error al obtener los productos')
        const data = await response.json()
        todosLosProductos = data.content
      }

      if (!todosLosProductos || todosLosProductos.length === 0) {
        setModalMsgTitle('Información')
        setModalMsgBody('No hay productos para exportar')
        setModalMsgColor('info')
        setModalMsgVisible(true)
        return
      }

      // Preparar los datos para el Excel
      const datosExcel = [...todosLosProductos]
        .sort((a, b) => (a.idProducto ?? 0) - (b.idProducto ?? 0))
        .map((producto, index) => ({
        'No.': index + 1,
        'Código Producto': producto.codigoProducto || '',
        'Código Producto Proveedor': producto.codigoProductoProveedor || '',
        'Descripción': producto.descripcionProducto || '',
        'Precio Compra': producto.precioCompra != null ? Number(producto.precioCompra).toFixed(2) : '',
        'Precio Venta': producto.precioVenta != null ? Number(producto.precioVenta).toFixed(2) : '',
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
        { wch: 15 }, // Precio Compra
        { wch: 15 }, // Precio Venta
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

  const activarModoEditarPrecio = () => {
    const inicial = {}
    productos.forEach(p => {
      inicial[p.idProducto] = {
        venta:  p.precioVenta  != null ? String(p.precioVenta)  : '',
        compra: p.precioCompra != null ? String(p.precioCompra) : '',
      }
    })
    setPreciosEditados(inicial)
    setModoEditarPrecio(true)
  }

  const cancelarEditarPrecio = () => {
    setModoEditarPrecio(false)
    setPreciosEditados({})
  }

  const guardarPrecios = async () => {
    const regexDecimal = /^\d+(\.\d{1,2})?$/
    const cambios = productos.filter(p => {
      const ed = preciosEditados[p.idProducto]
      if (!ed) return false
      const ventaCambio  = ed.venta?.trim()  && regexDecimal.test(ed.venta.trim())  && Number(ed.venta)  !== Number(p.precioVenta)
      const compraCambio = ed.compra?.trim() && regexDecimal.test(ed.compra.trim()) && Number(ed.compra) !== Number(p.precioCompra)
      return ventaCambio || compraCambio
    })

    if (cambios.length === 0) {
      setModalMsgTitle('Sin cambios')
      setModalMsgBody('No se detectaron cambios en los precios.')
      setModalMsgColor('info')
      setModalMsgVisible(true)
      cancelarEditarPrecio()
      return
    }

    setGuardandoPrecios(true)
    try {
      await Promise.all(
        cambios.map(p => {
          const ed = preciosEditados[p.idProducto]
          const nuevaVenta  = ed.venta?.trim()  && regexDecimal.test(ed.venta.trim())  ? Number(ed.venta)  : p.precioVenta
          const nuevaCompra = ed.compra?.trim() && regexDecimal.test(ed.compra.trim()) ? Number(ed.compra) : p.precioCompra
          return fetch(`/api/editarProducto/${p.idProducto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idProducto:                p.idProducto,
              codigoProducto:            p.codigoProducto,
              codigoProductoProveedor:   p.codigoProductoProveedor,
              descripcionProducto:       p.descripcionProducto,
              unidadDeMedida:            p.unidadDeMedida,
              precioCompra:              nuevaCompra,
              precioVenta:               nuevaVenta,
              idUsuarioModificacion:     idUsuarioActual,
            }),
          }).then(r => { if (!r.ok) throw new Error(`Error al actualizar ${p.codigoProducto}`) })
        })
      )
      await cargarProductos(page)
      cancelarEditarPrecio()
      setModalMsgTitle('Éxito')
      setModalMsgBody(`${cambios.length} precio(s) actualizado(s) correctamente.`)
      setModalMsgColor('success')
      setModalMsgVisible(true)
    } catch (err) {
      setModalMsgTitle('Error')
      setModalMsgBody(err.message)
      setModalMsgColor('danger')
      setModalMsgVisible(true)
    } finally {
      setGuardandoPrecios(false)
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      cargarProductos(0, busqueda)
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [busqueda])

  // Cargar diccionario para unidades de medida y Estado
  useEffect(() => {
    cargarDiccionario()
  }, [])

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="w-100 shadow-sm border-0" >
          <CCardHeader >
            <strong className="fs-4">Gestión de Productos</strong>
          </CCardHeader>
          <CCardBody className="p-4">

            <div className="mt-2 ms-auto me-2">
              <CCol className="d-flex justify-content-end gap-2 flex-wrap">
                {!modoEditarPrecio ? (
                  <>
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
                    }}>+ Agregar</CButton>
                    <CButton color="primary" className="text-light" onClick={activarModoEditarPrecio}>
                      $ Editar Precios
                    </CButton>
                    <CButton color="info" className="text-light" onClick={exportarAExcel}>Exportar</CButton>
                  </>
                ) : (
                  <>
                    <small className="text-muted align-self-center">
                      Editando precios de los productos visibles
                    </small>
                    <CButton color="success" className="text-light" onClick={guardarPrecios} disabled={guardandoPrecios}>
                      {guardandoPrecios && <CSpinner size="sm" className="me-1" />}
                      Guardar Precios
                    </CButton>
                    <CButton color="secondary" onClick={cancelarEditarPrecio} disabled={guardandoPrecios}>
                      Cancelar
                    </CButton>
                  </>
                )}
              </CCol>
            </div>

            <CForm>
              <CRow className="gy-3">
                <CCol md={6}>
                  <CFormLabel className="text-dark fw-bold" htmlFor="Buscar">Busqueda por:</CFormLabel>
                  <CFormInput
                    placeholder="Buscar por código, código proveedor o descripción..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </CCol>
              </CRow>
            </CForm>

            <CModal visible={visible} onClose={() => { quitarFoco(); setVisible(false) }} size="lg" backdrop="static">
              <CModalHeader className="bg-light">
                <CModalTitle className='text-dark' >{modoEdicion ? 'Editar Producto' : 'Agregar Producto'}</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CForm>
                 
                  <CRow className="mb-3">
                    <CCol xs={12} md={8}>
                      <CFormLabel className="text-dark fw-bold" htmlFor="AgregarCodigo">Código Producto</CFormLabel>
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
                      </CCol>
                    )}
                  </CRow>
                  <CRow className="mb-3">
                    <CCol xs={12} md={8}>
                      <CFormLabel className="text-dark fw-bold" htmlFor="AgregarCodigoProveedor">Código Producto Proveedor</CFormLabel>
                      <CFormInput
                        name="codigoProductoProveedor"
                        value={form.codigoProductoProveedor}
                        onChange={handleChange}
                        required />
                    </CCol>
                  </CRow>
                  <CRow className="mb-3">
                    <CCol xs={8}>
                      <CFormLabel className="text-dark fw-bold" htmlFor="AgregarDescripcion">Descripción</CFormLabel>
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
                    <CCol xs={8}>
                      <CFormLabel className="text-dark fw-bold" htmlFor="precioCompra">Precio de Compra</CFormLabel>
                      <CFormInput
                        id="precioCompra"
                        name="precioCompra"
                        value={form.precioCompra}
                        onChange={handleChange}
                        placeholder="0.00"
                        inputMode="decimal"
                        invalid={!!errors.precioCompra} />
                      {errors.precioCompra && (
                        <div className="invalid-feedback d-block">{errors.precioCompra}</div>
                      )}
                    </CCol>
                  </CRow>
                    <CRow className="mb-3">
                    <CCol xs={8}>
                      <CFormLabel className="text-dark fw-bold" htmlFor="precioVenta">Precio de Venta</CFormLabel>
                      <CFormInput
                        id="precioVenta"
                        name="precioVenta"
                        value={form.precioVenta}
                        onChange={handleChange}
                        placeholder="0.00"
                        inputMode="decimal"
                        invalid={!!errors.precioVenta} />
                      {errors.precioVenta && (
                        <div className="invalid-feedback d-block">{errors.precioVenta}</div>
                      )}
                    </CCol>
                  </CRow>
                  <CRow className="mb-3">
                    <CCol xs={12} md={8}>
                      <CFormLabel className="text-dark fw-bold" htmlFor="unidadDeMedida">Unidad de Medida</CFormLabel>
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
                <CButton className="text-light" color="danger" onClick={() => { quitarFoco(); setVisible(false) }}>
                  Cerrar
                </CButton>
                <CButton className="text-light" color="info" onClick={handleSubmit}>
                  Guardar
                </CButton>
              </CModalFooter>
            </CModal>
            <CModal
              visible={modalMsgVisible}
              onClose={() => { quitarFoco(); setModalMsgVisible(false) }}
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
                        quitarFoco()
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
                    onClick={() => { quitarFoco(); setModalMsgVisible(false) }}>
                    Aceptar
                  </CButton>
                )}
              </CModalFooter>
            </CModal>

            {loadingProductos && (
              <div className="text-center my-3">
                <CSpinner color="primary" size="sm" /> Cargando productos...
              </div>
            )}
            {errorProductos && (
              <div className="text-danger my-2">Error: {errorProductos}</div>
            )}

            <CTable bordered hover responsive="md" className="mt-4">
              <CTableHead style={{ '--cui-table-bg': '#1a3a6b', '--cui-table-color': '#fff', '--cui-table-border-color': '#2a4a8b', backgroundColor: '#1a3a6b', color: '#fff' }}>
                <CTableRow>
                  <CTableHeaderCell>No.</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Código Producto</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Código Producto Proveedor</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Descripción</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Precio Compra</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Precio Venta</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Unidad de Medida</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Estado</CTableHeaderCell>
                  <CTableHeaderCell className="py-2 text-nowrap">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {productos.map((producto, index) => (
                  <CTableRow key={`prod-${producto.idProducto ?? index}`}>
                    <CTableDataCell>{page * PAGE_SIZE + index + 1}</CTableDataCell>
                    <CTableDataCell>{producto.codigoProducto}</CTableDataCell>
                    <CTableDataCell>{producto.codigoProductoProveedor}</CTableDataCell>
                    <CTableDataCell>{producto.descripcionProducto}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {modoEditarPrecio ? (
                        <CFormInput
                          type="number"
                          step="0.01"
                          min="0"
                          size="sm"
                          style={{ minWidth: '90px' }}
                          value={preciosEditados[producto.idProducto]?.compra ?? ''}
                          onChange={(e) =>
                            setPreciosEditados(prev => ({
                              ...prev,
                              [producto.idProducto]: { ...prev[producto.idProducto], compra: e.target.value }
                            }))
                          }
                        />
                      ) : (
                        producto.precioCompra != null ? Number(producto.precioCompra).toFixed(2) : '—'
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {modoEditarPrecio ? (
                        <CFormInput
                          type="number"
                          step="0.01"
                          min="0"
                          size="sm"
                          style={{ minWidth: '90px' }}
                          value={preciosEditados[producto.idProducto]?.venta ?? ''}
                          onChange={(e) =>
                            setPreciosEditados(prev => ({
                              ...prev,
                              [producto.idProducto]: { ...prev[producto.idProducto], venta: e.target.value }
                            }))
                          }
                        />
                      ) : (
                        producto.precioVenta != null ? Number(producto.precioVenta).toFixed(2) : '—'
                      )}
                    </CTableDataCell>
                    <CTableDataCell>{obtenerNombreUnidad(producto.unidadDeMedida)}</CTableDataCell>
                    <CTableDataCell>
                      <span style={{ color: '#000' }}>
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
            <CPagination className="justify-content-end mt-3 flex-wrap align-items-center">
              {/* Primera */}
              <CPaginationItem disabled={page === 0} onClick={() => cargarProductos(0)} title="Primera página">«</CPaginationItem>
              {/* Anterior */}
              <CPaginationItem disabled={page === 0} onClick={() => cargarProductos(page - 1)}>Anterior</CPaginationItem>

              {/* Ventana de páginas */}
              {(() => {
                if (totalPages <= 7) {
                  return [...Array(totalPages)].map((_, i) => (
                    <CPaginationItem key={i} active={i === page} onClick={() => cargarProductos(i)}>{i + 1}</CPaginationItem>
                  ))
                }
                const items = []
                const mostrarPrimera = page > 2
                const mostrarUltima = page < totalPages - 3
                const inicio = Math.max(0, page - 2)
                const fin = Math.min(totalPages - 1, page + 2)

                if (mostrarPrimera) {
                  items.push(<CPaginationItem key={0} onClick={() => cargarProductos(0)}>1</CPaginationItem>)
                  if (page > 3) items.push(<CPaginationItem key="e1" disabled>…</CPaginationItem>)
                }
                for (let i = inicio; i <= fin; i++) {
                  items.push(
                    <CPaginationItem key={i} active={i === page} onClick={() => cargarProductos(i)}>{i + 1}</CPaginationItem>
                  )
                }
                if (mostrarUltima) {
                  if (page < totalPages - 4) items.push(<CPaginationItem key="e2" disabled>…</CPaginationItem>)
                  items.push(<CPaginationItem key={totalPages - 1} onClick={() => cargarProductos(totalPages - 1)}>{totalPages}</CPaginationItem>)
                }
                return items
              })()}

              {/* Siguiente */}
              <CPaginationItem disabled={page === totalPages - 1} onClick={() => cargarProductos(page + 1)}>Siguiente</CPaginationItem>
              {/* Última */}
              <CPaginationItem disabled={page === totalPages - 1} onClick={() => cargarProductos(totalPages - 1)} title="Última página">»</CPaginationItem>
            </CPagination>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>

  )
}
export default Layout
