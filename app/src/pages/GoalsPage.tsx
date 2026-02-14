import { useState, useMemo } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useGoals } from '@/hooks/useGoals'
import type { CategoryDoc, TrackWithProgress, ManualTimeEntryDoc } from '@/types'

// ─── Constants ─────────────────────────────────────────────

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280',
]

const CATEGORY_ICONS = [
  'book', 'code', 'palette', 'music', 'globe',
  'flask', 'calculator', 'briefcase', 'heart', 'star',
  'lightbulb', 'wrench', 'camera', 'film', 'cpu',
]

function getIconSvg(icon: string | null, className?: string) {
  const cls = className || 'w-4 h-4'
  switch (icon) {
    case 'book':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
    case 'code':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
    case 'palette':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197" /></svg>
    case 'music':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" /></svg>
    case 'globe':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>
    case 'flask':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l.051.057a2.25 2.25 0 0 1-.319 3.287l-.752.576a6.75 6.75 0 0 1-8.16 0l-.753-.576a2.25 2.25 0 0 1-.319-3.287l.051-.057" /></svg>
    case 'calculator':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.25-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.25-6.75h.008v.008H12.75v-.008Zm0 2.25h.008v.008H12.75v-.008Zm2.25-2.25h.008v.008H15v-.008Zm0 2.25h.008v.008H15v-.008Zm-7.5-4.5h9.75v3H7.5v-3ZM6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /></svg>
    case 'briefcase':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
    case 'heart':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
    case 'star':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
    case 'lightbulb':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
    case 'wrench':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z" /></svg>
    case 'camera':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
    case 'film':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" /></svg>
    case 'cpu':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" /></svg>
    default:
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>
  }
}

// ─── SVG Icons ─────────────────────────────────────────────

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  )
}

// ─── Helpers ───────────────────────────────────────────────

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${Math.round(hours * 10) / 10}h`
}

function formatDeadline(isoStr: string | null): string {
  if (!isoStr) return 'No deadline'
  const date = new Date(isoStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000)
  const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  if (diffDays < 0) return `Overdue (${formatted})`
  if (diffDays === 0) return `Due today`
  if (diffDays <= 7) return `${diffDays}d left`
  return formatted
}

function entryDate(entry: ManualTimeEntryDoc): string {
  const ts = entry.occurredAt
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts as unknown as string)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Main Goals Page ───────────────────────────────────────

export function GoalsPage() {
  const {
    categories,
    tracks,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    createTrack,
    updateTrack,
    deleteTrack,
    addManualEntry,
    deleteManualEntry,
    getEntriesForCategory,
  } = useGoals()

  // View state
  const [view, setView] = useState<'tracks' | 'categories'>('tracks')
  const [selectedTrack, setSelectedTrack] = useState<TrackWithProgress | null>(null)

  // Dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryDoc | null>(null)
  const [showTrackDialog, setShowTrackDialog] = useState(false)
  const [editingTrack, setEditingTrack] = useState<TrackWithProgress | null>(null)
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false)
  const [timeEntryCategoryId, setTimeEntryCategoryId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'category' | 'track'; id: string; name: string } | null>(null)

  // Categorized tracks
  const categoriesWithTracks = useMemo(() => {
    const map = new Map<string, TrackWithProgress[]>()
    for (const track of tracks) {
      const catId = track.category_id
      if (!map.has(catId)) map.set(catId, [])
      map.get(catId)!.push(track)
    }
    return map
  }, [tracks])

  const categoriesWithoutTracks = useMemo(() => {
    return categories.filter(
      (c) => c.id !== 'uncategorized' && !categoriesWithTracks.has(c.id)
    )
  }, [categories, categoriesWithTracks])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Track detail view
  if (selectedTrack) {
    const entries = getEntriesForCategory(selectedTrack.category_id)
    return (
      <TrackDetailView
        track={selectedTrack}
        entries={entries}
        onBack={() => setSelectedTrack(null)}
        onEdit={() => {
          setEditingTrack(selectedTrack)
          setShowTrackDialog(true)
        }}
        onDelete={() => setConfirmDelete({ type: 'track', id: selectedTrack.id, name: selectedTrack.category.name })}
        onAddTime={() => {
          setTimeEntryCategoryId(selectedTrack.category_id)
          setShowTimeEntryDialog(true)
        }}
        onDeleteEntry={deleteManualEntry}
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-fade">
      <div className="p-6 space-y-8 max-w-[1400px] animate-fade-in">
        {/* ─── Header ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-display font-semibold text-foreground">Goals</h2>
            <p className="text-ui-sm text-muted-foreground font-body mt-0.5">
              Track your learning progress across categories
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingCategory(null)
                setShowCategoryDialog(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-ui-sm font-body font-medium text-foreground hover:bg-accent transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Category
            </button>
            <button
              onClick={() => {
                setEditingTrack(null)
                setShowTrackDialog(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Learning Track
            </button>
          </div>
        </div>

        {/* ─── View Tabs ─────────────────────────────── */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
          <button
            onClick={() => setView('tracks')}
            className={`px-4 py-1.5 rounded-md text-ui-sm font-body font-medium transition-all ${
              view === 'tracks'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tracks
          </button>
          <button
            onClick={() => setView('categories')}
            className={`px-4 py-1.5 rounded-md text-ui-sm font-body font-medium transition-all ${
              view === 'categories'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Categories
          </button>
        </div>

        {/* ─── Tracks View ───────────────────────────── */}
        {view === 'tracks' && (
          <>
            {tracks.length === 0 ? (
              <EmptyTracksState onCreateTrack={() => {
                setEditingTrack(null)
                setShowTrackDialog(true)
              }} />
            ) : (
              <div className="space-y-8">
                {/* Summary strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SummaryCard
                    label="Active Tracks"
                    value={tracks.length}
                    unit={tracks.length === 1 ? 'track' : 'tracks'}
                    icon={<FlagIcon className="h-3 w-3" />}
                  />
                  <SummaryCard
                    label="Total Hours"
                    value={Math.round(tracks.reduce((a, t) => a + t.progress.totalHours, 0) * 10) / 10}
                    unit="hours"
                    icon={<ClockIcon className="h-3 w-3" />}
                  />
                  <SummaryCard
                    label="Avg Progress"
                    value={Math.round(tracks.reduce((a, t) => a + t.progress.percentComplete, 0) / tracks.length)}
                    unit="%"
                    icon={<FlagIcon className="h-3 w-3" />}
                    primary
                  />
                  <SummaryCard
                    label="Categories"
                    value={categories.filter((c) => c.id !== 'uncategorized').length}
                    unit="total"
                    icon={<FlagIcon className="h-3 w-3" />}
                  />
                </div>

                {/* Track cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {tracks.map((track) => (
                    <GoalTrackCard
                      key={track.id}
                      track={track}
                      onClick={() => setSelectedTrack(track)}
                      onAddTime={() => {
                        setTimeEntryCategoryId(track.category_id)
                        setShowTimeEntryDialog(true)
                      }}
                    />
                  ))}
                </div>

                {/* Categories without tracks */}
                {categoriesWithoutTracks.length > 0 && (
                  <section>
                    <h3 className="font-display text-lg text-foreground mb-3">
                      <span className="text-muted-foreground/40 mr-2">&mdash;</span>
                      Categories without tracks
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categoriesWithoutTracks.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setEditingTrack(null)
                            setShowTrackDialog(true)
                          }}
                          className="group inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-ui-sm font-body text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#6b7280' }}
                          />
                          {cat.name}
                          <PlusIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {/* ─── Categories View ───────────────────────── */}
        {view === 'categories' && (
          <CategoriesView
            categories={categories}
            tracksMap={categoriesWithTracks}
            onEdit={(cat) => {
              setEditingCategory(cat)
              setShowCategoryDialog(true)
            }}
            onDelete={(cat) => setConfirmDelete({ type: 'category', id: cat.id, name: cat.name })}
            onCreateCategory={() => {
              setEditingCategory(null)
              setShowCategoryDialog(true)
            }}
          />
        )}
      </div>

      {/* ─── Dialogs ─────────────────────────────────── */}
      {showCategoryDialog && (
        <CategoryDialog
          editing={editingCategory}
          onSave={async (data) => {
            if (editingCategory) {
              await updateCategory(editingCategory.id, data)
            } else {
              await createCategory({ name: data.name!, color: data.color!, icon: data.icon ?? null })
            }
            setShowCategoryDialog(false)
            setEditingCategory(null)
          }}
          onClose={() => {
            setShowCategoryDialog(false)
            setEditingCategory(null)
          }}
        />
      )}

      {showTrackDialog && (
        <TrackDialog
          editing={editingTrack}
          categories={categories.filter((c) => c.id !== 'uncategorized')}
          onSave={async (data) => {
            if (editingTrack) {
              await updateTrack(editingTrack.id, data)
            } else {
              await createTrack(data as Parameters<typeof createTrack>[0])
            }
            setShowTrackDialog(false)
            setEditingTrack(null)
            setSelectedTrack(null)
          }}
          onClose={() => {
            setShowTrackDialog(false)
            setEditingTrack(null)
          }}
        />
      )}

      {showTimeEntryDialog && timeEntryCategoryId && (
        <TimeEntryDialog
          categoryId={timeEntryCategoryId}
          categoryName={categories.find((c) => c.id === timeEntryCategoryId)?.name || ''}
          onSave={async (deltaMinutes, note, occurredAt) => {
            await addManualEntry(timeEntryCategoryId, deltaMinutes, note, occurredAt)
            setShowTimeEntryDialog(false)
            setTimeEntryCategoryId(null)
          }}
          onClose={() => {
            setShowTimeEntryDialog(false)
            setTimeEntryCategoryId(null)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteDialog
          type={confirmDelete.type}
          name={confirmDelete.name}
          onConfirm={async () => {
            if (confirmDelete.type === 'category') {
              await deleteCategory(confirmDelete.id)
            } else {
              await deleteTrack(confirmDelete.id)
              setSelectedTrack(null)
            }
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ─── Summary Card ──────────────────────────────────────────

function SummaryCard({
  label,
  value,
  unit,
  icon,
  primary,
}: {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
  primary?: boolean
}) {
  return (
    <div
      className={[
        'relative rounded-xl p-3 border transition-all duration-300',
        primary
          ? 'bg-primary/[0.06] border-primary/20'
          : 'bg-card border-border',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={[
            'w-6 h-6 rounded-md flex items-center justify-center',
            primary
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground',
          ].join(' ')}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={[
            'font-mono font-bold tabular-nums',
            primary ? 'text-ui-xl text-primary' : 'text-ui-lg text-foreground',
          ].join(' ')}
        >
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70 mt-0.5 block">
        {label}
      </span>
    </div>
  )
}

// ─── Goal Track Card ───────────────────────────────────────

function GoalTrackCard({
  track,
  onClick,
  onAddTime,
}: {
  track: TrackWithProgress
  onClick: () => void
  onAddTime: () => void
}) {
  const percent = track.progress.percentComplete
  const totalHours = track.progress.totalHours
  const targetHours = track.target_hours_total
  const deadlineStr = formatDeadline(track.target_deadline)
  const isOverdue = track.target_deadline && new Date(track.target_deadline) < new Date()

  return (
    <div className="group rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-[0_6px_24px_-4px_hsla(var(--primary),0.10),0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
      <button
        onClick={onClick}
        className="w-full text-left p-4 pb-3 focus:outline-none"
      >
        {/* Category header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: (track.category.color || '#6b7280') + '20' }}
          >
            <span style={{ color: track.category.color || '#6b7280' }}>
              {getIconSvg(track.category.icon)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ui-base font-medium text-foreground truncate group-hover:text-primary transition-colors duration-300">
              {track.category.name}
            </p>
            {track.source_label && (
              <p className="text-xs text-muted-foreground truncate">{track.source_label}</p>
            )}
          </div>
          <ChevronRightIcon className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
        </div>

        {/* Hours display */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="font-mono text-ui-lg font-bold text-foreground tabular-nums">
            {totalHours}h
          </span>
          {targetHours != null && targetHours > 0 && (
            <span className="text-ui-sm text-muted-foreground">/ {targetHours}h</span>
          )}
          <span className="ml-auto font-mono text-ui-sm font-semibold text-primary">
            {percent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${percent}%`,
              backgroundColor: track.category.color || 'hsl(var(--primary))',
            }}
          />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {track.weekly_target_hours != null && track.weekly_target_hours > 0 && (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {track.weekly_target_hours}h/week
            </span>
          )}
          {track.target_deadline && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
              <CalendarIcon className="h-3 w-3" />
              {deadlineStr}
            </span>
          )}
        </div>
      </button>

      {/* Quick add time button */}
      <div className="px-4 pb-3 pt-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddTime()
          }}
          className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
        >
          <PlusIcon className="w-3 h-3" />
          Log time
        </button>
      </div>
    </div>
  )
}

// ─── Track Detail View ─────────────────────────────────────

function TrackDetailView({
  track,
  entries,
  onBack,
  onEdit,
  onDelete,
  onAddTime,
  onDeleteEntry,
}: {
  track: TrackWithProgress
  entries: ManualTimeEntryDoc[]
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onAddTime: () => void
  onDeleteEntry: (id: string) => Promise<void>
}) {
  const percent = track.progress.percentComplete
  const totalHours = track.progress.totalHours
  const targetHours = track.target_hours_total || 0

  // Break down sources
  const activeHours = track.progress.activeMinutes / 60
  const manualHours = track.progress.manualMinutes / 60
  const baseHours = track.progress.manualBaseMinutes / 60

  return (
    <div className="flex-1 overflow-y-auto scroll-fade">
      <div className="p-6 space-y-8 max-w-[900px] animate-fade-in">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-ui-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to goals
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: (track.category.color || '#6b7280') + '20' }}
            >
              <span style={{ color: track.category.color || '#6b7280' }}>
                {getIconSvg(track.category.icon, 'w-6 h-6')}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-display font-semibold text-foreground">
                {track.category.name}
              </h2>
              {track.source_label && (
                <p className="text-ui-sm text-muted-foreground italic mt-0.5">{track.source_label}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Edit track"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete track"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big progress */}
        <div className="rounded-xl bg-card border border-border p-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">Total Progress</p>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold text-foreground tabular-nums">
                  {totalHours}
                </span>
                <span className="text-ui-lg text-muted-foreground">
                  {targetHours > 0 ? `/ ${targetHours} hours` : 'hours'}
                </span>
              </div>
            </div>
            <span
              className="font-mono text-3xl font-bold tabular-nums"
              style={{ color: track.category.color || 'hsl(var(--primary))' }}
            >
              {percent}%
            </span>
          </div>

          {/* Large progress bar */}
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${percent}%`,
                backgroundColor: track.category.color || 'hsl(var(--primary))',
              }}
            />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="font-mono text-ui-lg font-semibold text-foreground tabular-nums">
                {formatHours(activeHours)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Reading sessions</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-ui-lg font-semibold text-foreground tabular-nums">
                {formatHours(manualHours)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Manual entries</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-ui-lg font-semibold text-foreground tabular-nums">
                {formatHours(baseHours)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Base hours</p>
            </div>
          </div>
        </div>

        {/* Track details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {track.weekly_target_hours != null && track.weekly_target_hours > 0 && (
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Weekly target</span>
              </div>
              <p className="font-mono text-ui-lg font-semibold text-foreground">
                {track.weekly_target_hours}h / week
              </p>
            </div>
          )}
          {track.target_deadline && (
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Deadline</span>
              </div>
              <p className="font-mono text-ui-lg font-semibold text-foreground">
                {formatDeadline(track.target_deadline)}
              </p>
            </div>
          )}
          {track.notes && (
            <div className="rounded-xl bg-card border border-border p-4 md:col-span-full">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
              <p className="text-ui-sm text-foreground">{track.notes}</p>
            </div>
          )}
        </div>

        {/* Time entries */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-foreground">
              <span className="text-muted-foreground/40 mr-2">&mdash;</span>
              Manual Time Entries
            </h3>
            <button
              onClick={onAddTime}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-ui-sm font-body text-foreground hover:bg-accent transition-colors"
            >
              <PlusIcon className="w-3 h-3" />
              Add entry
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <ClockIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-ui-sm text-muted-foreground">
                No manual entries yet. Log time spent outside of reading sessions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 group"
                >
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <ClockIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ui-sm font-medium text-foreground">
                      {entry.deltaMinutes >= 60
                        ? `${Math.floor(entry.deltaMinutes / 60)}h ${entry.deltaMinutes % 60}m`
                        : `${entry.deltaMinutes}m`}
                    </p>
                    {entry.note && (
                      <p className="text-xs text-muted-foreground truncate">{entry.note}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{entryDate(entry)}</span>
                  <button
                    onClick={() => onDeleteEntry(entry.id)}
                    className="p-1 rounded text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete entry"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ─── Categories View ───────────────────────────────────────

function CategoriesView({
  categories,
  tracksMap,
  onEdit,
  onDelete,
  onCreateCategory,
}: {
  categories: CategoryDoc[]
  tracksMap: Map<string, TrackWithProgress[]>
  onEdit: (cat: CategoryDoc) => void
  onDelete: (cat: CategoryDoc) => void
  onCreateCategory: () => void
}) {
  const userCategories = categories.filter((c) => c.id !== 'uncategorized')

  if (userCategories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <FlagIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="text-ui-lg font-body font-medium text-foreground mb-1">
          No categories yet
        </h3>
        <p className="text-ui-sm text-muted-foreground font-body mb-4 max-w-sm mx-auto">
          Create categories to organize your books and set up learning tracks.
        </p>
        <button
          onClick={onCreateCategory}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Create your first category
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {userCategories.map((cat) => {
        const trackList = tracksMap.get(cat.id) || []
        return (
          <div
            key={cat.id}
            className="rounded-xl bg-card border border-border p-4 group hover:border-primary/20 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: (cat.color || '#6b7280') + '20' }}
              >
                <span style={{ color: cat.color || '#6b7280' }}>
                  {getIconSvg(cat.icon)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ui-base font-medium text-foreground truncate">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {trackList.length > 0
                    ? `${trackList.length} track${trackList.length !== 1 ? 's' : ''}`
                    : 'No tracks'}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(cat)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Edit category"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(cat)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete category"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Show color swatch */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color || '#6b7280' }}
              />
              {cat.color || '#6b7280'}
              {cat.icon && (
                <>
                  <span className="mx-1">&middot;</span>
                  {cat.icon}
                </>
              )}
            </div>
          </div>
        )
      })}

      {/* Add category card */}
      <button
        onClick={onCreateCategory}
        className="rounded-xl border border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors min-h-[120px]"
      >
        <PlusIcon className="w-6 h-6" />
        <span className="text-ui-sm font-body">Add category</span>
      </button>
    </div>
  )
}

// ─── Empty Tracks State ────────────────────────────────────

function EmptyTracksState({ onCreateTrack }: { onCreateTrack: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <FlagIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="text-ui-lg font-body font-medium text-foreground mb-1">
        No learning tracks yet
      </h3>
      <p className="text-ui-sm text-muted-foreground font-body mb-4 max-w-md mx-auto">
        Create a learning track to set hour targets, deadlines, and monitor your progress across categories.
      </p>
      <button
        onClick={onCreateTrack}
        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors"
      >
        <PlusIcon className="w-4 h-4" />
        Create your first track
      </button>
    </div>
  )
}

// ─── Category Dialog ───────────────────────────────────────

function CategoryDialog({
  editing,
  onSave,
  onClose,
}: {
  editing: CategoryDoc | null
  onSave: (data: { name?: string; color?: string; icon?: string | null }) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(editing?.name || '')
  const [color, setColor] = useState(editing?.color || CATEGORY_COLORS[0]!)
  const [icon, setIcon] = useState<string | null>(editing?.icon || 'book')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), color, icon })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogOverlay onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-semibold text-foreground">
            {editing ? 'Edit Category' : 'New Category'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="block text-ui-sm font-body font-medium text-foreground mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Machine Learning, Philosophy..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
            required
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-ui-sm font-body font-medium text-foreground mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${
                  color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className="block text-ui-sm font-body font-medium text-foreground mb-2">Icon</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                  icon === i
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
              >
                {getIconSvg(i, 'w-4 h-4')}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color + '20' }}
          >
            <span style={{ color }}>{getIconSvg(icon, 'w-4 h-4')}</span>
          </div>
          <span className="text-ui-sm font-medium text-foreground">
            {name || 'Category name'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-ui-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </form>
    </DialogOverlay>
  )
}

// ─── Track Dialog ──────────────────────────────────────────

function TrackDialog({
  editing,
  categories,
  onSave,
  onClose,
}: {
  editing: TrackWithProgress | null
  categories: CategoryDoc[]
  onSave: (data: {
    categoryId: string
    targetHoursTotal: number | null
    weeklyTargetHours: number | null
    targetDeadline: Date | null
    manualBaseHours: number | null
    notes: string | null
    sourceLabel: string | null
  }) => Promise<void>
  onClose: () => void
}) {
  const [categoryId, setCategoryId] = useState(editing?.category_id || (categories[0]?.id ?? ''))
  const [targetHours, setTargetHours] = useState(editing?.target_hours_total?.toString() || '')
  const [weeklyHours, setWeeklyHours] = useState(editing?.weekly_target_hours?.toString() || '')
  const [deadline, setDeadline] = useState(
    editing?.target_deadline ? new Date(editing.target_deadline).toISOString().split('T')[0] : ''
  )
  const [baseHours, setBaseHours] = useState(editing?.manual_base_hours?.toString() || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [sourceLabel, setSourceLabel] = useState(editing?.source_label || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId) return
    setSaving(true)
    try {
      await onSave({
        categoryId,
        targetHoursTotal: targetHours ? parseFloat(targetHours) : null,
        weeklyTargetHours: weeklyHours ? parseFloat(weeklyHours) : null,
        targetDeadline: deadline ? new Date(deadline + 'T23:59:59') : null,
        manualBaseHours: baseHours ? parseFloat(baseHours) : null,
        notes: notes.trim() || null,
        sourceLabel: sourceLabel.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogOverlay onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-semibold text-foreground">
            {editing ? 'Edit Learning Track' : 'New Learning Track'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Category */}
        {!editing && (
          <div>
            <label className="block text-ui-sm font-body font-medium text-foreground mb-1">Category</label>
            {categories.length === 0 ? (
              <p className="text-ui-sm text-muted-foreground italic">
                Create a category first before adding a learning track.
              </p>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Target hours */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-ui-sm font-body font-medium text-foreground mb-1">
              Target hours (total)
            </label>
            <input
              type="number"
              value={targetHours}
              onChange={(e) => setTargetHours(e.target.value)}
              placeholder="e.g. 100"
              min="0"
              step="0.5"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-ui-sm font-body font-medium text-foreground mb-1">
              Weekly target (hours)
            </label>
            <input
              type="number"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              placeholder="e.g. 10"
              min="0"
              step="0.5"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-ui-sm font-body font-medium text-foreground mb-1">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Base hours */}
        <div>
          <label className="block text-ui-sm font-body font-medium text-foreground mb-1">
            Base hours (prior study)
          </label>
          <input
            type="number"
            value={baseHours}
            onChange={(e) => setBaseHours(e.target.value)}
            placeholder="Hours already spent before tracking"
            min="0"
            step="0.5"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Source label */}
        <div>
          <label className="block text-ui-sm font-body font-medium text-foreground mb-1">
            Source / label
          </label>
          <input
            type="text"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="e.g. 10,000 hour rule, University course..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-ui-sm font-body font-medium text-foreground mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this learning track..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-ui-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={(!editing && !categoryId) || saving || categories.length === 0}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Track'}
          </button>
        </div>
      </form>
    </DialogOverlay>
  )
}

// ─── Time Entry Dialog ─────────────────────────────────────

function TimeEntryDialog({
  categoryId: _categoryId,
  categoryName,
  onSave,
  onClose,
}: {
  categoryId: string
  categoryName: string
  onSave: (deltaMinutes: number, note: string | null, occurredAt: Date) => Promise<void>
  onClose: () => void
}) {
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!)
  const [saving, setSaving] = useState(false)

  const totalMinutes = (parseFloat(hours || '0') * 60) + parseFloat(minutes || '0')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totalMinutes <= 0) return
    setSaving(true)
    try {
      await onSave(totalMinutes, note.trim() || null, new Date(date + 'T12:00:00'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogOverlay onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-semibold text-foreground">
            Log Time
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-ui-sm text-muted-foreground">
          Adding time to <span className="font-medium text-foreground">{categoryName}</span>
        </p>

        {/* Time input */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-ui-sm font-body font-medium text-foreground mb-1">Hours</label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-ui-sm font-body font-medium text-foreground mb-1">Minutes</label>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              min="0"
              max="59"
              step="1"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {totalMinutes > 0 && (
          <p className="text-ui-sm text-primary font-mono font-medium">
            = {formatHours(totalMinutes / 60)}
          </p>
        )}

        {/* Date */}
        <div>
          <label className="block text-ui-sm font-body font-medium text-foreground mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-ui-sm font-body font-medium text-foreground mb-1">
            Note <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Watched lecture, practiced exercises..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-ui-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={totalMinutes <= 0 || saving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Log Time'}
          </button>
        </div>
      </form>
    </DialogOverlay>
  )
}

// ─── Confirm Delete Dialog ─────────────────────────────────

function ConfirmDeleteDialog({
  type,
  name,
  onConfirm,
  onCancel,
}: {
  type: 'category' | 'track'
  name: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  return (
    <DialogOverlay onClose={onCancel}>
      <div className="space-y-4">
        <h3 className="text-lg font-display font-semibold text-foreground">
          Delete {type}?
        </h3>
        <p className="text-ui-sm text-muted-foreground">
          Are you sure you want to delete <span className="font-medium text-foreground">{name}</span>?
          {type === 'category' && ' This will not delete books assigned to this category.'}
          {' '}This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-ui-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setDeleting(true)
              try { await onConfirm() } finally { setDeleting(false) }
            }}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-ui-sm font-body font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </DialogOverlay>
  )
}

// ─── Dialog Overlay ────────────────────────────────────────

function DialogOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
