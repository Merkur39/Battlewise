import { describe, expect, it, vi } from 'vitest'
import type { KeyValueStorage } from '@/app/store'
import { createIssueStates, fetchIssueState } from './issues'

function memoryStorage(): KeyValueStorage {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
  }
}

const github = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body, { status }))

describe('fetchIssueState', () => {
  it('reads an issue from GitHub’s public API', async () => {
    const fetch = github(200, { number: 48, state: 'closed', state_reason: 'completed' })

    await expect(fetchIssueState(48)).resolves.toEqual({ state: 'closed', reason: 'completed' })
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/Merkur39/Foelore/issues/48', {
      headers: { Accept: 'application/vnd.github+json' },
    })
  })

  it('reads an open issue, and a reason it does not know as none', async () => {
    github(200, { state: 'open', state_reason: null })
    await expect(fetchIssueState(52)).resolves.toEqual({ state: 'open' })
    github(200, { state: 'closed', state_reason: 'reopened' })
    await expect(fetchIssueState(52)).resolves.toEqual({ state: 'closed', reason: null })
  })

  it('gives nothing when GitHub does not answer, or refuses', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchIssueState(48)).resolves.toBeNull()
    github(403, { message: 'API rate limit exceeded' })
    await expect(fetchIssueState(48)).resolves.toBeNull()
  })
})

describe('the issue states', () => {
  it('keeps what GitHub said on the device, to show it offline', async () => {
    const storage = memoryStorage()
    const read = vi.fn((number: number) =>
      Promise.resolve(number === 48 ? ({ state: 'open' } as const) : null),
    )

    await createIssueStates(storage, read).refresh([48])

    const offline = createIssueStates(storage, () => Promise.resolve(null))
    expect(offline.get(48)).toEqual({ state: 'open' })
    expect(offline.get(52)).toBeUndefined()
  })

  it('stops at the first issue GitHub does not give, and keeps what it knew', async () => {
    const storage = memoryStorage()
    await createIssueStates(storage, () => Promise.resolve({ state: 'open' } as const)).refresh([
      48, 52,
    ])
    const read = vi.fn(() => Promise.resolve(null))
    const states = createIssueStates(storage, read)

    await states.refresh([48, 52])

    expect(read).toHaveBeenCalledTimes(1)
    expect(states.get(52)).toEqual({ state: 'open' })
  })
})
