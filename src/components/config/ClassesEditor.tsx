import { useState } from 'react'

import type { Class, Subject } from '../../types/config'
import { ClassModal } from './ClassModal'

interface Props {
  classes: Class[]
  subjects: Subject[]
  onChange: (classes: Class[]) => void
}

type ModalState = { type: 'edit'; origIdx: number } | { type: 'new' } | null

const EMPTY_CLASS: Class = { name: '', cohorts: [], subjects: [] }

export function ClassesEditor({ classes, subjects, onChange }: Props) {
  const [modal, setModal] = useState<ModalState>(null)

  const sorted = [...classes].sort((a, b) => {
    if (!a.name && !b.name) return 0
    if (!a.name) return 1
    if (!b.name) return -1
    return a.name.localeCompare(b.name)
  })

  const handleSave = (updated: Class) => {
    if (modal?.type === 'new') {
      onChange([...classes, updated])
    } else if (modal?.type === 'edit') {
      onChange(classes.map((c, i) => (i === modal.origIdx ? updated : c)))
    }
    setModal(null)
  }

  const handleRemove = (origIdx: number) => {
    onChange(classes.filter((_, i) => i !== origIdx))
    setModal(null)
  }

  const modalClass = modal?.type === 'edit' ? classes[modal.origIdx] : EMPTY_CLASS

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Classes</h2>

      {sorted.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--brand)' }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-white">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-white">Cohorts</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((cls) => {
                const origIdx = classes.indexOf(cls)
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
                      {cls.name || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(unnamed)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {cls.cohorts.length > 0 ? cls.cohorts.join(', ') : '—'}
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
        + Add Class
      </button>

      {modal && modalClass && (
        <ClassModal
          cls={modalClass}
          subjects={subjects}
          onSave={handleSave}
          onRemove={modal.type === 'edit' ? () => handleRemove(modal.origIdx) : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
