import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'

const BASE_STYLE = {
  backgroundColor: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  color: 'var(--color-text)',
  padding: '7px 12px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ style, ...props }, ref) => (
    <input ref={ref} style={{ ...BASE_STYLE, ...style }} {...props} />
  )
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ style, children, ...props }, ref) => (
    <select
      ref={ref}
      style={{ ...BASE_STYLE, cursor: 'pointer', ...style }}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ style, ...props }, ref) => (
    <textarea
      ref={ref}
      style={{ ...BASE_STYLE, resize: 'vertical', minHeight: '80px', ...style }}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

interface LabelProps {
  children: React.ReactNode
  htmlFor?: string
}

export function Label({ children, htmlFor }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--color-muted)',
        marginBottom: '4px',
      }}
    >
      {children}
    </label>
  )
}

interface FieldProps {
  label: string
  htmlFor?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
