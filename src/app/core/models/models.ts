/**
 * Modelos alineados 1:1 con los DTOs del backend (paquete pe.gob.incidencias.incidencias.dto).
 */

export type Rol = 'USER' | 'ADMIN';

export type EstadoIncidencia = 'PENDIENTE' | 'EN_REVISION' | 'EN_PROCESO' | 'RESUELTO' | 'RECHAZADO';

// ---------- Auth ----------
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegistroRequest {
  nombre: string; // max 100
  email: string; // max 120
  password: string; // 8..72
}

export interface AuthResponse {
  token: string;
  tipo: string; // "Bearer"
  expiraEnSegundos: number;
  email: string;
  rol: Rol;
}

// ---------- Distritos ----------
export interface Distrito {
  id: number;
  nombre: string;
}

export interface DistritoRequest {
  nombre: string; // max 100
}

// ---------- Incidencias ----------
export interface Incidencia {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string; // LocalDateTime ISO (sin zona)
  latitud: number;
  longitud: number;
  urlImagenEvidencia: string | null;
  estado: EstadoIncidencia;
  distritoId: number;
  distrito: string; // nombre del distrito
  usuarioEmail: string;
}

export interface IncidenciaRequest {
  titulo: string; // max 150
  descripcion: string;
  latitud: number; // -90..90
  longitud: number; // -180..180
  urlImagenEvidencia: string | null; // max 500
  distritoId: number;
}

export interface EstadoUpdateRequest {
  estado: EstadoIncidencia;
}

export interface ReporteEstado {
  estado: EstadoIncidencia;
  total: number;
}

export interface FiltrosIncidencia {
  distritoId?: number | null;
  estado?: EstadoIncidencia | null;
}

// ---------- Errores (ApiError del GlobalExceptionHandler) ----------
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  mensaje: string;
  errores: Record<string, string> | null;
}
