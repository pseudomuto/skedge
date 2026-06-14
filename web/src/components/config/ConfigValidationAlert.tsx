import { useState } from 'react'

import type { ValidationError } from '../../validation/config'

interface Props {
  errors: ValidationError[]
}

export function ConfigValidationAlert({ errors }: Props) {
  const [dismissedKey, setDismissedKey] = useState('')
  const errorKey = errors.map((e) => e.path).join('\0')
  const dismissed = dismissedKey === errorKey && errorKey !== ''

  if (errors.length === 0 || dismissed) return null

  return (
    <div className="mb-4 rounded border border-red-300 bg-red-50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-red-800">
            Config has {errors.length} validation error{errors.length !== 1 ? 's' : ''}:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {errors.map((e) => (
              <li key={e.path}>
                <span className="font-mono">{e.path}</span> {e.message}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => setDismissedKey(errorKey)}
          className="ml-4 text-red-500 hover:text-red-700"
          aria-label="Dismiss"
        >
          x
        </button>
      </div>
    </div>
  )
}
