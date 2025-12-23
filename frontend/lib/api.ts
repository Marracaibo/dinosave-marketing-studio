// API configuration - usa backend URL diretto in produzione
export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || ''

export const apiUrl = (path: string) => {
  // In produzione, usa l'URL completo del backend
  // In sviluppo locale, usa i rewrites (path relativo)
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`
  }
  return path
}
