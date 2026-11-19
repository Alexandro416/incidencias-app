import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  success(mensaje: string) {
    this.mostrar('success', mensaje);
  }
  error(mensaje: string) {
    this.mostrar('error', mensaje, 7000);
  }
  info(mensaje: string) {
    this.mostrar('info', mensaje);
  }
  warning(mensaje: string) {
    this.mostrar('warning', mensaje, 6000);
  }

  cerrar(id: number) {
    this.toasts.update((l) => l.filter((t) => t.id !== id));
  }

  private mostrar(tipo: ToastTipo, mensaje: string, ms = 4200) {
    const id = ++this.seq;
    this.toasts.update((l) => [...l.slice(-3), { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), ms);
  }
}
