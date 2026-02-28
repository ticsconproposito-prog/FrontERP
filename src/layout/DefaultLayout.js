import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import { useAuth } from '../context/AuthContext'

const DefaultLayout = () => {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!usuario) {
      navigate('/login', { replace: true })
    }
  }, [usuario, navigate])

  if (!usuario) return null

  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout
