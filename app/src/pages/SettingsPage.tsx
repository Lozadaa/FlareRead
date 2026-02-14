import { useState } from 'react'
import { useSettings, type SettingsData } from '@/hooks/useSettings'
import { useThemeEffect } from '@/hooks/useTheme'
import { useAuth } from '@/contexts/AuthContext'
import { FONT_FAMILIES } from '@/types'
import { SOUNDSCAPES } from '@/lib/audioEngine'

// ─── Icons ────────────────────────────────────────────────

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  )
}

function ComputerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
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

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
  )
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
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

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}

// ─── Section Types ────────────────────────────────────────

type SectionId = 'appearance' | 'reading' | 'session' | 'soundscape'

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <PaletteIcon className="w-4 h-4" /> },
  { id: 'reading', label: 'Reading', icon: <BookIcon className="w-4 h-4" /> },
  { id: 'session', label: 'Sessions', icon: <ClockIcon className="w-4 h-4" /> },
  { id: 'soundscape', label: 'Soundscape', icon: <SpeakerIcon className="w-4 h-4" /> },
]

// ─── Main Settings Page ───────────────────────────────────

export function SettingsPage() {
  const { settings, updateSettings, loading, isNewUser, completeOnboarding } = useSettings()
  const { user, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState<SectionId>('appearance')

  // Apply theme immediately
  useThemeEffect(settings.theme)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // First-run wizard
  if (isNewUser) {
    return <OnboardingWizard settings={settings} updateSettings={updateSettings} onComplete={completeOnboarding} />
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-fade">
      <div className="p-6 space-y-8 max-w-[1000px] animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground">Settings</h2>
          <p className="text-ui-sm text-muted-foreground font-body mt-0.5">
            Customize your reading experience
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Section Nav */}
          <nav className="md:w-48 shrink-0">
            <div className="flex md:flex-col gap-1 md:sticky md:top-6">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-lg text-ui-sm font-body font-medium transition-all w-full text-left
                    ${activeSection === s.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Section Content */}
          <div className="flex-1 min-w-0">
            {activeSection === 'appearance' && (
              <AppearanceSection settings={settings} onUpdate={updateSettings} />
            )}
            {activeSection === 'reading' && (
              <ReadingSection settings={settings} onUpdate={updateSettings} />
            )}
            {activeSection === 'session' && (
              <SessionSection settings={settings} onUpdate={updateSettings} />
            )}
            {activeSection === 'soundscape' && (
              <SoundscapeSection settings={settings} onUpdate={updateSettings} />
            )}
          </div>
        </div>

        {/* Account Section */}
        <div className="border-t border-border pt-6">
          <h3 className="text-ui-sm font-body font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Account
          </h3>
          <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-3">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-10 h-10 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <p className="text-ui-sm font-body font-medium text-foreground">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 rounded-lg border border-border text-ui-sm font-body font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section Props ────────────────────────────────────────

interface SectionProps {
  settings: SettingsData
  onUpdate: (partial: Partial<SettingsData>) => void
}

// ─── Appearance Section ───────────────────────────────────

function AppearanceSection({ settings, onUpdate }: SectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Appearance" description="Theme, font, and display preferences" />

      {/* Theme */}
      <SettingGroup label="Theme">
        <div className="flex gap-2">
          <ThemeOption
            active={settings.theme === 'light'}
            onClick={() => onUpdate({ theme: 'light' })}
            icon={<SunIcon className="w-5 h-5" />}
            label="Light"
          />
          <ThemeOption
            active={settings.theme === 'dark'}
            onClick={() => onUpdate({ theme: 'dark' })}
            icon={<MoonIcon className="w-5 h-5" />}
            label="Dark"
          />
          <ThemeOption
            active={settings.theme === 'system'}
            onClick={() => onUpdate({ theme: 'system' })}
            icon={<ComputerIcon className="w-5 h-5" />}
            label="System"
          />
        </div>
      </SettingGroup>

      {/* Font Family */}
      <SettingGroup label="Font">
        <select
          value={settings.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="w-full max-w-xs h-9 px-3 text-ui-sm font-body bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </SettingGroup>

      {/* Font Size */}
      <SettingGroup label="Font Size">
        <div className="flex items-center gap-3 max-w-xs">
          <input
            type="range"
            min={12}
            max={32}
            value={settings.fontSize}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            className="flex-1 h-1.5 accent-primary"
          />
          <span className="text-ui-sm font-mono text-foreground tabular-nums w-12 text-right">
            {settings.fontSize}px
          </span>
        </div>
      </SettingGroup>

      {/* Line Height */}
      <SettingGroup label="Line Height">
        <div className="flex items-center gap-3 max-w-xs">
          <input
            type="range"
            min={1.0}
            max={3.0}
            step={0.1}
            value={settings.lineHeight}
            onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })}
            className="flex-1 h-1.5 accent-primary"
          />
          <span className="text-ui-sm font-mono text-foreground tabular-nums w-12 text-right">
            {settings.lineHeight.toFixed(1)}
          </span>
        </div>
      </SettingGroup>

      {/* Content Width */}
      <SettingGroup label="Content Width">
        <div className="flex items-center gap-3 max-w-xs">
          <input
            type="range"
            min={40}
            max={120}
            step={5}
            value={settings.contentWidth}
            onChange={(e) => onUpdate({ contentWidth: Number(e.target.value) })}
            className="flex-1 h-1.5 accent-primary"
          />
          <span className="text-ui-sm font-mono text-foreground tabular-nums w-12 text-right">
            {settings.contentWidth}ch
          </span>
        </div>
      </SettingGroup>

      {/* Margins */}
      <SettingGroup label="Margins">
        <div className="flex items-center gap-3 max-w-xs">
          <input
            type="range"
            min={0}
            max={120}
            step={10}
            value={settings.margin}
            onChange={(e) => onUpdate({ margin: Number(e.target.value) })}
            className="flex-1 h-1.5 accent-primary"
          />
          <span className="text-ui-sm font-mono text-foreground tabular-nums w-12 text-right">
            {settings.margin}px
          </span>
        </div>
      </SettingGroup>
    </div>
  )
}

// ─── Reading Section ──────────────────────────────────────

function ReadingSection({ settings, onUpdate }: SectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Reading" description="Default reading behavior" />

      <SettingGroup label="Default Focus Mode">
        <div className="flex gap-2">
          <ToggleCard
            active={settings.defaultFocusMode === 'study'}
            onClick={() => onUpdate({ defaultFocusMode: 'study' })}
            title="Study"
            description="Timed sessions, highlights tracking"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
              </svg>
            }
          />
          <ToggleCard
            active={settings.defaultFocusMode === 'leisure'}
            onClick={() => onUpdate({ defaultFocusMode: 'leisure' })}
            title="Leisure"
            description="Relaxed reading, no timers"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            }
          />
        </div>
      </SettingGroup>
    </div>
  )
}

// ─── Session Section ──────────────────────────────────────

function SessionSection({ settings, onUpdate }: SectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Sessions" description="Default session configuration" />

      <SettingGroup label="Default Session Type">
        <div className="flex gap-2">
          <ToggleCard
            active={settings.defaultSessionMode === 'pomodoro'}
            onClick={() => onUpdate({ defaultSessionMode: 'pomodoro' })}
            title="Pomodoro"
            description="Work/break cycles"
            icon={<ClockIcon className="w-5 h-5" />}
          />
          <ToggleCard
            active={settings.defaultSessionMode === 'free'}
            onClick={() => onUpdate({ defaultSessionMode: 'free' })}
            title="Free Reading"
            description="Continuous, untimed"
            icon={<BookIcon className="w-5 h-5" />}
          />
        </div>
      </SettingGroup>

      <SettingGroup label="Work Duration">
        <NumberStepper
          value={settings.workMin}
          onChange={(v) => onUpdate({ workMin: v })}
          min={5}
          max={90}
          step={5}
          unit="min"
        />
      </SettingGroup>

      <SettingGroup label="Break Duration">
        <NumberStepper
          value={settings.breakMin}
          onChange={(v) => onUpdate({ breakMin: v })}
          min={1}
          max={30}
          step={1}
          unit="min"
        />
      </SettingGroup>

      <SettingGroup label="AFK Timeout">
        <NumberStepper
          value={settings.afkTimeoutMin}
          onChange={(v) => onUpdate({ afkTimeoutMin: v })}
          min={1}
          max={30}
          step={1}
          unit="min"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Pause session after this many minutes of inactivity
        </p>
      </SettingGroup>

      <SettingGroup label="Microbreak Reminder">
        <NumberStepper
          value={settings.microbreakIntervalMin}
          onChange={(v) => onUpdate({ microbreakIntervalMin: v })}
          min={0}
          max={120}
          step={5}
          unit="min"
          zeroLabel="Off"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Gentle reminder to stretch and rest your eyes. Set to 0 to disable.
        </p>
      </SettingGroup>
    </div>
  )
}

// ─── Soundscape Section ───────────────────────────────────

function SoundscapeSection({ settings, onUpdate }: SectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Soundscape" description="Ambient sound preferences" />

      <SettingGroup label="Default Sound">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => onUpdate({ defaultSoundscape: null })}
            className={`
              px-3 py-2.5 rounded-lg border text-ui-sm font-body font-medium transition-all text-left
              ${settings.defaultSoundscape === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }
            `}
          >
            None
          </button>
          {SOUNDSCAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => onUpdate({ defaultSoundscape: s.id })}
              className={`
                px-3 py-2.5 rounded-lg border text-ui-sm font-body font-medium transition-all text-left
                ${settings.defaultSoundscape === s.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }
              `}
            >
              {s.name}
            </button>
          ))}
        </div>
      </SettingGroup>

      <SettingGroup label="Auto-pause on AFK">
        <ToggleSwitch
          checked={settings.autoPauseOnAfk}
          onChange={(v) => onUpdate({ autoPauseOnAfk: v })}
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Automatically pause ambient sounds when AFK is detected
        </p>
      </SettingGroup>
    </div>
  )
}

// ─── Onboarding Wizard ────────────────────────────────────

function OnboardingWizard({
  settings,
  updateSettings,
  onComplete,
}: {
  settings: SettingsData
  updateSettings: (partial: Partial<SettingsData>) => void
  onComplete: () => void
}) {
  const [step, setStep] = useState(0)

  useThemeEffect(settings.theme)

  const steps = [
    {
      title: 'Welcome to FlareRead',
      subtitle: 'Let\'s set up your reading experience',
      content: (
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <SparklesIcon className="w-8 h-8 text-primary" />
          </div>
          <p className="text-ui-sm text-muted-foreground max-w-sm">
            We'll help you configure your theme, reading mode, and session defaults.
            You can always change these in Settings later.
          </p>
        </div>
      ),
    },
    {
      title: 'Choose your theme',
      subtitle: 'How do you like to read?',
      content: (
        <div className="flex gap-3 justify-center py-4">
          <ThemeOption
            active={settings.theme === 'light'}
            onClick={() => updateSettings({ theme: 'light' })}
            icon={<SunIcon className="w-6 h-6" />}
            label="Light"
            large
          />
          <ThemeOption
            active={settings.theme === 'dark'}
            onClick={() => updateSettings({ theme: 'dark' })}
            icon={<MoonIcon className="w-6 h-6" />}
            label="Dark"
            large
          />
          <ThemeOption
            active={settings.theme === 'system'}
            onClick={() => updateSettings({ theme: 'system' })}
            icon={<ComputerIcon className="w-6 h-6" />}
            label="System"
            large
          />
        </div>
      ),
    },
    {
      title: 'Reading style',
      subtitle: 'Pick your default focus mode',
      content: (
        <div className="flex gap-3 justify-center py-4">
          <ToggleCard
            active={settings.defaultFocusMode === 'study'}
            onClick={() => updateSettings({ defaultFocusMode: 'study' })}
            title="Study"
            description="Pomodoro timer, session tracking, highlights"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
              </svg>
            }
            large
          />
          <ToggleCard
            active={settings.defaultFocusMode === 'leisure'}
            onClick={() => updateSettings({ defaultFocusMode: 'leisure' })}
            title="Leisure"
            description="Relaxed reading without time pressure"
            icon={<BookIcon className="w-6 h-6" />}
            large
          />
        </div>
      ),
    },
    {
      title: 'Pick a font',
      subtitle: 'Choose what feels best for long reading sessions',
      content: (
        <div className="grid grid-cols-2 gap-2 py-4 max-w-md mx-auto">
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.value}
              onClick={() => updateSettings({ fontFamily: f.value })}
              className={`
                px-4 py-3 rounded-lg border text-left transition-all
                ${settings.fontFamily === f.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }
              `}
            >
              <span className="text-ui-base font-medium" style={{ fontFamily: f.value }}>
                {f.label}
              </span>
              <p className="text-xs mt-0.5 opacity-60" style={{ fontFamily: f.value }}>
                The quick brown fox
              </p>
            </button>
          ))}
        </div>
      ),
    },
  ]

  const currentStep = steps[step]!
  const isLast = step === steps.length - 1

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Content Card */}
        <div className="rounded-xl bg-card border border-border p-8 shadow-sm">
          <div className="text-center mb-2">
            <h2 className="text-xl font-display font-semibold text-foreground">
              {currentStep.title}
            </h2>
            <p className="text-ui-sm text-muted-foreground mt-1">{currentStep.subtitle}</p>
          </div>

          {currentStep.content}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 rounded-lg text-ui-sm font-body text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="px-4 py-2 rounded-lg text-ui-sm font-body text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) {
                  onComplete()
                } else {
                  setStep((s) => s + 1)
                }
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-ui-sm font-body font-medium hover:bg-primary/90 transition-colors"
            >
              {isLast ? (
                <>
                  Get started
                  <CheckIcon className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared Components ────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="pb-4 border-b border-border">
      <h3 className="text-lg font-display font-semibold text-foreground">{title}</h3>
      <p className="text-ui-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
  )
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-ui-sm font-body font-medium text-foreground mb-2">{label}</label>
      {children}
    </div>
  )
}

function ThemeOption({
  active,
  onClick,
  icon,
  label,
  large,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  large?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center gap-2 rounded-xl border transition-all
        ${large ? 'px-6 py-5 min-w-[120px]' : 'px-4 py-3 min-w-[100px]'}
        ${active
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
        }
      `}
    >
      {icon}
      <span className={`font-body font-medium ${large ? 'text-ui-sm' : 'text-ui-xs'}`}>{label}</span>
    </button>
  )
}

function ToggleCard({
  active,
  onClick,
  title,
  description,
  icon,
  large,
}: {
  active: boolean
  onClick: () => void
  title: string
  description: string
  icon: React.ReactNode
  large?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex flex-col items-center gap-2 rounded-xl border text-center transition-all
        ${large ? 'px-5 py-5' : 'px-4 py-4'}
        ${active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
        }
      `}
    >
      {icon}
      <div>
        <p className={`font-body font-medium ${large ? 'text-ui-base' : 'text-ui-sm'}`}>{title}</p>
        <p className={`${large ? 'text-xs' : 'text-[11px]'} opacity-60 mt-0.5`}>{description}</p>
      </div>
    </button>
  )
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  zeroLabel,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  unit: string
  zeroLabel?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
      >
        -
      </button>
      <span className="w-16 text-center text-ui-sm font-body font-medium text-foreground tabular-nums">
        {value === 0 && zeroLabel ? zeroLabel : `${value} ${unit}`}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
      >
        +
      </button>
    </div>
  )
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer
        ${checked ? 'bg-primary' : 'bg-muted'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
}
