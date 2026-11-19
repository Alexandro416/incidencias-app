import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, forkJoin, of } from 'rxjs';
import { Distrito, IncidenciaRequest } from '../../core/models/models';
import { DistritoService } from '../../core/services/distrito.service';
import { IncidenciaService } from '../../core/services/incidencia.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiException } from '../../core/utils/error.util';
import { EvidenciaComponent } from '../../shared/evidencia.component';
import { IconComponent } from '../../shared/icon.component';
import { Coordenadas, MapPickerComponent } from '../../shared/map-picker.component';

const urlOpcional = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '').trim();
  return !v || /^https?:\/\/\S+$/i.test(v) ? null : { url: true };
};

/** Crear (/ciudadano/nueva) y editar (/ciudadano/editar/:id) una incidencia. */
@Component({
  selector: 'app-incidencia-form',
  imports: [ReactiveFormsModule, RouterLink, IconComponent, MapPickerComponent, EvidenciaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1 style="font-size: 2rem">{{ editando() ? 'Editar incidencia' : 'Reportar incidencia' }}</h1>
        <p>{{ editando() ? 'Puedes cambiar los datos mientras siga pendiente.' : 'Marca el lugar en el mapa y cuéntanos qué pasa.' }}</p>
      </div>
      <a class="btn btn-ghost" routerLink="/ciudadano">Volver a mis incidencias</a>
    </div>

    @if (cargando()) {
      <div class="layout">
        <div class="skeleton" style="height: 520px"></div>
        <div class="skeleton" style="height: 520px"></div>
      </div>
    } @else if (errorCarga()) {
      <div class="card empty">
        <div class="empty-ico" style="background: var(--danger-soft); color: var(--danger)"><app-icon name="alert" [size]="28" /></div>
        <h3>No pudimos abrir el formulario</h3>
        <p>{{ errorCarga() }}</p>
        <a class="btn btn-primary" routerLink="/ciudadano">Volver</a>
      </div>
    } @else {
      <form class="layout" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <section class="card card-pad fields">
          <div class="field">
            <label for="titulo">Título</label>
            <input id="titulo" class="input" maxlength="150" placeholder="Ej.: Bache profundo frente al paradero" formControlName="titulo" [class.invalid]="invalido('titulo')" />
            @if (invalido('titulo')) {
              <span class="error-text">Escribe un título (máximo 150 caracteres).</span>
            }
          </div>

          <div class="field">
            <label for="distrito">Distrito</label>
            <select id="distrito" class="select" formControlName="distritoId" [class.invalid]="invalido('distritoId')">
              <option [ngValue]="null" disabled>Selecciona un distrito</option>
              @for (d of distritos(); track d.id) {
                <option [ngValue]="d.id">{{ d.nombre }}</option>
              }
            </select>
            @if (distritos().length === 0) {
              <span class="error-text">Aún no hay distritos registrados. Pide a un administrador que los cargue.</span>
            } @else if (invalido('distritoId')) {
              <span class="error-text">Selecciona el distrito donde ocurre.</span>
            }
          </div>

          <div class="field">
            <label for="descripcion">Descripción</label>
            <textarea id="descripcion" class="textarea" placeholder="¿Qué ocurre, desde cuándo y qué riesgo representa?" formControlName="descripcion" [class.invalid]="invalido('descripcion')"></textarea>
            @if (invalido('descripcion')) {
              <span class="error-text">Describe el problema.</span>
            }
          </div>

          <div class="field">
            <label for="url">Enlace de la imagen de evidencia <span class="muted">(opcional)</span></label>
            <input id="url" class="input" type="url" maxlength="500" placeholder="https://…/foto.jpg" formControlName="urlImagenEvidencia" [class.invalid]="invalido('urlImagenEvidencia')" />
            @if (invalido('urlImagenEvidencia')) {
              <span class="error-text">Ingresa un enlace que empiece con http:// o https://</span>
            } @else {
              <span class="hint">Pega la dirección de una foto ya publicada en internet.</span>
            }
            <div class="preview">
              <app-evidencia [url]="urlVista()" alt="Vista previa de la evidencia" [zoomable]="false" style="--ratio: 16 / 7" />
            </div>
          </div>
        </section>

        <section class="card card-pad ubicacion">
          <div class="row">
            <h3>Ubicación</h3>
            <span class="spacer"></span>
            @if (coords(); as c) {
              <span class="coords"><app-icon name="map-pin" [size]="14" /> {{ c.lat }}, {{ c.lng }}</span>
            }
          </div>
          <div class="mapa">
            <app-map-picker [lat]="lat()" [lng]="lng()" (ubicacionChange)="fijarUbicacion($event)" />
          </div>
          @if (sinUbicacion()) {
            <span class="error-text">Marca la ubicación en el mapa para poder enviar el reporte.</span>
          } @else {
            <span class="hint">Puedes arrastrar el pin para ajustar la posición.</span>
          }

          <div class="acciones">
            <a class="btn" routerLink="/ciudadano">Cancelar</a>
            <button type="submit" class="btn btn-primary" [disabled]="guardando()">
              @if (guardando()) {
                <span class="spinner"></span> Guardando…
              } @else {
                <app-icon name="check" [size]="17" /> {{ editando() ? 'Guardar cambios' : 'Enviar reporte' }}
              }
            </button>
          </div>
        </section>
      </form>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
      gap: 1.25rem;
      align-items: start;
    }
    .fields {
      display: grid;
      gap: 1.1rem;
    }
    .preview {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--line);
      margin-top: 0.3rem;
    }
    .ubicacion {
      display: grid;
      gap: 0.8rem;
    }
    .mapa {
      height: 440px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--line-strong);
    }
    .coords {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      background: var(--brand-soft);
      color: var(--brand-ink);
      font-size: 0.8rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .acciones {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      padding-top: 0.4rem;
    }
    @media (max-width: 960px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .mapa {
        height: 340px;
      }
    }
  `,
})
export class IncidenciaFormComponent implements OnInit {
  /** Llega desde la ruta `editar/:id` gracias a withComponentInputBinding(). */
  readonly id = input<string>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly svc = inject(IncidenciaService);
  private readonly distritoSvc = inject(DistritoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly editando = computed(() => !!this.id());
  protected readonly distritos = signal<Distrito[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly coords = signal<Coordenadas | null>(null);
  protected readonly lat = computed(() => this.coords()?.lat ?? null);
  protected readonly lng = computed(() => this.coords()?.lng ?? null);
  protected readonly intentoEnvio = signal(false);

  protected readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', [Validators.required]],
    distritoId: this.fb.control<number | null>(null, Validators.required),
    urlImagenEvidencia: ['', [Validators.maxLength(500), urlOpcional]],
    latitud: this.fb.control<number | null>(null, Validators.required),
    longitud: this.fb.control<number | null>(null, Validators.required),
  });

  protected readonly urlVista = toSignal(
    this.form.controls.urlImagenEvidencia.valueChanges.pipe(debounceTime(350)),
    { initialValue: '' },
  );

  protected readonly sinUbicacion = computed(() => this.intentoEnvio() && this.coords() === null);

  ngOnInit() {
    const idNum = this.id() ? Number(this.id()) : null;
    if (this.id() && (idNum === null || Number.isNaN(idNum))) {
      this.errorCarga.set('La dirección de esta página no es válida.');
      this.cargando.set(false);
      return;
    }

    forkJoin({
      distritos: this.distritoSvc.listar(),
      incidencia: idNum !== null ? this.svc.miIncidencia(idNum) : of(null),
    }).subscribe({
      next: ({ distritos, incidencia }) => {
        this.distritos.set(distritos);
        if (incidencia) {
          if (incidencia.estado !== 'PENDIENTE') {
            this.toast.warning('Solo se pueden editar incidencias pendientes.');
            this.router.navigate(['/ciudadano']);
            return;
          }
          this.form.patchValue({
            titulo: incidencia.titulo,
            descripcion: incidencia.descripcion,
            distritoId: incidencia.distritoId,
            urlImagenEvidencia: incidencia.urlImagenEvidencia ?? '',
          });
          this.fijarUbicacion({ lat: Number(incidencia.latitud), lng: Number(incidencia.longitud) });
        }
        this.cargando.set(false);
      },
      error: (e: ApiException) => {
        this.errorCarga.set(e.message);
        this.cargando.set(false);
      },
    });
  }

  protected invalido(campo: 'titulo' | 'descripcion' | 'distritoId' | 'urlImagenEvidencia'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty || this.intentoEnvio());
  }

  protected fijarUbicacion(c: Coordenadas) {
    this.coords.set(c);
    this.form.patchValue({ latitud: c.lat, longitud: c.lng });
  }

  protected guardar() {
    this.intentoEnvio.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Revisa los campos marcados antes de enviar.');
      return;
    }

    const v = this.form.getRawValue();
    const req: IncidenciaRequest = {
      titulo: v.titulo.trim(),
      descripcion: v.descripcion.trim(),
      latitud: v.latitud!,
      longitud: v.longitud!,
      urlImagenEvidencia: v.urlImagenEvidencia.trim() || null,
      distritoId: v.distritoId!,
    };

    this.guardando.set(true);
    const idNum = this.id() ? Number(this.id()) : null;
    const peticion = idNum !== null ? this.svc.actualizarMia(idNum, req) : this.svc.crear(req);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.success(idNum !== null ? 'Cambios guardados' : 'Incidencia reportada. ¡Gracias por avisar!');
        this.router.navigate(['/ciudadano']);
      },
      error: (e: ApiException) => {
        this.guardando.set(false);
        this.toast.error(e.message);
      },
    });
  }
}
