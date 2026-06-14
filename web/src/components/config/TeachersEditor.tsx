import { useState } from 'react'

import type { Class, Teacher } from '../../types/config'
import { TeacherModal } from './TeacherModal'

interface Props {
  teachers: Teacher[]
  classes: Class[]
  onChange: (teachers: Teacher[]) => void
}

type ModalState = { type: 'edit'; origIdx: number } | { type: 'new' } | null

const EMPTY_TEACHER: Teacher = { name: '', room: '', subjects: [] }

function authorizedClasses(teacher: Teacher): string[] {
  return teacher.subjects
    .filter((ts) => ts.subjects.length > 0)
    .map((ts) => ts.class)
    .sort((a, b) => a.localeCompare(b))
}

export function TeachersEditor({ teachers, classes, onChange }: Props) {
  const [modal, setModal] = useState<ModalState>(null)

  const sorted = [...teachers].sort((a, b) => {
    if (!a.name && !b.name) return 0
    if (!a.name) return 1
    if (!b.name) return -1
    return a.name.localeCompare(b.name)
  })

  const handleSave = (updated: Teacher) => {
    if (modal?.type === 'new') {
      onChange([...teachers, updated])
    } else if (modal?.type === 'edit') {
      onChange(teachers.map((t, i) => (i === modal.origIdx ? updated : t)))
    }
    setModal(null)
  }

  const handleRemove = (origIdx: number) => {
    onChange(teachers.filter((_, i) => i !== origIdx))
    setModal(null)
  }

  const modalTeacher = modal?.type === 'edit' ? teachers[modal.origIdx] : EMPTY_TEACHER

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Teachers</h2>

      {sorted.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--brand)' }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-white">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-white">Room</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-white">Classes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((teacher) => {
                const origIdx = teachers.indexOf(teacher)
                const cls = authorizedClasses(teacher)
                return (
                  <tr
                    key={origIdx}
                    className="cursor-pointer transition-colors"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderTop: '1px solid var(--border)',
                    }}
                    onClick={() => setModal({ type: 'edit', origIdx })}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface)'
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text)' }}>
                      {teacher.name || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(unnamed)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {teacher.room}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {cls.length === 0 ? (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            —
                          </span>
                        ) : (
                          cls.map((c) => (
                            <span
                              key={c}
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: 'rgba(30,58,95,0.08)',
                                color: 'var(--brand)',
                              }}
                            >
                              {c}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={() => setModal({ type: 'new' })}
        className="rounded border border-blue-300 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
      >
        + Add Teacher
      </button>

      {modal && modalTeacher && (
        <TeacherModal
          teacher={modalTeacher}
          classes={classes}
          onSave={handleSave}
          onRemove={modal.type === 'edit' ? () => handleRemove(modal.origIdx) : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
