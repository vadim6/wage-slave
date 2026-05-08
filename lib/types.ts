import type { Application, Company, ApplicationFile, ApplicationEvent, Contact, Note } from '@prisma/client'

export type Stage = 'WISHLIST' | 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN' | 'GHOSTED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
export type EventType = 'APPLICATION_SENT' | 'RECRUITER_CALL' | 'TECHNICAL_SCREEN' | 'INTERVIEW_ROUND' | 'TAKE_HOME_TASK' | 'OFFER_RECEIVED' | 'REJECTION_RECEIVED' | 'FOLLOW_UP_SENT' | 'OTHER'
export type FileType = 'JOB_DESCRIPTION' | 'COVER_LETTER' | 'RESUME' | 'OTHER'

export type ApplicationWithRelations = Application & {
  company: Company
  files: ApplicationFile[]
  events: ApplicationEvent[]
  contacts: Contact[]
  notes: Note[]
}

export interface ScrapedJD {
  roleTitle: string
  company: string
  location: string | null
  workType: 'Remote' | 'Hybrid' | 'On-site' | null
  salary: string | null
  requirements: string[]
  responsibilities: string[]
  rawText: string
}

export interface StatsResponse {
  stageCounts: { stage: Stage; count: number }[]
  weeklyApplications: { week: string; count: number }[]
  responseRate: number
  sourceCounts: { source: string; count: number }[]
  totalActive: number
  totalOffers: number
}

export const STAGE_LABELS: Record<Stage, string> = {
  WISHLIST: 'Wishlist',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  GHOSTED: 'Ghosted',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  APPLICATION_SENT: 'Application sent',
  RECRUITER_CALL: 'Recruiter call',
  TECHNICAL_SCREEN: 'Technical screen',
  INTERVIEW_ROUND: 'Interview round',
  TAKE_HOME_TASK: 'Take-home task',
  OFFER_RECEIVED: 'Offer received',
  REJECTION_RECEIVED: 'Rejection received',
  FOLLOW_UP_SENT: 'Follow-up sent',
  OTHER: 'Other',
}

export const TERMINAL_STAGES: Stage[] = ['REJECTED', 'WITHDRAWN', 'GHOSTED']

export const PIPELINE_STAGES: Stage[] = ['WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER']
