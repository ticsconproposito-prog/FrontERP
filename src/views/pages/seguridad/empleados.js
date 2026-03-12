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
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

const FORM_INICIAL = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  direccionResidencia: '',
  fechaNacimiento: '',
  fechaIngresoLaboral: '',
  idUsuarioModificacion: 0,
}

const Empleados = () => {
  const { usuario } = useAuth()
  const idUsuarioActual = Number(usuario?.idUsuario ?? usuario?.id_Usuario ?? 0)
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEmpleadoEditar, setIdEmpleadoEditar] = useState(null)

  const [visibleModal, setVisibleModal] = useState(false)
  const [modalExito, setModalExito] = useState(false)
  const [modalError, setModalError] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  const [modalEliminar, setModalEliminar] = useState(false)
  const [idEliminar, setIdEliminar] = useState(null)
  const [modalVer, setModalVer] = useState(false)
  const [empleadoVer, setEmpleadoVer] = useState(null)

  // Búsqueda en tabla
  const [busqueda, setBusqueda] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const rEmp = await fetch('/api/empleados?size=1000')
      const dataEmp = await rEmp.json()
      setEmpleados(Array.isArray(dataEmp) ? dataEmp : (dataEmp?.content || []))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrores((prev) => ({ ...prev, [name]: '' }))
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return '—'
    const str = String(fecha).substring(0, 10)
    const [yyyy, mm, dd] = str.split('-')
    if (!yyyy || !mm || !dd) return str
    return `${dd}-${mm}-${yyyy}`
  }

  const validar = () => {
    const nuevosErrores = {}
    if (!String(form.nombre || '').trim()) nuevosErrores.nombre = 'El nombre es requerido'
    if (!String(form.apellido || '').trim()) nuevosErrores.apellido = 'El apellido es requerido'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      nuevosErrores.email = 'El email no tiene un formato válido'
    if (!form.fechaIngresoLaboral) nuevosErrores.fechaIngresoLaboral = 'La fecha de ingreso es requerida'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const abrirModalNuevo = () => {
    setForm(FORM_INICIAL)
    setErrores({})
    setModoEdicion(false)
    setIdEmpleadoEditar(null)
    setVisibleModal(true)
  }

  const abrirModalEditar = (emp) => {
    setForm({
      nombre: emp.nombre || '',
      apellido: emp.apellido || '',
      email: emp.email || '',
      telefono: emp.telefono || '',
      direccionResidencia: emp.direccionResidencia || '',
      fechaNacimiento: (emp.fechaNacimiento || '').toString().substring(0, 10),
      fechaIngresoLaboral: (emp.fechaIngresoLaboral || '').toString().substring(0, 10),
      idUsuarioModificacion: idUsuarioActual,
    })
    setErrores({})
    setModoEdicion(true)
    setIdEmpleadoEditar(emp.idEmpleado)
    setVisibleModal(true)
  }

  const guardarEmpleado = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const body = {
        nombre: String(form.nombre || '').trim(),
        apellido: String(form.apellido || '').trim(),
        email: String(form.email || '').trim(),
        telefono: String(form.telefono || '').trim(),
        idCargo: 0,
        idUbicacion: 0,
        direccionResidencia: String(form.direccionResidencia || '').trim(),
        fechaNacimiento: form.fechaNacimiento,
        fechaIngresoLaboral: form.fechaIngresoLaboral,
        idUsuarioModificacion: idUsuarioActual,
      }

      let url = '/api/grabarEmpleado'
      let method = 'POST'
      if (modoEdicion && idEmpleadoEditar) {
        url = `/api/editarEmpleado/${idEmpleadoEditar}`
        method = 'PUT'
        body.idEmpleado = idEmpleadoEditar
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const txt = await res.text()
        let msg = `Error ${res.status}`
        try { msg = JSON.parse(txt)?.message || txt } catch { msg = txt }
        throw new Error(msg)
      }

      setVisibleModal(false)
      setMensajeExito(modoEdicion ? 'Empleado actualizado correctamente.' : 'Empleado guardado correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setMensajeError(err.message || 'Error al guardar el empleado')
      setModalError(true)
    } finally {
      setGuardando(false)
    }
  }

  const verEmpleado = (emp) => {
    setEmpleadoVer(emp)
    setModalVer(true)
  }

  const confirmarEliminar = (id) => {
    setIdEliminar(id)
    setModalEliminar(true)
  }

  const eliminarEmpleado = async () => {
    try {
      const res = await fetch(`/api/eliminarEmpleado/${idEliminar}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuarioModificacion: idUsuarioActual }),
      })
      if (!res.ok) throw new Error('Error al eliminar el empleado')
      setModalEliminar(false)
      setMensajeExito('Empleado eliminado correctamente.')
      setModalExito(true)
      await cargarDatos()
    } catch (err) {
      setModalEliminar(false)
      setMensajeError(err.message || 'Error al eliminar')
      setModalError(true)
    }
  }

  const empleadosFiltrados = empleados.filter((emp) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      (emp.nombre || '').toLowerCase().includes(q) ||
      (emp.apellido || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q) ||
      (emp.telefono || '').toString().includes(q)
    )
  })

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-3">Cargando empleados...</p>
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
              <strong className="fs-4">Gestión de Empleados</strong>
              <CButton color="primary" className="text-light" onClick={abrirModalNuevo}>
                + Nuevo Empleado
              </CButton>
            </CCardHeader>
            <CCardBody>
              {/* Búsqueda */}
              <CRow className="mb-3">
                <CCol md={4}>
                  <CFormInput
                    placeholder="Buscar por nombre, apellido, email o teléfono..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </CCol>
              </CRow>

              {/* Tabla */}
              <CTable bordered hover responsive striped>
                <CTableHead className="table-primary">
                  <CTableRow>
                    <CTableHeaderCell className="py-2">No.</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Nombre</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Apellido</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Email</CTableHeaderCell>
                    <CTableHeaderCell className="py-2">Teléfono</CTableHeaderCell>
                  <CTableHeaderCell className="py-2">Fecha Ingreso</CTableHeaderCell>
                    <CTableHeaderCell className="py-2 text-center">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {empleadosFiltrados.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center py-4 text-muted">
                        No hay empleados registrados.
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    empleadosFiltrados.map((emp, idx) => (
                      <CTableRow key={emp.idEmpleado || idx}>
                        <CTableDataCell>{idx + 1}</CTableDataCell>
                        <CTableDataCell>{emp.nombre}</CTableDataCell>
                        <CTableDataCell>{emp.apellido}</CTableDataCell>
                        <CTableDataCell>{emp.email || '—'}</CTableDataCell>
                        <CTableDataCell>{emp.telefono || '—'}</CTableDataCell>
                        <CTableDataCell>{formatearFecha(emp.fechaIngresoLaboral)}</CTableDataCell>
                        <CTableDataCell className="text-center text-nowrap">
                          <CButton
                            color="info"
                            size="sm"
                            className="text-white me-2"
                            onClick={() => verEmpleado(emp)}
                            title="Ver detalle"
                          >
                            👁️
                          </CButton>
                          <CButton
                            color="warning"
                            size="sm"
                            className="text-dark me-2"
                            onClick={() => abrirModalEditar(emp)}
                            title="Editar"
                          >
                            ✏️
                          </CButton>
                          <CButton
                            color="danger"
                            size="sm"
                            className="text-white"
                            onClick={() => confirmarEliminar(emp.idEmpleado)}
                            title="Eliminar"
                          >
                            🗑️
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Modal Formulario */}
      <CModal visible={visibleModal} onClose={() => setVisibleModal(false)} size="lg" backdrop="static" keyboard={false}>
        <CModalHeader className="bg-primary text-white">
          <CModalTitle>{modoEdicion ? '✏️ Editar Empleado' : '➕ Nuevo Empleado'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <CForm>
            <CRow className="g-3">
              {/* Nombre */}
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Nombre <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ingrese el nombre"
                  className={errores.nombre ? 'is-invalid' : ''}
                />
                {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
              </CCol>

              {/* Apellido */}
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Apellido <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  name="apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  placeholder="Ingrese el apellido"
                  className={errores.apellido ? 'is-invalid' : ''}
                />
                {errores.apellido && <div className="invalid-feedback">{errores.apellido}</div>}
              </CCol>

              {/* Email */}
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Email</CFormLabel>
                <CFormInput
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  className={errores.email ? 'is-invalid' : ''}
                />
                {errores.email && <div className="invalid-feedback">{errores.email}</div>}
              </CCol>

              {/* Teléfono */}
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Teléfono</CFormLabel>
                <CFormInput
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="Ej: 5555-1234"
                />
              </CCol>

              {/* Dirección de residencia */}
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Dirección de Residencia</CFormLabel>
                <CFormInput
                  name="direccionResidencia"
                  value={form.direccionResidencia}
                  onChange={handleChange}
                  placeholder="Ingrese la dirección de residencia"
                />
              </CCol>

              {/* Fecha de nacimiento */}
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Fecha de Nacimiento</CFormLabel>
                <CFormInput
                  type="date"
                  name="fechaNacimiento"
                  value={form.fechaNacimiento}
                  onChange={handleChange}
                />
              </CCol>

              {/* Fecha de ingreso laboral */}
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Fecha de Ingreso Laboral <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  type="date"
                  name="fechaIngresoLaboral"
                  value={form.fechaIngresoLaboral}
                  onChange={handleChange}
                  className={errores.fechaIngresoLaboral ? 'is-invalid' : ''}
                />
                {errores.fechaIngresoLaboral && <div className="invalid-feedback">{errores.fechaIngresoLaboral}</div>}
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton color="light" className="border" onClick={() => setVisibleModal(false)} disabled={guardando}>
            Cancelar
          </CButton>
          <CButton color="primary" className="text-light" onClick={guardarEmpleado} disabled={guardando}>
            {guardando ? <><CSpinner size="sm" className="me-2" />Guardando...</> : (modoEdicion ? 'Guardar Cambios' : 'Guardar Empleado')}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Ver Empleado */}
      <CModal visible={modalVer} onClose={() => setModalVer(false)} size="lg">
        <CModalHeader className="bg-info text-white">
          <CModalTitle>👁️ Detalle del Empleado</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          {empleadoVer && (
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Nombre</CFormLabel>
                <p className="mb-0 fs-6">{empleadoVer.nombre || '—'}</p>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Apellido</CFormLabel>
                <p className="mb-0 fs-6">{empleadoVer.apellido || '—'}</p>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Email</CFormLabel>
                <p className="mb-0 fs-6">{empleadoVer.email || '—'}</p>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Teléfono</CFormLabel>
                <p className="mb-0 fs-6">{empleadoVer.telefono || '—'}</p>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-semibold text-muted small">Dirección de Residencia</CFormLabel>
                <p className="mb-0 fs-6">{empleadoVer.direccionResidencia || '—'}</p>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Fecha de Nacimiento</CFormLabel>
                <p className="mb-0 fs-6">{formatearFecha(empleadoVer.fechaNacimiento)}</p>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold text-muted small">Fecha de Ingreso Laboral</CFormLabel>
                <p className="mb-0 fs-6">{formatearFecha(empleadoVer.fechaIngresoLaboral)}</p>
              </CCol>
            </CRow>
          )}
        </CModalBody>
        <CModalFooter className="bg-light">
          <CButton color="secondary" onClick={() => setModalVer(false)}>Cerrar</CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Confirmar Eliminar */}
      <CModal visible={modalEliminar} onClose={() => setModalEliminar(false)}>
        <CModalHeader className="bg-danger text-white">
          <CModalTitle>Confirmar Eliminación</CModalTitle>
        </CModalHeader>
        <CModalBody>¿Está seguro que desea eliminar este empleado? Esta acción no se puede deshacer.</CModalBody>
        <CModalFooter>
          <CButton color="light" className="border" onClick={() => setModalEliminar(false)}>Cancelar</CButton>
          <CButton color="danger" className="text-white" onClick={eliminarEmpleado}>Eliminar</CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Éxito */}
      <CModal visible={modalExito} onClose={() => setModalExito(false)}>
        <CModalHeader className="bg-success text-white">
          <CModalTitle>✔ Éxito</CModalTitle>
        </CModalHeader>
        <CModalBody>{mensajeExito}</CModalBody>
        <CModalFooter>
          <CButton color="success" className="text-white" onClick={() => setModalExito(false)}>Aceptar</CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Error */}
      <CModal visible={modalError} onClose={() => setModalError(false)}>
        <CModalHeader className="bg-danger text-white">
          <CModalTitle>Error</CModalTitle>
        </CModalHeader>
        <CModalBody>{mensajeError}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModalError(false)}>Cerrar</CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default Empleados
