import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const AuthContext = createContext(null)

const TIMEOUT_INACTIVIDAD_MS = 30 * 60 * 1000 // 30 minutos en milisegundos
const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']

const cargarSesion = (clave, porDefecto) => {
  try {
    const valor = localStorage.getItem(clave)
    return valor ? JSON.parse(valor) : porDefecto
  } catch {
    return porDefecto
  }
}

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(() => cargarSesion('erp_usuario', null))
  const [paginasPermitidas, setPaginasPermitidas] = useState(() => cargarSesion('erp_paginas', []))
  const [tienePerfiles, setTienePerfiles] = useState(() => cargarSesion('erp_tienePerfiles', false))
  const [permisosCargados, setPermisosCargados] = useState(() => {
    return !!localStorage.getItem('erp_usuario')
  })
  const [idLogin, setIdLogin] = useState(() => cargarSesion('erp_idLogin', null))
  const [fechaLogin, setFechaLogin] = useState(() => cargarSesion('erp_fechaLogin', null))

  const timerRef = useRef(null)
  // Ref para acceder al logout actualizado dentro del event listener
  const logoutRef = useRef(null)

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async (motivo = 'manual') => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const idLoginGuardado = cargarSesion('erp_idLogin', null)

    if (idLoginGuardado) {
      try {
        // Leer idUsuario guardado directamente (no depende del nombre del campo del API)
        const idUsuario = cargarSesion('erp_idUsuario', 0)
        await fetch(`/api/editarSegLogin/${idLoginGuardado}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idLogin: idLoginGuardado, idUsuario, estadoConexion: 'Inactivo' }),
        })
       /* console.log('[Auth] Sesión marcada como Inactiva — idLogin:', idLoginGuardado, 'idUsuario:', idUsuario) */
      } catch (e) {
        console.error('[Auth] Error al cerrar sesión en el servidor:', e)
      }
    }

    if (motivo === 'inactividad') {
      console.info('[Auth] Sesión cerrada por inactividad (30 minutos)')
    }

    setUsuario(null)
    setPaginasPermitidas([])
    setTienePerfiles(false)
    setPermisosCargados(false)
    setIdLogin(null)
    setFechaLogin(null)
    localStorage.removeItem('erp_usuario')
    localStorage.removeItem('erp_idUsuario')
    localStorage.removeItem('erp_paginas')
    localStorage.removeItem('erp_tienePerfiles')
    localStorage.removeItem('erp_idLogin')
    localStorage.removeItem('erp_fechaLogin')
    localStorage.removeItem('erp_ultimaActividad')
  }, [])

  // Mantener ref sincronizada con la función logout actual
  useEffect(() => {
    logoutRef.current = logout
  }, [logout])

  // ── Temporizador de inactividad ──────────────────────────────────────────────
  const reiniciarTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    localStorage.setItem('erp_ultimaActividad', Date.now().toString())
    timerRef.current = setTimeout(() => {
      logoutRef.current?.('inactividad')
    }, TIMEOUT_INACTIVIDAD_MS)
  }, [])

  // Activar/desactivar listeners según si hay sesión
  useEffect(() => {
    if (!usuario) {
      // Sin sesión: limpiar timer y listeners
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, reiniciarTimer))
      return
    }

    // Verificar si la sesión ya expiró al recargar la página
    const ultimaActividad = parseInt(localStorage.getItem('erp_ultimaActividad') || '0', 10)
    if (ultimaActividad && Date.now() - ultimaActividad > TIMEOUT_INACTIVIDAD_MS) {
      logoutRef.current?.('inactividad')
      return
    }

    // Arrancar timer y escuchar actividad
    reiniciarTimer()
    EVENTOS_ACTIVIDAD.forEach((ev) => window.addEventListener(ev, reiniciarTimer, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, reiniciarTimer))
    }
  }, [usuario, reiniciarTimer])

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = useCallback(async (datosUsuario, idLoginActual) => {
    const ahora = new Date().toISOString()

    // Extraer y guardar idUsuario de forma explícita para usarlo en logout
    const idUsuario = Number(
      datosUsuario.idUsuario ?? datosUsuario.id_Usuario ?? datosUsuario.ID_Usuario ?? 0
    )

    setUsuario(datosUsuario)
    setIdLogin(idLoginActual)
    setFechaLogin(ahora)
    setPermisosCargados(false)
    setTienePerfiles(false)
    localStorage.setItem('erp_usuario', JSON.stringify(datosUsuario))
    localStorage.setItem('erp_idUsuario', JSON.stringify(idUsuario))
    localStorage.setItem('erp_idLogin', JSON.stringify(idLoginActual))
    localStorage.setItem('erp_fechaLogin', JSON.stringify(ahora))

    try {

      /* console.log('[Auth] Usuario logueado:', datosUsuario)
      console.log('[Auth] idUsuario:', idUsuario) */

      // 1. Perfiles asignados al usuario
      const resUsuariosPerfiles = await fetch('/api/usuariosPerfiles?size=1000')
      const todosUsuariosPerfiles = await resUsuariosPerfiles.json()
      /* console.log('[Auth] /api/usuariosPerfiles response:', todosUsuariosPerfiles) */

      const perfilesUsuario = Array.isArray(todosUsuariosPerfiles)
        ? todosUsuariosPerfiles.filter((p) => {
            const idP = Number(p.idUsuario ?? p.id_Usuario ?? p.ID_Usuario ?? -1)
            return idP === idUsuario
          })
        : []

      /* console.log('[Auth] Perfiles del usuario:', perfilesUsuario) */

      const conPerfiles = perfilesUsuario.length > 0
      setTienePerfiles(conPerfiles)
      localStorage.setItem('erp_tienePerfiles', JSON.stringify(conPerfiles))

      const idPerfiles = perfilesUsuario.map((p) => Number(p.idPerfil ?? p.id_Perfil ?? -1))
      /* console.log('[Auth] IDs de perfiles:', idPerfiles) */  

      // 2. Páginas asignadas a esos perfiles
      const resPerfilesPaginas = await fetch('/api/perfilesPaginas?size=1000')
      const todosPerfilesPaginas = await resPerfilesPaginas.json()
      /* console.log('[Auth] /api/perfilesPaginas response:', todosPerfilesPaginas) */

      const asignacionesPerfil = Array.isArray(todosPerfilesPaginas)
        ? todosPerfilesPaginas.filter((pp) => {
            const idPerfil = Number(pp.idPerfil ?? pp.id_Perfil ?? -1)
            return idPerfiles.includes(idPerfil)
          })
        : []

      const idPaginasPermitidas = asignacionesPerfil.map(
        (pp) => Number(pp.idPagina ?? pp.id_Pagina ?? -1)
      )
      /* console.log('[Auth] IDs de páginas permitidas:', idPaginasPermitidas) */

      // 3. URLs desde /api/paginas (respuesta con content:[])
      const resPaginas = await fetch('/api/paginas?size=1000')
      const respPaginas = await resPaginas.json()
      /* console.log('[Auth] /api/paginas response:', respPaginas) */

      const todasPaginas = Array.isArray(respPaginas)
        ? respPaginas
        : Array.isArray(respPaginas?.content)
          ? respPaginas.content
          : []

      const paginasFiltradas = todasPaginas.filter((pag) => {
        const idPag = Number(pag.idPagina ?? pag.id_Pagina ?? -1)
        return idPaginasPermitidas.includes(idPag)
      })

      const urls = paginasFiltradas
        .map((pag) => String(pag.URL ?? pag.url ?? pag.Url ?? '').trim())
        .filter(Boolean)

      /* console.log('[Auth] URLs permitidas finales:', urls) */

      setPaginasPermitidas(urls)
      localStorage.setItem('erp_paginas', JSON.stringify(urls))
    } catch (e) {
      console.error('[Auth] Error cargando perfiles/páginas:', e)
      setPaginasPermitidas([])
      localStorage.setItem('erp_paginas', JSON.stringify([]))
    } finally {
      setPermisosCargados(true)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        usuario,
        paginasPermitidas,
        tienePerfiles,
        permisosCargados,
        idLogin,
        fechaLogin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
