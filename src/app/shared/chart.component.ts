import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);
Chart.defaults.font.family = '"Public Sans", system-ui, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#4a5c70';

/** Envoltorio mínimo de Chart.js (sin ng2-charts, así no hay conflictos de versiones con Angular). */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #cv role="img" [attr.aria-label]="etiqueta()"></canvas>`,
  styles: `
    :host {
      display: block;
      position: relative;
      height: 100%;
      min-height: 0;
    }
  `,
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly config = input.required<ChartConfiguration<any>>();
  readonly etiqueta = input('Gráfico');

  private readonly cv = viewChild.required<ElementRef<HTMLCanvasElement>>('cv');
  private chart?: Chart;

  constructor() {
    effect(() => {
      const cfg = this.config();
      if (!this.chart) return;
      this.chart.data = cfg.data;
      this.chart.options = cfg.options ?? {};
      this.chart.update();
    });
  }

  ngAfterViewInit() {
    const cfg = this.config();
    const sinAnimacion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.chart = new Chart(this.cv().nativeElement, {
      ...cfg,
      options: { ...(cfg.options ?? {}), ...(sinAnimacion ? { animation: false } : {}) },
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }
}
