import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPalette } from '../CommandPalette'

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        onOpenCommandPalette={openCommandPalette}
      />

      {/* Main content area */}
      <div
        className={`
          transition-all duration-300 ease-in-out min-h-screen flex flex-col
          ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        `}
      >
        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  )
}
