import { useCallback, useEffect, useRef, useState } from 'react'

import {
  copyTerm as copyTermQuery,
  createTerm as createTermQuery,
  deleteTerm as deleteTermQuery,
  listTerms,
  renameTerm as renameTermQuery,
} from '../db/queries'
import type { StoredTerm } from '../db/schema'

const ACTIVE_TERM_KEY = 'skedge_active_term'

interface UseTermsReturn {
  terms: StoredTerm[]
  activeTerm: StoredTerm | null
  loading: boolean
  setActiveTerm: (id: number) => void
  createTerm: (name: string, copyFromId?: number) => Promise<void>
  renameTerm: (id: number, name: string) => Promise<void>
  deleteTerm: (id: number) => Promise<void>
}

export function useTerms(): UseTermsReturn {
  const [terms, setTerms] = useState<StoredTerm[]>([])
  const [activeTerm, setActiveTermState] = useState<StoredTerm | null>(null)
  const [loading, setLoading] = useState(true)
  const activeTermRef = useRef(activeTerm)

  useEffect(() => {
    activeTermRef.current = activeTerm
  }, [activeTerm])

  useEffect(() => {
    async function init() {
      let loaded = await listTerms()
      if (loaded.length === 0) {
        await createTermQuery('Default')
        loaded = await listTerms()
      }
      setTerms(loaded)

      const storedId = Number(localStorage.getItem(ACTIVE_TERM_KEY))
      const active = loaded.find((t) => t.id === storedId) ?? loaded[0] ?? null
      setActiveTermState(active)
      if (active?.id != null) {
        localStorage.setItem(ACTIVE_TERM_KEY, String(active.id))
      }
      setLoading(false)
    }
    init()
  }, [])

  const setActiveTerm = useCallback(
    (id: number) => {
      const term = terms.find((t) => t.id === id) ?? null
      setActiveTermState(term)
      if (id != null) localStorage.setItem(ACTIVE_TERM_KEY, String(id))
    },
    [terms],
  )

  const createTerm = useCallback(async (name: string, copyFromId?: number) => {
    const newId = copyFromId != null ? await copyTermQuery(copyFromId, name) : await createTermQuery(name)
    const updated = await listTerms()
    setTerms(updated)
    const newTerm = updated.find((t) => t.id === newId) ?? null
    setActiveTermState(newTerm)
    if (newId != null) localStorage.setItem(ACTIVE_TERM_KEY, String(newId))
  }, [])

  const renameTerm = useCallback(async (id: number, name: string) => {
    await renameTermQuery(id, name)
    const updated = await listTerms()
    setTerms(updated)
    if (activeTermRef.current?.id === id) {
      setActiveTermState(updated.find((t) => t.id === id) ?? null)
    }
  }, [])

  const deleteTerm = useCallback(async (id: number) => {
    await deleteTermQuery(id)
    let updated = await listTerms()
    if (updated.length === 0) {
      await createTermQuery('Default')
      updated = await listTerms()
    }
    setTerms(updated)
    if (activeTermRef.current?.id === id) {
      const next = updated[0] ?? null
      setActiveTermState(next)
      if (next?.id != null) localStorage.setItem(ACTIVE_TERM_KEY, String(next.id))
    }
  }, [])

  return { terms, activeTerm, loading, setActiveTerm, createTerm, renameTerm, deleteTerm }
}
