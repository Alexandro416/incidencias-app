import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiException } from '../../core/utils/error.util';
import { IconComponent } from '../../shared/icon.component';

const coincide = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirmar')?.value ? null : { noCoincide: true };

type Campo = 'nombre' | 'email' | 'password' | 'confirmar';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth">
      <aside class="auth-side">
        <a routerLink="/" class="auth-brand">
          <span class="logo"><app-icon name="map-pin" [size]="18" /></span> Incidencias Lima
        </a>
        <div>
          <h2>Un reporte tuyo puede arreglar una cuadra entera.</h2>
          <p>Crea tu cuenta, marca el problema en el mapa y sigue su estado hasta que se resuelva.</p>
        </div>
        <div class="pins-deco" aria-hidden="true">
          <div style="--c: #2a78d6"><span class="dot"></span> Baches y pistas dañadas</div>
          <div style="--c: #eda100"><span class="dot"></span> Alumbrado público malogrado</div>
          <div style="--c: #008300"><span class="dot"></span> Residuos acumulados</div>
        </div>
      </aside>

      <main class="auth-main">
        <form class="auth-form" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
          <header>
            <h1 style="font-size: 2rem">Crear cuenta</h1>
            <p>Es gratis y toma menos de un minuto.</p>
          </header>

          @if (error()) {
            <div class="alert alert-error" role="alert">
              <app-icon name="alert" [size]="18" />
              <span>{{ error() }}</span>
            </div>
          }

          <div class="field">
            <label for="nombre">Nombre completo</label>
            <input id="nombre" class="input" autocomplete="name" formControlName="nombre" [class.invalid]="invalido('nombre')" />
            @if (invalido('nombre')) {
              <span class="error-text">Ingresa tu nombre (máximo 100 caracteres).</span>
            }
          </div>

          <div class="field">
            <label for="email">Correo electrónico</label>
            <input
              id="email"
              class="input"
              type="email"
              autocomplete="email"
              placeholder="nombre@correo.com"
              formControlName="email"
              [class.invalid]="invalido('email')"
            />
            @if (invalido('email')) {
              <span class="error-text">Ingresa un correo válido (máximo 120 caracteres).</span>
            }
          </div>

          <div class="field">
            <label for="password">Contraseña</label>
            <div class="input-wrap">
              <input
                id="password"
                class="input"
                [type]="verPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                formControlName="password"
                [class.invalid]="invalido('password')"
              />
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                [attr.aria-label]="verPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                (click)="verPassword.set(!verPassword())"
              >
                <app-icon [name]="verPassword() ? 'eye-off' : 'eye'" [size]="18" />
              </button>
            </div>
            <div class="meter" aria-hidden="true">
              @for (n of [1, 2, 3, 4]; track n) {
                <span [class.on]="fuerza().nivel >= n" [attr.data-n]="fuerza().nivel"></span>
              }
            </div>
            <span class="hint">
              Seguridad: <b>{{ fuerza().etiqueta }}</b> · mínimo 8 caracteres.
            </span>
            @if (invalido('password')) {
              <span class="error-text">La contraseña debe tener entre 8 y 72 caracteres.</span>
            }
          </div>

          <div class="field">
            <label for="confirmar">Repite la contraseña</label>
            <input
              id="confirmar"
              class="input"
              [type]="verPassword() ? 'text' : 'password'"
              autocomplete="new-password"
              formControlName="confirmar"
              [class.invalid]="invalido('confirmar') || noCoincide()"
            />
            @if (noCoincide()) {
              <span class="error-text">Las contraseñas no coinciden.</span>
            }
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="cargando()">
            @if (cargando()) {
              <span class="spinner"></span> Creando cuenta…
            } @else {
              Crear cuenta
            }
          </button>

          <p class="auth-foot">¿Ya tienes cuenta? <a routerLink="/login">Ingresar</a></p>
        </form>
      </main>
    </div>
  `,
  styles: `
    .meter {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
    }
    .meter span {
      height: 5px;
      border-radius: 3px;
      background: var(--line);
    }
    .meter span.on {
      background: var(--danger);
    }
    .meter span.on[data-n='2'] {
      background: #d98a00;
    }
    .meter span.on[data-n='3'] {
      background: #2a78d6;
    }
    .meter span.on[data-n='4'] {
      background: #008300;
    }
  `,
})
export class RegistroComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly cargando = signal(false);
  protected readonly verPassword = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: [coincide] },
  );

  private readonly passwordActual = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

  protected readonly fuerza = computed(() => {
    const p = this.passwordActual();
    let nivel = 0;
    if (p.length >= 8) nivel++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) nivel++;
    if (/\d/.test(p)) nivel++;
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) nivel++;
    if (p.length === 0) nivel = 0;
    return { nivel, etiqueta: ['—', 'débil', 'aceptable', 'buena', 'fuerte'][nivel] };
  });

  protected invalido(campo: Campo): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  protected noCoincide(): boolean {
    const c = this.form.controls.confirmar;
    return this.form.hasError('noCoincide') && (c.touched || c.dirty);
  }

  protected enviar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.cargando.set(true);
    const { nombre, email, password } = this.form.getRawValue();

    this.auth.registro({ nombre: nombre.trim(), email: email.trim(), password }).subscribe({
      next: () => {
        this.cargando.set(false);
        this.toast.success('Cuenta creada. ¡Ya puedes reportar incidencias!');
        this.router.navigateByUrl(this.auth.homeUrl());
      },
      error: (e: ApiException) => {
        this.cargando.set(false);
        this.error.set(e.message);
      },
    });
  }
}
