import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  titulo: string;
  mensaje: string;
  confirmar?: string;
  cancelar?: string;
  tono?: 'normal' | 'peligro';
}

export interface ConfirmRequest {
  opts: ConfirmOptions;
  resolve: (valor: boolean) => void;
}

/** Modal de confirmación basado en promesas: `if (await confirm.ask({...})) { ... }` */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(opts: ConfirmOptions): Promise<boolean> {
    this.request()?.resolve(false);
    return new Promise<boolean>((resolve) => this.request.set({ opts, resolve }));
  }

  responder(valor: boolean) {
    const r = this.request();
    if (!r) return;
    this.request.set(null);
    r.resolve(valor);
  }
}
