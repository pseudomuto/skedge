interface Props {
  blocks: string[]
  onChange: (blocks: string[]) => void
}

export function BlocksEditor({ blocks, onChange }: Props) {
  const update = (index: number, value: string) => {
    const next = blocks.map((b, i) => (i === index ? value : b))
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...blocks]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next)
  }

  const moveDown = (index: number) => {
    if (index === blocks.length - 1) return
    const next = [...blocks]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    onChange(next)
  }

  const add = () => {
    onChange([...blocks, ''])
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Blocks</h2>
      <div className="space-y-2">
        {blocks.map((block, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-right text-sm text-gray-400">{i + 1}.</span>
            <input
              type="text"
              value={block}
              onChange={(e) => update(i, e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="e.g. 8:00-9:00"
            />
            <button
              onClick={() => moveUp(i)}
              disabled={i === 0}
              className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              ^
            </button>
            <button
              onClick={() => moveDown(i)}
              disabled={i === blocks.length - 1}
              className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              v
            </button>
            <button onClick={() => remove(i)} className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50">
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-3 rounded border border-blue-300 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
      >
        + Add Block
      </button>
    </div>
  )
}
