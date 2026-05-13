// ============================================================
// AuthContext.jsx — Contexto global de autenticación
// Provee: usuario, rol, cargando, login, logout
// Todos los componentes pueden consumir este contexto
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {

  const [usuario, setUsuario]   = useState(null)
  // usuario: objeto con datos del usuario logueado (email, id, etc.)
  const [perfil, setPerfil]     = useState(null)
  // perfil: datos adicionales de la tabla usuarios (nombre, rol)
  const [cargando, setCargando] = useState(true)
  // cargando: true mientras verificamos si hay sesión activa

  // ── CARGAR SESIÓN AL MONTAR ──────────────────────────────
  useEffect(() => {
    // Verificamos si hay una sesión activa al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id)
      else setCargando(false)
    })

    // Escuchamos cambios de sesión (login, logout, expiración)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUsuario(session?.user ?? null)
        if (session?.user) cargarPerfil(session.user.id)
        else {
          setPerfil(null)
          setCargando(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ── CARGAR PERFIL DESDE TABLA USUARIOS ──────────────────
  const cargarPerfil = async (userId) => {
    try {
      const { data } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, activo')
        .eq('id', userId)
        .single()
      setPerfil(data)
    } catch (e) {
      console.error('Error al cargar perfil:', e)
    } finally {
      setCargando(false)
    }
  }

  // ── LOGIN ────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    })
    if (error) throw new Error(error.message)
    return data
  }

  // ── LOGOUT ───────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut()
    setUsuario(null)
    setPerfil(null)
  }

  const esAdmin = perfil?.rol === 'admin'
  // esAdmin: true si el usuario tiene rol admin
  // Usado para mostrar/ocultar el panel de usuarios

  return (
    <AuthContext.Provider value={{
      usuario,
      perfil,
      cargando,
      esAdmin,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook para consumir el contexto fácilmente
export const useAuth = () => useContext(AuthContext)
