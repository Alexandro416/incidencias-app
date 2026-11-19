import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ConfirmService } from '../core/services/confirm.service';
import { IconComponent } from './icon.component';

/** Layout de las áreas privadas: barra superior con navegación según el rol + <router-outlet>. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <div class="container bar-in">
        <a class="brand" routerLink="/" aria-label="Incidencias Lima, ir al inicio">
          <span class="logo"><app-icon name="map-pin" [size]="18" /></span>
          <span class="brand-name">Incidencias <b>Lima</b></span>
        </a>

        <nav aria-label="Principal">
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">
              <app-icon name="dashboard" [size]="17" /> <span>Panel</span>
            </a>
            <a routerLink="/admin/distritos" routerLinkActive="on">
              <app-icon name="building" [size]="17" /> <span>Distritos</span>
            </a>
          } @else {
            <a routerLink="/ciudadano" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">
              <app-icon name="clipboard" [size]="17" /> <span>Mis incidencias</span>
            </a>
            <a routerLink="/ciudadano/nueva" routerLinkActive="on">
              <app-icon name="plus" [size]="17" /> <span>Reportar</span>
            </a>
          }
        </nav>

        <div class="user">
          <div class="who">
            <span class="email truncate">{{ auth.email() }}</span>
            <span class="rol" [class.admin]="auth.isAdmin()">
              <app-icon [name]="auth.isAdmin() ? 'shield' : 'user'" [size]="12" />
              {{ auth.isAdmin() ? 'Administrador' : 'Ciudadano' }}
            </span>
          </div>
          <button type="button" class="btn btn-sm" (click)="salir()">
            <app-icon name="logout" [size]="16" /> <span class="salir-txt">Salir</span>
          </button>
        </div>
      </div>
    </header>

    <main class="container page">
      <router-outlet />
    </main>
  `,
  styles: `
    .bar {
      position: sticky;
      top: 0;
      z-index: 900;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--line);
    }
    .bar-in {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      min-height: 64px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      color: var(--ink);
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 500;
    }
    .brand b {
      color: var(--brand);
      font-weight: 700;
    }
    .logo {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: var(--brand);
      color: var(--signal);
    }
    nav {
      display: flex;
      gap: 0.25rem;
      flex: 1;
    }
    nav a {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 0.85rem;
      border-radius: 9px;
      color: var(--ink-2);
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    nav a:hover {
      background: rgba(16, 36, 59, 0.06);
      color: var(--ink);
    }
    nav a.on {
      background: var(--brand-soft);
      color: var(--brand-ink);
    }
    .user {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }
    .who {
      display: grid;
      justify-items: end;
      line-height: 1.25;
      min-width: 0;
    }
    .email {
      max-width: 200px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .rol {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.75rem;
      color: var(--ink-2);
    }
    .rol.admin {
      color: var(--signal-ink);
      font-weight: 600;
    }
    @media (max-width: 720px) {
      .bar-in {
        gap: 0.5rem;
        flex-wrap: wrap;
        padding-block: 0.5rem;
      }
      .brand-name,
      .who,
      .salir-txt,
      nav a span {
        display: none;
      }
      nav {
        justify-content: center;
      }
      nav a {
        padding: 0.55rem;
      }
    }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);

  protected async salir() {
    const ok = await this.confirm.ask({
      titulo: '¿Cerrar sesión?',
      mensaje: 'Tendrás que ingresar de nuevo con tu correo y contraseña.',
      confirmar: 'Cerrar sesión',
    });
    if (ok) this.auth.logout();
  }
}
