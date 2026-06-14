import { useEffect, useState } from 'react'

import type { Class, Teacher, TeacherSubject } from '../../types/config'

interface Props {
  teacher: Teacher
  classes: Class[]
  onSave: (updated: Teacher) => void
  onRemove?: () => void
  onClose: () => void
}

export function TeacherModal({ teacher, classes, onSave, onRemove, onClose }: Props) {
  const [name, setName] = useState(teacher.name)
  const [room, setRoom] = useState(teacher.room)
  const [subjects, setSubjects] = useState<TeacherSubject[]>(teacher.subjects)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isAuthorized = (className: string, subjectName: string): boolean =>
    subjects.find((s) => s.class === className)?.subjects.includes(subjectName) ?? false

  const toggleSubject = (className: string, subjectName: string) => {
    const existing = subjects.find((s) => s.class === className)
    let next: TeacherSubject[]

    if (existing) {
      const had = existing.subjects.includes(subjectName)
      const updated = had ? existing.subjects.filter((s) => s !== subjectName) : [...existing.subjects, subjectName]
      next =
        updated.length === 0
          ? subjects.filter((s) => s.class !== className)
          : subjects.map((s) => (s.class === className ? { ...s, subjects: updated } : s))
    } else {
      next = [...subjects, { class: className, subjects: [subjectName] }]
    }

    setSubjects(next)
  }

  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(28,28,46,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl shadow-2xl"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: 'var(--brand)' }}>
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            {name.trim() || 'New Teacher'}
          </h2>
          <button onClick={onClose} className="text-lg leading-none text-white/60 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Teacher name"
                autoFocus
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div className="w-28">
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Room
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Room"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
          </div>

          {sortedClasses.some((c) => c.subjects.length > 0) && (
            <div>
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                Authorized to teach
              </p>
              <div className="space-y-4">
                {sortedClasses.map((cls) => {
                  const subs = cls.subjects.map((s) => s.name).sort((a, b) => a.localeCompare(b))
                  if (subs.length === 0) return null
                  return (
                    <div key={cls.name}>
                      <p className="mb-2 text-xs font-medium" style={{ color: 'var(--brand)' }}>
                        {cls.name || '(unnamed class)'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {subs.map((sub) => {
                          const on = isAuthorized(cls.name, sub)
                          return (
                            <label
                              key={sub}
                              className="flex cursor-pointer select-none items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                              style={
                                on
                                  ? {
                                      backgroundColor: 'var(--brand)',
                                      borderColor: 'var(--brand)',
                                      color: '#fff',
                                    }
                                  : { borderColor: 'var(--border)', color: 'var(--text-muted)' }
                              }
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggleSubject(cls.name, sub)}
                                className="sr-only"
                              />
                              {sub}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            {onRemove && (
              <button onClick={onRemove} className="text-sm text-red-500 hover:text-red-700 transition-colors">
                Remove teacher
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({ name, room, subjects })}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
