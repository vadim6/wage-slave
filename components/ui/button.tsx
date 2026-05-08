import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const VARIANT_STYLES = {
  primary: {
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    border: '1px solid transparent',
  },
  secondary: {
    backgroundColor: 'var(--color-surface-2)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-muted)',
    border: '1px solid transparent',
  },
  danger: {
    backgroundColor: 'transparent',
    color: '#f87171',
    border: '1px solid #f8717144',
  },
}

const SIZE_STYLES = {
  sm: { padding: '4px 10px', fontSize: '13px' },
  md: { padding: '7px 14px', fontSize: '14px' },
  lg: { padding: '10px 20px', fontSize: '15px' },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', style, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        style={{
          ...VARIANT_STYLES[variant],
          ...SIZE_STYLES[size],
          borderRadius: '6px',
          fontWeight: 500,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          opacity: props.disabled ? 0.5 : 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'opacity 0.15s, background-color 0.15s',
          ...style,
        }}
        className={className}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
