import { useCallback, useEffect, useMemo, useState } from 'react'

import { getConfig, saveConfig } from '../db/queries'
import type { Config } from '../types/config'
import { validateConfig } from '../validation/config'
import type { ValidationError } from '../validation/config'

interface UseConfigReturn {
  config: Config | null
  loading: boolean
  error: Error | null
  updateConfig: (next: Config) => Promise<void>
  validationErrors: ValidationError[]
}

type TermState = { termId: number; config: Config | null; error: Error | null }

export function useConfig(termId: number | null): UseConfigReturn {
  const [termState, setTermState] = useState<TermState | null>(null)

  useEffect(() => {
    if (termId === null) return
    getConfig(termId)
      .then((data) => setTermState({ termId, config: data ?? null, error: null }))
      .catch((err) =>
        setTermState({ termId, config: null, error: err instanceof Error ? err : new Error(String(err)) }),
      )
  }, [termId])

  const config = termState?.termId === termId ? termState.config : null
  const loading = termId === null || termState?.termId !== termId
  const error = termState?.termId === termId ? (termState.error ?? null) : null

  const updateConfig = useCallback(
    async (next: Config): Promise<void> => {
      if (termId === null) return
      setTermState((s) => (s?.termId === termId ? { ...s, config: next } : s))
      await saveConfig(termId, next)
    },
    [termId],
  )

  const validationErrors = useMemo(() => (config ? validateConfig(config) : []), [config])

  return { config, loading, error, updateConfig, validationErrors }
}
