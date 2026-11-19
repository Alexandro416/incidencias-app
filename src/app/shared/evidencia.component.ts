import { ChangeDetectionStrategy, Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { IconComponent } from './icon.component';

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">
<rect width="400" height="260" fill="#e4ece8"/>
<g stroke="#c5d3cc" stroke-width="2" fill="none"><path d="M0 70h400M0 150h400M0 220h400M90 0v260M210 0v260M320 0v260"/></g>
<g transform="translate(168 78)" fill="none" stroke="#7f9a90" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
<rect x="0" y="12" width="64" height="48" rx="8"/><circle cx="32" cy="36" r="12"/><path d="M20 12l4-8h16l4 8"/></g>
<text x="200" y="176" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#6f8094">Sin evidencia fotográfica</text>
</svg>`;

/** Imagen de evidencia con imagen por defecto (si la URL es nula o falla) y vista ampliada al hacer clic. */
@Component({
  selector: 'app-evidencia',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="frame"
      [disabled]="!zoomable() || !hayImagen()"
      [attr.aria-label]="hayImagen() ? 'Ampliar imagen de evidencia' : 'Sin imagen de evidencia'"
      (click)="abierto.set(true)"
    >
      <img [src]="src()" [alt]="hayImagen() ? alt() : 'Sin evidencia fotográfica'" loading="lazy" (error)="imagenFallida()" />
      @if (hayImagen() && zoomable()) {
        <span class="zoom"><app-icon name="zoom" [size]="16" /></span>
      }
    </button>

    @if (abierto()) {
      <div class="modal-backdrop" style="z-index: 1400" (click)="abierto.set(false)">
        <figure class="lightbox" (click)="$event.stopPropagation()">
          <img [src]="src()" [alt]="alt()" />
          <figcaption>{{ alt() }}</figcaption>
          <button type="button" class="btn btn-icon close" aria-label="Cerrar imagen" (click)="abierto.set(false)">
            <app-icon name="x" [size]="18" />
          </button>
        </figure>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .frame {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: var(--ratio, 16 / 10);
      padding: 0;
      border: 0;
      border-radius: inherit;
      overflow: hidden;
      background: #e4ece8;
      cursor: zoom-in;
    }
    .frame:disabled {
      cursor: default;
    }
    .frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .frame:not(:disabled):hover img {
      transform: scale(1.04);
    }
    .zoom {
      position: absolute;
      right: 8px;
      bottom: 8px;
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: rgba(16, 36, 59, 0.72);
      color: #fff;
    }
    .lightbox {
      position: relative;
      margin: 0;
      max-width: min(1000px, 100%);
      animation: pop-in 0.22s ease;
    }
    .lightbox img {
      max-height: 80vh;
      width: auto;
      max-width: 100%;
      border-radius: 14px;
      box-shadow: var(--shadow-lg);
      background: #fff;
    }
    .lightbox figcaption {
      margin-top: 0.6rem;
      color: #fff;
      text-align: center;
      font-size: 0.9rem;
    }
    .close {
      position: absolute;
      top: -14px;
      right: -14px;
      background: #fff;
    }
  `,
})
export class EvidenciaComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly url = input<string | null | undefined>(null);
  readonly alt = input('Evidencia de la incidencia');
  readonly zoomable = input(true);

  protected readonly abierto = signal(false);
  private readonly urlFallida = signal<string | null>(null);

  private readonly placeholder: SafeUrl = this.sanitizer.bypassSecurityTrustUrl(
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PLACEHOLDER_SVG),
  );

  protected readonly hayImagen = computed(() => {
    const u = this.url()?.trim();
    return !!u && u !== this.urlFallida();
  });

  protected readonly src = computed<SafeUrl | string>(() =>
    this.hayImagen() ? this.url()!.trim() : this.placeholder,
  );

  protected imagenFallida() {
    const u = this.url()?.trim();
    if (u) this.urlFallida.set(u);
  }

  @HostListener('document:keydown.escape')
  protected cerrarConEsc() {
    this.abierto.set(false);
  }
}
