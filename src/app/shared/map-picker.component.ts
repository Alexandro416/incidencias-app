import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { ToastService } from '../core/services/toast.service';
import { IconComponent } from './icon.component';
import { crearMapa, pinIcon, redondear7 } from './leaflet.util';

export interface Coordenadas {
  lat: number;
  lng: number;
}

/**
 * Mapa de Lima donde el ciudadano hace clic (o arrastra el pin) para fijar la ubicación.
 * Emite las coordenadas ya redondeadas a 7 decimales (precisión de la columna en MySQL).
 */
@Component({
  selector: 'app-map-picker',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <div #host class="map-box" role="application" aria-label="Mapa de Lima: haz clic para marcar la ubicación"></div>
      <button type="button" class="btn btn-sm locate" (click)="usarMiUbicacion()" [disabled]="buscando()">
        @if (buscando()) {
          <span class="spinner"></span>
        } @else {
          <app-icon name="locate" [size]="16" />
        }
        Usar mi ubicación
      </button>
      @if (!lat()) {
        <p class="tip">Haz clic en el mapa para marcar dónde está el problema</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .wrap {
      position: relative;
      height: 100%;
      min-height: 320px;
    }
    .map-box {
      position: absolute;
      inset: 0;
      min-height: 0;
      cursor: crosshair;
    }
    .locate {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 500;
      box-shadow: var(--shadow-md);
    }
    .tip {
      position: absolute;
      left: 50%;
      bottom: 14px;
      transform: translateX(-50%);
      z-index: 500;
      background: var(--ink);
      color: #fff;
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      font-size: 0.82rem;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: var(--shadow-md);
    }
  `,
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
  readonly lat = input<number | null>(null);
  readonly lng = input<number | null>(null);
  readonly ubicacionChange = output<Coordenadas>();

  protected readonly buscando = signal(false);
  private readonly toast = inject(ToastService);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private map?: L.Map;
  private marker?: L.Marker;

  constructor() {
    // Si el formulario cambia las coordenadas (p. ej. al editar), mueve el pin.
    effect(() => {
      const la = this.lat();
      const ln = this.lng();
      if (this.map) this.colocar(la, ln, true);
    });
  }

  ngAfterViewInit() {
    this.map = crearMapa(this.host().nativeElement);
    this.map.on('click', (e: L.LeafletMouseEvent) => this.elegir(e.latlng.lat, e.latlng.lng));
    this.colocar(this.lat(), this.lng(), false);
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  usarMiUbicacion() {
    if (!('geolocation' in navigator)) {
      this.toast.warning('Tu navegador no permite obtener la ubicación.');
      return;
    }
    this.buscando.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.buscando.set(false);
        this.elegir(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        this.buscando.set(false);
        this.toast.warning('No pudimos obtener tu ubicación. Marca el punto directamente en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  private elegir(lat: number, lng: number) {
    const c = { lat: redondear7(lat), lng: redondear7(lng) };
    this.colocar(c.lat, c.lng, true);
    this.ubicacionChange.emit(c);
  }

  private colocar(lat: number | null, lng: number | null, mover: boolean) {
    if (!this.map) return;
    if (lat == null || lng == null) {
      this.marker?.remove();
      this.marker = undefined;
      return;
    }
    const pos: L.LatLngTuple = [lat, lng];
    if (!this.marker) {
      this.marker = L.marker(pos, { draggable: true, icon: pinIcon('#f26a2e', true), keyboard: false }).addTo(this.map);
      this.marker.on('dragend', () => {
        const p = this.marker!.getLatLng();
        this.elegir(p.lat, p.lng);
      });
    } else {
      this.marker.setLatLng(pos);
    }
    if (mover) {
      const bounds = this.map.getBounds();
      if (!bounds.contains(pos)) this.map.panTo(pos);
      else if (this.map.getZoom() < 14) this.map.setView(pos, 15, { animate: true });
    } else {
      this.map.setView(pos, 15);
    }
  }
}
