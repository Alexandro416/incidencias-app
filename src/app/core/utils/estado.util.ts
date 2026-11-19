import { EstadoIncidencia, Incidencia } from '../models/models';

export interface EstadoMeta {
  label: string;
  /** Color de marca del estado (pines del mapa y gráficos). Validado para daltonismo. */
  color: string;
  descripcion: string;
}

export const ESTADO_META: Record<EstadoIncidencia, EstadoMeta> = {
  PENDIENTE: { label: 'Pendiente', color: '#eda100', descripcion: 'Recibido, todavía sin revisar.' },
  EN_REVISION: { label: 'En revisión', color: '#2a78d6', descripcion: 'Un administrador está evaluando el reporte.' },
  EN_PROCESO: { label: 'En proceso', color: '#6250d6', descripcion: 'Un equipo está trabajando en la solución.' },
  RESUELTO: { label: 'Resuelto', color: '#008300', descripcion: 'El problema ya fue solucionado.' },
  RECHAZADO: { label: 'Rechazado', color: '#e34948', descripcion: 'No procede: duplicado o fuera de competencia.' },
};

/** Orden del flujo de trabajo (selects, filtros, leyenda). */
export const ESTADOS: EstadoIncidencia[] = ['PENDIENTE', 'EN_REVISION', 'EN_PROCESO', 'RESUELTO', 'RECHAZADO'];

/**
 * Orden de los colores en gráficos: es el orden validado (separación entre vecinos para
 * daltonismo). Se usa para doughnut/barras en lugar de ESTADOS.
 */
export const ESTADOS_GRAFICO: EstadoIncidencia[] = ['PENDIENTE', 'EN_REVISION', 'RESUELTO', 'EN_PROCESO', 'RECHAZADO'];

export const labelEstado = (e: EstadoIncidencia): string => ESTADO_META[e]?.label ?? e;

/** Acepta string ISO o el formato array [y,m,d,h,mi,s] que Jackson usa si los timestamps están activos. */
export function normalizarFecha(valor: unknown): string {
  if (Array.isArray(valor)) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = valor as number[];
    const p = (n: number) => String(n).padStart(2, '0');
    return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}:${p(s)}`;
  }
  return String(valor ?? '');
}

export function normalizarIncidencia(i: Incidencia): Incidencia {
  return { ...i, fecha: normalizarFecha(i.fecha) };
}

export function tiempoRelativo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? 'hace 1 día' : `hace ${d} días`;
  const m = Math.floor(d / 30);
  return m === 1 ? 'hace 1 mes' : `hace ${m} meses`;
}
