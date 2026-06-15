import { useCallback, useEffect, useRef, useState } from 'react'

import type { StoredTerm } from '../../db/schema'

interface Props {
  terms: StoredTerm[]
  activeTerm: StoredTerm | null
  onSelect: (id: number) => void
  onRename: (id: number, name: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onCreate: (name: string, copyFromId?: number) => Promise<void>
}

type PanelMode =
  | { type: 'idle' }
  | { type: 'renaming'; id: number; value: string }
  | { type: 'confirming-delete'; id: number }
  | { type: 'creating'; name: string; copyFromId: string }

export function TermSelector({ terms, activeTerm, onSelect, onRename, onDelete, onCreate }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<PanelMode>({ type: 'idle' })
  const [busy, setBusy] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode.type === 'renaming') renameInputRef.current?.focus()
    if (mode.type === 'creating') createInputRef.current?.focus()
  }, [mode.type])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setMode({ type: 'idle' })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen, closeDropdown])

  async function commitRename(id: number, value: string) {
    const trimmed = value.trim()
    if (!trimmed || busy) return
    setBusy(true)
    await onRename(id, trimmed)
    setBusy(false)
    setMode({ type: 'idle' })
  }

  async function commitCreate(name: string, copyFromId: string) {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    await onCreate(trimmed, copyFromId ? Number(copyFromId) : undefined)
    setBusy(false)
    closeDropdown()
  }

  async function commitDelete(id: number) {
    if (busy) return
    setBusy(true)
    await onDelete(id)
    setBusy(false)
    setMode({ type: 'idle' })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => (isOpen ? closeDropdown() : setIsOpen(true))}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all"
        style={{ color: 'rgba(255,255,255,0.85)', backgroundColor: isOpen ? 'rgba(255,255,255,0.15)' : 'transparent' }}
        onMouseEnter={(e) => {
          if (!isOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)'
        }}
        onMouseLeave={(e) => {
          if (!isOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
        }}
      >
        <span>{activeTerm?.name ?? 'Select term'}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-64 rounded-lg border py-1 shadow-lg"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', zIndex: 50 }}
        >
          {terms.map((term) => {
            if (mode.type === 'renaming' && mode.id === term.id) {
              return (
                <div key={term.id} className="px-2 py-1">
                  <input
                    ref={renameInputRef}
                    value={mode.value}
                    onChange={(e) => setMode({ type: 'renaming', id: term.id!, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(term.id!, mode.value)
                      if (e.key === 'Escape') setMode({ type: 'idle' })
                    }}
                    onBlur={() => commitRename(term.id!, mode.value)}
                    className="w-full rounded border px-2 py-1 text-sm outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--bg)' }}
                  />
                </div>
              )
            }

            if (mode.type === 'confirming-delete' && mode.id === term.id) {
              return (
                <div key={term.id} className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-sm" style={{ color: 'var(--text)' }}>
                    Delete "{term.name}"?
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => commitDelete(term.id!)}
                      className="text-xs font-medium"
                      style={{ color: '#b91c1c' }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setMode({ type: 'idle' })}
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            }

            const isActive = term.id === activeTerm?.id
            return (
              <div key={term.id} className="group flex items-center justify-between px-3 py-1.5 hover:bg-black/5">
                <button
                  onClick={() => {
                    onSelect(term.id!)
                    setIsOpen(false)
                  }}
                  className="flex-1 text-left text-sm font-medium"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text)' }}
                >
                  {term.name}
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setMode({ type: 'renaming', id: term.id!, value: term.name })}
                    className="rounded p-0.5 hover:bg-black/10"
                    title="Rename"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M11.498 1.088a2.085 2.085 0 0 1 2.95 2.95L5.2 13.285 1.5 14.5l1.215-3.7L11.498 1.088zm-1.06 1.06-8.31 8.311-.81 2.46 2.46-.81 8.31-8.31-1.65-1.651z" />
                    </svg>
                  </button>
                  {terms.length > 1 && (
                    <button
                      onClick={() => setMode({ type: 'confirming-delete', id: term.id! })}
                      className="rounded p-0.5 hover:bg-black/10"
                      title="Delete"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 2h4a1 1 0 0 1 1 1H5a1 1 0 0 1 1-1zM3 4h10l-.9 9.1A1 1 0 0 1 11.1 14H4.9a1 1 0 0 1-1-.9L3 4zm2.5 2a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5zm3 0a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
            {mode.type === 'creating' ? (
              <div className="space-y-2 px-3 py-2">
                <input
                  ref={createInputRef}
                  placeholder="Term name"
                  value={mode.name}
                  onChange={(e) => setMode({ ...mode, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitCreate(mode.name, mode.copyFromId)
                    if (e.key === 'Escape') setMode({ type: 'idle' })
                  }}
                  className="w-full rounded border px-2 py-1 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--bg)' }}
                />
                <select
                  value={mode.copyFromId}
                  onChange={(e) => setMode({ ...mode, copyFromId: e.target.value })}
                  className="w-full rounded border px-2 py-1 text-sm outline-none"
                  style={{
                    borderColor: 'var(--border)',
                    color: mode.copyFromId ? 'var(--text)' : 'var(--text-muted)',
                    backgroundColor: 'var(--bg)',
                  }}
                >
                  <option value="">Copy from (optional)</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => commitCreate(mode.name, mode.copyFromId)}
                    className="rounded px-2 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setMode({ type: 'idle' })}
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setMode({ type: 'creating', name: '', copyFromId: '' })}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-black/5"
                style={{ color: 'var(--text-muted)' }}
              >
                + New term
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
