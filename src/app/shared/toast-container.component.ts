import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-container',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" role="region" aria-live="polite" aria-label="Notificaciones">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast t-' + t.tipo" [attr.role]="t.tipo === 'error' ? 'alert' : 'status'">
          <app-icon [name]="icono(t.tipo)" [size]="20" />
          <p>{{ t.mensaje }}</p>
          <button type="button" class="btn btn-ghost btn-icon" aria-label="Cerrar notificación" (click)="toast.cerrar(t.id)">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 2000;
      display: grid;
      gap: 0.6rem;
      width: min(380px, calc(100vw - 2rem));
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.7rem;
      padding: 0.8rem 0.6rem 0.8rem 0.9rem;
      background: var(--surface);
      border: 1px solid var(--line);
      border-left: 5px solid var(--c);
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      animation: toast-in 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.1);
    }
    .toast p {
      flex: 1;
      padding-top: 1px;
      font-size: 0.9rem;
    }
    .toast app-icon {
      color: var(--c);
      margin-top: 1px;
    }
    .t-success {
      --c: #008300;
    }
    .t-error {
      --c: #c8372f;
    }
    .t-info {
      --c: #2a78d6;
    }
    .t-warning {
      --c: #d98a00;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(24px);
      }
    }
  `,
})
export class ToastContainerComponent {
  protected readonly toast = inject(ToastService);

  protected icono(tipo: string): string {
    return tipo === 'success' ? 'check' : tipo === 'info' ? 'info' : 'alert';
  }
}
