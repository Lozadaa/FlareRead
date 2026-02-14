import {
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { UserSettingsDoc } from '../types'

function settingsRef(uid: string) {
  return doc(db, 'users', uid, 'settings', 'preferences')
}

export const DEFAULT_USER_SETTINGS: Omit<UserSettingsDoc, 'updatedAt'> = {
  // Appearance
  fontSize: 18,
  fontFamily: 'Literata, Georgia, serif',
  lineHeight: 1.8,
  margin: 40,
  contentWidth: 65,
  theme: 'system',
  // Reading
  defaultFocusMode: 'study',
  // Session
  defaultSessionMode: 'pomodoro',
  workMin: 25,
  breakMin: 5,
  afkTimeoutMin: 5,
  microbreakIntervalMin: 30,
  // Soundscape
  defaultSoundscape: null,
  autoPauseOnAfk: true,
  // Meta
  onboardingComplete: false,
}

export const settingsService = {
  async get(uid: string): Promise<UserSettingsDoc> {
    const snap = await getDoc(settingsRef(uid))
    if (!snap.exists()) {
      await this.initialize(uid)
      return { ...DEFAULT_USER_SETTINGS, updatedAt: Timestamp.now() }
    }
    // Merge with defaults so new fields are always present
    return { ...DEFAULT_USER_SETTINGS, ...snap.data(), updatedAt: snap.data().updatedAt ?? Timestamp.now() } as UserSettingsDoc
  },

  async update(uid: string, data: Partial<Omit<UserSettingsDoc, 'updatedAt'>>): Promise<void> {
    await setDoc(
      settingsRef(uid),
      { ...data, updatedAt: Timestamp.now() },
      { merge: true }
    )
  },

  async initialize(uid: string): Promise<void> {
    const snap = await getDoc(settingsRef(uid))
    if (!snap.exists()) {
      await setDoc(settingsRef(uid), {
        ...DEFAULT_USER_SETTINGS,
        updatedAt: Timestamp.now()
      })
    }
  }
}
