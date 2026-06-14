import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Config } from '../types/config'
import { validateConfig } from '../validation/config'
import type { ValidationError } from '../validation/config'
import { getConfig, saveConfig } from '../db/queries'

interface UseConfigReturn {
  config: Config | null
  loading: boolean
  error: Error | null
  updateConfig: (next: Config) => Promise<void>
  validationErrors: ValidationError[]
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    getConfig()
      .then((data) => setConfig(data ?? null))
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false))
  }, [])

  const updateConfig = useCallback(async (next: Config): Promise<void> => {
    setConfig(next)
    await saveConfig(next)
  }, [])

  const validationErrors = useMemo(() => (config ? validateConfig(config) : []), [config])

  return { config, loading, error, updateConfig, validationErrors }
}
