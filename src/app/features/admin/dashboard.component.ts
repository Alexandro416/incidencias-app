import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { forkJoin } from 'rxjs';
import { Distrito, EstadoIncidencia, Incidencia, ReporteEstado } from '../../core/models/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { DistritoService } from '../../core/services/distrito.service';
import { IncidenciaService } from '../../core/services/incidencia.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiException } from '../../core/utils/error.util';
import { ESTADOS, ESTADOS_GRAFICO, ESTADO_META } from '../../core/utils/estado.util';
import { ChartComponent } from '../../shared/chart.component';
import { EstadoBadgeComponent } from '../../shared/estado-badge.component';
import { EvidenciaComponent } from '../../shared/evidencia.component';
import { IconComponent } from '../../shared/icon.component';
import { IncidenciaDetalleComponent } from '../../shared/incidencia-detalle.component';
import { MapaIncidenciasComponent } from '../../shared/mapa-incidencias.component';

type Vista = 'tabla' | 'mapa';

const BRAND = '#0f6b73';
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pad = (n: number) => String(n).padStart(2, '0');
const claveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    ChartComponent,
    EstadoBadgeComponent,
    EvidenciaComponent,
    IconComponent,
    IncidenciaDetalleComponent,
    MapaIncidenciasComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1 style="font-size: 2rem">Panel de incidencias</h1>
        <p>Resumen de la ciudad y gestión de reportes en un solo lugar.</p>
      </div>
      <button type="button" class="btn" (click)="cargarTodo(true)" [disabled]="cargando() || refrescando()">
        @if (refrescando()) {
          <span class="spinner"></span>
        } @else {
          <app-icon name="refresh" [size]="16" />
        }
        Actualizar
      </button>
    </div>

    @if (cargando()) {
      <div class="kpis">
        @for (n of [1, 2, 3, 4]; track n) {
          <div class="skeleton" style="height: 104px"></div>
        }
      </div>
      <div class="skeleton" style="height: 300px; margin-top: 1.25rem"></div>
    } @else if (error()) {
      <div class="card empty">
        <div class="empty-ico" style="background: var(--danger-soft); color: var(--danger)"><app-icon name="alert" [size]="28" /></div>
        <h3>No pudimos cargar el panel</h3>
        <p>{{ error() }}</p>
        <button type="button" class="btn btn-primary" (click)="cargarTodo()"><app-icon name="refresh" [size]="16" /> Reintentar</button>
      </div>
    } @else {
      <!-- ===== KPIs ===== -->
      <section class="kpis" aria-label="Indicadores">
        <article class="card kpi">
          <span class="kpi-ico"><app-icon name="clipboard" [size]="20" /></span>
          <div>
            <p class="kpi-n">{{ total() }}</p>
            <p class="kpi-l">Reportes recibidos</p>
          </div>
        </article>
        <article class="card kpi alerta">
          <span class="kpi-ico"><app-icon name="clock" [size]="20" /></span>
          <div>
            <p class="kpi-n">{{ conteo('PENDIENTE') }}</p>
            <p class="kpi-l">Pendientes de revisar</p>
          </div>
        </article>
        <article class="card kpi">
          <span class="kpi-ico"><app-icon name="refresh" [size]="20" /></span>
          <div>
            <p class="kpi-n">{{ conteo('EN_REVISION') + conteo('EN_PROCESO') }}</p>
            <p class="kpi-l">En revisión o en proceso</p>
          </div>
        </article>
        <article class="card kpi ok">
          <span class="kpi-ico"><app-icon name="check" [size]="20" /></span>
          <div>
            <p class="kpi-n">{{ tasaResolucion() }}%</p>
            <p class="kpi-l">Resueltos ({{ conteo('RESUELTO') }} de {{ total() }})</p>
          </div>
        </article>
      </section>

      <!-- ===== Gráficos ===== -->
      <section class="charts" aria-label="Gráficos">
        <article class="card card-pad ch">
          <h3>Incidencias por estado</h3>
          @if (total() > 0) {
            <div class="ch-body"><app-chart [config]="chartEstado()" etiqueta="Gráfico de dona: incidencias por estado" /></div>
          } @else {
            <p class="muted ch-vacio">Cuando lleguen reportes, verás aquí cómo se reparten.</p>
          }
        </article>
        <article class="card card-pad ch ancho">
          <h3>Reportes de los últimos 14 días</h3>
          <div class="ch-body"><app-chart [config]="chartDias()" etiqueta="Gráfico de líneas: reportes por día" /></div>
        </article>
        <article class="card card-pad ch">
          <h3>Distritos con más reportes</h3>
          @if (todas().length > 0) {
            <div class="ch-body"><app-chart [config]="chartDistritos()" etiqueta="Gráfico de barras: reportes por distrito" /></div>
          } @else {
            <p class="muted ch-vacio">Aún no hay reportes para comparar distritos.</p>
          }
        </article>
      </section>

      <!-- ===== Gestión ===== -->
      <section class="card gestion" aria-label="Gestión de incidencias">
        <div class="toolbar">
          <div class="search">
            <app-icon name="search" [size]="16" />
            <input
              class="input"
              type="search"
              placeholder="Buscar por título, correo o distrito"
              aria-label="Buscar incidencias"
              [value]="busqueda()"
              (input)="busqueda.set(valorDe($event.target))"
            />
          </div>

          <select class="select" aria-label="Filtrar por distrito" (change)="onDistrito($event.target)">
            <option value="" [selected]="fDistrito() === null">Todos los distritos</option>
            @for (d of distritos(); track d.id) {
              <option [value]="d.id" [selected]="fDistrito() === d.id">{{ d.nombre }}</option>
            }
          </select>

          <select class="select" aria-label="Filtrar por estado" (change)="onEstado($event.target)">
            <option value="" [selected]="fEstado() === null">Todos los estados</option>
            @for (e of estados; track e) {
              <option [value]="e" [selected]="fEstado() === e">{{ meta[e].label }}</option>
            }
          </select>

          @if (filtrosActivos()) {
            <button type="button" class="btn btn-ghost btn-sm" (click)="limpiarFiltros()"><app-icon name="x" [size]="15" /> Limpiar</button>
          }

          <span class="spacer"></span>

          <div class="seg" role="tablist" aria-label="Tipo de vista">
            <button type="button" role="tab" [attr.aria-selected]="vista() === 'tabla'" [class.on]="vista() === 'tabla'" (click)="vista.set('tabla')">
              <app-icon name="list" [size]="16" /> Tabla
            </button>
            <button type="button" role="tab" [attr.aria-selected]="vista() === 'mapa'" [class.on]="vista() === 'mapa'" (click)="vista.set('mapa')">
              <app-icon name="map" [size]="16" /> Mapa
            </button>
          </div>
        </div>

        <p class="resumen muted small" aria-live="polite">
          @if (cargandoLista()) {
            <span class="spinner" style="width: 14px; height: 14px; border-width: 2px"></span> Filtrando…
          } @else {
            Mostrando {{ visibles().length }} de {{ total() }} incidencias
          }
        </p>

        @if (visibles().length === 0 && !cargandoLista()) {
          <div class="empty">
            <div class="empty-ico"><app-icon name="inbox" [size]="28" /></div>
            <h3>No hay incidencias con esos criterios</h3>
            <p>Prueba con otro distrito o estado, o limpia los filtros.</p>
            @if (filtrosActivos() || busqueda()) {
              <button type="button" class="btn" (click)="limpiarFiltros()">Limpiar filtros</button>
            }
          </div>
        } @else if (vista() === 'tabla') {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Evidencia</th>
                  <th>Incidencia</th>
                  <th>Distrito</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (i of visibles(); track i.id) {
                  <tr>
                    <td class="thumb"><app-evidencia [url]="i.urlImagenEvidencia" [alt]="i.titulo" [zoomable]="false" style="--ratio: 4 / 3" /></td>
                    <td class="cell-main">
                      <button type="button" class="link" (click)="detalle.set(i)">{{ i.titulo }}</button>
                      <span class="muted small truncate">{{ i.usuarioEmail }}</span>
                    </td>
                    <td>{{ i.distrito }}</td>
                    <td class="muted nowrap">{{ i.fecha | date: 'dd MMM y, HH:mm' }}</td>
                    <td>
                      <div class="estado-cell">
                        <select
                          [class]="'select select-estado estado-' + i.estado"
                          [attr.aria-label]="'Cambiar estado de ' + i.titulo"
                          [disabled]="cambiando() === i.id"
                          (change)="cambiarEstado(i, $event.target)"
                        >
                          @for (e of estados; track e) {
                            <option [value]="e" [selected]="e === i.estado">{{ meta[e].label }}</option>
                          }
                        </select>
                        @if (cambiando() === i.id) {
                          <span class="spinner" style="width: 16px; height: 16px; border-width: 2px"></span>
                        }
                      </div>
                    </td>
                    <td class="acc">
                      <button type="button" class="btn btn-sm btn-icon" aria-label="Ver detalle" title="Ver detalle" (click)="detalle.set(i)"><app-icon name="eye" [size]="16" /></button>
                      <button type="button" class="btn btn-sm btn-icon" aria-label="Eliminar incidencia" title="Eliminar" (click)="eliminar(i)"><app-icon name="trash" [size]="16" /></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="mapa-wrap">
            <app-mapa-incidencias [incidencias]="visibles()" [seleccionadaId]="detalle()?.id ?? null" (seleccionar)="detalle.set($event)" />
            <ul class="leyenda" aria-label="Leyenda de estados">
              @for (e of estados; track e) {
                <li [class]="'estado-' + e"><i></i>{{ meta[e].label }}</li>
              }
            </ul>
          </div>
        }
      </section>
    }

    @if (detalle(); as d) {
      <app-incidencia-detalle [incidencia]="d" (cerrar)="detalle.set(null)">
        <div class="field" style="min-width: 190px">
          <label for="estado-detalle">Estado</label>
          <select id="estado-detalle" [class]="'select select-estado estado-' + d.estado" [disabled]="cambiando() === d.id" (change)="cambiarEstado(d, $event.target)">
            @for (e of estados; track e) {
              <option [value]="e" [selected]="e === d.estado">{{ meta[e].label }}</option>
            }
          </select>
        </div>
        <span class="spacer"></span>
        <button type="button" class="btn btn-danger" style="align-self: flex-end" (click)="eliminar(d)"><app-icon name="trash" [size]="16" /> Eliminar</button>
      </app-incidencia-detalle>
    }
  `,
  styles: `
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .kpi {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.1rem 1.2rem;
    }
    .kpi-ico {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--brand-soft);
      color: var(--brand);
      flex: none;
    }
    .kpi.alerta .kpi-ico {
      background: var(--signal-soft);
      color: var(--signal-ink);
    }
    .kpi.ok .kpi-ico {
      background: #dcf1dc;
      color: #0a4d0a;
    }
    .kpi-n {
      font: 700 1.9rem/1 var(--font-display);
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
    }
    .kpi-l {
      margin-top: 0.25rem;
      color: var(--ink-2);
      font-size: 0.84rem;
    }
    .charts {
      display: grid;
      grid-template-columns: 1fr 1.6fr 1.1fr;
      gap: 1rem;
      margin-top: 1.25rem;
    }
    .ch {
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 0.8rem;
      min-width: 0;
    }
    .ch-body {
      height: 260px;
      min-width: 0;
    }
    .ch-vacio {
      align-self: center;
      text-align: center;
    }
    .gestion {
      margin-top: 1.25rem;
      overflow: hidden;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      padding: 1rem 1.1rem 0.4rem;
    }
    .toolbar .select {
      width: auto;
      min-width: 170px;
    }
    .search {
      position: relative;
      flex: 1 1 240px;
      max-width: 340px;
    }
    .search app-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--ink-3);
      pointer-events: none;
    }
    .search .input {
      padding-left: 2.3rem;
    }
    .seg {
      display: inline-flex;
      padding: 3px;
      border-radius: 10px;
      background: #e8eeeb;
    }
    .seg button {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.42rem 0.85rem;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--ink-2);
      font: 600 0.86rem var(--font-body);
      cursor: pointer;
    }
    .seg button.on {
      background: var(--surface);
      color: var(--ink);
      box-shadow: var(--shadow-sm);
    }
    .resumen {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 1.1rem 0.7rem;
    }
    .thumb {
      width: 92px;
    }
    .thumb app-evidencia {
      border-radius: 8px;
      overflow: hidden;
    }
    .cell-main {
      display: grid;
      gap: 0.15rem;
      max-width: 320px;
    }
    .link {
      padding: 0;
      border: 0;
      background: none;
      text-align: left;
      font: 600 0.95rem var(--font-body);
      color: var(--ink);
      cursor: pointer;
    }
    .link:hover {
      color: var(--brand);
      text-decoration: underline;
    }
    .nowrap {
      white-space: nowrap;
    }
    .estado-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .select-estado {
      width: auto;
      min-width: 150px;
      padding: 0.35rem 0.6rem;
      font-weight: 600;
      font-size: 0.85rem;
      background: var(--e-soft);
      color: var(--e-ink);
      border-color: var(--e);
    }
    .acc {
      white-space: nowrap;
      text-align: right;
    }
    .acc .btn + .btn {
      margin-left: 0.3rem;
    }
    .mapa-wrap {
      position: relative;
      height: 560px;
      padding: 0 1.1rem 1.1rem;
    }
    .leyenda {
      position: absolute;
      left: 2rem;
      bottom: 2.2rem;
      z-index: 500;
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem 0.9rem;
      margin: 0;
      padding: 0.5rem 0.8rem;
      list-style: none;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid var(--line);
      border-radius: 10px;
      font-size: 0.8rem;
      box-shadow: var(--shadow-md);
    }
    .leyenda li {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .leyenda i {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--e);
    }
    @media (max-width: 1080px) {
      .kpis {
        grid-template-columns: repeat(2, 1fr);
      }
      .charts {
        grid-template-columns: 1fr 1fr;
      }
      .charts .ancho {
        grid-column: 1 / -1;
        order: 3;
      }
    }
    @media (max-width: 640px) {
      .kpis,
      .charts {
        grid-template-columns: 1fr;
      }
      .toolbar .select,
      .search {
        flex: 1 1 100%;
        max-width: none;
      }
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly svc = inject(IncidenciaService);
  private readonly distritoSvc = inject(DistritoService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly estados = ESTADOS;
  protected readonly meta = ESTADO_META;

  protected readonly cargando = signal(true);
  protected readonly refrescando = signal(false);
  protected readonly cargandoLista = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly cambiando = signal<number | null>(null);

  protected readonly reporte = signal<ReporteEstado[]>([]);
  /** Todas las incidencias (sin filtros): alimentan KPIs, gráficos por día/distrito. */
  protected readonly todas = signal<Incidencia[]>([]);
  /** Lista que se muestra en la tabla/mapa (filtrada en el servidor por distrito y estado). */
  protected readonly lista = signal<Incidencia[]>([]);
  protected readonly distritos = signal<Distrito[]>([]);

  protected readonly fDistrito = signal<number | null>(null);
  protected readonly fEstado = signal<EstadoIncidencia | null>(null);
  protected readonly busqueda = signal('');
  protected readonly vista = signal<Vista>('tabla');
  protected readonly detalle = signal<Incidencia | null>(null);

  protected readonly filtrosActivos = computed(() => this.fDistrito() !== null || this.fEstado() !== null);

  protected readonly total = computed(() => this.reporte().reduce((acc, r) => acc + r.total, 0));
  protected readonly tasaResolucion = computed(() => {
    const t = this.total();
    return t === 0 ? 0 : Math.round((this.conteo('RESUELTO') / t) * 100);
  });

  protected readonly visibles = computed(() => {
    const q = sinTildes(this.busqueda().trim());
    if (!q) return this.lista();
    return this.lista().filter((i) => sinTildes(`${i.titulo} ${i.usuarioEmail} ${i.distrito}`).includes(q));
  });

  // ---------- Gráficos ----------
  protected readonly chartEstado = computed<ChartConfiguration<'doughnut'>>(() => ({
    type: 'doughnut',
    data: {
      labels: ESTADOS_GRAFICO.map((e) => `${ESTADO_META[e].label} (${this.conteo(e)})`),
      datasets: [
        {
          data: ESTADOS_GRAFICO.map((e) => this.conteo(e)),
          backgroundColor: ESTADOS_GRAFICO.map((e) => ESTADO_META[e].color),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12 } } },
    },
  }));

  protected readonly chartDias = computed<ChartConfiguration<'line'>>(() => {
    const dias: Date[] = [];
    for (let k = 13; k >= 0; k--) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - k);
      dias.push(d);
    }
    const porDia = new Map<string, number>();
    for (const i of this.todas()) {
      const clave = i.fecha.slice(0, 10);
      porDia.set(clave, (porDia.get(clave) ?? 0) + 1);
    }
    return {
      type: 'line',
      data: {
        labels: dias.map((d) => `${d.getDate()}/${d.getMonth() + 1}`),
        datasets: [
          {
            label: 'Reportes',
            data: dias.map((d) => porDia.get(claveDia(d)) ?? 0),
            borderColor: BRAND,
            backgroundColor: 'rgba(15, 107, 115, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: BRAND,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#e6ece9' }, border: { display: false } },
        },
      },
    };
  });

  protected readonly chartDistritos = computed<ChartConfiguration<'bar'>>(() => {
    const cuenta = new Map<string, number>();
    for (const i of this.todas()) cuenta.set(i.distrito, (cuenta.get(i.distrito) ?? 0) + 1);
    const top = [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      type: 'bar',
      data: {
        labels: top.map(([nombre]) => nombre),
        datasets: [{ label: 'Reportes', data: top.map(([, n]) => n), backgroundColor: BRAND, borderRadius: 4, barThickness: 18 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#e6ece9' }, border: { display: false } },
          y: { grid: { display: false } },
        },
      },
    };
  });

  ngOnInit() {
    this.cargarTodo();
  }

  protected conteo(e: EstadoIncidencia): number {
    return this.reporte().find((r) => r.estado === e)?.total ?? 0;
  }

  protected valorDe(t: EventTarget | null): string {
    return (t as HTMLInputElement | HTMLSelectElement).value;
  }

  // ---------- Carga ----------
  protected cargarTodo(manual = false) {
    if (manual) this.refrescando.set(true);
    else this.cargando.set(true);
    this.error.set(null);

    forkJoin({
      reporte: this.svc.reporte(),
      todas: this.svc.listarTodas(),
      distritos: this.distritoSvc.listar(),
    }).subscribe({
      next: ({ reporte, todas, distritos }) => {
        this.reporte.set(reporte);
        this.todas.set(todas);
        this.distritos.set(distritos);
        this.cargando.set(false);
        this.refrescando.set(false);
        if (this.filtrosActivos()) this.aplicarFiltros();
        else this.lista.set(todas);
        if (manual) this.toast.info('Datos actualizados');
      },
      error: (e: ApiException) => {
        this.cargando.set(false);
        this.refrescando.set(false);
        if (manual) this.toast.error(e.message);
        else this.error.set(e.message);
      },
    });
  }

  private recargarReporte() {
    this.svc.reporte().subscribe({
      next: (r) => this.reporte.set(r),
      error: (e: ApiException) => this.toast.error(e.message),
    });
  }

  // ---------- Filtros (servidor: distritoId y estado) ----------
  protected onDistrito(t: EventTarget | null) {
    const v = this.valorDe(t);
    this.fDistrito.set(v ? Number(v) : null);
    this.aplicarFiltros();
  }

  protected onEstado(t: EventTarget | null) {
    const v = this.valorDe(t);
    this.fEstado.set(v ? (v as EstadoIncidencia) : null);
    this.aplicarFiltros();
  }

  protected limpiarFiltros() {
    this.fDistrito.set(null);
    this.fEstado.set(null);
    this.busqueda.set('');
    this.lista.set(this.todas());
  }

  private aplicarFiltros() {
    if (!this.filtrosActivos()) {
      this.lista.set(this.todas());
      return;
    }
    this.cargandoLista.set(true);
    this.svc.listarTodas({ distritoId: this.fDistrito(), estado: this.fEstado() }).subscribe({
      next: (l) => {
        this.lista.set(l);
        this.cargandoLista.set(false);
      },
      error: (e: ApiException) => {
        this.cargandoLista.set(false);
        this.toast.error(e.message);
      },
    });
  }

  // ---------- Acciones ----------
  protected async cambiarEstado(i: Incidencia, destino: EventTarget | null) {
    const select = destino as HTMLSelectElement;
    const nuevo = select.value as EstadoIncidencia;
    if (nuevo === i.estado) return;

    const ok = await this.confirm.ask({
      titulo: 'Cambiar estado',
      mensaje: `«${i.titulo}» pasará de ${ESTADO_META[i.estado].label} a ${ESTADO_META[nuevo].label}.`,
      confirmar: 'Cambiar estado',
    });
    if (!ok) {
      select.value = i.estado; // revierte el select
      return;
    }

    this.cambiando.set(i.id);
    this.svc.cambiarEstado(i.id, nuevo).subscribe({
      next: (act) => {
        this.cambiando.set(null);
        this.reemplazar(act);
        this.recargarReporte();
        this.toast.success(`Estado actualizado a ${ESTADO_META[act.estado].label}`);
      },
      error: (e: ApiException) => {
        this.cambiando.set(null);
        select.value = i.estado;
        this.toast.error(e.message);
      },
    });
  }

  protected async eliminar(i: Incidencia) {
    const ok = await this.confirm.ask({
      titulo: '¿Eliminar esta incidencia?',
      mensaje: `Se eliminará «${i.titulo}» de ${i.usuarioEmail}. Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar',
      tono: 'peligro',
    });
    if (!ok) return;

    this.svc.eliminarAdmin(i.id).subscribe({
      next: () => {
        this.todas.update((l) => l.filter((x) => x.id !== i.id));
        this.lista.update((l) => l.filter((x) => x.id !== i.id));
        if (this.detalle()?.id === i.id) this.detalle.set(null);
        this.recargarReporte();
        this.toast.success('Incidencia eliminada');
      },
      error: (e: ApiException) => this.toast.error(e.message),
    });
  }

  private reemplazar(act: Incidencia) {
    this.todas.update((l) => l.map((x) => (x.id === act.id ? act : x)));
    const filtroEstado = this.fEstado();
    this.lista.update((l) => {
      const mapeada = l.map((x) => (x.id === act.id ? act : x));
      // Si hay filtro por estado y la incidencia ya no cumple, sale de la vista.
      return filtroEstado ? mapeada.filter((x) => x.estado === filtroEstado) : mapeada;
    });
    if (this.detalle()?.id === act.id) this.detalle.set(act);
  }
}
