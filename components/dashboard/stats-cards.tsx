interface StatsCardsProps {
  totalActive: number
  totalOffers: number
  responseRate: number
  totalApplications: number
}

interface CardProps {
  label: string
  value: string | number
  color?: string
}

function Card({ label, value, color }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '20px',
      }}
    >
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ fontSize: '32px', fontWeight: 700, color: color ?? 'var(--color-text)', margin: 0, lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

export function StatsCards({ totalActive, totalOffers, responseRate, totalApplications }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <Card label="Total Applications" value={totalApplications} />
      <Card label="Active" value={totalActive} color="var(--color-accent)" />
      <Card label="Response Rate" value={`${responseRate}%`} color="#34d399" />
      <Card label="Offers" value={totalOffers} color="#10b981" />
    </div>
  )
}
