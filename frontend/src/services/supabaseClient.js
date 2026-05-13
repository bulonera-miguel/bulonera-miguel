// ============================================================
// supabaseClient.js — Cliente de Supabase para autenticación
// Importar desde acá en todos los componentes que necesiten auth
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
// Las variables de entorno se definen en el archivo .env de la raíz
// del frontend. NUNCA hardcodear las keys acá.

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
