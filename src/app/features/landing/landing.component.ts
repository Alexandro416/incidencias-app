import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ESTADOS, ESTADO_META } from '../../core/utils/estado.util';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top">
      <div class="container top-in">
        <a class="brand" routerLink="/">
          <span class="logo"><app-icon name="map-pin" [size]="18" /></span>
          <span>Incidencias <b>Lima</b></span>
        </a>
        <nav class="row">
          @if (auth.isLoggedIn()) {
            <a class="btn btn-primary" [routerLink]="auth.homeUrl()">
              {{ auth.isAdmin() ? 'Ir al panel' : 'Ir a mis incidencias' }}
            </a>
          } @else {
            <a class="btn btn-ghost" routerLink="/login">Ingresar</a>
            <a class="btn btn-primary" routerLink="/registro">Crear cuenta</a>
          }
        </nav>
      </div>
    </header>

    <main>
      <section class="hero container">
        <div class="hero-copy">
          <h1>Si está roto en tu cuadra, ponlo en el mapa.</h1>
          <p class="lead">
            Reporta baches, luminarias apagadas o basura acumulada en cualquier distrito de Lima y sigue el avance hasta
            que la municipalidad lo resuelva.
          </p>
          <div class="row cta">
            @if (auth.isLoggedIn()) {
              <a class="btn btn-signal" [routerLink]="auth.isAdmin() ? '/admin' : '/ciudadano/nueva'">
                <app-icon name="plus" [size]="18" />
                {{ auth.isAdmin() ? 'Abrir el panel' : 'Reportar una incidencia' }}
              </a>
            } @else {
              <a class="btn btn-signal" routerLink="/registro">
                <app-icon name="plus" [size]="18" /> Reportar una incidencia
              </a>
              <a class="btn" routerLink="/login">Ya tengo cuenta</a>
            }
          </div>
        </div>

        <div class="map-card" aria-hidden="true">
          <svg viewBox="0 0 520 440" role="img">
            <rect width="520" height="440" fill="#dfe9e4" />
            <path d="M-10 330C80 300 140 340 230 300S400 240 530 270V450H-10Z" fill="#c9dfe0" />
            <g fill="#e9f0ec" stroke="#cdd9d3" stroke-width="2">
              <rect x="30" y="30" width="120" height="80" rx="8" />
              <rect x="170" y="30" width="90" height="80" rx="8" />
              <rect x="290" y="30" width="200" height="80" rx="8" />
              <rect x="30" y="140" width="80" height="110" rx="8" />
              <rect x="130" y="140" width="150" height="110" rx="8" />
              <rect x="310" y="140" width="85" height="110" rx="8" />
              <rect x="415" y="140" width="75" height="110" rx="8" />
            </g>
            <path d="M0 125H520M0 265H520M155 0V330M285 0V290M405 0V280" stroke="#fff" stroke-width="12" />
            <path d="M-10 190 520 60" stroke="#fff" stroke-width="8" />
            <g class="lpin p1"><circle cx="95" cy="190" r="17" fill="#6250d6" /><circle cx="95" cy="190" r="6" fill="#fff" /></g>
            <g class="lpin p2"><circle cx="350" cy="195" r="17" fill="#008300" /><circle cx="350" cy="195" r="6" fill="#fff" /></g>
            <g class="lpin p3"><circle cx="220" cy="85" r="17" fill="#2a78d6" /><circle cx="220" cy="85" r="6" fill="#fff" /></g>
            <g class="lpin p4"><circle cx="440" cy="85" r="17" fill="#e34948" /><circle cx="440" cy="85" r="6" fill="#fff" /></g>
            <g class="nuevo">
              <circle class="onda" cx="220" cy="215" r="20" fill="none" stroke="#f26a2e" stroke-width="3" />
              <circle cx="220" cy="215" r="17" fill="#eda100" />
              <circle cx="220" cy="215" r="6" fill="#fff" />
            </g>
          </svg>
          <div class="chip nuevo-chip"><span class="dot"></span> Nuevo reporte: bache en Av. Arequipa</div>
        </div>
      </section>

      <section class="container como">
        <h2>Así funciona</h2>
        <ol>
          <li>
            <span class="n">1</span>
            <h3>Marca el lugar</h3>
            <p>Haz clic en el mapa de Lima. Las coordenadas se guardan solas, sin escribir nada.</p>
          </li>
          <li>
            <span class="n">2</span>
            <h3>Describe y adjunta una foto</h3>
            <p>Cuéntanos qué pasa y, si puedes, agrega el enlace de una imagen como evidencia.</p>
          </li>
          <li>
            <span class="n">3</span>
            <h3>Sigue el avance</h3>
            <p>Tu reporte pasa por revisión, proceso y resolución. Lo ves en tiempo real.</p>
          </li>
        </ol>
      </section>

      <section class="container estados">
        <div>
          <h2>Cada reporte tiene un estado claro</h2>
          <p class="muted">Mientras esté pendiente, puedes editarlo o eliminarlo.</p>
        </div>
        <ul>
          @for (e of estados; track e) {
            <li [class]="'estado-' + e">
              <span class="badge">{{ meta[e].label }}</span>
              <span class="muted small">{{ meta[e].descripcion }}</span>
            </li>
          }
        </ul>
      </section>
    </main>

    <footer class="foot">
      <div class="container">Plataforma Web de Incidencias Urbanas en Lima · Proyecto de Desarrollo Web Integrado</div>
    </footer>
  `,
  styles: `
    .top {
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .top-in {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 66px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      color: var(--ink);
      text-decoration: none;
      font-family: var(--font-display);
      font-size: 1.2rem;
    }
    .brand b {
      color: var(--brand);
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
    .hero {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 3rem;
      align-items: center;
      padding-block: 4.5rem 3.5rem;
    }
    .hero h1 {
      max-width: 16ch;
    }
    .lead {
      margin-top: 1.2rem;
      font-size: 1.12rem;
      color: var(--ink-2);
      max-width: 48ch;
    }
    .cta {
      margin-top: 1.8rem;
    }
    .map-card {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid var(--line-strong);
      box-shadow: var(--shadow-lg);
      transform: rotate(1.2deg);
    }
    .map-card svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .lpin circle:first-child {
      stroke: #fff;
      stroke-width: 4;
      filter: drop-shadow(0 3px 4px rgba(16, 36, 59, 0.3));
    }
    .nuevo circle:nth-child(2) {
      stroke: #fff;
      stroke-width: 4;
    }
    .onda {
      transform-origin: 220px 215px;
      animation: onda 2.2s ease-out infinite;
    }
    @keyframes onda {
      from {
        transform: scale(1);
        opacity: 0.9;
      }
      to {
        transform: scale(3);
        opacity: 0;
      }
    }
    .nuevo-chip {
      position: absolute;
      left: 16px;
      bottom: 16px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.9rem;
      border-radius: 999px;
      background: var(--ink);
      color: #fff;
      font-size: 0.82rem;
      font-weight: 600;
    }
    .nuevo-chip .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #eda100;
    }
    .como {
      padding-block: 2.5rem 3rem;
    }
    .como h2 {
      margin-bottom: 1.5rem;
    }
    .como ol {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }
    .como li {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 1.4rem;
      display: grid;
      gap: 0.5rem;
      align-content: start;
    }
    .como li p {
      color: var(--ink-2);
    }
    .n {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--signal);
      color: #1c1006;
      font-weight: 700;
      font-family: var(--font-display);
    }
    .estados {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 2rem;
      align-items: center;
      padding-block: 1.5rem 4.5rem;
    }
    .estados ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }
    .estados li {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.65rem 0.9rem;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 12px;
    }
    .estados .badge {
      min-width: 112px;
    }
    .foot {
      border-top: 1px solid var(--line);
      padding: 1.5rem 0;
      color: var(--ink-3);
      font-size: 0.85rem;
    }
    @media (max-width: 900px) {
      .hero,
      .estados {
        grid-template-columns: 1fr;
      }
      .hero {
        padding-top: 2.5rem;
      }
      .como ol {
        grid-template-columns: 1fr;
      }
      .map-card {
        transform: none;
      }
    }
  `,
})
export class LandingComponent {
  protected readonly auth = inject(AuthService);
  protected readonly estados = ESTADOS;
  protected readonly meta = ESTADO_META;
}
