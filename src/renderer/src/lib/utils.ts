import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Convert an absolute file path to a local-file:// URL for Electron (handles Windows backslashes). */
export function fileUrl(path: string): string {
  return 'local-file:///' + path.replace(/\\/g, '/')
}
