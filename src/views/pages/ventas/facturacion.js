import React, { useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormSelect,
  CFormCheck,
  CFormTextarea,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'

const Layout = () => {
  const [visible, setVisible] = useState(false);
  const [esConsumidorFinal, setEsConsumidorFinal] = useState(false);
  const [modalCliente, setModalCliente] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState('');
  const [errorsCliente, setErrorsCliente] = useState({});
  const [clientes, setClientes] = useState([]);
  const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
  const [mostrarSugerenciasClientes, setMostrarSugerenciasClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(false);
  
  // Estados para productos
  const [productos, setProductos] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [sugerenciasProductos, setSugerenciasProductos] = useState([]);
  const [mostrarSugerenciasProductos, setMostrarSugerenciasProductos] = useState(false);
  const [detalleFactura, setDetalleFactura] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [alertProductoDuplicado, setAlertProductoDuplicado] = useState(false);
  const [guardandoFactura, setGuardandoFactura] = useState(false);
  const [errorFactura, setErrorFactura] = useState('');
  const [enviarCorreo, setEnviarCorreo] = useState(false);
  const [documentoOpts, setDocumentoOpts] = useState([]);
  const [documento, setDocumento] = useState('');
  
  // Estados para totales de factura
  const [impuestoIVA, setImpuestoIVA] = useState(12); // 12% IVA por defecto
  
  // Obtener fecha de hoy en formato YYYY-MM-DD
  const obtenerFechaHoy = () => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  // Formatear fecha en formato DD-MM-YYYY para mostrar
  const formatearFechaParaMostrar = (fechaYMD) => {
    if (!fechaYMD) return '';
    const [año, mes, dia] = fechaYMD.split('-');
    return `${dia}-${mes}-${año}`;
  };

  // Estados para el formulario de facturación
  const [formFactura, setFormFactura] = useState({
    idCliente: null,
    nit: '',
    nombre: '',
    telefono: '',
    direccion: '',
    direccionEntrega: '',
    tipoDocumento: '1',
    moneda: '1',
    fecha: obtenerFechaHoy(),
    establecimiento: 'Ferreteria y bloquera Agmner',
  });

  // Estados para el formulario de nuevo cliente
  const [formCliente, setFormCliente] = useState({
    nombreCliente: '',
    nit: '',
    nombreFacturacion: '',
    direccionFisica: '',
    correoElectronico: '',
    telefono1: '',
    telefono2: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormFactura((prev) => ({ ...prev, [name]: value }));
  };

  const handleConsumidorFinal = (e) => {
    const checked = e.target.checked;
    setEsConsumidorFinal(checked);
    
    if (checked) {
      setFormFactura({
        idCliente: null,
        nit: 'CF',
        nombre: 'Consumidor Final',
        telefono: '',
        direccion: 'Ciudad',
        direccionEntrega: '',
        tipoDocumento: formFactura.tipoDocumento,
        moneda: formFactura.moneda,
        fecha: formFactura.fecha,
        establecimiento: formFactura.establecimiento,
      });
    } else {
      limpiarFormulario();
    }
  };

  const limpiarFormulario = () => {
    setFormFactura({
      idCliente: null,
      nit: '',
      nombre: '',
      telefono: '',
      direccion: '',
      direccionEntrega: '',
      tipoDocumento: '1',
      moneda: '1',
      fecha: obtenerFechaHoy(),
      establecimiento: 'Ferreteria y bloquera Agmner',
    });
    setEsConsumidorFinal(false);
    setClienteSeleccionado(false);
    setDocumento('');
    setImpuestoIVA(12);
    setErrorFactura('');
  };

  const cargarDocumentos = async () => {
    try {
      const response = await fetch('/api/diccionarios?diccionario=TIPODOCUMENTO&estado=1');
      const data = await response.json();
      const lista = Array.isArray(data) ? data : (data?.content || []);
      setDocumentoOpts(lista);
    } catch (e) {
      console.error('Error al cargar tipos de documento:', e);
      setDocumentoOpts([]);
    }
  };

  const cargarClientes = async () => {
    try {
      const response = await fetch('/api/clientes?size=1000');
      const data = await response.json();
      const lista = Array.isArray(data) ? data : (data?.content || []);
      setClientes(lista);
    } catch (e) {
      console.error('Error al cargar clientes:', e);
      setClientes([]);
    }
  };

  const cargarInventario = async () => {
    setCargandoProductos(true);
    try {
      const response = await fetch('/api/inventario?size=1000');
      const data = await response.json();
      const lista = Array.isArray(data) ? data : (data?.content || []);
      setProductos(lista);
    } catch (e) {
      console.error('Error al cargar inventario:', e);
      setProductos([]);
    } finally {
      setCargandoProductos(false);
    }
  };

  const handleBusquedaProducto = (e) => {
    const value = e.target.value;
    setBusquedaProducto(value);

    const valorLimpio = value.trim();
    if (valorLimpio.length >= 2) {
      const valorLower = valorLimpio.toLowerCase();
      const encontrados = productos.filter((p) => {
        const codigoProducto = (p.idProducto?.codigoProducto || p.codigoProducto || '').toString().toLowerCase();
        const codigoProveedor = (p.idProducto?.codigoProductoProveedor || p.codigoProductoProveedor || '').toString().toLowerCase();
        const descripcion = (p.idProducto?.descripcionProducto || p.descripcionProducto || p.descripcion || '').toString().toLowerCase();
        return codigoProducto.includes(valorLower) || codigoProveedor.includes(valorLower) || descripcion.includes(valorLower);
      });
      setSugerenciasProductos(encontrados.slice(0, 10));
      setMostrarSugerenciasProductos(encontrados.length > 0);
    } else {
      setSugerenciasProductos([]);
      setMostrarSugerenciasProductos(false);
    }
  };

  const agregarProductoDetalle = (producto) => {
    const idRef = producto.idProductoInventario ?? producto.idProducto?.idProducto ?? producto.idProducto ?? producto.id;
    const existe = detalleFactura.find((item) => item.idProductoInventario === idRef || item.idProducto === idRef);

    if (existe) {
      setAlertProductoDuplicado(true);
      return;
    }

    const codigo = producto.idProducto?.codigoProducto || producto.codigoProducto || '';
    const descripcion = producto.idProducto?.descripcionProducto || producto.descripcionProducto || producto.descripcion || '';
    const precioVenta = producto.precioVenta || 0;
    const cantidad = 1;
    const precio = precioVenta * cantidad;
    const descuento = 0;
    const total = precio - descuento;

    const nuevoItem = {
      idProductoInventario: producto.idProductoInventario,
      idProducto: producto.idProducto?.idProducto ?? producto.idProducto,
      idUnidadMedida: producto.idProducto?.unidadDeMedida ?? producto.unidadDeMedida ?? null,
      codigo,
      descripcion,
      cantidad,
      precioUnitario: precioVenta,
      precio,
      descuento,
      total,
    };

    setDetalleFactura([...detalleFactura, nuevoItem]);
    setBusquedaProducto('');
    setSugerenciasProductos([]);
    setMostrarSugerenciasProductos(false);
  };

  const eliminarProductoDetalle = (index) => {
    const nuevoDetalle = detalleFactura.filter((_, i) => i !== index);
    setDetalleFactura(nuevoDetalle);
  };

  const actualizarCantidadDetalle = (index, cantidad) => {
    const nuevoDetalle = [...detalleFactura];
    nuevoDetalle[index].cantidad = cantidad === '' ? '' : (Number(cantidad) || 0);
    const cant = Number(nuevoDetalle[index].cantidad) || 0;
    const desc = Number(nuevoDetalle[index].descuento) || 0;
    nuevoDetalle[index].precio = cant * nuevoDetalle[index].precioUnitario;
    nuevoDetalle[index].total = nuevoDetalle[index].precio - desc;
    setDetalleFactura(nuevoDetalle);
  };

  const actualizarPrecioDetalle = (index, precio) => {
    const nuevoDetalle = [...detalleFactura];
    nuevoDetalle[index].precioUnitario = Number(precio) || 0;
    const cant = Number(nuevoDetalle[index].cantidad) || 0;
    const desc = Number(nuevoDetalle[index].descuento) || 0;
    nuevoDetalle[index].precio = cant * nuevoDetalle[index].precioUnitario;
    nuevoDetalle[index].total = nuevoDetalle[index].precio - desc;
    setDetalleFactura(nuevoDetalle);
  };

  const actualizarDescuentoDetalle = (index, descuento) => {
    const nuevoDetalle = [...detalleFactura];
    nuevoDetalle[index].descuento = descuento === '' ? '' : (Number(descuento) || 0);
    const cant = Number(nuevoDetalle[index].cantidad) || 0;
    const desc = Number(nuevoDetalle[index].descuento) || 0;
    nuevoDetalle[index].precio = cant * nuevoDetalle[index].precioUnitario;
    nuevoDetalle[index].total = nuevoDetalle[index].precio - desc;
    setDetalleFactura(nuevoDetalle);
  };

  const calcularSubtotal = () => {
    return detalleFactura.reduce((sum, item) => sum + item.total, 0);
  };

  const calcularTotalDescuentoProductos = () => {
    return detalleFactura.reduce((sum, item) => sum + (item.descuento || 0), 0);
  };

  const calcularBaseImponible = () => {
    const totalProductos = calcularSubtotal();
    return totalProductos / 1.12;
  };

  const calcularIVA = () => {
    const totalProductos = calcularSubtotal();
    return totalProductos * 0.12 / 1.12;
  };

  const calcularTotal = () => {
    return calcularBaseImponible() + calcularIVA();
  };

  const tipoBusqueda = () => {
    const seleccionado = documentoOpts.find((d) => String(d.indice) === String(documento));
    if (!seleccionado) return 'nit';
    const valor = (seleccionado.valor || '').toLowerCase();
    if (valor.includes('pasaporte')) return 'pasaporte';
    if (valor.includes('dpi')) return 'dpi';
    return 'nit';
  };

  const handleNitChange = (e) => {
    const value = (e.target.value || '').toString();
    setFormFactura((prev) => ({ ...prev, nit: value }));

    const valorLimpio = value.trim();
    if (valorLimpio.length >= 2) {
      const valorLower = valorLimpio.toLowerCase();
      const tipo = tipoBusqueda();
      const encontrados = clientes.filter((c) => {
        if (tipo === 'dpi' || tipo === 'pasaporte') {
          const dpi = (c.documentoIdentificacion || '').toString().toLowerCase();
          return dpi.includes(valorLower);
        }
        const nit = (c.nit || '').toString().toLowerCase();
        return nit.includes(valorLower);
      });
      setSugerenciasClientes(encontrados.slice(0, 10));
      setMostrarSugerenciasClientes(encontrados.length > 0);
    } else {
      setSugerenciasClientes([]);
      setMostrarSugerenciasClientes(false);
    }
  };

  const handleNombreChange = (e) => {
    const value = (e.target.value || '').toString();
    setFormFactura((prev) => ({ ...prev, nombre: value }));

    const valorLimpio = value.trim();
    if (valorLimpio.length >= 2) {
      const valorLower = valorLimpio.toLowerCase();
      const encontrados = clientes.filter((c) => {
        const nombre = (c.nombreCliente || c.nombreFacturacion || '').toString().toLowerCase();
        return nombre.includes(valorLower);
      });
      setSugerenciasClientes(encontrados.slice(0, 10));
      setMostrarSugerenciasClientes(encontrados.length > 0);
    } else {
      setSugerenciasClientes([]);
      setMostrarSugerenciasClientes(false);
    }
  };

  const seleccionarClienteSugerencia = (cliente) => {
    const tipo = tipoBusqueda();
    const docValue = (tipo === 'dpi' || tipo === 'pasaporte')
      ? (cliente.documentoIdentificacion || '')
      : (cliente.nit || '');
    setFormFactura((prev) => ({
      ...prev,
      idCliente: cliente.idCliente ?? cliente.id ?? null,
      nit: docValue,
      nombre: cliente.nombreCliente || cliente.nombreFacturacion || '',
      dpiPasaporte: cliente.documentoIdentificacion || '',
      telefono: cliente.telefono1 || '',
      direccion: cliente.direccionFisica || '',
      direccionEntrega: '',
      fecha: prev.fecha,
      tipoDocumento: prev.tipoDocumento,
      moneda: prev.moneda,
      establecimiento: prev.establecimiento,
    }));
    setSugerenciasClientes([]);
    setMostrarSugerenciasClientes(false);
    setClienteSeleccionado(true);
  };

  useEffect(() => {
    cargarClientes();
    cargarDocumentos();
  }, []);

  useEffect(() => {
    if (visible) {
      cargarInventario();
    }
  }, [visible]);

  const handleClienteChange = (e) => {
    const { name, value } = e.target;
    setFormCliente((prev) => ({ ...prev, [name]: value }));
  };

  const abrirModalCliente = () => {
    setFormCliente({
      nombreCliente: '',
      nit: '',
      nombreFacturacion: '',
      direccionFisica: '',
      correoElectronico: '',
      telefono1: '',
      telefono2: '',
    });
    setErrorCliente('');
    setErrorsCliente({});
    setModalCliente(true);
  };

  const cerrarModalCliente = () => {
    setModalCliente(false);
    setErrorCliente('');
    setErrorsCliente({});
  };

  const guardarCliente = async (e) => {
    e.preventDefault();
    setErrorCliente('');

    if (!formCliente.nombreCliente?.trim() || !formCliente.nombreFacturacion?.trim() || !formCliente.direccionFisica?.trim()) {
      setErrorCliente('Los campos Nombre, Nombre de Facturación y Dirección son obligatorios');
      return;
    }

    setGuardandoCliente(true);
    try {
      const body = {
        nombreCliente: formCliente.nombreCliente.trim(),
        nit: formCliente.nit.trim(),
        nombreFacturacion: formCliente.nombreFacturacion.trim(),
        direccionFisica: formCliente.direccionFisica.trim(),
        correoElectronico: formCliente.correoElectronico?.trim() || '',
        telefono1: formCliente.telefono1?.trim() || '',
        telefono2: formCliente.telefono2?.trim() || '',
        creditoAutorizado: null,
        deudaActual: null,
      };

      const response = await fetch('/api/grabarCliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al guardar el cliente');
      }

      const data = await response.json().catch(() => ({}));
      const idClienteNuevo = data?.idCliente ?? data?.id ?? null;

      const tieneNit = !!formCliente.nit?.trim();
      const tieneDpi = !!formCliente.dpiPasaporte?.trim();

      if (tieneNit) {
        const opcionNit = documentoOpts.find((d) => (d.valor || '').toLowerCase().includes('nit'));
        if (opcionNit) setDocumento(String(opcionNit.indice));
      } else if (tieneDpi) {
        const opcionDpi = documentoOpts.find((d) => (d.valor || '').toLowerCase().includes('dpi'));
        if (opcionDpi) setDocumento(String(opcionDpi.indice));
      }

      const docValue = tieneNit
        ? formCliente.nit
        : tieneDpi
        ? formCliente.dpiPasaporte
        : '';

      setFormFactura((prev) => ({
        ...prev,
        idCliente: idClienteNuevo,
        nit: docValue,
        nombre: formCliente.nombreCliente,
        dpiPasaporte: formCliente.dpiPasaporte || '',
        telefono: formCliente.telefono1,
        direccion: formCliente.direccionFisica,
        direccionEntrega: '',
        fecha: prev.fecha,
        tipoDocumento: prev.tipoDocumento,
        moneda: prev.moneda,
        establecimiento: prev.establecimiento,
      }));
      setClienteSeleccionado(true);

      cerrarModalCliente();
      cargarClientes();
      alert('Cliente guardado exitosamente');
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      setErrorCliente(err.message || 'No se pudo guardar el cliente');
    } finally {
      setGuardandoCliente(false);
    }
  };

  const guardarFactura = async (e) => {
    e.preventDefault();
    setErrorFactura('');

    if (!formFactura.nombre?.trim()) {
      setErrorFactura('Debe seleccionar o agregar un cliente');
      return;
    }

    if (detalleFactura.length === 0) {
      setErrorFactura('Debe agregar al menos un producto');
      return;
    }

    setGuardandoFactura(true);
    try {
      const totalBruto = detalleFactura.reduce((sum, item) => sum + (Number(item.cantidad) || 0) * item.precioUnitario, 0);
      const cantidadDescuento = calcularTotalDescuentoProductos();
      const baseImponible = calcularBaseImponible();
      const totalNeto = totalBruto / 1.12;
      const iva = calcularIVA();
      const total = calcularTotal();

      const body = {
        tipoDocumento: formFactura.tipoDocumento,
        idCliente: esConsumidorFinal ? 'CF' : { idCliente: formFactura.idCliente },
        tipoVenta: 'B',
        destinoVenta: '1',
        FechaFactura: formFactura.fecha,
        moneda: formFactura.moneda,
        tasaDeCambio: formFactura.moneda === '1' ? '1.00' : '2.00',
        referencia: '0',
        numeroAcceso: '0',
        serieAdmin: '',
        numeroAdmin: '0',
        totalBruto: totalBruto.toFixed(2),
        cantidadDeDescuento: cantidadDescuento.toFixed(2),
        porcentajeDeDescuento: 0,
        exento: '0.00',
        otro: '0.00',
        totalNeto: totalNeto.toFixed(2),
        isr: '0.00',
        iva: iva.toFixed(2),
        total: total.toFixed(2),
        facturaProcesada: '',
        direccionEntrega: formFactura.direccionEntrega || '',
        idUsuarioModificacion: 1,
      };

      const response = await fetch('/api/grabarEncabezadoFacturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al guardar la factura');
      }

      const idEncabezadoFactura = await response.text();

      // Guardar el detalle de la factura
      const detallePromises = detalleFactura.map((item) => {
        const cantItem = Number(item.cantidad) || 0;
        const descItem = Number(item.descuento) || 0;
        const precioItem = item.precioUnitario || 0;
        const totalItem = cantItem * precioItem;
        const ivaItem = (totalItem * 0.12) / 1.12;
        const netoItem = item.total / 1.12;
        const totalConDescuento = totalItem - descItem;

        const bodyDetalle = {
          idEncabezadoFactura: String(idEncabezadoFactura),
          idProducto: String(item.idProducto),
          idUnidadDeMedida: String(item.idUnidadMedida ?? '1'),
          cantidad: String(cantItem),
          precioVenta: precioItem.toFixed(2),
          cantidadDeDescuento: descItem.toFixed(2),
          porcentajeDeDescuento: '0.00',
          ImpBruto: totalItem.toFixed(2),
          ImpExento: '0.00',
          ImpOtros: '0.00',
          ImpNeto: netoItem.toFixed(2),
          iva: ivaItem.toFixed(2),
          isr: '0.00',
          ImpTotal: item.total.toFixed(2),
          idUsuarioModificacion: '1',
        };

        return fetch('/api/grabarDetalleFactura', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyDetalle),
        });
      });

      const resultadosDetalle = await Promise.all(detallePromises);
      const erroresDetalle = resultadosDetalle.filter((r) => !r.ok);
      if (erroresDetalle.length > 0) {
        throw new Error('La factura se guardó pero algunos productos del detalle fallaron');
      }

      alert('Factura guardada exitosamente');
      limpiarFormulario();
      setDetalleFactura([]);
      setErrorFactura('');
    } catch (err) {
      console.error('Error al guardar factura:', err);
      setErrorFactura(err.message || 'No se pudo guardar la factura');
    } finally {
      setGuardandoFactura(false);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardBody>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong className="fs-4">Facturación</strong>
              <div className="d-flex align-items-center gap-3">
                <span className="badge bg-secondary">
                  📅 Fecha: {formatearFechaParaMostrar(formFactura.fecha)}
                </span>
                <span className="badge bg-secondary" style={{ fontSize: '0.85rem' }}>
                🏪 Establecimiento: {formFactura.establecimiento}
                </span>
              </div>
            </CCardHeader>

            <CForm className="mt-4" onSubmit={guardarFactura}>
              {errorFactura && (
                <div className="alert alert-danger mb-3" role="alert">
                  {errorFactura}
                </div>
              )}
              <CRow className="mb-2 align-items-center">
                <CCol xs={12} md={6} className="d-flex gap-4">
                  <CFormCheck
                    id="consumidorFinal"
                    label="Consumidor Final"
                    checked={esConsumidorFinal}
                    onChange={handleConsumidorFinal}
                  />
                  <CFormCheck
                    id="enviarCorreo"
                    label="Enviar Correo Electrónico"
                    checked={enviarCorreo}
                    onChange={(e) => setEnviarCorreo(e.target.checked)}
                  />
                </CCol>
                <CCol xs={12} md={6} className="d-flex justify-content-end gap-2">
                  <CButton color="secondary" className="text-light" onClick={limpiarFormulario}>
                    Limpiar
                  </CButton>
                  <CButton
                    color="success"
                    className="text-light"
                    onClick={abrirModalCliente}
                    disabled={esConsumidorFinal}
                  >
                    + Agregar
                  </CButton>
                </CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel htmlFor="documento">Documento</CFormLabel>
                  <CFormSelect
                    id="documento"
                    value={documento}
                    disabled={clienteSeleccionado || esConsumidorFinal}
                    onChange={(e) => {
                      setDocumento(e.target.value);
                      setFormFactura((prev) => ({ ...prev, nit: '' }));
                      setSugerenciasClientes([]);
                      setMostrarSugerenciasClientes(false);
                    }}
                  >
                    <option value="">Seleccione documento</option>
                    {documentoOpts.map((d) => (
                      <option key={d.indice} value={d.indice}>
                        {d.valor}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={6}>
                  <CFormLabel htmlFor="nombre">Nombre</CFormLabel>
                  <div style={{ position: 'relative' }}>
                    <CFormInput
                      type="text"
                      id="nombre"
                      name="nombre"
                      placeholder={!documento && !esConsumidorFinal ? 'Seleccione un documento primero' : 'Ingrese el nombre para buscar cliente'}
                      value={formFactura.nombre}
                      onChange={handleNombreChange}
                      disabled={esConsumidorFinal || clienteSeleccionado || !documento}
                      autoComplete="off"
                    />
                    {mostrarSugerenciasClientes && sugerenciasClientes.length > 0 && (
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
                          <small><strong>Clientes encontrados:</strong> haga clic para seleccionar</small>
                        </div>
                        {sugerenciasClientes.map((cli) => (
                          <button
                            key={cli.idCliente ?? cli.id}
                            type="button"
                            className="list-group-item list-group-item-action text-start"
                            onClick={() => seleccionarClienteSugerencia(cli)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div>
                              <strong>{cli.nombreCliente || cli.nombreFacturacion}</strong> - {cli.nit}
                            </div>
                            <small className="text-muted">{cli.telefono1}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel htmlFor="nit">
                    {tipoBusqueda() === 'dpi' ? 'DPI' : tipoBusqueda() === 'pasaporte' ? 'Pasaporte' : 'NIT'}
                  </CFormLabel>
                  <div style={{ position: 'relative' }}>
                    <CFormInput
                      type="text"
                      id="nit"
                      name="nit"
                      placeholder={!documento && !esConsumidorFinal ? 'Seleccione un documento primero' : tipoBusqueda() === 'dpi' ? 'Ingrese el DPI para buscar' : tipoBusqueda() === 'pasaporte' ? 'Ingrese el Pasaporte para buscar' : 'Ingrese el NIT para buscar cliente'}
                      value={formFactura.nit}
                      onChange={handleNitChange}
                      disabled={esConsumidorFinal || clienteSeleccionado || !documento}
                      autoComplete="off"
                    />
                    {mostrarSugerenciasClientes && sugerenciasClientes.length > 0 && (
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
                          <small><strong>Clientes encontrados:</strong> haga clic para seleccionar</small>
                        </div>
                        {sugerenciasClientes.map((cli) => (
                          <button
                            key={cli.idCliente ?? cli.id}
                            type="button"
                            className="list-group-item list-group-item-action text-start"
                            onClick={() => seleccionarClienteSugerencia(cli)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div>
                              <strong>{(tipoBusqueda() === 'dpi' || tipoBusqueda() === 'pasaporte') ? (cli.documentoIdentificacion || '—') : cli.nit}</strong> - {cli.nombreCliente || cli.nombreFacturacion}
                            </div>
                            <small className="text-muted">{cli.telefono1}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </CCol>
                 <CCol md={6}>
                  <CFormLabel htmlFor="telefono">Teléfono</CFormLabel>
                  <CFormInput
                    type="text"
                    id="telefono"
                    name="telefono"
                    placeholder="Ingrese el teléfono"
                    value={formFactura.telefono}
                    onChange={handleChange}
                    disabled={esConsumidorFinal || clienteSeleccionado}
                  />
                </CCol>
              </CRow>
              <CRow className="mb-3">              
                <CCol md={6}>
                  <CFormLabel htmlFor="direccion">Dirección</CFormLabel>
                  <CFormInput
                    type="text"
                    id="direccion"
                    name="direccion"
                    placeholder="Ingrese la dirección"
                    value={formFactura.direccion}
                    onChange={handleChange}
                    disabled={esConsumidorFinal || clienteSeleccionado}
                  />
                </CCol>
                
                <CCol md={3}>
                  <CFormLabel htmlFor="tipoDocumento">Tipo de Documento</CFormLabel>
                  <CFormSelect
                    id="tipoDocumento"
                    name="tipoDocumento"
                    value={formFactura.tipoDocumento}
                    onChange={handleChange}
                  >
                    <option value="">Seleccione tipo de documento</option>
                    <option value="1">Factura</option>
                    <option value="2">Nota de Crédito</option>
                    <option value="3">Nota de Débito</option>
                    <option value="4">Consignación</option>
                  </CFormSelect>
                </CCol>
                 <CCol md={3}>
                  <CFormLabel htmlFor="moneda">Moneda</CFormLabel>
                  <CFormSelect
                    id="moneda"
                    name="moneda"
                    value={formFactura.moneda}
                    onChange={handleChange}
                  >
                    <option value="">Seleccione moneda</option>
                    <option value="1">Quetzales</option>
                    <option value="2">Dólares</option>
                  </CFormSelect>
                </CCol>       
              </CRow >
              <CRow className="g-1">
                 <CCol xs={6}>
                  <CFormLabel htmlFor="direccionEntrega">Dirección de entrega</CFormLabel>
                  <CFormTextarea
                    id="direccionEntrega"
                    name="direccionEntrega"
                    placeholder="Ingrese la dirección de entrega"
                    value={formFactura.direccionEntrega}
                    onChange={handleChange}
                    rows={2}
                  />
                </CCol> 
              </CRow>
              {/* Sección: Detalle de Productos en el Formulario Principal */}
              <div className="mb-4 mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-primary mb-0">Detalle de Productos</h6>
                  <CButton 
                    color="success" 
                    size="sm" 
                    className="text-light"
                    onClick={() => setVisible(true)}
                  >
                    + Agregar Productos
                  </CButton>
                </div>

                <CTable bordered hover responsive>
                  <CTableHead className="bg-light text-dark">
                    <CTableRow>
                      <CTableHeaderCell className="py-2">No.</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Descripción Producto</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Unidades</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Precio Unidad</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Precio</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Descuento</CTableHeaderCell>
                      <CTableHeaderCell className="py-2">Total</CTableHeaderCell>
                      <CTableHeaderCell className="py-2 text-center">Eliminar</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {detalleFactura.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan="8" className="text-center py-4 text-muted">
                          No hay productos agregados. Haga clic en "+ Agregar Productos" para añadir productos.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      detalleFactura.map((item, index) => (
                        <CTableRow key={index}>
                          <CTableDataCell>{index + 1}</CTableDataCell>
                          <CTableDataCell>
                            <div>
                              <strong>{item.descripcion}</strong>
                              <br />
                              <small className="text-muted">Código: {item.codigo}</small>
                            </div>
                          </CTableDataCell>
                          <CTableDataCell className="text-center">{Number(item.cantidad) || 0}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            {formFactura.moneda === '1' ? 'Q' : '$'}{item.precioUnitario.toFixed(2)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {formFactura.moneda === '1' ? 'Q' : '$'}{item.precio.toFixed(2)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {formFactura.moneda === '1' ? 'Q' : '$'}{(Number(item.descuento) || 0).toFixed(2)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            {formFactura.moneda === '1' ? 'Q' : '$'}{item.total.toFixed(2)}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton
                              color="danger"
                              size="sm"
                              onClick={() => eliminarProductoDetalle(index)}
                              title="Eliminar producto"
                            >
                              🗑️ Eliminar
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>

                {/* Totales */}
                <div className="d-flex justify-content-end mt-3">
                  <div className="border rounded p-2" style={{ minWidth: '320px' }}>
                    <CRow className="mb-1">
                      <CCol xs={5}>
                        <CFormLabel className="mb-0 small fw-semibold">SubTotal:</CFormLabel>
                      </CCol>
                      <CCol xs={7}>
                        <CFormInput
                          type="text"
                          value={`${formFactura.moneda === '1' ? 'Q' : '$'}${calcularBaseImponible().toFixed(2)}`}
                          readOnly
                          disabled
                          size="sm"
                          className="text-end"
                          style={{ backgroundColor: '#e9ecef' }}
                        />
                      </CCol>
                    </CRow>

                    <CRow className="mb-1">
                      <CCol xs={5}>
                        <CFormLabel className="mb-0 small fw-semibold">Total Descuento:</CFormLabel>
                      </CCol>
                      <CCol xs={7}>
                        <CFormInput
                          type="text"
                          value={`${formFactura.moneda === '1' ? 'Q' : '$'}${calcularTotalDescuentoProductos().toFixed(2)}`}
                          readOnly
                          disabled
                          size="sm"
                          className="text-end"
                          style={{ backgroundColor: '#e9ecef' }}
                        />
                      </CCol>
                    </CRow>

                    <CRow className="mb-1">
                      <CCol xs={5}>
                        <CFormLabel className="mb-0 small fw-semibold">Impuesto IVA:</CFormLabel>
                      </CCol>
                      <CCol xs={7}>
                        <CFormInput
                          type="text"
                          value={`${formFactura.moneda === '1' ? 'Q' : '$'}${calcularIVA().toFixed(2)}`}
                          readOnly
                          disabled
                          size="sm"
                          className="text-end"
                          style={{ backgroundColor: '#e9ecef' }}
                        />
                      </CCol>
                    </CRow>

                    <CRow className="pt-1 border-top">
                      <CCol xs={5}>
                        <CFormLabel className="mb-0 fw-bold">Total:</CFormLabel>
                      </CCol>
                      <CCol xs={7}>
                        <CFormInput
                          type="text"
                          value={`${formFactura.moneda === '1' ? 'Q' : '$'}${calcularTotal().toFixed(2)}`}
                          readOnly
                          disabled
                          size="sm"
                          className="text-end fw-bold text-success"
                          style={{ backgroundColor: '#e9ecef' }}
                        />
                      </CCol>
                    </CRow>
                  </div>
                </div>
              </div>

              <CRow className="mt-4">
                <CCol className="d-flex justify-content-end gap-2">
                  <CButton color="primary" className="text-light" type="submit" disabled={detalleFactura.length === 0 || guardandoFactura}>
                    {guardandoFactura ? 'Guardando...' : 'Guardar Factura'}
                  </CButton>
                </CCol>
              </CRow>
            </CForm>

            <CModal visible={visible} onClose={() => setVisible(false)} size="xl">
              <CModalHeader className="bg-primary text-white">
                <CModalTitle className="d-flex align-items-center gap-2">
                  <span>🛒</span> Agregar Productos a la Factura
                </CModalTitle>
              </CModalHeader>
              <CModalBody className="p-4">
                {/* Sección: Buscar Producto */}
                <div className="mb-4">
                  <h6 className="mb-3">🔍 Buscar Producto</h6>
                  <CRow>
                    <CCol xs={12}>
                      <div style={{ position: 'relative' }}>
                        <CFormInput
                          type="text"
                          placeholder="Buscar por código, código proveedor o descripción..."
                          value={busquedaProducto}
                          onChange={handleBusquedaProducto}
                          autoComplete="off"
                          className="form-control-lg"
                        />
                        {cargandoProductos && (
                          <small className="text-muted">Cargando inventario...</small>
                        )}
                        {mostrarSugerenciasProductos && sugerenciasProductos.length > 0 && (
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
                            {sugerenciasProductos.map((prod) => {
                              const codigo = prod.idProducto?.codigoProducto || prod.codigoProducto || '';
                              const descripcion = prod.idProducto?.descripcionProducto || prod.descripcionProducto || prod.descripcion || '';
                              const key = prod.idProductoInventario ?? prod.idProducto?.idProducto ?? prod.id;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  className="list-group-item list-group-item-action text-start"
                                  onClick={() => agregarProductoDetalle(prod)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="d-flex justify-content-between">
                                    <div>
                                      <strong>{codigo}</strong> - {descripcion}
                                    </div>
                                    <div>
                                      <span className="badge bg-success">
                                        {formFactura.moneda === '1' ? 'Q' : '$'} {prod.precioVenta?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                  </div>
                                  <small className="text-muted">Stock: {prod.cantidadExistencias ?? prod.stock ?? 0}</small>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CCol>
                  </CRow>
                </div>

                {/* Sección: Detalle de Productos */}
                <div className="mb-3">
                  <h6 className="text-primary mb-3">Detalle de Productos</h6>
                  
                  <CTable bordered hover responsive>
                    <CTableHead className="bg-light text-dark">
                      <CTableRow>
                        <CTableHeaderCell className="py-2">No.</CTableHeaderCell>
                        <CTableHeaderCell className="py-2">Descripción Producto</CTableHeaderCell>
                        <CTableHeaderCell className="py-2">Unidades</CTableHeaderCell>
                        <CTableHeaderCell className="py-2">Precio Unidad</CTableHeaderCell>
                        <CTableHeaderCell className="py-2">Precio</CTableHeaderCell>
                        <CTableHeaderCell className="py-2">Descuento</CTableHeaderCell>
                        <CTableHeaderCell className="py-2">Total</CTableHeaderCell>
                        <CTableHeaderCell className="py-2 text-center">Eliminar</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {detalleFactura.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan="8" className="text-center py-4 text-muted">
                            No hay productos agregados. Busque y seleccione productos arriba.
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        detalleFactura.map((item, index) => (
                          <CTableRow key={index}>
                            <CTableDataCell>{index + 1}</CTableDataCell>
                            <CTableDataCell>
                              <div>
                                <strong>{item.descripcion}</strong>
                                <br />
                                <small className="text-muted">Código: {item.codigo}</small>
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <CFormInput
                                type="number"
                                min="1"
                                value={item.cantidad === '' ? '' : item.cantidad}
                                onChange={(e) => actualizarCantidadDetalle(index, e.target.value)}
                                placeholder="0"
                                size="sm"
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {formFactura.moneda === '1' ? 'Q' : '$'}{item.precioUnitario.toFixed(2)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {formFactura.moneda === '1' ? 'Q' : '$'}{item.precio.toFixed(2)}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CFormInput
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.descuento === '' ? '' : item.descuento}
                                onChange={(e) => actualizarDescuentoDetalle(index, e.target.value)}
                                placeholder="0"
                                size="sm"
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {formFactura.moneda === '1' ? 'Q' : '$'}{item.total.toFixed(2)}
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CButton
                                color="danger"
                                size="sm"
                                onClick={() => eliminarProductoDetalle(index)}
                                title="Eliminar producto"
                              >
                                🗑️ Eliminar
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>

                  {/* Totales */}
                  {detalleFactura.length > 0 && (
                    <div className="d-flex justify-content-end mt-3">
                      <div className="border rounded p-3" style={{ minWidth: '300px' }}>
                        <div className="d-flex justify-content-between mb-2">
                          <strong>Total de productos:</strong>
                          <span>{detalleFactura.reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <strong>Total descuento:</strong>
                          <span>{formFactura.moneda === '1' ? 'Q' : '$'}{calcularTotalDescuentoProductos().toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <strong>Total general:</strong>
                          <strong className="text-primary">
                            {formFactura.moneda === '1' ? 'Q' : '$'}{calcularTotal().toFixed(2)}
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
                  onClick={() => setVisible(false)}
                  className="border d-flex align-items-center gap-2"
                >
                  <span>✖️</span> Cerrar
                </CButton>
                <CButton 
                  color="primary"
                  className="d-flex align-items-center gap-2"
                  onClick={() => setVisible(false)}
                  disabled={detalleFactura.length === 0}
                >
                  <span>✅</span> Confirmar Productos
                </CButton>
              </CModalFooter>
          </CModal>

            <CModal visible={alertProductoDuplicado} onClose={() => setAlertProductoDuplicado(false)} alignment="center">
              <CModalHeader className="bg-warning text-dark">
                <CModalTitle className="d-flex align-items-center gap-2">
                  <span>⚠️</span> Producto duplicado
                </CModalTitle>
              </CModalHeader>
              <CModalBody className="text-center py-4">
                <p className="mb-0">Este producto ya está en el detalle de la factura. No puede agregarlo dos veces.</p>
              </CModalBody>
              <CModalFooter className="justify-content-center">
                <CButton color="secondary" onClick={() => setAlertProductoDuplicado(false)}>
                  Aceptar
                </CButton>
              </CModalFooter>
            </CModal>

            <CModal visible={modalCliente} onClose={cerrarModalCliente} backdrop="static" size="lg">
              <CModalHeader className="bg-light">
                <CModalTitle className="text-dark">Agregar Nuevo Cliente</CModalTitle>
              </CModalHeader>
              <CForm onSubmit={guardarCliente}>
                <CModalBody>
                  {errorCliente && (
                    <div className="alert alert-danger small mb-3" role="alert">
                      {errorCliente}
                    </div>
                  )}

                  <CRow className="gy-2">
                    <CRow className="g-3">
                      <CCol xs={6}>
                        <CFormLabel className="text-dark fw-bold">Nombre Cliente</CFormLabel>
                        <CFormInput
                          name="nombreCliente"
                          value={formCliente.nombreCliente}
                          onChange={handleClienteChange}
                          placeholder="Nombre del cliente"
                          required
                        />
                      </CCol>
                      <CCol xs={6}>
                        <CFormLabel className="text-dark fw-bold">Correo electrónico</CFormLabel>
                        <CFormInput
                          name="correoElectronico"
                          type="email"
                          value={formCliente.correoElectronico}
                          onChange={handleClienteChange}
                          placeholder="correo@ejemplo.com"
                        />
                      </CCol>
                    </CRow>
                    <CRow className="g-3">
                      <CCol xs={6}>
                        <CFormLabel className="text-dark fw-bold">NIT</CFormLabel>
                        <CFormInput
                          name="nit"
                          value={formCliente.nit}
                          onChange={handleClienteChange}
                          placeholder="NIT"
                        />
                      </CCol>
                      <CCol xs={6}>
                        <CFormLabel className="text-dark fw-bold">DPI / Pasaporte</CFormLabel>
                        <CFormInput
                          name="dpiPasaporte"
                          value={formCliente.dpiPasaporte}
                          onChange={handleClienteChange}
                          placeholder="DPI o Pasaporte"
                        />
                      </CCol>
                    </CRow>
                    <CRow className="g-3">
                      <CCol xs={6}>
                        <CFormLabel className="text-dark fw-bold">Nombre Facturación</CFormLabel>
                        <CFormInput
                          name="nombreFacturacion"
                          value={formCliente.nombreFacturacion}
                          onChange={handleClienteChange}
                          placeholder="Nombre para facturación"
                          invalid={!!errorsCliente.nombreFacturacion}
                        />
                        {errorsCliente.nombreFacturacion && (
                          <div className="invalid-feedback d-block">{errorsCliente.nombreFacturacion}</div>
                        )}
                      </CCol>
                      <CCol xs={6}>
                        <CFormLabel className="text-dark fw-bold">Dirección física</CFormLabel>
                        <CFormTextarea
                          name="direccionFisica"
                          value={formCliente.direccionFisica}
                          onChange={handleClienteChange}
                          placeholder="Dirección"
                          rows={2}
                          invalid={!!errorsCliente.direccionFisica}
                        />
                        {errorsCliente.direccionFisica && (
                          <div className="invalid-feedback d-block">{errorsCliente.direccionFisica}</div>
                        )}
                      </CCol>
                    </CRow>
                    <CRow className="g-3">
                      <CCol xs={6}>
                        <CFormLabel className="text-dark fw-bold">Teléfono 1</CFormLabel>
                        <CFormInput
                          name="telefono1"
                          value={formCliente.telefono1}
                          onChange={handleClienteChange}
                          placeholder="Número de teléfono principal"
                        />
                      </CCol>
                      <CCol xs={6}>
                        <CFormLabel className="text-dark fw-bold">Teléfono 2</CFormLabel>
                        <CFormInput
                          name="telefono2"
                          value={formCliente.telefono2}
                          onChange={handleClienteChange}
                          placeholder="Número de teléfono secundario"
                        />
                      </CCol>
                    </CRow>
                  </CRow>
                </CModalBody>
                <CModalFooter>
                  <CButton color="secondary" type="button" onClick={cerrarModalCliente} disabled={guardandoCliente}>
                    Cerrar
                  </CButton>
                  <CButton className="text-light" color="success" type="submit" disabled={guardandoCliente}>
                    {guardandoCliente ? 'Guardando…' : 'Guardar Cliente'}
                  </CButton>
                </CModalFooter>
              </CForm>
          </CModal>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}
export default Layout
