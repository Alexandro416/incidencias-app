import { ChangeDetectionStrategy, Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from '../core/services/confirm.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-confirm-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (svc.request(); as r) {
      <div class="modal-backdrop" style="z-index: 1500" (click)="svc.responder(false)">
        <div
          class="modal dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-msg"
          (click)="$event.stopPropagation()"
        >
          <div class="ico" [class.peligro]="r.opts.tono === 'peligro'">
            <app-icon [name]="r.opts.tono === 'peligro' ? 'alert' : 'info'" [size]="24" />
          </div>
          <h3 id="confirm-title">{{ r.opts.titulo }}</h3>
          <p id="confirm-msg" class="muted">{{ r.opts.mensaje }}</p>
          <div class="actions">
            <button #cancelBtn type="button" class="btn" (click)="svc.responder(false)">
              {{ r.opts.cancelar ?? 'Cancelar' }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn-danger]="r.opts.tono === 'peligro'"
              [class.btn-primary]="r.opts.tono !== 'peligro'"
              (click)="svc.responder(true)"
            >
              {{ r.opts.confirmar ?? 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .dialog {
      width: min(420px, 100%);
      padding: 1.5rem;
      display: grid;
      gap: 0.6rem;
    }
    .ico {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: var(--brand-soft);
      color: var(--brand);
      margin-bottom: 0.2rem;
    }
    .ico.peligro {
      background: var(--danger-soft);
      color: var(--danger);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      margin-top: 0.9rem;
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly svc = inject(ConfirmService);
  private readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');

  constructor() {
    effect(() => {
      if (this.svc.request()) setTimeout(() => this.cancelBtn()?.nativeElement.focus(), 0);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.svc.request()) this.svc.responder(false);
  }
}
