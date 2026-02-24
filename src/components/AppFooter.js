import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        
        <span className="fw-bold fs-6">Ferreteria y Blockera Agmner</span>
        <span className="ms-1">&copy; 2026</span>
      </div>
      <div className=" ms-auto">
        <span>Todos los derechos reservados</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
