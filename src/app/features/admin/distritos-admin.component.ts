import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { Distrito } from '../../core/models/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { DistritoService } from '../../core/services/distrito.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiException } from '../../core/utils/error.util';
import { IconComponent } from '../../shared/icon.component';

/** Los 43 distritos de la provincia de Lima, para precargar el catálogo con un clic. */
const DISTRITOS_LIMA = [
  'Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Cercado de Lima', 'Chaclacayo', 'Chorrillos', 'Cieneguilla',
  'Comas', 'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lince', 'Los Olivos',
  'Lurigancho-Chosica', 'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacámac', 'Pucusana', 'Pueblo Libre',
  'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo', 'San Borja', 'San Isidro',
  'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel',
  'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador',
  'Villa María del Triunfo',
];

@Component({
  selector: 'app-distritos-admin',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1 style="font-size: 2rem">Distritos</h1>
        <p>Catálogo que los ciudadanos ven al reportar una incidencia.</p>
      </div>
      <button type="button" class="btn" (click)="cargarDistritosLima()" [disabled]="precargando()">
        @if (precargando()) {
          <span class="spinner"></span> Cargando…
        } @else {
          <app-icon name="building" [size]="16" /> Cargar distritos de Lima
        }
      </button>
    </div>

    <div class="layout">
      <form class="card card-pad nuevo" (ngSubmit)="crear()" novalidate>
        <h3>Agregar distrito</h3>
        <div class="field">
          <label for="nombre">Nombre</label>
          <input id="nombre" class="input" maxlength="100" placeholder="Ej.: Miraflores" [formControl]="nuevo" [class.invalid]="nuevo.invalid && nuevo.touched" />
          @if (nuevo.invalid && nuevo.touched) {
            <span class="error-text">Escribe un nombre (máximo 100 caracteres).</span>
          }
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="creando()">
          @if (creando()) {
            <span class="spinner"></span> Guardando…
          } @else {
            <app-icon name="plus" [size]="16" /> Agregar
          }
        </button>
      </form>

      <section class="card lista">
        @if (cargando()) {
          <div class="skeleton" style="height: 260px; margin: 1rem"></div>
        } @else if (error()) {
          <div class="empty">
            <div class="empty-ico" style="background: var(--danger-soft); color: var(--danger)"><app-icon name="alert" [size]="28" /></div>
            <h3>No pudimos cargar los distritos</h3>
            <p>{{ error() }}</p>
            <button type="button" class="btn btn-primary" (click)="cargar()">Reintentar</button>
          </div>
        } @else if (distritos().length === 0) {
          <div class="empty">
            <div class="empty-ico"><app-icon name="building" [size]="28" /></div>
            <h3>Aún no hay distritos</h3>
            <p>Sin distritos, los ciudadanos no pueden reportar. Agrega uno o carga los 43 distritos de Lima de una vez.</p>
            <button type="button" class="btn btn-primary" (click)="cargarDistritosLima()" [disabled]="precargando()">Cargar distritos de Lima</button>
          </div>
        } @else {
          <div class="head">
            <span class="muted small">{{ filtrados().length }} de {{ distritos().length }} distritos</span>
            <input class="input buscar" type="search" placeholder="Buscar distrito" aria-label="Buscar distrito" [value]="busqueda()" (input)="busqueda.set(valorDe($event.target))" />
          </div>
          <ul>
            @for (d of filtrados(); track d.id) {
              <li>
                @if (editandoId() === d.id) {
                  <input
                    class="input"
                    maxlength="100"
                    [value]="nombreEdicion()"
                    [attr.aria-label]="'Nuevo nombre para ' + d.nombre"
                    (input)="nombreEdicion.set(valorDe($event.target))"
                    (keydown.enter)="guardarEdicion(d)"
                    (keydown.escape)="editandoId.set(null)"
                  />
                  <button type="button" class="btn btn-sm btn-primary" (click)="guardarEdicion(d)"><app-icon name="check" [size]="15" /> Guardar</button>
                  <button type="button" class="btn btn-sm" (click)="editandoId.set(null)">Cancelar</button>
                } @else {
                  <span class="nombre"><app-icon name="map-pin" [size]="15" /> {{ d.nombre }}</span>
                  <span class="spacer"></span>
                  <button type="button" class="btn btn-sm btn-icon" aria-label="Renombrar {{ d.nombre }}" title="Renombrar" (click)="editar(d)"><app-icon name="edit" [size]="16" /></button>
                  <button type="button" class="btn btn-sm btn-icon" aria-label="Eliminar {{ d.nombre }}" title="Eliminar" (click)="eliminar(d)"><app-icon name="trash" [size]="16" /></button>
                }
              </li>
            } @empty {
              <li class="muted">Ningún distrito coincide con la búsqueda.</li>
            }
          </ul>
        }
      </section>
    </div>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 1.25rem;
      align-items: start;
    }
    .nuevo {
      display: grid;
      gap: 1rem;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.2rem;
      border-bottom: 1px solid var(--line);
    }
    .buscar {
      max-width: 240px;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.2rem;
      border-bottom: 1px solid var(--line);
    }
    li:last-child {
      border-bottom: 0;
    }
    li:hover {
      background: #f8fbf9;
    }
    .nombre {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
    }
    .nombre app-icon {
      color: var(--brand);
    }
    @media (max-width: 860px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DistritosAdminComponent implements OnInit {
  private readonly svc = inject(DistritoService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly distritos = signal<Distrito[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly creando = signal(false);
  protected readonly precargando = signal(false);
  protected readonly busqueda = signal('');
  protected readonly editandoId = signal<number | null>(null);
  protected readonly nombreEdicion = signal('');

  protected readonly nuevo = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] });

  protected readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return q ? this.distritos().filter((d) => d.nombre.toLowerCase().includes(q)) : this.distritos();
  });

  ngOnInit() {
    this.cargar();
  }

  protected valorDe(t: EventTarget | null): string {
    return (t as HTMLInputElement).value;
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.svc.listar().subscribe({
      next: (l) => {
        this.distritos.set(l);
        this.cargando.set(false);
      },
      error: (e: ApiException) => {
        this.error.set(e.message);
        this.cargando.set(false);
      },
    });
  }

  protected crear() {
    this.nuevo.markAsTouched();
    const nombre = this.nuevo.value.trim();
    if (this.nuevo.invalid || !nombre) return;

    this.creando.set(true);
    this.svc.crear({ nombre }).subscribe({
      next: (d) => {
        this.creando.set(false);
        this.distritos.update((l) => this.ordenar([...l, d]));
        this.nuevo.reset('');
        this.toast.success(`Distrito «${d.nombre}» agregado`);
      },
      error: (e: ApiException) => {
        this.creando.set(false);
        this.toast.error(e.message);
      },
    });
  }

  protected editar(d: Distrito) {
    this.editandoId.set(d.id);
    this.nombreEdicion.set(d.nombre);
  }

  protected guardarEdicion(d: Distrito) {
    const nombre = this.nombreEdicion().trim();
    if (!nombre) {
      this.toast.warning('El nombre no puede estar vacío.');
      return;
    }
    if (nombre === d.nombre) {
      this.editandoId.set(null);
      return;
    }
    this.svc.actualizar(d.id, { nombre }).subscribe({
      next: (act) => {
        this.distritos.update((l) => this.ordenar(l.map((x) => (x.id === act.id ? act : x))));
        this.editandoId.set(null);
        this.toast.success('Distrito actualizado');
      },
      error: (e: ApiException) => this.toast.error(e.message),
    });
  }

  protected async eliminar(d: Distrito) {
    const ok = await this.confirm.ask({
      titulo: '¿Eliminar este distrito?',
      mensaje: `Se eliminará «${d.nombre}». Si ya tiene incidencias registradas, el sistema no permitirá borrarlo.`,
      confirmar: 'Eliminar',
      tono: 'peligro',
    });
    if (!ok) return;

    this.svc.eliminar(d.id).subscribe({
      next: () => {
        this.distritos.update((l) => l.filter((x) => x.id !== d.id));
        this.toast.success('Distrito eliminado');
      },
      error: (e: ApiException) =>
        this.toast.error(e.status === 409 ? 'No se puede eliminar: el distrito tiene incidencias asociadas.' : e.message),
    });
  }

  protected cargarDistritosLima() {
    const existentes = new Set(this.distritos().map((d) => d.nombre.toLowerCase()));
    const faltantes = DISTRITOS_LIMA.filter((n) => !existentes.has(n.toLowerCase()));
    if (faltantes.length === 0) {
      this.toast.info('Ya están cargados todos los distritos de Lima.');
      return;
    }
    this.precargando.set(true);
    forkJoin(faltantes.map((nombre) => this.svc.crear({ nombre }).pipe(catchError(() => of(null))))).subscribe((res) => {
      const creados = res.filter((d): d is Distrito => d !== null);
      this.distritos.update((l) => this.ordenar([...l, ...creados]));
      this.precargando.set(false);
      if (creados.length === faltantes.length) this.toast.success(`Se agregaron ${creados.length} distritos`);
      else this.toast.warning(`Se agregaron ${creados.length} de ${faltantes.length} distritos. Revisa la lista.`);
    });
  }

  private ordenar(l: Distrito[]): Distrito[] {
    return [...l].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
}
