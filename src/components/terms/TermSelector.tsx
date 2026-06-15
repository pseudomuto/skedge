import { useCallback, useEffect, useRef, useState } from 'react'

import type { StoredTerm } from '../../db/schema'
import type { TermExport } from '../../types/term'
import { parseTermExport } from '../../utils/termFile'

interface Props {
  terms: StoredTerm[]
  activeTerm: StoredTerm | null
  onSelect: (id: number) => void
  onRename: (id: number, name: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onCreate: (name: string, copyFromId?: number) => Promise<void>
  onExport: (id: number) => Promise<void>
  onImport: (name: string, data: TermExport) => Promise<void>
}

type PanelMode =
  | { type: 'idle' }
  | { type: 'renaming'; id: number; value: string }
  | { type: 'confirming-delete'; id: number }
  | { type: 'creating'; name: string; copyFromId: string }
  | { type: 'importing'; name: string; parsed: TermExport }

export function TermSelector({ terms, activeTerm, onSelect, onRename, onDelete, onCreate, onExport, onImport }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<PanelMode>({ type: 'idle' })
  const [busy, setBusy] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    if (mode.type === 'renaming') renameInputRef.current?.focus()
    if (mode.type === 'creating') createInputRef.current?.focus()
    if (mode.type === 'importing') importInputRef.current?.focus()
  }, [mode.type])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setMode({ type: 'idle' })
    setImportError(null)
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
    try {
      await onRename(id, trimmed)
      setMode({ type: 'idle' })
    } finally {
      setBusy(false)
    }
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
    try {
      await onDelete(id)
      setMode({ type: 'idle' })
    } finally {
      setBusy(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setImportError(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseTermExport(ev.target?.result as string)
        setImportError(null)
        setMode({ type: 'importing', name: parsed.name, parsed })
      } catch (err) {
        setImportError((err as Error).message)
      }
    }
    reader.onerror = () => {
      setImportError('Failed to read file')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function commitImport(name: string, parsed: TermExport) {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onImport(trimmed, parsed)
      closeDropdown()
    } finally {
      setBusy(false)
    }
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
                    onClick={() => onExport(term.id!)}
                    className="rounded p-0.5 hover:bg-black/10"
                    title="Export"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
                      <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.061l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.061z" />
                    </svg>
                  </button>
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
            ) : mode.type === 'importing' ? (
              <div className="space-y-2 px-3 py-2">
                <input
                  ref={importInputRef}
                  placeholder="Term name"
                  value={mode.name}
                  onChange={(e) => setMode({ ...mode, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitImport(mode.name, mode.parsed)
                    if (e.key === 'Escape') closeDropdown()
                  }}
                  className="w-full rounded border px-2 py-1 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--bg)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => commitImport(mode.name, mode.parsed)}
                    className="rounded px-2 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    Import
                  </button>
                  <button onClick={closeDropdown} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {importError && (
                  <p className="px-3 pb-1 text-xs" style={{ color: '#b91c1c' }}>
                    {importError}
                  </p>
                )}
                <div className="flex">
                  <button
                    onClick={() => setMode({ type: 'creating', name: '', copyFromId: '' })}
                    className="flex-1 px-3 py-1.5 text-left text-sm hover:bg-black/5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    + New term
                  </button>
                  <button
                    onClick={() => {
                      setImportError(null)
                      fileInputRef.current?.click()
                    }}
                    className="px-3 py-1.5 text-sm hover:bg-black/5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Import
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
