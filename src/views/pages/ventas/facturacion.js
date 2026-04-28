import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import logoFerreteria from 'src/assets/images/logo-ferreteria-agmner.png'
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
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const [visible, setVisible] = useState(false);
  const [esConsumidorFinal, setEsConsumidorFinal] = useState(false);
  const [modalCliente, setModalCliente] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState('');
  const [errorsCliente, setErrorsCliente] = useState({});
  const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
  const [mostrarSugerenciasClientes, setMostrarSugerenciasClientes] = useState(false);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(false);
  const debounceCliente = useRef(null);

  // Estados para productos
  const [productos, setProductos] = useState([]);
  const [todosProductosCache, setTodosProductosCache] = useState([]); // caché completo de inventario
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [sugerenciasProductos, setSugerenciasProductos] = useState([]);
  const [mostrarSugerenciasProductos, setMostrarSugerenciasProductos] = useState(false);
  const [detalleFactura, setDetalleFactura] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [alertProductoDuplicado, setAlertProductoDuplicado] = useState(false);
  const [guardandoFactura, setGuardandoFactura] = useState(false);
  const [errorFactura, setErrorFactura] = useState('');
  const [enviarCorreo, setEnviarCorreo] = useState(false);
  const [alertaSinCorreo, setAlertaSinCorreo] = useState(false);
  const [documentoOpts, setDocumentoOpts] = useState([]);
  const [tiposReceptor, setTiposReceptor] = useState({});
  const [documento, setDocumento] = useState('');
  const [ubicaciones, setUbicaciones] = useState([]);
  const [errorDteModal, setErrorDteModal] = useState({ visible: false, mensaje: '' });
  const esErrorNitDteRef = useRef(false);
  const [errorValidacionModal, setErrorValidacionModal] = useState({ visible: false, mensaje: '' });
  const [alertaCantidadModal, setAlertaCantidadModal] = useState(false);
  const [referenciaParaComprobante, setReferenciaParaComprobante] = useState('');
  const [clienteGuardadoModal, setClienteGuardadoModal] = useState(false);

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
    correoElectronico: '',
    telefono: '',
    direccion: '',
    direccionEntrega: '',
    tipoDocumento: '1',
    moneda: '1',
    fecha: obtenerFechaHoy(),
    establecimiento: 'Ferreteria y Blockera Agmner',
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

  const handleConsumidorFinal = async (e) => {
    const checked = e.target.checked;
    setEsConsumidorFinal(checked);

    if (checked) {
      let idClienteCF = null;
      try {
        const res = await fetch('/api/clientes?documentoCliente=CF&page=0&size=1');
        if (res.ok) {
          const data = await res.json();
          const lista = Array.isArray(data) ? data : (data?.content || []);
          const cf = lista.find(
            (c) => (c.nit || '').toString().toUpperCase() === 'CF' ||
                   (c.nombreCliente || c.nombreFacturacion || '').toLowerCase().includes('consumidor final')
          );
          idClienteCF = cf?.idCliente ?? cf?.id ?? null;
        }
      } catch { /* silencioso */ }
      setFormFactura({
        idCliente: idClienteCF,
        nit: 'CF',
        nombre: 'Consumidor Final',
        correoElectronico: '',
        telefono: '',
        direccion: 'Ciudad',
        direccionEntrega: formFactura.direccionEntrega,
        tipoDocumento: formFactura.tipoDocumento,
        moneda: formFactura.moneda,
        fecha: formFactura.fecha,
        establecimiento: formFactura.establecimiento,
      });
    } else {
      const entregaActual = formFactura.direccionEntrega;
      limpiarFormulario();
      setFormFactura((prev) => ({ ...prev, direccionEntrega: entregaActual }));
    }
  };

  const limpiarFormulario = () => {
    setFormFactura({
      idCliente: null,
      nit: '',
      nombre: '',
      correoElectronico: '',
      telefono: '',
      direccion: '',
      direccionEntrega: '',
      tipoDocumento: '1',
      moneda: '1',
      fecha: obtenerFechaHoy(),
      establecimiento: 'Ferreteria y Blockera Agmner',
    });
    setEsConsumidorFinal(false);
    setClienteSeleccionado(false);
    setEnviarCorreo(false);
    setAlertaSinCorreo(false);
    const nitEntry = Object.entries(tiposReceptor).find(([, v]) => v.toUpperCase().includes('NIT'));
    setDocumento(nitEntry ? nitEntry[0] : '');
    setSugerenciasClientes([]);
    setMostrarSugerenciasClientes(false);
    setImpuestoIVA(12);
    setErrorFactura('');
  };

  const cargarDocumentos = async () => {
    try {
      const response = await fetch('/api/diccionarios?diccionario=TIPODOCUMENTO&estado=1');
      const data = await response.json();
      const lista = Array.isArray(data) ? data : (data?.content || []);
      setDocumentoOpts(lista);
      if (lista.length > 0) {
        setFormFactura((prev) => ({ ...prev, tipoDocumento: String(lista[0].indice) }));
      }
    } catch (e) {
      console.error('Error al cargar tipos de documento:', e);
      setDocumentoOpts([]);
    }
  };

  const cargarTiposReceptor = async () => {
    try {
      const response = await fetch('/api/diccionarios?diccionario=TIPORECEPTOR&estado=1');
      const data = await response.json();
      const lista = Array.isArray(data) ? data : (data?.content || []);
      const mapa = {};
      lista.forEach((item) => { mapa[String(item.indice)] = item.valor; });
      setTiposReceptor(mapa);
      const nitEntry = lista.find((item) => (item.valor || '').toUpperCase().includes('NIT'));
      if (nitEntry) setDocumento(String(nitEntry.indice));
    } catch (e) {
      console.error('Error al cargar tipos de receptor:', e);
    }
  };

  const buscarClientes = async (termino, campo = 'nombre') => {
    const t = (termino || '').trim();
    if (t.length < 1) {
      setSugerenciasClientes([]);
      setMostrarSugerenciasClientes(false);
      return;
    }
    setCargandoClientes(true);
    try {
      const params = new URLSearchParams({ page: 0, size: 15 });
      if (campo === 'nombre') {
        params.append('nombreCliente', t);
      } else {
        if (documento) params.append('tipoDocumento', documento);
        params.append('documentoCliente', t);
      }
      const res = await fetch(`/api/clientes?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const lista = Array.isArray(data) ? data : (data?.content || []);
      setSugerenciasClientes(lista.slice(0, 15));
      setMostrarSugerenciasClientes(lista.length > 0);
    } catch {
      setSugerenciasClientes([]);
      setMostrarSugerenciasClientes(false);
    } finally {
      setCargandoClientes(false);
    }
  };

  const cargarUbicaciones = async () => {
    try {
      const res = await fetch('/api/ubicaciones')
      const data = await res.json()
      setUbicaciones(Array.isArray(data) ? data : data?.content || [])
    } catch { /* silencioso */ }
  }

  const obtenerNombreUbicacion = (id) => {
    const u = ubicaciones.find((u) => Number(u.idUbicacion) === Number(id))
    return u ? (u.nombreUbicacion || `Ubic. ${id}`) : (id ? `Ubic. ${id}` : '—')
  }

  // Búsqueda server-side paralela por campo (igual que reporteInventario.js)
  const cargarInventario = async () => {
    // ya no pre-carga masiva; la búsqueda se hace en buscarEnInventario
  };

  const buscarEnInventario = async (termino) => {
    const t = (termino || '').trim();
    if (t.length < 1) {
      setSugerenciasProductos([]);
      setMostrarSugerenciasProductos(false);
      return;
    }

    // Cancelar la búsqueda anterior en vuelo para evitar acumulación de peticiones
    if (abortBusquedaProducto.current) {
      abortBusquedaProducto.current.abort();
    }
    const controller = new AbortController();
    abortBusquedaProducto.current = controller;
    const { signal } = controller;

    try {
      setCargandoProductos(true);
      // Códigos son únicos o casi únicos: 30 resultados es suficiente
      const SIZE_CODIGO = 30;
      // Descripción necesita más margen para que la intersección por palabras
      // funcione correctamente en catálogos grandes (6000+ productos)
      const SIZE_DESCRIPCION = 300;
      const palabras = t.split(/\s+/).filter(Boolean);

      const fetchDescripcion = (palabra) =>
        fetch(`/api/inventario?descripcion=${encodeURIComponent(palabra)}&page=0&size=${SIZE_DESCRIPCION}`, { signal })
          .then(r => r.json()).then(d => (Array.isArray(d) ? d : d.content || []));

      const [rCodigo, rProveedor, ...rDescPalabras] = await Promise.all([
        fetch(`/api/inventario?codigoProducto=${encodeURIComponent(t)}&page=0&size=${SIZE_CODIGO}`, { signal }).then(r => r.json()),
        fetch(`/api/inventario?codigoProductoProveedor=${encodeURIComponent(t)}&page=0&size=${SIZE_CODIGO}`, { signal }).then(r => r.json()),
        ...palabras.map(fetchDescripcion),
      ]);

      // Intersección por descripción (el producto debe aparecer en TODAS las palabras)
      let porDescripcion = rDescPalabras[0] || [];
      for (let i = 1; i < rDescPalabras.length; i++) {
        const ids = new Set(rDescPalabras[i].map(p => p.idInventario));
        porDescripcion = porDescripcion.filter(p => ids.has(p.idInventario));
      }

      const combinados = [
        ...(Array.isArray(rCodigo) ? rCodigo : rCodigo.content || []),
        ...(Array.isArray(rProveedor) ? rProveedor : rProveedor.content || []),
        ...porDescripcion,
      ];
      const unicos = combinados.filter((p, idx, arr) =>
        arr.findIndex(x => x.idInventario === p.idInventario) === idx
      );
      setSugerenciasProductos(unicos.slice(0, 15));
      setMostrarSugerenciasProductos(unicos.length > 0);
    } catch (e) {
      // Ignorar errores de cancelación (AbortError)
      if (e.name === 'AbortError') return;
      console.error('Error al buscar inventario:', e);
      setSugerenciasProductos([]);
      setMostrarSugerenciasProductos(false);
    } finally {
      if (!signal.aborted) {
        setCargandoProductos(false);
      }
    }
  };

  const debounceProducto = useRef(null);
  const abortBusquedaProducto = useRef(null);
  const handleBusquedaProducto = (e) => {
    const value = e.target.value;
    setBusquedaProducto(value);
    clearTimeout(debounceProducto.current);
    debounceProducto.current = setTimeout(() => {
      buscarEnInventario(value);
    }, 300);
  };

  const agregarProductoDetalle = (producto) => {
    const idInventario = producto.idInventario ?? producto.idProductoInventario;
    const idProducto = producto.idProducto?.idProducto ?? producto.idProducto ?? producto.id;
    const existe = detalleFactura.find((item) => item.idProductoInventario === idInventario || item.idProducto === idProducto);

    if (existe) {
      setAlertProductoDuplicado(true);
      return;
    }

    const codigo = producto.idProducto?.codigoProducto || producto.codigoProducto || '';
    const descripcion = producto.idProducto?.descripcionProducto || producto.descripcionProducto || producto.descripcion || '';
    const precioVenta = producto.idProducto?.precioVenta ?? producto.precioVenta ?? 0;
    const cantidad = 1;
    const precio = precioVenta * cantidad;
    const descuento = 0;
    const total = precio - descuento;

    const nuevoItem = {
      idProductoInventario: idInventario,
      idProducto,
      idUnidadMedida: producto.idProducto?.unidadDeMedida ?? producto.unidadDeMedida ?? null,
      codigo,
      descripcion,
      cantidad,
      precioUnitario: precioVenta,
      precio,
      descuento,
      total,
      stock: producto.cantidadExistencias ?? producto.stock ?? 0,
      ubicacion: obtenerNombreUbicacion(producto.idUbicacion),
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
    const valor = Number(cantidad);
    if (cantidad !== '' && (valor <= 0 || isNaN(valor))) {
      setAlertaCantidadModal(true);
      return;
    }
    const nuevoDetalle = [...detalleFactura];
    nuevoDetalle[index].cantidad = cantidad === '' ? '' : valor;
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
    const valorDesc = Number(descuento);
    if (descuento !== '' && (valorDesc < 0 || isNaN(valorDesc))) {
      setAlertaCantidadModal(true);
      return;
    }
    const nuevoDetalle = [...detalleFactura];
    nuevoDetalle[index].descuento = descuento === '' ? '' : valorDesc;
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
    const valor = (tiposReceptor[String(documento)] || '').toLowerCase();
    if (valor.includes('pasaporte')) return 'pasaporte';
    if (valor.includes('dpi')) return 'dpi';
    return 'nit';
  };

  const handleNitChange = (e) => {
    const value = (e.target.value || '').toString();
    setFormFactura((prev) => ({ ...prev, nit: value }));
    const tipo = tipoBusqueda();
    const campo = (tipo === 'dpi' || tipo === 'pasaporte') ? 'dpi' : 'nit';
    clearTimeout(debounceCliente.current);
    if (value.trim().length < 1) {
      setSugerenciasClientes([]);
      setMostrarSugerenciasClientes(false);
      return;
    }
    debounceCliente.current = setTimeout(() => buscarClientes(value, campo), 300);
  };

  const handleNombreChange = (e) => {
    const value = (e.target.value || '').toString();
    setFormFactura((prev) => ({ ...prev, nombre: value }));
    clearTimeout(debounceCliente.current);
    if (value.trim().length < 1) {
      setSugerenciasClientes([]);
      setMostrarSugerenciasClientes(false);
      return;
    }
    debounceCliente.current = setTimeout(() => buscarClientes(value, 'nombre'), 300);
  };

  const seleccionarClienteSugerencia = (cliente) => {
    const tipo = tipoBusqueda();
    const docValue = (tipo === 'dpi' || tipo === 'pasaporte')
      ? (cliente.documentoIdentificacion || '')
      : (cliente.nit || '');
    const correo = cliente.correoElectronico || '';
    setFormFactura((prev) => ({
      ...prev,
      idCliente: cliente.idCliente ?? cliente.id ?? null,
      nit: docValue,
      nombre: cliente.nombreCliente || cliente.nombreFacturacion || '',
      correoElectronico: correo,
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
    cargarDocumentos();
    cargarTiposReceptor();
    cargarUbicaciones();
    cargarInventario();
  }, []);

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
        documentoIdentificacion: formCliente.dpiPasaporte?.trim() || '',
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

      const rawCliente = await response.text();
      console.log('[grabarCliente] Respuesta raw:', rawCliente);
      const numCliente = parseInt(rawCliente.trim(), 10);
      const idClienteNuevo = !isNaN(numCliente) ? numCliente : null;
      console.log('[grabarCliente] idClienteNuevo:', idClienteNuevo);

      const tieneNit = !!formCliente.nit?.trim();
      const tieneDpi = !!formCliente.dpiPasaporte?.trim();

      if (tieneNit) {
        const nitEntry = Object.entries(tiposReceptor).find(([, v]) => v.toLowerCase().includes('nit'));
        if (nitEntry) setDocumento(nitEntry[0]);
      } else if (tieneDpi) {
        const dpiEntry = Object.entries(tiposReceptor).find(([, v]) => v.toLowerCase().includes('dpi'));
        if (dpiEntry) setDocumento(dpiEntry[0]);
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
        correoElectronico: formCliente.correoElectronico?.trim() || '',
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
      setClienteGuardadoModal(true);
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      setErrorCliente(err.message || 'No se pudo guardar el cliente');
    } finally {
      setGuardandoCliente(false);
    }
  };

  const formatearFechaFactura = (fecha) => {
    if (!fecha) return '—';
    try {
      const [yyyy, mm, dd] = fecha.split('-');
      return `${dd}-${mm}-${yyyy}`;
    } catch (_) {
      return fecha;
    }
  };

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
      if (n >= 20) { s += decenas[Math.floor(n / 10)]; if (n % 10) s += ' Y ' + unidades[n % 10]; }
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

  const imprimirFactura = async ({ cliente, detalle, iva, total, totalDescuento, numeroAutorizacion, serieRes, referenciaRes, preimpresoRes, error = false, esConsignacion = false }) => {
    const moneda = cliente.moneda === '1' ? 'Q' : '$';

    // Convertir logo a base64 para que funcione en la ventana de impresión
    let logoBase64 = '';
    try {
      const resp = await fetch(logoFerreteria);
      const blob = await resp.blob();
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      logoBase64 = '';
    }

    const FILAS_PAGINA_1 = 20   // filas de productos en la primera hoja (carta: ~87mm disponibles ÷ 5.8mm/fila)
    const FILAS_PAGINA_N = 30   // filas de productos en hojas de continuación

    // Calcular valores por ítem para columnas condicionales
    const detalleConCalculo = detalle.map((item) => {
      const cantItem = Number(item.cantidad) || 0;
      const descItem = Number(item.descuento) || 0;
      const precioItem = Number(item.precioUnitario) || 0;
      const totalItem = cantItem * precioItem;
      const totalConDescuento = totalItem - descItem;
      const impExento = 0;   // Actualmente siempre 0
      const impOtros  = 0;   // Actualmente siempre 0
      return { ...item, cantidadDeDescuento: descItem, ImpExento: impExento, ImpOtros: impOtros, totalConDescuento };
    });

    // Flags: mostrar columna solo si al menos un ítem tiene valor distinto de 0
    const hayDescuento = detalleConCalculo.some((i) => i.cantidadDeDescuento !== 0);
    const hayExento    = detalleConCalculo.some((i) => i.ImpExento !== 0);
    const hayOtros     = detalleConCalculo.some((i) => i.ImpOtros !== 0);

    // Total de columnas dinámico
    const totalCols = 4 + (hayDescuento ? 1 : 0) + (hayExento ? 1 : 0) + (hayOtros ? 1 : 0);

    const renderFilasProducto = (items) => items.map((item) => `
      <tr>
        <td style="text-align:center;">${item.cantidad}</td>
        <td>${item.descripcion || item.nombre || ''}</td>
        <td style="text-align:right;">${moneda}${Number(item.precioUnitario || 0).toFixed(2)}</td>
        ${hayDescuento ? `<td style="text-align:right;">${moneda}${item.cantidadDeDescuento.toFixed(2)}</td>` : ''}
        ${hayExento    ? `<td style="text-align:right;">${moneda}${item.ImpExento.toFixed(2)}</td>` : ''}
        ${hayOtros     ? `<td style="text-align:right;">${moneda}${item.ImpOtros.toFixed(2)}</td>` : ''}
        <td style="text-align:right;">${moneda}${Number(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('')

    const renderFilasVacias = (n) => Array.from({ length: Math.max(0, n) }, () =>
      `<tr>${Array(totalCols).fill('<td>&nbsp;</td>').join('')}</tr>`
    ).join('')

    // Dividir el detalle en páginas
    const paginasDetalle = []
    paginasDetalle.push(detalleConCalculo.slice(0, FILAS_PAGINA_1))
    let restoDetalle = detalleConCalculo.slice(FILAS_PAGINA_1)
    while (restoDetalle.length > 0) {
      paginasDetalle.push(restoDetalle.slice(0, FILAS_PAGINA_N))
      restoDetalle = restoDetalle.slice(FILAS_PAGINA_N)
    }
    const totalPaginas = paginasDetalle.length

    // Fragmentos HTML reutilizables
    const colgroupHTML = `
      <colgroup>
        <col class="col-cant" />
        <col class="col-desc" />
        <col class="col-precio" />
        ${hayDescuento ? '<col class="col-precio" />' : ''}
        ${hayExento    ? '<col class="col-precio" />' : ''}
        ${hayOtros     ? '<col class="col-precio" />' : ''}
        <col class="col-total" />
      </colgroup>`

    const theadHTML = `
      <thead>
        <tr>
          <th>Cantidad</th>
          <th>Descripción</th>
          <th>Precio Unitario</th>
          ${hayDescuento ? '<th>Descuento</th>' : ''}
          ${hayExento    ? '<th>Valor Exento</th>' : ''}
          ${hayOtros     ? '<th>Otros Impuestos</th>' : ''}
          <th>Total</th>
        </tr>
      </thead>`

    const tfootHTML = `
      <tfoot>
        <tr>
          <td colspan="2" rowspan="2" style="font-size:10px;color:#000;vertical-align:middle;padding:6px 8px;border-top:1px solid #000;">
            <strong>TOTAL EN QUETZALES:</strong> ${numeroALetras(total.toFixed(2))}
          </td>
          <td colspan="${totalCols - 3}" style="text-align:left;padding:5px 8px;border-left:1px solid #000;border-top:1px solid #000;">IVA:</td>
          <td style="text-align:right;padding:5px 8px;border-top:1px solid #000;">${moneda}${iva.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="${totalCols - 3}" style="text-align:left;padding:5px 8px;font-weight:bold;font-size:13px;border-left:1px solid #000;border-top:1px solid #000;">TOTAL:</td>
          <td style="text-align:right;padding:5px 8px;font-weight:bold;font-size:13px;border-top:1px solid #000;">${moneda}${total.toFixed(2)}</td>
        </tr>
      </tfoot>`

    const headerEmpresaHTML = `
      <div class="header-empresa">
        <div class="logo">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
          <div class="telefonos">📞 7888-9138 / 5203-0726</div>
        </div>
        <div class="empresa-info">
          <div style="font-size:14px;font-weight:bold;margin-bottom:3px;letter-spacing:0.5px;">${esConsignacion ? 'CONSIGNACIÓN' : error ? 'COMPROBANTE DE PAGO' : 'DOCUMENTO TRIBUTARIO ELECTRÓNICO'}</div>
          <div class="empresa-nombre">Blockera Agmner</div>
          <div class="empresa-linea">JUAN ALBERTO, ARREDONDO GARCIA</div>
          <div class="empresa-linea">CALLE PRINCIPAL SECTOR PALIN NUEVA SANTA ROSA</div>
          <div class="empresa-linea">SANTA ROSA</div>
          <div class="empresa-linea">NIT: 16949447</div>
        </div>
        <div class="factura-id">
          ${(error || esConsignacion) ? `
          <div class="factura-linea"><strong>Referencia:</strong> ${referenciaRes || '—'}</div>
          <div class="factura-linea" style="margin-top:5px;"><strong>Fecha de Emisión:</strong> ${formatearFechaFactura(cliente.fecha)}</div>
          ` : `
          <div class="factura-titulo">FACTURA</div>
          <div class="factura-linea"><strong>NÚMERO DE AUTORIZACIÓN</strong></div>
          <div class="factura-linea" style="font-size:10px;line-height:1.4;">${numeroAutorizacion ? numeroAutorizacion.slice(0, 26) : '—'}</div>
          ${numeroAutorizacion && numeroAutorizacion.length > 26 ? `<div class="factura-linea" style="font-size:10px;line-height:1.4;">${numeroAutorizacion.slice(26)}</div>` : ''}
          <div class="factura-linea"><strong>Serie:</strong> ${serieRes || '—'}</div>
          <div class="factura-linea"><strong>Número:</strong> ${preimpresoRes || '—'}</div>
          <div class="factura-linea" style="margin-top:5px;"><strong>Fecha de Emisión:</strong> ${formatearFechaFactura(cliente.fecha)}</div>
          `}
        </div>
      </div>`

    const clienteBoxHTML = `
      <div class="cliente-box">
        <div class="field"><label>Nombre: </label>${cliente.nombre || 'Consumidor Final'}</div>
        <div class="field"><label>${(tiposReceptor[String(documento)] || 'NIT').toUpperCase()}: </label>${cliente.nit || 'CF'}</div>
        <div class="field"><label>Dirección: </label>${cliente.direccion || '—'}</div>
        <div class="field"><label>Dirección de entrega: </label>${cliente.direccionEntrega || '—'}</div>
      </div>`

    const footerContenidoHTML = `
      ${(!error && !esConsignacion) ? `
      <div style="margin-top:10px;padding:6px 10px;border:1px solid #000;border-radius:4px;font-size:10px;text-align:center;">
        <div><strong>Sujeto a pagos trimestrales ISR</strong></div>
        <div><strong>Agente de Retención de IVA</strong></div>
      </div>
      <div style="margin-top:10px;padding:6px 10px;border:1px solid #000;border-radius:4px;font-size:10px;text-align:center;">
        <div style="font-weight:bold;margin-bottom:4px;">DATOS DEL CERTIFICADOR</div>
        <div style="text-align:center;">
          <span><strong>NIT del contribuyente:</strong> 5640773-4</span>
          &nbsp;&nbsp;
          <span><strong>Nombre, razón o denominación social:</strong> AINNOVA, SOCIEDAD ANÓNIMA</span>
        </div>
      </div>
      ` : ''}
      <div class="footer">Gracias por su compra — Ferretería y Blockera Agmner</div>
      <div style="font-weight:bold;margin-bottom:6px;text-align:center;font-size:14px;">No se aceptan cambios, Ni devoluciones.</div>
      ${esConsignacion ? `
      <div style="font-weight:bold;text-align:center;font-size:14px;margin-top:4px;">**Productos pendientes de pago**</div>
      <div style="margin-top:30px;text-align:center;">
        <div style="font-size:13px;">f._____________________</div>
        <div style="font-size:12px;margin-top:4px;">${cliente.nombre || 'Consumidor Final'}</div>
      </div>
      ` : ''}`

    const paginasHTML = paginasDetalle.map((chunk, idx) => {
      const esPrimera = idx === 0
      const esUltima  = idx === totalPaginas - 1
      const filasPorPagina = esPrimera ? FILAS_PAGINA_1 : FILAS_PAGINA_N
      // Cada descripción larga que haga wrap resta una fila disponible para el relleno
      const CHARS_POR_LINEA = 56
      const lineasExtra = chunk.reduce((acc, item) => {
        const desc = (item.descripcion || item.nombre || '').trim()
        return acc + Math.max(0, Math.ceil(desc.length / CHARS_POR_LINEA) - 1)
      }, 0)
      const bodyFilas = renderFilasProducto(chunk) + (esPrimera ? renderFilasVacias(filasPorPagina - chunk.length - lineasExtra) : '')
      return `
        <div class="page"${!esUltima ? ' style="page-break-after:always;"' : ''}>
          ${esPrimera ? headerEmpresaHTML + clienteBoxHTML : ''}
          <table class="${`detalle-table${!esUltima ? ' tabla-continua' : ''}${!esPrimera ? ' tabla-desde-anterior' : ''}`}">
            ${colgroupHTML}
            ${esPrimera ? theadHTML : ''}
            <tbody>${bodyFilas}</tbody>
            ${esUltima ? tfootHTML : ''}
          </table>
          ${esUltima ? footerContenidoHTML : ''}
        </div>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${esConsignacion ? `Consignación - ${referenciaRes}` : error ? `Comprobante - ${referenciaRes}` : cliente.tipoDocumento === '2' ? `Nota de Crédito - ${referenciaRes}` : cliente.tipoDocumento === '3' ? `Nota de Débito - ${referenciaRes}` : `Factura - ${referenciaRes}`}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #222; }

          @page { size: letter; margin: 8mm 10mm; }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }

          .page { width: 100%; min-height: 259mm; padding: 6mm 8mm; }

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

          /* Encabezado */
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

          /* Celdas */
          .detalle-table td {
            padding: 5px 8px;
            border: none;
            vertical-align: top;
            height: 22px;
          }

          /* Líneas verticales internas */
          .detalle-table th + th,
          .detalle-table td + td {
            border-left: 1px solid #000;
          }

          /* 🔹 Redondear SOLO esquinas externas */
          .detalle-table tr:first-child th:first-child {
            border-top-left-radius: 6px;
          }

          .detalle-table tr:first-child th:last-child {
            border-top-right-radius: 6px;
          }

          .detalle-table tr:last-child td:first-child {
            border-bottom-left-radius: 6px;
          }

          .detalle-table tr:last-child td:last-child {
            border-bottom-right-radius: 6px;
          }

          /* Anchos de columnas */
          .detalle-table col.col-cant  { width: 60px; }
          .detalle-table col.col-desc  { width: auto; }
          .detalle-table col.col-precio { width: 110px; }
          .detalle-table col.col-total  { width: 110px; }

          /* Alineaciones */
          .detalle-table th:nth-child(1),
          .detalle-table td:nth-child(1) {
            text-align: center;
          }

          .detalle-table th:nth-child(3),
          .detalle-table td:nth-child(3),
          .detalle-table th:nth-child(4),
          .detalle-table td:nth-child(4) {
            text-align: right;
          } 

          /* ── Totales ── */
          .totales-wrap { margin-bottom: 12px; }
          .totales-tabla {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 12px;
            font-weight: normal;
            border: 1px solid #000;
            border-radius: 0;
            overflow: hidden;
          }
          .totales-tabla td {
            padding: 5px 12px;
            border: none;
            border-bottom: 1px solid #000;
            font-weight: normal;
          }
          .totales-tabla tr:last-child td { border-bottom: none; }
          .totales-tabla td + td { border-left: 1px solid #000; }
          .totales-tabla td:last-child { text-align: right; }
          .totales-tabla .fila-total { font-weight: bold; font-size: 13px; }
          .totales-tabla tr:first-child td:first-child { border-top-left-radius: 0; }
          .totales-tabla tr:first-child td:last-child  { border-top-right-radius: 0; }
          .totales-tabla tr:last-child  td:first-child { border-bottom-left-radius: 0; }
          .totales-tabla tr:last-child  td:last-child  { border-bottom-right-radius: 0; }
          .td-son {
            font-size: 10px;
            color: #444;
            vertical-align: middle;
            width: 55%;
          }

          /* ── Continuación ── */
          .cont-header {
            font-size: 11px;
            font-weight: bold;
            border-bottom: 1px solid #555;
            padding-bottom: 6px;
            margin-bottom: 8px;
            color: #333;
          }

          /* Tabla que continúa en la siguiente hoja: sin borde ni radio inferior */
          .detalle-table.tabla-continua {
            border-bottom: none;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
          }
          .detalle-table.tabla-continua tr:last-child td:first-child {
            border-bottom-left-radius: 0;
          }
          .detalle-table.tabla-continua tr:last-child td:last-child {
            border-bottom-right-radius: 0;
          }

          /* Tabla que viene de la hoja anterior: sin borde ni radio superior */
          .detalle-table.tabla-desde-anterior {
            border-top: none;
            border-top-left-radius: 0;
            border-top-right-radius: 0;
          }
          .detalle-table.tabla-desde-anterior tr:first-child td:first-child {
            border-top-left-radius: 0;
          }
          .detalle-table.tabla-desde-anterior tr:first-child td:last-child {
            border-top-right-radius: 0;
          }

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
        ${paginasHTML}
        <script>
          window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
        </script>
      </body>
      </html>
    `;

    const ventana = window.open('', '_blank', 'width=900,height=700');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
    }
  };

  const guardarFactura = async (e) => {
    e.preventDefault();
    setErrorFactura('');

    const mostrarErrorValidacion = (mensaje) => {
      setErrorValidacionModal({ visible: true, mensaje });
    };

    if (!formFactura.tipoDocumento) {
      mostrarErrorValidacion('Debe seleccionar un Tipo de Documento (Factura, Nota de Crédito, etc.) antes de generar la factura.');
      return;
    }

    if (!esConsumidorFinal && !documento) {
      mostrarErrorValidacion('Debe seleccionar un tipo de receptor (NIT, DPI o Pasaporte) antes de generar la factura.');
      return;
    }

    if (!formFactura.nombre?.trim()) {
      mostrarErrorValidacion('Debe seleccionar o agregar un cliente.');
      return;
    }

    if (detalleFactura.length === 0) {
      mostrarErrorValidacion('Debe agregar al menos un producto.');
      return;
    }

    if (!formFactura.idCliente) {
      mostrarErrorValidacion('El cliente no tiene un ID válido. Por favor seleccione o guarde el cliente nuevamente.');
      return;
    }

    setGuardandoFactura(true);
    try {
      // Calcular valores por línea (redondeados a 2 decimales) y acumular totales del encabezado
      const r2 = (n) => parseFloat(n.toFixed(2))
      const lineasDetalle = detalleFactura.map((item) => {
        const cantItem     = Number(item.cantidad) || 0
        const descItem     = r2(item.descuento || 0)
        const precioItem   = r2(item.precioUnitario || 0)
        const impBruto     = r2(cantItem * precioItem)
        const totalConDesc = r2(impBruto - descItem)   // ImpTotal por línea
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
      }), { totalBruto: 0.00, cantidadDeDescuento: 0.00, totalNeto: 0.00, iva: 0.00, total: 0.00 })

      console.log('[lineasDetalle]', lineasDetalle)
      console.log('[totalesDetalle]', totalesDetalle)

      const body = {
        tipoDocumento: formFactura.tipoDocumento,
        idCliente: { idCliente: formFactura.idCliente },
        tipoVenta: 'B',
        destinoVenta: '1',
        FechaFactura: formFactura.fecha,
        moneda: formFactura.moneda,
        tasaDeCambio: formFactura.moneda === '1' ? '1.00' : '2.00',
        referencia: '0',
        numeroAcceso: '0',
        serieAdmin: '',
        numeroAdmin: '0',
        totalBruto:          totalesDetalle.totalBruto.toFixed(2),
        cantidadDeDescuento: totalesDetalle.cantidadDeDescuento.toFixed(2),
        porcentajeDeDescuento: 0,
        exento: '0.00',
        otro: '0.00',
        totalNeto: totalesDetalle.totalNeto,
        isr: '0.00',
        iva: totalesDetalle.iva.toFixed(2),
        total: totalesDetalle.total.toFixed(2),
        facturaProcesada: '',
        direccionEntrega: formFactura.direccionEntrega || '',
        enviarCorreo: enviarCorreo ? 'S' : 'N',
        tipoReceptor: documento || '1',
        idUsuarioModificacion: idUsuarioActual,
      };

      console.log('[grabarEncabezadoFacturas] Body enviado:', body);
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

      // Guardar el detalle de la factura usando los valores ya calculados en lineasDetalle
      const detallePromises = lineasDetalle.map(({ item, cantItem, descItem, precioItem, impBruto, totalConDesc, impNeto, impIva }) => {
        const bodyDetalle = {
          idEncabezadoFactura: String(idEncabezadoFactura),
          idProducto: String(item.idProducto),
          idUnidadDeMedida: String(item.idUnidadMedida ?? '1'),
          cantidad: String(cantItem),
          precioVenta: precioItem.toFixed(2),
          cantidadDeDescuento: descItem.toFixed(2),
          porcentajeDeDescuento: '0.00',
          ImpBruto: impBruto.toFixed(2),
          ImpExento: '0.00',
          ImpOtros: '0.00',
          ImpNeto: impNeto.toFixed(2),
          iva: impIva.toFixed(2),
          isr: '0.00',
          ImpTotal: totalConDesc.toFixed(2),
          consignacionFacturada: '0',
          idUsuarioModificacion: String(idUsuarioActual),
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

      // Construir la referencia en memoria: prefijo + idEncabezadoFactura
      const idFacturaTrimmed = idEncabezadoFactura.trim()
      const tipoDoc = String(formFactura.tipoDocumento)
      const prefijoRef = tipoDoc === '1' ? 'FACT' : tipoDoc === '2' ? 'NCRE' : tipoDoc === '3' ? 'NDEB' : tipoDoc === '4' ? 'CONS' : ''
      const referenciaCalculada = prefijoRef ? `${prefijoRef}${idFacturaTrimmed}` : idFacturaTrimmed
      setReferenciaParaComprobante(referenciaCalculada)

      // Tipo 4 (Consignación): no enviar DTE, guardar referencia y imprimir directamente
      if (tipoDoc === '4') {
        await fetch('/api/grabarEncabezadoFacturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idEncabezadoFactura: idFacturaTrimmed,
            tipoDocumento: formFactura.tipoDocumento,
            idCliente: { idCliente: formFactura.idCliente },
            tipoVenta: 'B',
            destinoVenta: '1',
            FechaFactura: formFactura.fecha,
            moneda: formFactura.moneda,
            tasaDeCambio: formFactura.moneda === '1' ? '1.00' : '2.00',
            referencia: referenciaCalculada,
            numeroAcceso: '0',
            serieAdmin: '',
            numeroAdmin: '0',
            totalBruto:          totalesDetalle.totalBruto.toFixed(2),
            cantidadDeDescuento: totalesDetalle.cantidadDeDescuento.toFixed(2),
            porcentajeDeDescuento: 0,
            exento: '0.00',
            otro: '0.00',
            totalNeto: totalesDetalle.totalNeto,
            isr: '0.00',
            iva: totalesDetalle.iva.toFixed(2),
            total: totalesDetalle.total.toFixed(2),
            facturaProcesada: '',
            direccionEntrega: formFactura.direccionEntrega || '',
            enviarCorreo: 'N',
            tipoReceptor: documento || '1',
            idUsuarioModificacion: idUsuarioActual,
          }),
        })

        await imprimirFactura({
          cliente: { ...formFactura },
          detalle: [...detalleFactura],
          iva: totalesDetalle.iva,
          total: totalesDetalle.total,
          totalDescuento: calcularTotalDescuentoProductos(),
          numeroAutorizacion: '',
          serieRes: '',
          referenciaRes: referenciaCalculada,
          preimpresoRes: '',
          esConsignacion: true,
        });
        limpiarFormulario();
        setDetalleFactura([]);
        setErrorFactura('');
        setTodosProductosCache([]);
        cargarInventario();
        return;
      }

      let numeroAutorizacion = '';
      let serieRes = '';
      let referenciaRes = referenciaCalculada;
      let preimpresoRes = '';
      let nombreDte = '';
      let hayErrorDte = false;

      // Enviar DTE al API /dtes
      try {
        const fechaDte = (() => {
          const f = formFactura.fecha || ''
          if (f.includes('-')) {
            const [y, m, d] = f.split('-')
            return `${d}/${m}/${y}`
          }
          return f
        })()

        const itemsDte = lineasDetalle.map(({ item, cantItem, descItem, precioItem, impBruto, totalConDesc, impNeto, impIva }) => ({
            producto: item.codigo || String(item.idProducto || ''),
            descripcion: item.descripcion || '',
            medida: 1,
            cantidad: cantItem,
            precio: precioItem,
            porcDesc: 0.00,
            impBruto: parseFloat(impBruto.toFixed(2)),
            impDescuento: parseFloat(descItem.toFixed(2)),
            impExento: 0.00,
            impOtros: 0.00,
            impNeto: parseFloat(impNeto.toFixed(2)),
            impIsr: 0.00,
            impIva: parseFloat(impIva.toFixed(2)),
          impTotal: parseFloat(totalConDesc.toFixed(2)),
            TipoVentaDet: 'B',
        }))

        const bodyDte = {
          tipoDoc: Number(formFactura.tipoDocumento),
          tipoVenta: 'B',
          destinoVenta: 1,
          fecha: fechaDte,
          moneda: Number(formFactura.moneda),
          tasa: formFactura.moneda === '1' ? 1.0 : 2.0,
          referencia: referenciaCalculada,
          items: itemsDte,
          receptor: {
            nitReceptor: formFactura.nit || 'CF',
            nombre: formFactura.nombre || 'Consumidor Final',
            direccion: formFactura.direccion || formFactura.direccionEntrega || 'Ciudad',
          },
          totales: {
            bruto:     parseFloat(totalesDetalle.totalBruto.toFixed(2)),
            descuento: parseFloat(totalesDetalle.cantidadDeDescuento.toFixed(2)),
            exento: 0.00,
            otros: 0.00,
            neto:      parseFloat(totalesDetalle.totalNeto.toFixed(2)),
            isr: 0.00,
            iva:       parseFloat(totalesDetalle.iva.toFixed(2)),
            total:     parseFloat(totalesDetalle.total.toFixed(2)),
          },
          datosAdicionales: {
            tipoReceptor: documento || '1',
            email: formFactura.correoElectronico || '',
            enviar: enviarCorreo ? 'S' : 'N',
          },
        }

        console.log('[DTE] Enviando a /fel/dtes:', bodyDte)
        const resDte = await fetch('/api/fel/dtes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyDte),
        })
        const rawDte = await resDte.text()
        let responseDte = null
        try { responseDte = JSON.parse(rawDte) } catch (_) { responseDte = rawDte }
        console.log('[DTE] Response completo:', responseDte)

        // La respuesta viene envuelta en { mensaje, fel: { ok, error, referencia, ... } }
        const fel = responseDte?.fel ?? responseDte

        if (fel?.ok === false) {
          const mensajeError = fel.error || 'Error desconocido al emitir el DTE'
          console.warn('[DTE] Error FEL:', mensajeError)
          hayErrorDte = true
          const msgStr = String(mensajeError)
          const esNit = msgStr.includes('NO EXISTE EL NIT') || msgStr.includes('186-NUMERO') || msgStr.includes('DOCUMENTO DE IDENTIFICACION INVALIDO')
          console.warn('[DTE] esErrorNitDteRef →', esNit, '| mensaje →', msgStr)
          esErrorNitDteRef.current = esNit
          setErrorDteModal({ visible: true, mensaje: mensajeError })
        } else {
          if (fel?.referencia) referenciaRes = fel.referencia
          if (fel?.numeroAutorizacion) numeroAutorizacion = fel.numeroAutorizacion
          if (fel?.serie) serieRes = fel.serie
          if (fel?.Preimpreso) preimpresoRes = fel.Preimpreso
          if (fel?.nombre) nombreDte = fel.nombre
          console.log('[DTE] DTE exitoso. Referencia:', referenciaRes, '| Autorización:', numeroAutorizacion, '| Serie:', serieRes, '| Preimpreso:', preimpresoRes, '| Nombre:', nombreDte)
        }
      } catch (eDte) {
        console.warn('[DTE] Error al enviar DTE:', eDte)
        hayErrorDte = true
        const msgCatch = eDte.message || 'Error al conectar con el servicio DTE'
        const esNitCatch = String(msgCatch).includes('NO EXISTE EL NIT') || String(msgCatch).includes('186-NUMERO') || String(msgCatch).includes('DOCUMENTO DE IDENTIFICACION INVALIDO')
        console.warn('[DTE] esErrorNitDteRef (catch) →', esNitCatch, '| mensaje →', msgCatch)
        esErrorNitDteRef.current = esNitCatch
        setErrorDteModal({ visible: true, mensaje: msgCatch })
      }

      if (!hayErrorDte) {
        await imprimirFactura({
          cliente: { ...formFactura, nombre: nombreDte || formFactura.nombre },
          detalle: [...detalleFactura],
          iva: totalesDetalle.iva,
          total: totalesDetalle.total,
          totalDescuento: calcularTotalDescuentoProductos(),
          numeroAutorizacion,
          serieRes,
          referenciaRes,
          preimpresoRes,
        });

        limpiarFormulario();
        setDetalleFactura([]);
        setErrorFactura('');
        setTodosProductosCache([]);
        cargarInventario();
      }
    } catch (err) {
      console.error('Error al guardar factura:', err);
      setErrorValidacionModal({ visible: true, mensaje: err.message || 'No se pudo guardar la factura.' });
    } finally {
      setGuardandoFactura(false);
    }
  };

  return (
    <>
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
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked && !formFactura.correoElectronico?.trim()) {
                        setAlertaSinCorreo(true);
                        setEnviarCorreo(false);
                        return;
                      }
                      setAlertaSinCorreo(false);
                      setEnviarCorreo(checked);
                    }}
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
              {alertaSinCorreo && (
                <CRow className="mb-2">
                  <CCol xs={12}>
                    <div className="alert alert-warning d-flex align-items-center justify-content-between mb-0" role="alert">
                      <span>El cliente no tiene un correo electrónico agregado. No se puede activar el envío de correo.</span>
                      <button type="button" className="btn-close ms-2" aria-label="Cerrar" onClick={() => setAlertaSinCorreo(false)} />
                    </div>
                  </CCol>
                </CRow>
              )}
              <CRow className="mb-3">
              <CCol md={6}>
  <div className="col-5 mb-2">
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
      {Object.entries(tiposReceptor).map(([indice, valor]) => (
        <option key={indice} value={indice}>
          {valor}
        </option>
      ))}
    </CFormSelect>
  </div>

  <div style={{ position: 'relative' }}>
    <CFormInput
      type="text"
      id="nit"
      name="nit"
      placeholder={
        !documento && !esConsumidorFinal
          ? 'Seleccione un documento primero'
          : tipoBusqueda() === 'dpi'
          ? 'Ingrese el DPI para buscar'
          : tipoBusqueda() === 'pasaporte'
          ? 'Ingrese el Pasaporte para buscar'
          : 'Ingrese el NIT para buscar cliente'
      }
      value={formFactura.nit}
      onChange={handleNitChange}
      disabled={esConsumidorFinal || clienteSeleccionado || !documento}
      autoComplete="off"
    />
  </div>
</CCol>
               
                <CCol md={6} className="mt-3">
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
                    {(cargandoClientes || (mostrarSugerenciasClientes && sugerenciasClientes.length > 0)) && (
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
                        {cargandoClientes ? (
                          <div className="list-group-item py-2 text-muted text-center">
                            <small>Buscando clientes...</small>
                          </div>
                        ) : (
                          <div className="list-group-item list-group-item-secondary py-2">
                            <small><strong>Clientes encontrados:</strong> haga clic para seleccionar</small>
                          </div>
                        )}
                        {sugerenciasClientes.map((cli) => (
                          <button
                            key={cli.idCliente ?? cli.id}
                            type="button"
                            className="list-group-item list-group-item-action text-start"
                            onClick={() => seleccionarClienteSugerencia(cli)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div>
                              <strong>{cli.nombreCliente || cli.nombreFacturacion}</strong>
                              {' - '}
                              {(tipoBusqueda() === 'dpi' || tipoBusqueda() === 'pasaporte')
                                ? (cli.documentoIdentificacion || '—')
                                : (cli.nit || '—')}
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
                <CFormLabel htmlFor="direccionEntrega">Dirección de entrega</CFormLabel>
                  <CFormTextarea
                    id="direccionEntrega"
                    name="direccionEntrega"
                    placeholder="Ingrese la dirección de entrega"
                    value={formFactura.direccionEntrega}
                    onChange={handleChange}
                    rows={2}
                    maxLength={250}
                  />
                  <div className="text-end" style={{ fontSize: '0.75rem', color: (formFactura.direccionEntrega?.length || 0) >= 250 ? '#dc3545' : '#6c757d' }}>
                    {formFactura.direccionEntrega?.length || 0}/250
                  </div>
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
                    {documentoOpts.map((d) => (
                      <option key={d.indice} value={String(d.indice)}>
                        {d.valor}
                      </option>
                    ))}
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
                  <CTableHead style={{ '--cui-table-bg': '#6c757d', '--cui-table-color': '#fff', '--cui-table-border-color': '#7d868e', backgroundColor: '#6c757d', color: '#fff' }}>
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
                              <br />
                              <small className="text-muted">Stock: {item.stock ?? 0} · Ubicación: {item.ubicacion ?? '—'}</small>
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
                    {guardandoFactura ? 'Guardando...' : (
                      formFactura.tipoDocumento === '2' ? 'Guardar Nota de Crédito' :
                      formFactura.tipoDocumento === '3' ? 'Guardar Nota de Débito' :
                      formFactura.tipoDocumento === '4' ? 'Guardar Consignación' :
                      'Guardar Factura'
                    )}
                  </CButton>
                </CCol>
              </CRow>
            </CForm>

            <CModal visible={visible} onClose={() => setVisible(false)} size="xl" backdrop="static" keyboard={false}>
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
                              const key = prod.idInventario ?? prod.idProductoInventario ?? prod.idProducto?.idProducto ?? prod.id;
                              const precio = prod.idProducto?.precioVenta ?? prod.precioVenta ?? 0;
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
                                        {formFactura.moneda === '1' ? 'Q' : '$'} {Number(precio).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                  <small className="text-muted">
                                    Stock: {prod.cantidadExistencias ?? prod.stock ?? 0}
                                    {' · '}
                                    Ubicación: {obtenerNombreUbicacion(prod.idUbicacion)}
                                  </small>
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
                    <CTableHead style={{ '--cui-table-bg': '#6c757d', '--cui-table-color': '#fff', '--cui-table-border-color': '#7d868e', backgroundColor: '#6c757d', color: '#fff' }}>
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
                                <br />
                                <small className="text-muted">Stock: {item.stock ?? 0} · Ubicación: {item.ubicacion ?? '—'}</small>
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

    {/* Modal éxito guardar cliente */}
    <CModal
      visible={clienteGuardadoModal}
      onClose={() => setClienteGuardadoModal(false)}
      alignment="center"
    >
      <CModalHeader className="bg-success text-white">
        <CModalTitle>Cliente guardado</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-0">El cliente fue guardado exitosamente y quedó seleccionado en la factura.</p>
      </CModalBody>
      <CModalFooter>
        <CButton color="success" className="text-white" onClick={() => setClienteGuardadoModal(false)}>
          Aceptar
        </CButton>
      </CModalFooter>
    </CModal>

    {/* Modal alerta cantidad inválida */}
    <CModal
      visible={alertaCantidadModal}
      onClose={() => setAlertaCantidadModal(false)}
      alignment="center"
    >
      <CModalHeader className="bg-warning text-dark">
        <CModalTitle>⚠️ Valor inválido</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-0">No se permiten valores negativos. La cantidad debe ser mayor a <strong>0</strong> y el descuento debe ser mayor o igual a <strong>0</strong>.</p>
      </CModalBody>
      <CModalFooter>
        <CButton color="warning" className="text-dark" onClick={() => setAlertaCantidadModal(false)}>
          Entendido
        </CButton>
      </CModalFooter>
    </CModal>

    {/* Modal error validación */}
    <CModal
      visible={errorValidacionModal.visible}
      onClose={() => setErrorValidacionModal({ visible: false, mensaje: '' })}
      alignment="center"
    >
      <CModalHeader className="bg-warning text-dark">
        <CModalTitle>⚠️ Atención</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-0">{errorValidacionModal.mensaje}</p>
      </CModalBody>
      <CModalFooter>
        <CButton color="warning" className="text-dark" onClick={() => setErrorValidacionModal({ visible: false, mensaje: '' })}>
          Entendido
        </CButton>
      </CModalFooter>
    </CModal>

    {/* Modal error DTE / FEL */}
    <CModal
      visible={errorDteModal.visible}
      onClose={() => {
        console.warn('[DTE] onClose | esErrorNitDteRef.current:', esErrorNitDteRef.current);
        if (!esErrorNitDteRef.current) { limpiarFormulario(); setDetalleFactura([]); }
        esErrorNitDteRef.current = false;
        setErrorDteModal({ visible: false, mensaje: '' });
      }}
      backdrop="static"
      alignment="center"
    >
      <CModalHeader className="bg-danger text-white">
        <CModalTitle>Error al emitir DTE</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {errorDteModal.mensaje}
        </p>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => {
          console.warn('[DTE] Cerrar clicked | esErrorNitDteRef.current:', esErrorNitDteRef.current);
          setErrorDteModal({ visible: false, mensaje: '' });
        }}>
          Cerrar
        </CButton>
        {!errorDteModal.mensaje?.includes('NO EXISTE EL NIT') && !errorDteModal.mensaje?.includes('2-NO EXISTE EL NIT/CUI DEL CONTRIBUYENTE') && !errorDteModal.mensaje?.includes('186-NUMERO DE DOCUMENTO DE IDENTIFICACION INVALIDO') && (
        <CButton color="success" className="text-white" onClick={async () => {
          const r2 = (n) => parseFloat(n.toFixed(2))
          const totales = detalleFactura.reduce((acc, item) => {
            const cantItem     = Number(item.cantidad) || 0
            const descItem     = r2(item.descuento || 0)
            const precioItem   = r2(item.precioUnitario || 0)
            const impBruto     = r2(cantItem * precioItem)
            const totalConDesc = r2(impBruto - descItem)
            const impNeto      = r2(totalConDesc / 1.12)
            const impIva       = r2(totalConDesc - impNeto)
            return { iva: r2(acc.iva + impIva), total: r2(acc.total + totalConDesc) }
          }, { iva: 0, total: 0 })
          setErrorDteModal({ visible: false, mensaje: '' })
          await imprimirFactura({
            cliente: { ...formFactura },
            detalle: [...detalleFactura],
            iva: totales.iva,
            total: totales.total,
            totalDescuento: calcularTotalDescuentoProductos(),
            numeroAutorizacion: '',
            serieRes: '',
            referenciaRes: referenciaParaComprobante,
            preimpresoRes: '',
            error: true,
          })
          limpiarFormulario()
          setDetalleFactura([])
          setErrorFactura('')
          setTodosProductosCache([])
          cargarInventario()
        }}>
          Generar comprobante de pago
        </CButton>
        )}
      </CModalFooter>
    </CModal>
    </>
  )
}
export default Layout
