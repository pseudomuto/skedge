import type { Teacher, Class, TeacherSubject } from '../../types/config'

interface Props {
  teachers: Teacher[]
  classes: Class[]
  onChange: (teachers: Teacher[]) => void
}

interface TeacherPanelProps {
  teacher: Teacher
  classes: Class[]
  onUpdate: (updated: Teacher) => void
  onRemove: () => void
}

function TeacherPanel({ teacher, classes, onUpdate, onRemove }: TeacherPanelProps) {
  const updateName = (name: string) => onUpdate({ ...teacher, name })
  const updateRoom = (room: string) => onUpdate({ ...teacher, room })

  const isAuthorized = (className: string, subjectName: string): boolean => {
    const entry = teacher.subjects.find(s => s.class === className)
    return entry?.subjects.includes(subjectName) ?? false
  }

  const toggleSubject = (className: string, subjectName: string) => {
    const existing = teacher.subjects.find(s => s.class === className)
    let nextSubjects: TeacherSubject[]

    if (existing) {
      const alreadyHas = existing.subjects.includes(subjectName)
      const updatedSubjectList = alreadyHas
        ? existing.subjects.filter(s => s !== subjectName)
        : [...existing.subjects, subjectName]

      if (updatedSubjectList.length === 0) {
        nextSubjects = teacher.subjects.filter(s => s.class !== className)
      } else {
        nextSubjects = teacher.subjects.map(s =>
          s.class === className ? { ...s, subjects: updatedSubjectList } : s,
        )
      }
    } else {
      nextSubjects = [...teacher.subjects, { class: className, subjects: [subjectName] }]
    }

    onUpdate({ ...teacher, subjects: nextSubjects })
  }

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          value={teacher.name}
          onChange={e => updateName(e.target.value)}
          placeholder="Teacher name"
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-medium focus:border-blue-400 focus:outline-none"
        />
        <input
          type="text"
          value={teacher.room}
          onChange={e => updateRoom(e.target.value)}
          placeholder="Room"
          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
        />
        <button
          onClick={onRemove}
          className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
        >
          Remove
        </button>
      </div>

      {classes.length > 0 && (
        <div className="space-y-3">
          {classes.map(cls => {
            const classSubjects = cls.subjects.map(s => s.name)
            if (classSubjects.length === 0) return null
            return (
              <div key={cls.name}>
                <p className="mb-1 text-xs font-medium text-gray-500">{cls.name || '(unnamed class)'}</p>
                <div className="flex flex-wrap gap-3">
                  {classSubjects.map(subjectName => (
                    <label key={subjectName} className="flex items-center gap-1 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isAuthorized(cls.name, subjectName)}
                        onChange={() => toggleSubject(cls.name, subjectName)}
                        className="rounded"
                      />
                      {subjectName}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TeachersEditor({ teachers, classes, onChange }: Props) {
  const updateAt = (index: number, updated: Teacher) => {
    onChange(teachers.map((t, i) => (i === index ? updated : t)))
  }

  const remove = (index: number) => {
    onChange(teachers.filter((_, i) => i !== index))
  }

  const add = () => {
    onChange([...teachers, { name: '', room: '', subjects: [] }])
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Teachers</h2>
      <div className="space-y-3">
        {teachers.map((teacher, i) => (
          <TeacherPanel
            key={i}
            teacher={teacher}
            classes={classes}
            onUpdate={updated => updateAt(i, updated)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>
      <button
        onClick={add}
        className="mt-3 rounded border border-blue-300 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
      >
        + Add Teacher
      </button>
    </div>
  )
}
