import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoIncidencia, Incidencia } from '../../core/models/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { IncidenciaService } from '../../core/services/incidencia.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiException } from '../../core/utils/error.util';
import { ESTADOS, ESTADO_META, tiempoRelativo } from '../../core/utils/estado.util';
import { EstadoBadgeComponent } from '../../shared/estado-badge.component';
import { EvidenciaComponent } from '../../shared/evidencia.component';
import { IconComponent } from '../../shared/icon.component';
import { IncidenciaDetalleComponent } from '../../shared/incidencia-detalle.component';

@Component({
  selector: 'app-mis-incidencias',
  imports: [
    DatePipe,
    RouterLink,
    EstadoBadgeComponent,
    EvidenciaComponent,
    IconComponent,
    IncidenciaDetalleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1 style="font-size: 2rem">Mis incidencias</h1>
        <p>Aquí ves el estado de cada problema que reportaste.</p>
      </div>
      <a class="btn btn-signal" routerLink="/ciudadano/nueva"><app-icon name="plus" [size]="18" /> Reportar incidencia</a>
    </div>

    @if (cargando()) {
      <div class="grid">
        @for (n of [1, 2, 3]; track n) {
          <div class="skeleton" style="height: 330px"></div>
        }
      </div>
    } @else if (error()) {
      <div class="card empty">
        <div class="empty-ico" style="background: var(--danger-soft); color: var(--danger)">
          <app-icon name="alert" [size]="28" />
        </div>
        <h3>No pudimos cargar tus incidencias</h3>
        <p>{{ error() }}</p>
        <button type="button" class="btn btn-primary" (click)="cargar()"><app-icon name="refresh" [size]="16" /> Reintentar</button>
      </div>
    } @else if (incidencias().length === 0) {
      <div class="card empty">
        <div class="empty-ico"><app-icon name="inbox" [size]="28" /></div>
        <h3>Todavía no has reportado nada</h3>
        <p>Cuando veas un problema en tu distrito, márcalo en el mapa y nosotros lo hacemos llegar a los administradores.</p>
        <a class="btn btn-signal" routerLink="/ciudadano/nueva"><app-icon name="plus" [size]="18" /> Reportar mi primera incidencia</a>
      </div>
    } @else {
      <div class="chips" role="group" aria-label="Filtrar por estado">
        <button type="button" class="chip" [class.on]="filtro() === null" [attr.aria-pressed]="filtro() === null" (click)="filtro.set(null)">
          Todas <b>{{ incidencias().length }}</b>
        </button>
        @for (c of conteos(); track c.estado) {
          @if (c.total > 0) {
            <button
              type="button"
              class="chip"
              [class]="'chip estado-' + c.estado"
              [class.on]="filtro() === c.estado"
              [attr.aria-pressed]="filtro() === c.estado"
              (click)="filtro.set(filtro() === c.estado ? null : c.estado)"
            >
              <i></i>{{ meta[c.estado].label }} <b>{{ c.total }}</b>
            </button>
          }
        }
      </div>

      <div class="grid">
        @for (i of visibles(); track i.id) {
          <article class="card inc">
            <app-evidencia [url]="i.urlImagenEvidencia" [alt]="i.titulo" [zoomable]="false" style="--ratio: 16 / 9" />
            <div class="inc-body">
              <div class="row">
                <app-estado-badge [estado]="i.estado" />
                <span class="spacer"></span>
                <span class="muted small" [title]="(i.fecha | date: 'medium') ?? ''">{{ relativo(i.fecha) }}</span>
              </div>
              <h3 class="clamp-2">{{ i.titulo }}</h3>
              <p class="muted small row" style="gap: 0.35rem">
                <app-icon name="building" [size]="14" /> {{ i.distrito }}
              </p>
              <p class="clamp-2 desc">{{ i.descripcion }}</p>
            </div>
            <div class="inc-foot">
              <button type="button" class="btn btn-sm" (click)="detalle.set(i)"><app-icon name="eye" [size]="15" /> Ver detalle</button>
              <span class="spacer"></span>
              @if (i.estado === 'PENDIENTE') {
                <button type="button" class="btn btn-sm btn-icon" aria-label="Editar incidencia" title="Editar" (click)="editar(i)">
                  <app-icon name="edit" [size]="16" />
                </button>
                <button type="button" class="btn btn-sm btn-icon" aria-label="Eliminar incidencia" title="Eliminar" (click)="eliminar(i)">
                  <app-icon name="trash" [size]="16" />
                </button>
              } @else {
                <span class="muted small lock" title="Solo se puede editar o eliminar mientras esté pendiente">
                  <app-icon name="lock" [size]="14" /> Bloqueada
                </span>
              }
            </div>
          </article>
        } @empty {
          <p class="muted">No tienes incidencias con ese estado.</p>
        }
      </div>
    }

    @if (detalle(); as d) {
      <app-incidencia-detalle [incidencia]="d" (cerrar)="detalle.set(null)">
        @if (d.estado === 'PENDIENTE') {
          <button type="button" class="btn btn-primary" (click)="editar(d)"><app-icon name="edit" [size]="16" /> Editar</button>
          <button type="button" class="btn" (click)="eliminar(d)"><app-icon name="trash" [size]="16" /> Eliminar</button>
        } @else {
          <p class="muted small row"><app-icon name="lock" [size]="14" /> Ya no se puede modificar porque está {{ meta[d.estado].label.toLowerCase() }}.</p>
        }
      </app-incidencia-detalle>
    }
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.25rem;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.85rem;
      border-radius: 999px;
      border: 1px solid var(--line-strong);
      background: var(--surface);
      color: var(--ink);
      font: 500 0.86rem var(--font-body);
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .chip i {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--e);
    }
    .chip:hover {
      border-color: var(--ink-3);
    }
    .chip.on {
      background: var(--ink);
      border-color: var(--ink);
      color: #fff;
    }
    .inc {
      display: grid;
      grid-template-rows: auto 1fr auto;
      overflow: hidden;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .inc:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    .inc app-evidencia {
      border-radius: 0;
    }
    .inc-body {
      display: grid;
      gap: 0.5rem;
      align-content: start;
      padding: 1rem 1.1rem 0.4rem;
    }
    .desc {
      color: var(--ink-2);
      font-size: 0.9rem;
    }
    .inc-foot {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.8rem 1.1rem 1rem;
    }
    .lock {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
  `,
})
export class MisIncidenciasComponent implements OnInit {
  private readonly svc = inject(IncidenciaService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly meta = ESTADO_META;
  protected readonly incidencias = signal<Incidencia[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal<EstadoIncidencia | null>(null);
  protected readonly detalle = signal<Incidencia | null>(null);

  protected readonly conteos = computed(() =>
    ESTADOS.map((estado) => ({ estado, total: this.incidencias().filter((i) => i.estado === estado).length })),
  );
  protected readonly visibles = computed(() => {
    const f = this.filtro();
    return f ? this.incidencias().filter((i) => i.estado === f) : this.incidencias();
  });

  protected relativo = tiempoRelativo;

  ngOnInit() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.svc.misIncidencias().subscribe({
      next: (lista) => {
        this.incidencias.set(lista);
        this.cargando.set(false);
      },
      error: (e: ApiException) => {
        this.error.set(e.message);
        this.cargando.set(false);
      },
    });
  }

  protected editar(i: Incidencia) {
    this.detalle.set(null);
    this.router.navigate(['/ciudadano/editar', i.id]);
  }

  protected async eliminar(i: Incidencia) {
    const ok = await this.confirm.ask({
      titulo: '¿Eliminar esta incidencia?',
      mensaje: `Se eliminará «${i.titulo}». Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar',
      tono: 'peligro',
    });
    if (!ok) return;

    this.svc.eliminarMia(i.id).subscribe({
      next: () => {
        this.incidencias.update((l) => l.filter((x) => x.id !== i.id));
        if (this.detalle()?.id === i.id) this.detalle.set(null);
        this.toast.success('Incidencia eliminada');
      },
      error: (e: ApiException) => {
        this.toast.error(e.message);
        if (e.status === 409) this.cargar(); // el estado cambió mientras tanto
      },
    });
  }
}
