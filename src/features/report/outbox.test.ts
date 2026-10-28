import { describe, expect, it, vi } from 'vitest'
import type { KeyValueStorage } from '@/app/store'
import type { Report } from './model'
import { createOutbox, SendError, type Sender } from './outbox'

function memoryStorage(): KeyValueStorage {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
  }
}

const report = (text: string): Report => ({
  kind: 'bug',
  text,
  website: '',
  context: {
    version: '1.4.0',
    gameVersion: '0.221.4',
    language: 'fr',
    width: 390,
    screen: 'settings',
    shows: [],
  },
})

const at = () => new Date('2026-10-27T18:00:00Z')
const numbered =
  (...numbers: number[]): Sender =>
  () => {
    const number = numbers.shift()
    return number === undefined ? Promise.reject(new SendError(null)) : Promise.resolve({ number })
  }

describe('the outbox', () => {
  it('sends a report at once and keeps its receipt on the device', async () => {
    const storage = memoryStorage()
    const outbox = createOutbox(storage, numbered(48), at)

    const outcome = await outbox.submit(report('Rien ne se passe.'), 'Rien ne se passe.')

    const receipt = {
      number: 48,
      kind: 'bug',
      at: '2026-10-27T18:00:00.000Z',
      title: 'Rien ne se passe.',
    }
    expect(outcome).toEqual({ status: 'sent', receipt })
    expect(outbox.pending()).toEqual([])
    expect(createOutbox(storage, numbered(), at).receipts()).toEqual([receipt])
  })

  it('keeps a report that could not leave, even once the app is closed, and sends it later', async () => {
    const storage = memoryStorage()
    const offline = createOutbox(storage, numbered(), at)

    expect(await offline.submit(report('Rien ne se passe.'), 'Rien ne se passe.')).toEqual({
      status: 'kept',
    })

    const reopened = createOutbox(storage, numbered(49), at)
    expect(reopened.pending()).toEqual([report('Rien ne se passe.')])
    await reopened.flush()
    expect(reopened.pending()).toEqual([])
    expect(reopened.receipts().map((receipt) => receipt.number)).toEqual([49])
  })

  it('sends in order and stops at the first that fails', async () => {
    const send = vi.fn<Sender>().mockRejectedValue(new SendError(503))
    const outbox = createOutbox(memoryStorage(), send, at)
    await outbox.submit(report('premier'), 'premier')
    await outbox.submit(report('second'), 'second')
    send.mockClear()

    await outbox.flush()

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(report('premier'))
    expect(outbox.pending()).toEqual([report('premier'), report('second')])
  })

  it.each([429, 404, 500])(
    'keeps a report the server answers %i to: held back, not there yet, or down',
    async (status) => {
      const outbox = createOutbox(memoryStorage(), () => Promise.reject(new SendError(status)), at)
      expect(await outbox.submit(report('Rien ne se passe.'), 'Rien ne se passe.')).toEqual({
        status: 'kept',
      })
      expect(outbox.pending()).toHaveLength(1)
    },
  )

  it('says when the server refuses for good the report just sent', async () => {
    const outbox = createOutbox(memoryStorage(), () => Promise.reject(new SendError(422)), at)
    expect(await outbox.submit(report('Rien ne se passe.'), 'Rien ne se passe.')).toEqual({
      status: 'refused',
    })
    expect(outbox.pending()).toEqual([])
  })

  it('drops a report the server refuses for good, and goes on with the next', async () => {
    const storage = memoryStorage()
    const offline = createOutbox(storage, numbered(), at)
    await offline.submit(report('refusé'), 'refusé')
    await offline.submit(report('accepté'), 'accepté')
    const send = vi
      .fn<Sender>()
      .mockRejectedValueOnce(new SendError(422))
      .mockResolvedValueOnce({ number: 50 })

    const later = createOutbox(storage, send, at)
    await later.flush()

    expect(later.pending()).toEqual([])
    expect(later.receipts().map((receipt) => receipt.number)).toEqual([50])
  })

  it('sends a report once when asked twice at the same time', async () => {
    const storage = memoryStorage()
    await createOutbox(storage, numbered(), at).submit(
      report('Rien ne se passe.'),
      'Rien ne se passe.',
    )
    const send = vi.fn(numbered(51))
    const outbox = createOutbox(storage, send, at)

    await Promise.all([outbox.flush(), outbox.flush()])

    expect(send).toHaveBeenCalledTimes(1)
  })

  it('holds reports for the session where the device keeps nothing', async () => {
    const outbox = createOutbox(null, numbered(), at)
    await outbox.submit(report('Rien ne se passe.'), 'Rien ne se passe.')
    expect(outbox.pending()).toHaveLength(1)
  })

  it('keeps the title and the name of a report with its receipt', async () => {
    const outbox = createOutbox(memoryStorage(), numbered(48), at)
    await outbox.submit(
      { ...report('Elle fait 60.'), kind: 'data', nickname: 'Ragnar' },
      'Troll › Frappe au sol',
    )
    expect(outbox.receipts()).toEqual([
      {
        number: 48,
        kind: 'data',
        at: '2026-10-27T18:00:00.000Z',
        title: 'Troll › Frappe au sol',
        nickname: 'Ragnar',
      },
    ])
  })

  it('says what waits, with its title and when it was written', async () => {
    const outbox = createOutbox(memoryStorage(), numbered(), at)
    await outbox.submit(report('Rien ne se passe.'), 'Rien ne se passe.')
    expect(outbox.waiting()).toEqual([
      { kind: 'bug', title: 'Rien ne se passe.', at: '2026-10-27T18:00:00.000Z' },
    ])
  })

  it('reads what an older version kept, which had no title', () => {
    const storage = memoryStorage()
    storage.setItem('foelore-outbox', JSON.stringify([{ id: 'a', report: report('Rien.') }]))
    storage.setItem(
      'foelore-reports',
      JSON.stringify([{ number: 40, kind: 'bug', at: '2026-10-27T18:00:00.000Z' }]),
    )
    const outbox = createOutbox(storage, numbered(), at)
    expect(outbox.pending()).toEqual([report('Rien.')])
    expect(outbox.waiting()).toEqual([{ kind: 'bug', title: '', at: '' }])
    expect(outbox.receipts()).toEqual([
      { number: 40, kind: 'bug', at: '2026-10-27T18:00:00.000Z', title: '' },
    ])
  })
})
