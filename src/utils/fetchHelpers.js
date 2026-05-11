// Utilidades compartidas para optimizar peticiones HTTP y evitar
// el patrón N+1 que satura el navegador y congela la UI.

/**
 * Ejecuta una lista de tareas asíncronas con un límite máximo de
 * concurrencia. Evita disparar 500 fetch simultáneos cuando el navegador
 * solo permite ~6 conexiones HTTP/2 al mismo origen.
 *
 * @param {Array} items   - Lista de elementos a procesar.
 * @param {number} limit  - Cantidad máxima de tareas en paralelo.
 * @param {Function} task - Función async que recibe un item y devuelve una promesa.
 * @returns {Promise<Array>} Resultados en el mismo orden que `items`.
 */
export const mapConLimite = async (items, limit, task) => {
  const resultados = new Array(items.length)
  let cursor = 0

  const trabajadores = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      try {
        resultados[i] = await task(items[i], i)
      } catch (e) {
        resultados[i] = undefined
      }
    }
  })

  await Promise.all(trabajadores)
  return resultados
}

/**
 * Caché simple en memoria para evitar pedir el mismo recurso varias veces
 * dentro de la misma sesión. Útil para productos, ubicaciones, diccionarios
 * y cualquier catálogo que cambia rara vez.
 */
const _cacheMemoria = new Map()

export const fetchConCache = async (clave, fetcher, ttlMs = 60_000) => {
  const ahora = Date.now()
  const entrada = _cacheMemoria.get(clave)
  if (entrada && ahora - entrada.timestamp < ttlMs) {
    return entrada.valor
  }
  const valor = await fetcher()
  _cacheMemoria.set(clave, { valor, timestamp: ahora })
  return valor
}

export const invalidarCache = (clave) => {
  if (clave) {
    _cacheMemoria.delete(clave)
  } else {
    _cacheMemoria.clear()
  }
}

/**
 * Realiza un fetch con timeout configurable. Si el servidor no responde
 * en `timeoutMs` aborta la petición automáticamente para que la UI
 * no se quede congelada esperando indefinidamente.
 */
export const fetchConTimeout = async (url, opciones = {}, timeoutMs = 15_000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const signal = opciones.signal
    ? mergeSignals(opciones.signal, controller.signal)
    : controller.signal
  try {
    return await fetch(url, { ...opciones, signal })
  } finally {
    clearTimeout(timer)
  }
}

// Une dos AbortSignal: si cualquiera de los dos aborta, el resultado aborta.
const mergeSignals = (a, b) => {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([a, b])
  }
  const controller = new AbortController()
  const onAbortA = () => controller.abort(a.reason)
  const onAbortB = () => controller.abort(b.reason)
  if (a.aborted) controller.abort(a.reason)
  else a.addEventListener('abort', onAbortA, { once: true })
  if (b.aborted) controller.abort(b.reason)
  else b.addEventListener('abort', onAbortB, { once: true })
  return controller.signal
}
