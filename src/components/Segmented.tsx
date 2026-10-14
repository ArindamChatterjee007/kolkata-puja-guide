import type { ReactNode } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  title?: string
  hint?: string
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: readonly SegmentOption<T>[]
  onChange: (value: T) => void
  compact?: boolean
}

export function Segmented<T extends string>({ label, value, options, onChange, compact }: SegmentedProps<T>) {
  return (
    <div className={`segmented${compact ? ' segmented--compact' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            className={`segmented__item${checked ? ' is-active' : ''}`}
            title={option.title ?? (typeof option.label === 'string' ? option.label : undefined)}
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            {option.hint && <small>{option.hint}</small>}
          </button>
        )
      })}
    </div>
  )
}
