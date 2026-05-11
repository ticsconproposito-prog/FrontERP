import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const AuthContext = createContext(null)

const TIMEOUT_INACTIVIDAD_MS = 30 * 60 * 1000 // 30 minutos en milisegundos
const THROTTLE_ACTIVIDAD_MS = 5000 // No reiniciar el timer más de 1 vez cada 5s
const FETCH_LOGOUT_TIMEOUT_MS = 8000 // Timeout máximo para el fetch de logout
// mousemove se excluye intencionalmente: dispara cientos de eventos por segundo
// y provoca congelamiento del navegador al combinarse con escrituras a localStorage.
const EVENTOS_ACTIVIDAD = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

const cargarSesion = (clave, porDefecto) => {
  try {
    const valor = localStorage.getItem(clave)
    return valor ? JSON.parse(valor) : porDefecto
  } catch {
    return porDefecto
  }
}

// Realiza un fetch con timeout para evitar que la app quede colgada
const fetchConTimeout = (url, opciones = {}, timeoutMs = FETCH_LOGOUT_TIMEOUT_MS) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...opciones, signal: controller.signal }).finally(() => clearTimeout(id))
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
  const ultimaEjecucionRef = useRef(0)
  const cerrandoSesionRef = useRef(false)
  // Ref para acceder al logout actualizado dentro del event listener
  const logoutRef = useRef(null)

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async (motivo = 'manual') => {
    // Evita que dos disparos simultáneos (timer + acción del usuario) ejecuten logout dos veces
    if (cerrandoSesionRef.current) return
    cerrandoSesionRef.current = true

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const idLoginGuardado = cargarSesion('erp_idLogin', null)

    if (idLoginGuardado) {
      try {
        // Leer idUsuario guardado directamente (no depende del nombre del campo del API)
        const idUsuario = cargarSesion('erp_idUsuario', 0)
        await fetchConTimeout(`/api/editarSegLogin/${idLoginGuardado}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idLogin: idLoginGuardado, idUsuario, estadoConexion: 'Inactivo' }),
        })
      } catch (e) {
        // No bloqueamos el logout si el backend falla o el fetch se aborta por timeout
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

    cerrandoSesionRef.current = false
  }, [])

  // Mantener ref sincronizada con la función logout actual
  useEffect(() => {
    logoutRef.current = logout
  }, [logout])

  // ── Temporizador de inactividad ──────────────────────────────────────────────
  // Throttled: máximo una ejecución cada THROTTLE_ACTIVIDAD_MS para evitar saturar
  // el hilo principal con escrituras a localStorage y reseteos de setTimeout.
  const reiniciarTimer = useCallback(() => {
    const ahora = Date.now()
    if (ahora - ultimaEjecucionRef.current < THROTTLE_ACTIVIDAD_MS) return
    ultimaEjecucionRef.current = ahora

    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      localStorage.setItem('erp_ultimaActividad', ahora.toString())
    } catch {
      // Ignorar errores de quota o modo privado
    }
    timerRef.current = setTimeout(() => {
      logoutRef.current?.('inactividad')
    }, TIMEOUT_INACTIVIDAD_MS)
  }, [])

  // Verifica si la sesión expiró comparando contra la última actividad guardada.
  // Se ejecuta cuando la pestaña vuelve a estar visible (cubre el caso donde el
  // navegador suspendió los setTimeout porque la pestaña estaba en background).
  const verificarExpiracion = useCallback(() => {
    const ultimaActividad = parseInt(localStorage.getItem('erp_ultimaActividad') || '0', 10)
    if (ultimaActividad && Date.now() - ultimaActividad > TIMEOUT_INACTIVIDAD_MS) {
      logoutRef.current?.('inactividad')
      return true
    }
    return false
  }, [])

  // Activar/desactivar listeners según si hay sesión
  useEffect(() => {
    if (!usuario) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Verificar si la sesión ya expiró al cargar / re-montar
    if (verificarExpiracion()) return

    // Forzar el primer reset (saltarse el throttle inicial)
    ultimaEjecucionRef.current = 0
    reiniciarTimer()

    EVENTOS_ACTIVIDAD.forEach((ev) =>
      window.addEventListener(ev, reiniciarTimer, { passive: true })
    )

    // Al volver a la pestaña, comprobar si expiró mientras estaba en background
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!verificarExpiracion()) {
          ultimaEjecucionRef.current = 0
          reiniciarTimer()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, reiniciarTimer))
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [usuario, reiniciarTimer, verificarExpiracion])

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
    localStorage.setItem('erp_ultimaActividad', Date.now().toString())

    try {
      // Las 3 cargas son independientes entre sí en cuanto a IO: las pedimos
      // en paralelo en lugar de secuencialmente. Esto reduce el tiempo total
      // del login de la suma de las 3 latencias a la latencia de la más lenta.
      const [resUsuariosPerfiles, resPerfilesPaginas, resPaginas] = await Promise.all([
        fetch('/api/usuariosPerfiles?size=1000'),
        fetch('/api/perfilesPaginas?size=1000'),
        fetch('/api/paginas?size=1000'),
      ])

      const [todosUsuariosPerfiles, todosPerfilesPaginas, respPaginas] = await Promise.all([
        resUsuariosPerfiles.json(),
        resPerfilesPaginas.json(),
        resPaginas.json(),
      ])

      // 1. Perfiles asignados al usuario
      const perfilesUsuario = Array.isArray(todosUsuariosPerfiles)
        ? todosUsuariosPerfiles.filter((p) => {
            const idP = Number(p.idUsuario ?? p.id_Usuario ?? p.ID_Usuario ?? -1)
            return idP === idUsuario
          })
        : []

      const conPerfiles = perfilesUsuario.length > 0
      setTienePerfiles(conPerfiles)
      localStorage.setItem('erp_tienePerfiles', JSON.stringify(conPerfiles))

      const idPerfiles = perfilesUsuario.map((p) => Number(p.idPerfil ?? p.id_Perfil ?? -1))

      // 2. Páginas asignadas a esos perfiles
      const asignacionesPerfil = Array.isArray(todosPerfilesPaginas)
        ? todosPerfilesPaginas.filter((pp) => {
            const idPerfil = Number(pp.idPerfil ?? pp.id_Perfil ?? -1)
            return idPerfiles.includes(idPerfil)
          })
        : []

      const idPaginasPermitidas = asignacionesPerfil.map(
        (pp) => Number(pp.idPagina ?? pp.id_Pagina ?? -1)
      )

      // 3. URLs desde /api/paginas (respuesta con content:[])
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
