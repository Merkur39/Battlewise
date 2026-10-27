import { generateKeyPairSync, verify } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { buildReport, MAX_LENGTH, REPORT_KINDS, type Report } from '@/features/report/model'
import { handle, issueOf, KINDS, LIMITS, neutralise, validate } from './feedback'

const ZWSP = '​'

/** A report as the app builds it, from the Troll's sheet. */
const report: Report = buildReport(
  {
    screen: 'creature',
    kind: 'data',
    heading: 'Troll · 0★',
    title: 'Troll',
    subject: 'Troll',
    ids: { creature: 'Troll', stars: 0 },
    shows: ['Troll · 0★', 'Frappe au sol, contondant, 70 dégâts'],
    lines: [
      {
        id: 'Troll/troll_groundslam',
        label: 'Frappe au sol',
        subject: 'Ground slam',
        shows: 'Frappe au sol, contondant, 70 dégâts',
      },
    ],
  },
  {
    kind: 'data',
    line: 'Troll/troll_groundslam',
    text: 'Elle fait 60 dans le jeu.',
    game: '60',
    nickname: 'Ragnar',
    website: '',
  },
  { version: '1.4.0', gameVersion: '0.221.4', language: 'fr', width: 390 },
)

describe('the limits', () => {
  it('are the app’s', () => {
    expect(KINDS).toEqual(REPORT_KINDS)
    expect(LIMITS).toMatchObject(MAX_LENGTH)
  })
})

describe('validate', () => {
  it('takes a report as the app builds it', () => {
    expect(validate(report)).toEqual({ ok: true, value: report })
  })

  it('keeps only the fields it knows', () => {
    const result = validate({
      ...report,
      extra: 'x',
      context: { ...report.context, ip: '1.2.3.4' },
    })
    expect(result).toEqual({ ok: true, value: report })
  })

  it.each<[string, unknown]>([
    ['an unknown kind', { ...report, kind: 'spam' }],
    ['no text', { ...report, text: '   ' }],
    ['a text too long', { ...report, text: 'a'.repeat(LIMITS.text + 1) }],
    ['a name too long', { ...report, nickname: 'a'.repeat(LIMITS.nickname + 1) }],
    ['another language', { ...report, context: { ...report.context, language: 'de' } }],
    ['a width that is no number', { ...report, context: { ...report.context, width: '390' } }],
    ['a creature id with spaces', { ...report, context: { ...report.context, creature: 'a b' } }],
    [
      'too many lines shown',
      { ...report, context: { ...report.context, shows: Array(61).fill('x') } },
    ],
    ['no context', { ...report, context: null }],
    ['no object at all', 'Elle fait 60'],
  ])('refuses %s', (_, input) => {
    expect(validate(input).ok).toBe(false)
  })
})

describe('neutralise', () => {
  it('breaks mentions, so nobody is called', () => {
    expect(neutralise('Merci @octocat')).toBe(`Merci @${ZWSP}octocat`)
  })

  it('breaks links, written or bare', () => {
    const text = neutralise('[ici](https://evil.example) ou www.evil.example')
    expect(text).not.toMatch(/\]\(/)
    expect(text).toContain(`https:${ZWSP}//`)
    expect(text).toContain(`www${ZWSP}.`)
  })

  it('shows images and HTML as text', () => {
    expect(neutralise('![x](a.png) <img src=x>')).toBe('\\!\\[x\\]\\(a.png\\) \\<img src=x\\>')
  })

  it('breaks references to other issues', () => {
    expect(neutralise('comme #12')).toBe(`comme \\#${ZWSP}12`)
  })

  it('drops control characters and keeps the lines', () => {
    expect(neutralise('un\r\ndeux\u0007')).toBe('un\ndeux')
  })
})

describe('issueOf', () => {
  it('titles the issue with its kind, its subject and the start of the text', () => {
    expect(issueOf(report).title).toBe('[data] Troll › Ground slam — « Elle fait 60 dans le jeu. »')
  })

  it('cuts a long text in the title', () => {
    const { title } = issueOf({ ...report, text: 'mot '.repeat(100) })
    expect(title.length).toBeLessThanOrEqual(120)
    expect(title).toMatch(/… »$/)
  })

  it('leaves out the subject a report from Settings has not', () => {
    const idea: Report = { kind: 'idea', text: report.text, website: '', context: report.context }
    expect(issueOf(idea).title).toBe('[idea] « Elle fait 60 dans le jeu. »')
  })

  it('labels it for the Inbox, with its kind', () => {
    expect(issueOf(report).labels).toEqual(['from:app', 'data'])
  })

  it('writes the player’s words, then what the app attached', () => {
    const { body } = issueOf(report)
    expect(body.startsWith('Elle fait 60 dans le jeu.\n')).toBe(true)
    expect(body).toContain('**What the game shows:** 60')
    expect(body).toContain('**Line:** Frappe au sol · Frappe au sol, contondant, 70 dégâts')
    expect(body).toContain('Reported from the app by **Ragnar**.')
    expect(body).toContain('<details>')
    expect(body).toContain('| App | 1.4.0 |')
    expect(body).toContain('| Game data | Valheim 0.221.4 |')
    expect(body).toContain('| Screen | creature, 390 px |')
    expect(body).toContain('| Creature | `Troll` · 0★ |')
    expect(body).toContain('- Troll · 0★')
  })
})

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})

const env = {
  GITHUB_APP_ID: '123456',
  GITHUB_APP_INSTALLATION_ID: '7890',
  GITHUB_APP_PRIVATE_KEY: privateKey,
}

/** GitHub as seen by the function: an installation token, then the issue. */
function github({ token = 201, issue = 201 } = {}) {
  return vi.fn<typeof fetch>((input) =>
    Promise.resolve(
      (input instanceof Request ? input.url : input.toString()).endsWith('/access_tokens')
        ? Response.json({ token: 'ghs_installation' }, { status: token })
        : Response.json({ number: 48 }, { status: issue }),
    ),
  )
}

const post = (body: string, type = 'application/json') =>
  new Request('https://battlewise.test/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': type },
    body,
  })

const now = () => Date.UTC(2026, 9, 27, 18)

describe('handle', () => {
  it('opens the issue as the GitHub App, and answers its number', async () => {
    const fetch = github()

    const response = await handle(post(JSON.stringify(report)), { env, fetch, now })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ number: 48 })

    const [tokenUrl, tokenInit] = fetch.mock.calls[0] ?? []
    expect(tokenUrl).toBe('https://api.github.com/app/installations/7890/access_tokens')
    const jwt = new Headers(tokenInit?.headers).get('Authorization')?.replace('Bearer ', '') ?? ''
    const [header = '', payload = '', signature = ''] = jwt.split('.')
    expect(
      verify(
        'sha256',
        Buffer.from(`${header}.${payload}`),
        publicKey,
        Buffer.from(signature, 'base64url'),
      ),
    ).toBe(true)
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toMatchObject({
      iss: '123456',
    })

    const [issueUrl, issueInit] = fetch.mock.calls[1] ?? []
    expect(issueUrl).toBe('https://api.github.com/repos/Merkur39/Battlewise/issues')
    expect(new Headers(issueInit?.headers).get('Authorization')).toBe('Bearer ghs_installation')
    expect(typeof issueInit?.body === 'string' && JSON.parse(issueInit.body)).toEqual(
      issueOf(report),
    )
  })

  it('reads a key whose line breaks were pasted as \\n', async () => {
    const fetch = github()
    const flat = { ...env, GITHUB_APP_PRIVATE_KEY: privateKey.replaceAll('\n', '\\n') }
    const response = await handle(post(JSON.stringify(report)), { env: flat, fetch, now })
    expect(response.status).toBe(201)
  })

  it('takes POST only', async () => {
    const fetch = github()
    const response = await handle(new Request('https://battlewise.test/api/feedback'), {
      env,
      fetch,
      now,
    })
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each<[string, Request, number]>([
    ['what is not JSON', post('kind=data', 'application/x-www-form-urlencoded'), 415],
    ['a body too large', post(JSON.stringify({ ...report, text: 'a'.repeat(40_000) })), 413],
    ['broken JSON', post('{"kind":'), 400],
    ['a report it cannot take', post(JSON.stringify({ ...report, kind: 'spam' })), 422],
  ])('refuses %s, and opens nothing', async (_, request, status) => {
    const fetch = github()
    const response = await handle(request, { env, fetch, now })
    expect(response.status).toBe(status)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('answers a bot that filled the hidden field as if all went well, and opens nothing', async () => {
    const fetch = github()
    const response = await handle(post(JSON.stringify({ ...report, website: 'https://spam' })), {
      env,
      fetch,
      now,
    })
    expect(response.status).toBe(201)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('says it is not set up yet without its variables, so that the app keeps the report', async () => {
    const fetch = github()
    const response = await handle(post(JSON.stringify(report)), { env: {}, fetch, now })
    expect(response.status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['the token', { token: 401 }],
    ['the issue', { issue: 500 }],
  ])('answers 502 when GitHub refuses %s, so that the app keeps the report', async (_, answers) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await handle(post(JSON.stringify(report)), {
      env,
      fetch: github(answers),
      now,
    })
    expect(response.status).toBe(502)
  })
})
