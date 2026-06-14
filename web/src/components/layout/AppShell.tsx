import { useState } from 'react'
import type { Config } from '../../types/config'
import type { ScheduleClass } from '../../types/schedule'
import { useConfig } from '../../hooks/useConfig'
import { BlocksEditor } from '../config/BlocksEditor'
import { SubjectsEditor } from '../config/SubjectsEditor'
import { ClassesEditor } from '../config/ClassesEditor'
import { TeachersEditor } from '../config/TeachersEditor'
import { ConfigValidationAlert } from '../config/ConfigValidationAlert'
import { GenerateButton } from '../schedule/GenerateButton'
import { ScheduleGrid } from '../schedule/ScheduleGrid'

type Tab = 'config' | 'teachers' | 'schedule'

const DEFAULT_CONFIG: Config = {
  blocks: [],
  subjects: [],
  classes: [],
  teachers: [],
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('config')
  const [schedule, setSchedule] = useState<ScheduleClass[] | null>(null)
  const { config, loading, error, updateConfig, validationErrors } = useConfig()

  const current: Config = config ?? DEFAULT_CONFIG

  const handleChange = (next: Config) => {
    updateConfig(next)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <header style={{ backgroundColor: 'var(--brand)' }} className="sticky top-0 z-10 shadow-sm">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-8 py-4">
            <span
              className="text-xl font-semibold tracking-tight text-white"
              style={{ fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '-0.01em' }}
            >
              skedge
            </span>
            <nav className="flex gap-1">
              {(['config', 'teachers', 'schedule'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-all"
                  style={
                    activeTab === tab
                      ? { backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }
                      : { color: 'rgba(255,255,255,0.55)' }
                  }
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) {
                      ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) {
                      ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'
                    }
                  }}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <div
            className="mb-6 rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#b91c1c' }}
          >
            Failed to load config: {error.message}
          </div>
        )}

        {loading && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading...
          </p>
        )}

        {!loading && activeTab === 'config' && (
          <div className="space-y-8">
            <ConfigValidationAlert errors={validationErrors} />
            <BlocksEditor blocks={current.blocks} onChange={(blocks) => handleChange({ ...current, blocks })} />
            <SubjectsEditor
              subjects={current.subjects}
              onChange={(subjects) => handleChange({ ...current, subjects })}
            />
            <ClassesEditor
              classes={current.classes}
              subjects={current.subjects}
              onChange={(classes) => handleChange({ ...current, classes })}
            />
          </div>
        )}

        {!loading && activeTab === 'teachers' && (
          <TeachersEditor
            teachers={current.teachers}
            classes={current.classes}
            onChange={(teachers) => handleChange({ ...current, teachers })}
          />
        )}

        {!loading && activeTab === 'schedule' && (
          <div className="space-y-6">
            <GenerateButton config={current} onScheduleGenerated={setSchedule} />
            {schedule && <ScheduleGrid schedule={schedule} blocks={current.blocks} />}
          </div>
        )}
      </main>
    </div>
  )
}
