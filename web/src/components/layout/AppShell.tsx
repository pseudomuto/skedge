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

type Tab = 'config' | 'schedule'

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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-6 py-3">
            <span className="font-semibold text-gray-800">skedge</span>
            <nav className="flex gap-1">
              {(['config', 'schedule'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded px-3 py-1 text-sm capitalize ${
                    activeTab === tab
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Failed to load config: {error.message}
          </div>
        )}

        {loading && (
          <p className="text-sm text-gray-500">Loading...</p>
        )}

        {!loading && activeTab === 'config' && (
          <div className="space-y-8">
            <ConfigValidationAlert errors={validationErrors} />
            <BlocksEditor
              blocks={current.blocks}
              onChange={blocks => handleChange({ ...current, blocks })}
            />
            <SubjectsEditor
              subjects={current.subjects}
              onChange={subjects => handleChange({ ...current, subjects })}
            />
            <ClassesEditor
              classes={current.classes}
              subjects={current.subjects}
              onChange={classes => handleChange({ ...current, classes })}
            />
            <TeachersEditor
              teachers={current.teachers}
              classes={current.classes}
              onChange={teachers => handleChange({ ...current, teachers })}
            />
          </div>
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
