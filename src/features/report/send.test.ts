import { describe, expect, it, vi } from 'vitest'
import type { Report } from './model'
import { SendError } from './outbox'
import { postReport } from './send'

const report: Report = {
  kind: 'idea',
  text: 'Les boss phase par phase.',
  website: '',
  context: {
    version: '1.4.0',
    gameVersion: '0.221.4',
    language: 'fr',
    width: 1440,
    screen: 'settings',
    shows: [],
  },
}

const answer = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body, { status }))

describe('postReport', () => {
  it('posts the report to /api/feedback and answers with the number of its issue', async () => {
    const fetch = answer(201, { number: 48 })

    await expect(postReport(report)).resolves.toEqual({ number: 48 })
    expect(fetch).toHaveBeenCalledWith('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    })
  })

  it('fails with the status the server answers', async () => {
    answer(429, { error: 'Too many reports' })
    await expect(postReport(report)).rejects.toEqual(new SendError(429))
  })

  it('fails without a status when no answer comes', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(postReport(report)).rejects.toEqual(new SendError(null))
  })

  it('fails when the answer carries no issue number', async () => {
    answer(200, {})
    await expect(postReport(report)).rejects.toBeInstanceOf(SendError)
  })
})
