import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiException } from '../../core/utils/error.util';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth">
      <aside class="auth-side">
        <a routerLink="/" class="auth-brand">
          <span class="logo"><app-icon name="map-pin" [size]="18" /></span> Incidencias Lima
        </a>
        <div>
          <h2>Tu distrito mejora cuando se reporta.</h2>
          <p>Ingresa para ver el estado de tus reportes o gestionar las incidencias de la ciudad.</p>
        </div>
        <div class="pins-deco" aria-hidden="true">
          <div style="--c: #eda100"><span class="dot"></span> Pendiente: recibido</div>
          <div style="--c: #6250d6"><span class="dot"></span> En proceso: un equipo trabaja en ello</div>
          <div style="--c: #008300"><span class="dot"></span> Resuelto: problema solucionado</div>
        </div>
      </aside>

      <main class="auth-main">
        <form class="auth-form" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
          <header>
            <h1 style="font-size: 2rem">Ingresar</h1>
            <p>Usa el correo con el que te registraste.</p>
          </header>

          @if (error()) {
            <div class="alert alert-error" role="alert">
              <app-icon name="alert" [size]="18" />
              <span>{{ error() }}</span>
            </div>
          }

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
              <span class="error-text">Ingresa un correo válido.</span>
            }
          </div>

          <div class="field">
            <label for="password">Contraseña</label>
            <div class="input-wrap">
              <input
                id="password"
                class="input"
                [type]="verPassword() ? 'text' : 'password'"
                autocomplete="current-password"
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
            @if (invalido('password')) {
              <span class="error-text">Ingresa tu contraseña.</span>
            }
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="cargando()">
            @if (cargando()) {
              <span class="spinner"></span> Ingresando…
            } @else {
              Ingresar
            }
          </button>

          @if (demo) {
            <button type="button" class="btn btn-sm btn-block" (click)="usarAdminDemo()">
              <app-icon name="shield" [size]="15" /> Rellenar con la cuenta de administrador (demo)
            </button>
          }

          <p class="auth-foot">¿Aún no tienes cuenta? <a routerLink="/registro">Crear cuenta</a></p>
        </form>
      </main>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly demo = environment.showDemoHints;
  protected readonly cargando = signal(false);
  protected readonly verPassword = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected invalido(campo: 'email' | 'password'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  protected usarAdminDemo() {
    this.form.setValue({ email: environment.adminDemo.email, password: environment.adminDemo.password });
    this.error.set(null);
  }

  protected enviar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.cargando.set(true);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (r) => {
        this.cargando.set(false);
        this.toast.success(`Bienvenido, ${r.email}`);
        const destino = this.auth.homeUrl();
        const volver = this.route.snapshot.queryParamMap.get('returnUrl');
        // Solo se vuelve a la URL pedida si pertenece al área del rol (evita redirecciones abiertas).
        this.router.navigateByUrl(volver && volver.startsWith(destino) ? volver : destino);
      },
      error: (e: ApiException) => {
        this.cargando.set(false);
        this.error.set(e.message);
      },
    });
  }
}
