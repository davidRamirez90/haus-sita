import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-category-chip',
  template: `
    <button
      type="button"
      class="chip"
      [class.active]="active()"
      [attr.aria-pressed]="active()"
      (click)="select()"
    >
      {{ label() }}
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .chip {
        border: none;
        background: #f3f4f6;
        color: var(--ios-secondary);
        padding: 8px 14px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 160ms ease, color 160ms ease;
        white-space: nowrap;
      }

      .chip.active {
        background: #e5e7eb;
        color: var(--ios-text);
      }

      .chip:focus-visible {
        outline: 2px solid rgba(0, 122, 255, 0.7);
        outline-offset: 2px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryChipComponent {
  readonly label = input.required<string>();
  readonly active = input(false);
  readonly selected = output<void>();

  select(): void {
    this.selected.emit();
  }
}
