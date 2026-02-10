import { useState } from 'react'
import {
  Palette,
  BookOpen,
  Timer,
  LayoutGrid,
  Volume2,
  Keyboard,
  ChevronRight
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme, type ThemeMode } from '@/components/ThemeProvider'
import { type AppSettings } from '@/hooks/useSettings'
import { FONT_FAMILIES } from '@/types'

// ─── Types ──────────────────────────────────────────

interface SettingsViewProps {
  settings: AppSettings
  onSetSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

type SettingsSection =
  | 'appearance'
  | 'reading'
  | 'sessions'
  | 'focuswalls'
  | 'soundscapes'
  | 'shortcuts'

const SECTIONS: { id: SettingsSection; label: string; icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'sessions', label: 'Sessions', icon: Timer },
  { id: 'focuswalls', label: 'Focus Walls', icon: LayoutGrid },
  { id: 'soundscapes', label: 'Soundscapes', icon: Volume2 },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard }
]

// ─── Component ──────────────────────────────────────

export function SettingsView({ settings, onSetSetting }: SettingsViewProps): JSX.Element {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance')

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Section nav */}
      <nav className="w-52 shrink-0 border-r border-border/50 bg-muted/20 py-5 px-3">
        <div className="space-y-0.5">
          {SECTIONS.map((section) => (
            <Button
              key={section.id}
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full justify-start gap-2.5 text-ui-sm rounded-lg h-9 transition-all',
                activeSection === section.id
                  ? 'bg-primary/8 text-primary font-medium shadow-[inset_0_0_0_1px_hsla(var(--primary),0.12)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
              {activeSection === section.id && (
                <ChevronRight className="h-3 w-3 ml-auto text-primary/60" />
              )}
            </Button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-2xl p-8 space-y-8">
          {activeSection === 'appearance' && (
            <AppearanceSection settings={settings} onSetSetting={onSetSetting} />
          )}
          {activeSection === 'reading' && (
            <ReadingSection settings={settings} onSetSetting={onSetSetting} />
          )}
          {activeSection === 'sessions' && (
            <SessionsSection settings={settings} onSetSetting={onSetSetting} />
          )}
          {activeSection === 'focuswalls' && (
            <FocusWallsSection settings={settings} onSetSetting={onSetSetting} />
          )}
          {activeSection === 'soundscapes' && (
            <SoundscapesSection settings={settings} onSetSetting={onSetSetting} />
          )}
          {activeSection === 'shortcuts' && <ShortcutsSection />}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Shared Field Components ────────────────────────

function SettingGroup({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div>
      <h3 className="text-ui-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="text-ui-sm text-muted-foreground mt-1">{description}</p>}
      <div className="mt-6 space-y-1">
        <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/40">
          {children}
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
      <div className="min-w-0">
        <p className="text-ui-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-ui-xs text-muted-foreground/70 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 mt-0.5',
          checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
}): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-border/60 bg-background px-2.5 text-ui-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

function NumberInput({ value, onChange, min, max, step = 1, suffix }: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
}): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!isNaN(n) && n >= min && n <= max) onChange(n)
        }}
        min={min}
        max={max}
        step={step}
        className="h-8 w-20 rounded-lg border border-border/60 bg-background px-2.5 text-ui-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
      />
      {suffix && <span className="text-ui-xs text-muted-foreground/70">{suffix}</span>}
    </div>
  )
}

function SliderWithValue({ value, onChange, min, max, step = 1, suffix }: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 w-56">
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="flex-1 h-1.5 rounded-full appearance-none bg-input accent-primary cursor-pointer"
      />
      <span className="text-ui-sm text-foreground tabular-nums w-12 text-right font-medium">
        {value}{suffix}
      </span>
    </div>
  )
}

// ─── Section: Appearance ────────────────────────────

function AppearanceSection({ settings, onSetSetting }: {
  settings: AppSettings
  onSetSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}): JSX.Element {
  const { setTheme: applyTheme } = useTheme()

  const handleThemeChange = (mode: ThemeMode): void => {
    onSetSetting('appearance:theme', mode)
    applyTheme(mode)
  }

  return (
    <>
      <SettingGroup title="Appearance" description="Customize the look and feel of FlareRead">
        {/* Theme */}
        <SettingRow label="Theme" description="Choose your preferred color scheme">
          <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleThemeChange(mode)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-ui-xs font-medium capitalize transition-all',
                  settings['appearance:theme'] === mode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Font */}
        <SettingRow label="Reading font" description="Font used for book content">
          <Select
            value={settings['appearance:font']}
            onChange={(v) => onSetSetting('appearance:font', v)}
            options={FONT_FAMILIES}
          />
        </SettingRow>

        {/* Font size */}
        <SettingRow label="Font size" description="Base font size for reading">
          <SliderWithValue
            value={settings['appearance:fontSize']}
            onChange={(v) => onSetSetting('appearance:fontSize', v)}
            min={12}
            max={32}
            suffix="px"
          />
        </SettingRow>

        {/* Line height */}
        <SettingRow label="Line height" description="Space between lines of text">
          <SliderWithValue
            value={settings['appearance:lineHeight']}
            onChange={(v) => onSetSetting('appearance:lineHeight', v)}
            min={1.0}
            max={2.5}
            step={0.1}
          />
        </SettingRow>

        {/* Margins */}
        <SettingRow label="Margins" description="Side margins in the reader">
          <SliderWithValue
            value={settings['appearance:margins']}
            onChange={(v) => onSetSetting('appearance:margins', v)}
            min={20}
            max={120}
            suffix="px"
          />
        </SettingRow>
      </SettingGroup>
    </>
  )
}

// ─── Section: Reading ───────────────────────────────

function ReadingSection({ settings, onSetSetting }: {
  settings: AppSettings
  onSetSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}): JSX.Element {
  return (
    <SettingGroup title="Reading" description="Default reading behavior preferences">
      <SettingRow label="Default focus mode" description="Session type used when starting a new session">
        <Select
          value={settings['reading:defaultFocusMode']}
          onChange={(v) => onSetSetting('reading:defaultFocusMode', v as 'pomodoro' | 'free')}
          options={[
            { label: 'Pomodoro', value: 'pomodoro' },
            { label: 'Free reading', value: 'free' }
          ]}
        />
      </SettingRow>

      <SettingRow label="Auto-fullscreen" description="Automatically enter fullscreen when starting a session">
        <Toggle
          checked={settings['reading:autoFullscreen']}
          onChange={(v) => onSetSetting('reading:autoFullscreen', v)}
        />
      </SettingRow>
    </SettingGroup>
  )
}

// ─── Section: Sessions ──────────────────────────────

function SessionsSection({ settings, onSetSetting }: {
  settings: AppSettings
  onSetSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}): JSX.Element {
  return (
    <SettingGroup title="Sessions" description="Configure Pomodoro timer and session behavior">
      <SettingRow label="Work duration" description="Length of each focus period">
        <NumberInput
          value={settings['session:workMinutes']}
          onChange={(v) => onSetSetting('session:workMinutes', v)}
          min={5}
          max={120}
          suffix="min"
        />
      </SettingRow>

      <SettingRow label="Break duration" description="Length of each break period">
        <NumberInput
          value={settings['session:breakMinutes']}
          onChange={(v) => onSetSetting('session:breakMinutes', v)}
          min={1}
          max={30}
          suffix="min"
        />
      </SettingRow>

      <SettingRow label="AFK timeout" description="Time before detecting you are away">
        <NumberInput
          value={settings['session:afkTimeoutMinutes']}
          onChange={(v) => onSetSetting('session:afkTimeoutMinutes', v)}
          min={1}
          max={30}
          suffix="min"
        />
      </SettingRow>

      <SettingRow label="Microbreak interval" description="Minutes between microbreak reminders (0 = disabled)">
        <NumberInput
          value={settings['session:microbreakInterval']}
          onChange={(v) => onSetSetting('session:microbreakInterval', v)}
          min={0}
          max={60}
          suffix="min"
        />
      </SettingRow>

      <SettingRow label="Re-entry threshold" description="Days of inactivity before showing a recap">
        <NumberInput
          value={settings['session:reentryThresholdDays']}
          onChange={(v) => onSetSetting('session:reentryThresholdDays', v)}
          min={1}
          max={30}
          suffix="days"
        />
      </SettingRow>
    </SettingGroup>
  )
}

// ─── Section: Focus Walls ───────────────────────────

function FocusWallsSection({ settings, onSetSetting }: {
  settings: AppSettings
  onSetSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}): JSX.Element {
  return (
    <SettingGroup title="Focus Walls" description="Configure the secondary display during sessions">
      <SettingRow label="Default preset" description="Visual style for the focus wall display">
        <Select
          value={settings['focuswall:defaultPreset']}
          onChange={(v) => onSetSetting('focuswall:defaultPreset', v)}
          options={[
            { label: 'Minimal', value: 'minimal' },
            { label: 'Gradient', value: 'gradient' },
            { label: 'Monochrome', value: 'monochrome' },
            { label: 'Illustration', value: 'illustration' }
          ]}
        />
      </SettingRow>

      <SettingRow label="Show timer" description="Display session timer on focus wall">
        <Toggle
          checked={settings['focuswall:showTimer']}
          onChange={(v) => onSetSetting('focuswall:showTimer', v)}
        />
      </SettingRow>

      <SettingRow label="Show progress" description="Display reading progress on focus wall">
        <Toggle
          checked={settings['focuswall:showProgress']}
          onChange={(v) => onSetSetting('focuswall:showProgress', v)}
        />
      </SettingRow>

      <SettingRow label="Show pomodoros" description="Display completed pomodoro count">
        <Toggle
          checked={settings['focuswall:showPomodoros']}
          onChange={(v) => onSetSetting('focuswall:showPomodoros', v)}
        />
      </SettingRow>
    </SettingGroup>
  )
}

// ─── Section: Soundscapes ───────────────────────────

function SoundscapesSection({ settings, onSetSetting }: {
  settings: AppSettings
  onSetSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}): JSX.Element {
  return (
    <SettingGroup title="Soundscapes" description="Ambient sounds for focused reading">
      <SettingRow label="Default sound" description="Sound that plays automatically with sessions">
        <Select
          value={settings['soundscape:defaultSound']}
          onChange={(v) => onSetSetting('soundscape:defaultSound', v)}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Rain', value: 'rain' },
            { label: 'Fireplace', value: 'fireplace' },
            { label: 'Coffee Shop', value: 'coffeeshop' },
            { label: 'Forest', value: 'forest' },
            { label: 'White Noise', value: 'whitenoise' }
          ]}
        />
      </SettingRow>

      <SettingRow label="Auto-pause on AFK" description="Pause soundscape when you're away">
        <Toggle
          checked={settings['soundscape:autoPauseOnAfk']}
          onChange={(v) => onSetSetting('soundscape:autoPauseOnAfk', v)}
        />
      </SettingRow>
    </SettingGroup>
  )
}

// ─── Section: Keyboard Shortcuts ────────────────────

const SHORTCUTS = [
  { action: 'Open command palette', keys: ['Ctrl', 'K'] },
  { action: 'Open settings', keys: ['Ctrl', ','] },
  { action: 'Import EPUB', keys: ['Ctrl', 'O'] },
  { action: 'Toggle fullscreen', keys: ['F11'] },
  { action: 'Toggle theme', keys: ['Sidebar button'] },
  { action: 'Next page (reader)', keys: ['Arrow Right'] },
  { action: 'Previous page (reader)', keys: ['Arrow Left'] },
  { action: 'Table of contents (reader)', keys: ['Ctrl', 'T'] },
  { action: 'Reader settings (reader)', keys: ['Ctrl', '.'] }
]

function ShortcutsSection(): JSX.Element {
  return (
    <SettingGroup title="Keyboard Shortcuts" description="Current keyboard bindings">
      {SHORTCUTS.map((shortcut) => (
        <div
          key={shortcut.action}
          className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
        >
          <span className="text-ui-sm text-foreground">{shortcut.action}</span>
          <div className="flex items-center gap-1">
            {shortcut.keys.map((key, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/40 text-xs mx-0.5">+</span>}
                <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-md border border-border/60 bg-gradient-to-b from-muted/80 to-muted/40 px-1.5 font-mono text-xs font-medium text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]">
                  {key}
                </kbd>
              </span>
            ))}
          </div>
        </div>
      ))}
    </SettingGroup>
  )
}
