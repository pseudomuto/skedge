import { useState } from 'react'

import { exportTerm } from '../../db/queries'
import { useConfig } from '../../hooks/useConfig'
import { useTerms } from '../../hooks/useTerms'
import type { Config } from '../../types/config'
import type { ScheduleClass } from '../../types/schedule'
import { downloadTerm } from '../../utils/termFile'
import { BlocksEditor } from '../config/BlocksEditor'
import { ClassesEditor } from '../config/ClassesEditor'
import { ConfigValidationAlert } from '../config/ConfigValidationAlert'
import { SubjectsEditor } from '../config/SubjectsEditor'
import { TeachersEditor } from '../config/TeachersEditor'
import { GenerateButton } from '../schedule/GenerateButton'
import { ScheduleGrid } from '../schedule/ScheduleGrid'
import { TermSelector } from '../terms/TermSelector'

type Tab = 'config' | 'teachers' | 'schedule'

const DEFAULT_CONFIG: Config = {
  blocks: [],
  subjects: [],
  classes: [],
  teachers: [],
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('config')
  const [scheduleResult, setScheduleResult] = useState<{ termId: number; data: ScheduleClass[] } | null>(null)
  const {
    terms,
    activeTerm,
    loading: termsLoading,
    setActiveTerm,
    createTerm,
    renameTerm,
    deleteTerm,
    importTerm,
  } = useTerms()
  const { config, loading: configLoading, error, updateConfig, validationErrors } = useConfig(activeTerm?.id ?? null)

  const schedule = scheduleResult && scheduleResult.termId === activeTerm?.id ? scheduleResult.data : null

  const loading = termsLoading || configLoading
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
            <div className="ml-auto">
              <TermSelector
                terms={terms}
                activeTerm={activeTerm}
                onSelect={setActiveTerm}
                onRename={renameTerm}
                onDelete={deleteTerm}
                onCreate={createTerm}
                onExport={async (id) => {
                  try {
                    const data = await exportTerm(id)
                    downloadTerm(data)
                  } catch {
                    // export failure is non-destructive; user can retry
                  }
                }}
                onImport={importTerm}
              />
            </div>
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

        {!loading && activeTab === 'schedule' && activeTerm && (
          <div className="space-y-6">
            <GenerateButton
              termId={activeTerm.id!}
              config={current}
              onScheduleGenerated={(data) => setScheduleResult({ termId: activeTerm.id!, data })}
            />
            {schedule && <ScheduleGrid schedule={schedule} blocks={current.blocks} />}
          </div>
        )}
      </main>
    </div>
  )
}
