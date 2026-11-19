import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, input, output } from '@angular/core';
import { Incidencia } from '../core/models/models';
import { tiempoRelativo } from '../core/utils/estado.util';
import { EstadoBadgeComponent } from './estado-badge.component';
import { EvidenciaComponent } from './evidencia.component';
import { IconComponent } from './icon.component';
import { MapaIncidenciasComponent } from './mapa-incidencias.component';

/** Modal de detalle (compartido por ciudadano y admin). Las acciones se proyectan con <ng-content>. */
@Component({
  selector: 'app-incidencia-detalle',
  imports: [DatePipe, EstadoBadgeComponent, EvidenciaComponent, IconComponent, MapaIncidenciasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="cerrar.emit()">
      <article
        class="modal modal-lg detalle"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-titulo"
        (click)="$event.stopPropagation()"
      >
        <div class="media">
          <app-evidencia [url]="incidencia().urlImagenEvidencia" [alt]="incidencia().titulo" />
          <div class="mini-map">
            <app-mapa-incidencias [incidencias]="lista()" [interactivo]="false" />
          </div>
          <a class="btn btn-sm btn-block" [href]="enlaceMapa()" target="_blank" rel="noopener">
            <app-icon name="external" [size]="15" /> Abrir en Google Maps
          </a>
        </div>

        <div class="body">
          <header>
            <app-estado-badge [estado]="incidencia().estado" />
            <button type="button" class="btn btn-ghost btn-icon" aria-label="Cerrar detalle" (click)="cerrar.emit()">
              <app-icon name="x" [size]="20" />
            </button>
          </header>

          <h2 id="detalle-titulo">{{ incidencia().titulo }}</h2>

          <dl class="meta">
            <div>
              <dt><app-icon name="building" [size]="15" /> Distrito</dt>
              <dd>{{ incidencia().distrito }}</dd>
            </div>
            <div>
              <dt><app-icon name="calendar" [size]="15" /> Reportado</dt>
              <dd>{{ incidencia().fecha | date: "d 'de' MMMM y, HH:mm" }} ({{ relativo() }})</dd>
            </div>
            <div>
              <dt><app-icon name="user" [size]="15" /> Reportado por</dt>
              <dd class="truncate">{{ incidencia().usuarioEmail }}</dd>
            </div>
            <div>
              <dt><app-icon name="map-pin" [size]="15" /> Coordenadas</dt>
              <dd>{{ incidencia().latitud }}, {{ incidencia().longitud }}</dd>
            </div>
          </dl>

          <h3>Descripción</h3>
          <p class="desc">{{ incidencia().descripcion }}</p>

          <footer class="acciones">
            <ng-content />
          </footer>
        </div>
      </article>
    </div>
  `,
  styles: `
    .detalle {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
    }
    .media {
      display: grid;
      align-content: start;
      gap: 0.7rem;
      padding: 1.1rem;
      background: #f3f7f5;
    }
    .media app-evidencia {
      border-radius: 14px;
      overflow: hidden;
    }
    .mini-map {
      height: 190px;
      border-radius: 14px;
      overflow: hidden;
    }
    .body {
      padding: 1.25rem 1.5rem 1.5rem;
      display: grid;
      align-content: start;
      gap: 0.9rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta {
      display: grid;
      gap: 0.55rem;
      margin: 0;
    }
    .meta div {
      display: grid;
      grid-template-columns: 9.5rem 1fr;
      gap: 0.5rem;
      align-items: baseline;
    }
    dt {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--ink-2);
      font-size: 0.85rem;
    }
    dd {
      margin: 0;
      font-weight: 500;
      font-size: 0.92rem;
      min-width: 0;
    }
    .desc {
      white-space: pre-line;
      color: var(--ink-2);
      max-width: 62ch;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      padding-top: 0.6rem;
      margin-top: 0.3rem;
      border-top: 1px solid var(--line);
    }
    .acciones:empty {
      display: none;
    }
    @media (max-width: 760px) {
      .detalle {
        grid-template-columns: 1fr;
      }
      .meta div {
        grid-template-columns: 1fr;
        gap: 0;
      }
    }
  `,
})
export class IncidenciaDetalleComponent {
  readonly incidencia = input.required<Incidencia>();
  readonly cerrar = output<void>();

  protected readonly lista = computed(() => [this.incidencia()]);
  protected readonly relativo = computed(() => tiempoRelativo(this.incidencia().fecha));
  protected readonly enlaceMapa = computed(
    () => `https://www.google.com/maps?q=${this.incidencia().latitud},${this.incidencia().longitud}`,
  );

  @HostListener('document:keydown.escape')
  protected onEscape() {
    this.cerrar.emit();
  }
}
