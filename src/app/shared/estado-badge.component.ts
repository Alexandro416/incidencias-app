import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoIncidencia } from '../core/models/models';
import { ESTADO_META } from '../core/utils/estado.util';

@Component({
  selector: 'app-estado-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge estado-' + estado()" [title]="descripcion()">{{ label() }}</span>`,
})
export class EstadoBadgeComponent {
  readonly estado = input.required<EstadoIncidencia>();
  protected readonly label = computed(() => ESTADO_META[this.estado()]?.label ?? this.estado());
  protected readonly descripcion = computed(() => ESTADO_META[this.estado()]?.descripcion ?? '');
}
