import * as L from 'leaflet';

/** Centro de Lima (Plaza Mayor) y límites aproximados de Lima Metropolitana + Callao. */
export const LIMA_CENTER: L.LatLngTuple = [-12.0464, -77.0428];
export const LIMA_BOUNDS: L.LatLngBoundsExpression = [
  [-12.6, -77.4],
  [-11.6, -76.6],
];

/** Crea un mapa de Leaflet base (OpenStreetMap) que se ajusta solo cuando cambia el tamaño del contenedor. */
export function crearMapa(el: HTMLElement, opts: L.MapOptions = {}): L.Map {
  const map = L.map(el, {
    center: LIMA_CENTER,
    zoom: 12,
    minZoom: 10,
    maxBounds: LIMA_BOUNDS,
    maxBoundsViscosity: 0.85,
    ...opts,
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const ro = new ResizeObserver(() => map.invalidateSize());
  ro.observe(el);
  map.on('unload', () => ro.disconnect());
  return map;
}

/** Pin en forma de gota, coloreado por estado. No necesita imágenes externas. */
export function pinIcon(color: string, activo = false): L.DivIcon {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="pin${activo ? ' pin-active' : ''}" style="--pin:${color}"></span>`,
    iconSize: [30, 36],
    iconAnchor: [15, 34],
    tooltipAnchor: [14, -22],
  });
}

/** Texto plano como elemento DOM: evita inyectar HTML de usuario en tooltips/popups. */
export function textoComoElemento(texto: string): HTMLElement {
  const span = document.createElement('span');
  span.textContent = texto;
  return span;
}

export const redondear7 = (n: number) => Number(n.toFixed(7));
