import type { Stage, EventType } from '@/lib/types'

export function stageToEventType(stage: Stage): EventType | null {
  const map: Partial<Record<Stage, EventType>> = {
    APPLIED: 'APPLICATION_SENT',
    SCREENING: 'RECRUITER_CALL',
    INTERVIEW: 'INTERVIEW_ROUND',
    OFFER: 'OFFER_RECEIVED',
    REJECTED: 'REJECTION_RECEIVED',
  }
  return map[stage] ?? null
}

export function stageToEventTitle(stage: Stage): string | null {
  const map: Partial<Record<Stage, string>> = {
    APPLIED: 'Application submitted',
    SCREENING: 'Moved to screening',
    INTERVIEW: 'Interview stage',
    OFFER: 'Offer received',
    REJECTED: 'Rejected',
    WITHDRAWN: 'Withdrew application',
    GHOSTED: 'Marked as ghosted',
  }
  return map[stage] ?? null
}
