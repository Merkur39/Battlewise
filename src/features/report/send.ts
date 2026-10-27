import { SendError, type Sender } from './outbox'

/** Sends a report to /api/feedback, which opens its issue (see api/README.md). */
export const postReport: Sender = async (report) => {
  let response: Response
  try {
    response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    })
  } catch {
    throw new SendError(null)
  }
  if (!response.ok) throw new SendError(response.status)
  const body: unknown = await response.json().catch(() => null)
  const number = typeof body === 'object' && body !== null && 'number' in body ? body.number : null
  if (typeof number !== 'number' || !Number.isInteger(number)) throw new SendError(null)
  return { number }
}
