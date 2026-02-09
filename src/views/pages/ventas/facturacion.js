import React, { useState } from 'react'
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
} from '@coreui/react'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CIcon from '@coreui/icons-react';
import { cilPlus } from '@coreui/icons';

const Layout = () => {
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [visible, setVisible] = useState(false);
  const [fechaIngreso, setFechaIngreso] = useState(null);
  
  // Estados para los filtros
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setCodigo('');
    setDescripcion('');
    setFechaInicio(null);
    setFechaFin(null);
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardBody>
            <CForm>
              <CCardHeader>
                <strong className="fs-4">Facturación</strong>
              </CCardHeader>

              <CRow className="mt-4" >
                <CCol md={4} className="d-flex align-items-center">
                  <CFormLabel className="me-2" htmlFor="inputCodigo">Código: </CFormLabel>
                  <CFormInput 
                    type="text" 
                    id="inputCodigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                  />
                </CCol>

                <CCol md={8} className="d-flex align-items-center gap-2">
                  <CFormLabel htmlFor="inputFechaInicio">Fecha Inicio: </CFormLabel>
                  <DatePicker
                    selected={fechaInicio}
                    onChange={(date) => setFechaInicio(date)}
                    className="form-control"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccione fecha"
                  />

                  <CFormLabel htmlFor="inputFechaFin">Fecha Fin: </CFormLabel>
                  <DatePicker
                    selected={fechaFin}
                    onChange={(date) => setFechaFin(date)}
                    className="form-control"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccione fecha"
                  />
                </CCol>

              </CRow>

              <CRow className="mt-4" >
                <CCol md={6} className="d-flex align-items-center">
                  <CFormLabel className="me-2" htmlFor="inputDescripcion">Descripción: </CFormLabel>
                  <CFormInput 
                    type="text" 
                    id="inputDescripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </CCol>

                <CCol md={4} className="d-flex gap-2">
                  <CButton color="info" className="text-light" type="submit">Consultar</CButton>
                  <CButton color="secondary" onClick={limpiarFiltros}>Limpiar Filtros</CButton>
                </CCol>
              </CRow>
              <CRow className="mt-3">

                <CCol className="d-flex justify-content-end gap-4" >
                  <CButton color="success" className="text-light" onClick={() => setVisible(true)}>Agregar</CButton>
                  <CButton color="info" className="text-light" type="submit">Exportar</CButton>
                </CCol>
              </CRow>
            </CForm>

            <CModal visible={visible} onClose={() => setVisible(false)} size="lg">
              <CModalHeader>
                <CModalTitle>Agregar Productos</CModalTitle>
              </CModalHeader>
              <CModalBody>
                <CForm>

                  <CRow className="mb-3">
                    <CCol xs={12} md={6}>
                      <CFormLabel htmlFor="AgregarCodigo">Código</CFormLabel>
                      <CFormInput id="AgregarCodigo" />
                    </CCol>

                      <CCol className="d-flex justify-content-end">
                       <div className="mt-auto">
                      <CButton className="text-dark" color="warning">
                        Carga Masiva
                      </CButton>
                      </div>
                    </CCol>

                  </CRow>
                  <CRow className="mb-3">
                    <CCol xs={12} md={6}>
                      <CFormLabel htmlFor="AgregarDescripcion">Descripción</CFormLabel>
                      <CFormInput id="AgregarDescripcion" />
                    </CCol>
                  </CRow>

                  <CRow className="mb-3">
                    <CCol xs={12} md={6}>
                      <CFormLabel htmlFor="PrecioCompra">Precio de Compra</CFormLabel>
                      <CFormInput id="PrecioCompra" />
                    </CCol>
                  </CRow>

                  <CRow className="mb-3">
                    <CCol xs={12} md={6}>

                      <CFormLabel htmlFor="Proveedor">Proveedor</CFormLabel>
                
                      <CFormSelect>
                        <option value="">Seleccione una opción</option>
                        <option value="1">Opción 1</option>
                        <option value="2">Opción 2</option>
                        <option value="3">Opción 3</option>
                      </CFormSelect>
                    </CCol>

                    <CCol className="d-flex flex-column">
                       <div className="mt-auto">
                      <CButton className="text-light" color="success">
                        <CIcon icon={cilPlus} />
                        Agregar
                      </CButton>
                      </div>
                    </CCol>
                  </CRow>

                  <CRow className="mb-3">
                    <CCol xs={12} md={6}>
                      <CFormLabel htmlFor="CantidadProducto">Cantidad de Producto</CFormLabel>
                      <CFormInput id="CantidadProducto" />
                    </CCol>
                  </CRow>

                  <CRow className="mb-3">
                    <CCol xs={12} md={6}>
                      <CFormLabel htmlFor="UnidadMedida">Unidad de Medida</CFormLabel>
                      <CFormSelect>
                        <option value="">Seleccione una opción</option>
                        <option value="1">Opción 1</option>
                        <option value="2">Opción 2</option>
                        <option value="3">Opción 3</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>

                  <CRow className="mb-4">
                    <CCol xs={12} md={6}>
                      <CFormLabel htmlFor="TipoIngreso">Tipo de Ingreso</CFormLabel>
                      <CFormSelect>
                        <option value="">Seleccione una opción</option>
                        <option value="1">Opción 1</option>
                        <option value="2">Opción 2</option>
                        <option value="3">Opción 3</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>


                  <CRow className="mb-4">
                    <CCol xs={12} md={6}>
                      <CFormLabel htmlFor="Ubicacion">Ubicación</CFormLabel>
                      <CFormSelect>
                        <option value="">Seleccione una opción</option>
                        <option value="1">Opción 1</option>
                        <option value="2">Opción 2</option>
                        <option value="3">Opción 3</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>

                  <CRow className="mb-4">
                    <CCol xs={12} md={6} className="d-flex align-items-center gap-2">
                      <CFormLabel htmlFor="inputFechaIngreso">Fecha de Ingreso:</CFormLabel>
                      <DatePicker
                        selected={fechaIngreso}
                        onChange={(date) => setFechaIngreso(date)}
                        className="form-control"
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Seleccione fecha"
                      />
                    </CCol>
                  </CRow>

                </CForm>
              </CModalBody>


              <CModalFooter>
                <CButton className="text-light" color="danger" onClick={() => setVisible(false)}>
                  Cerrar
                </CButton>
                <CButton className="text-light" color="info">
                  Guardar
                </CButton>
              </CModalFooter>
            </CModal>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}
export default Layout
