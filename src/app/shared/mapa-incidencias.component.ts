import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Incidencia } from '../core/models/models';
import { ESTADO_META } from '../core/utils/estado.util';
import { LIMA_CENTER, crearMapa, pinIcon, textoComoElemento } from './leaflet.util';

/** Mapa con un pin por incidencia, coloreado según su estado. Sirve para el panel admin y el detalle. */
@Component({
  selector: 'app-mapa-incidencias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="map-box" role="application" aria-label="Mapa de incidencias"></div>`,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .map-box {
      min-height: 0;
    }
  `,
})
export class MapaIncidenciasComponent implements AfterViewInit, OnDestroy {
  readonly incidencias = input.required<Incidencia[]>();
  readonly seleccionadaId = input<number | null>(null);
  /** false = mapa fijo (mini mapa del detalle): sin zoom por scroll ni arrastre. */
  readonly interactivo = input(true);
  readonly seleccionar = output<Incidencia>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private map?: L.Map;
  private capa = L.layerGroup();
  private ultimoAjuste = '';

  constructor() {
    effect(() => {
      const lista = this.incidencias();
      const activa = this.seleccionadaId();
      if (this.map) this.pintar(lista, activa);
    });
  }

  ngAfterViewInit() {
    const interactivo = this.interactivo();
    this.map = crearMapa(this.host().nativeElement, {
      dragging: interactivo,
      scrollWheelZoom: interactivo,
      doubleClickZoom: interactivo,
      touchZoom: interactivo,
      boxZoom: interactivo,
      keyboard: interactivo,
      zoomControl: interactivo,
    });
    this.capa.addTo(this.map);
    this.pintar(this.incidencias(), this.seleccionadaId());
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  private pintar(lista: Incidencia[], activaId: number | null) {
    if (!this.map) return;
    this.capa.clearLayers();

    const puntos: L.LatLngTuple[] = [];
    for (const i of lista) {
      const pos: L.LatLngTuple = [Number(i.latitud), Number(i.longitud)];
      if (Number.isNaN(pos[0]) || Number.isNaN(pos[1])) continue;
      puntos.push(pos);

      const marker = L.marker(pos, {
        icon: pinIcon(ESTADO_META[i.estado].color, i.id === activaId),
        title: i.titulo,
        riseOnHover: true,
      });
      marker.bindTooltip(textoComoElemento(`${i.titulo} · ${ESTADO_META[i.estado].label}`), { direction: 'top' });
      marker.on('click', () => this.seleccionar.emit(i));
      marker.addTo(this.capa);
    }

    // Reencuadra solo cuando cambia el conjunto de puntos (no al seleccionar uno).
    const firma = puntos.map((p) => p.join(',')).join('|');
    if (firma === this.ultimoAjuste) return;
    this.ultimoAjuste = firma;

    if (puntos.length === 0) {
      this.map.setView(LIMA_CENTER, 12);
    } else if (puntos.length === 1) {
      this.map.setView(puntos[0], 16);
    } else {
      this.map.fitBounds(L.latLngBounds(puntos), { padding: [48, 48], maxZoom: 15 });
    }
  }
}
