import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  template: `
    <div
      class="progress"
      role="progressbar"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="total()"
      [attr.aria-valuenow]="value()"
      [attr.aria-valuetext]="computedLabel()"
      [attr.aria-label]="computedLabel()"
    >
      <div class="label">{{ computedLabel() }}</div>
      <div class="track">
        <div
          class="fill"
          [style.width.%]="percent()"
          [style.backgroundColor]="accent() || 'var(--ios-green)'"
        ></div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .progress {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .label {
        font-size: 12px;
        color: var(--ios-secondary);
        letter-spacing: 0.02em;
      }

      .track {
        width: 100%;
        height: 4px;
        border-radius: 999px;
        background: #e5e7eb;
        overflow: hidden;
      }

      .fill {
        height: 100%;
        width: 0;
        border-radius: 999px;
        transition: width 200ms ease;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressBarComponent {
  readonly value = input(0);
  readonly total = input(0);
  readonly label = input<string | null>(null);
  readonly accent = input<string | null>(null);

  readonly percent = computed(() => {
    const total = this.total();
    if (!total) return 0;
    return Math.min(100, Math.max(0, (this.value() / total) * 100));
  });

  readonly computedLabel = computed(() => {
    const custom = this.label();
    if (custom) return custom;
    return `${this.value()}/${this.total()} erledigt`;
  });
}
