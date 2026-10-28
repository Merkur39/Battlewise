import { generateKeyPairSync, verify } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { buildReport, MAX_LENGTH, REPORT_KINDS, type Report } from '@/features/report/model'
import { commentOf, handle, issueOf, KINDS, LIMITS, neutralise, validate } from './feedback'

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

/** The same report as 1.5 built it: its line has no id. */
const earlier: Report = {
  ...report,
  line: { label: report.line?.label ?? '', shows: report.line?.shows ?? '' },
}

/** A crash on the Troll's sheet, reported without a word. Its stack holds what could close a code block,
 * call someone or link elsewhere. */
const crash: Report = {
  kind: 'bug',
  text: '',
  website: '',
  subject: 'Troll',
  crash: {
    message: "TypeError: Cannot read properties of undefined (reading 'hits')",
    stack: [
      "TypeError: Cannot read properties of undefined (reading 'hits')",
      '    at attackDamage (https://foelore.test/assets/index.js:1:48211)',
      '    at ```Sheet``` @octocat (index.js:1:2)',
    ].join('\n'),
  },
  context: { ...report.context, stars: 2, shows: [] },
}

/** Open issues the app opened on another line of the Troll, and on the same line of another creature. */
const elsewhere = [
  {
    number: 45,
    body: issueOf({ ...report, line: { id: 'health', label: 'PV', shows: 'PV 600' } }).body,
  },
  {
    number: 46,
    body: issueOf({ ...report, context: { ...report.context, creature: 'Fenring' } }).body,
  },
]

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

  it('takes a line without its id, as 1.5 sent it', () => {
    expect(validate(earlier)).toEqual({ ok: true, value: earlier })
  })

  it('takes a crash without a word', () => {
    expect(validate(crash)).toEqual({ ok: true, value: crash })
  })

  it('takes a crash on the page of last resort, which shows no screen', () => {
    const anywhere = { ...crash, context: { ...crash.context, screen: 'app' } }
    expect(validate(anywhere).ok).toBe(true)
  })

  it.each(['bestiary', 'arsenal', 'guide'])(
    'takes a crash on the %s, its list or its screen',
    (screen) => {
      expect(validate({ ...crash, context: { ...crash.context, screen } }).ok).toBe(true)
    },
  )

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
    ['no text and no crash', { ...report, text: '' }],
    ['a crash without its stack', { ...crash, crash: { message: 'TypeError' } }],
    [
      'a stack too long',
      { ...crash, crash: { message: 'TypeError', stack: 'a'.repeat(LIMITS.crashStack + 1) } },
    ],
    ['a text too long', { ...report, text: 'a'.repeat(LIMITS.text + 1) }],
    ['a name too long', { ...report, nickname: 'a'.repeat(LIMITS.nickname + 1) }],
    ['another language', { ...report, context: { ...report.context, language: 'de' } }],
    ['a width that is no number', { ...report, context: { ...report.context, width: '390' } }],
    ['a creature id with spaces', { ...report, context: { ...report.context, creature: 'a b' } }],
    ['a line id that closes a comment', { ...report, line: { ...report.line, id: 'a -->' } }],
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

  it('marks the creature and the line, last, for the next report on them to find', () => {
    expect(issueOf(report).body).toMatch(
      /<\/details>\n\n<!-- battlewise-line: Troll\/Troll\/troll_groundslam -->$/,
    )
  })

  it('marks nothing when the report names no line', () => {
    expect(issueOf(earlier).body).not.toContain('battlewise-line')
  })
})

describe('issueOf, for a crash', () => {
  it('titles it with its subject and its error', () => {
    expect(issueOf(crash).title).toMatch(
      /^\[bug\] Troll — Crash « TypeError: Cannot read properties of undefined/,
    )
  })

  it('writes the error and its stack as code, in a fence nothing in it can close', () => {
    const { body } = issueOf(crash)
    expect(body.startsWith('**Crash:**\n\n````\n')).toBe(true)
    expect(body).toContain(['', crash.crash?.stack ?? '', '````', ''].join('\n'))
  })

  it('puts the player’s words first, when they gave some', () => {
    const { body } = issueOf({ ...crash, text: 'Je passais le Troll à 2★.' })
    expect(body.startsWith('Je passais le Troll à 2★.\n\n**Crash:**\n')).toBe(true)
  })
})

describe('commentOf', () => {
  it('adds a +1, then says what the issue would have said, without its mark', () => {
    const { body } = commentOf(report)
    expect(body.startsWith('**+1**\n\nElle fait 60 dans le jeu.\n')).toBe(true)
    expect(body).toContain('**What the game shows:** 60')
    expect(body).toContain('Reported from the app by **Ragnar**.')
    expect(body).toContain('| Creature | `Troll` · 0★ |')
    expect(body).not.toContain('battlewise-line')
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

const urlOf = (input: RequestInfo | URL) =>
  new URL(input instanceof Request ? input.url : input.toString())

/** GitHub as seen by the function: an installation token, the open issues, then a new issue or a
 * +1 on one of them. */
function github({
  token = 201,
  list = 200,
  open = [] as readonly unknown[],
  issue = 201,
  comment = 201,
} = {}) {
  return vi.fn<typeof fetch>((input, init) => {
    const { pathname } = urlOf(input)
    const answer = (body: unknown, status: number) =>
      Promise.resolve(Response.json(body, { status }))
    if (pathname.endsWith('/access_tokens')) return answer({ token: 'ghs_installation' }, token)
    if (pathname.endsWith('/comments')) return answer({ id: 9001 }, comment)
    return init?.method === 'POST' ? answer({ number: 48 }, issue) : answer(open, list)
  })
}

/** What the function asked GitHub with this method on this path. */
const calls = (fetch: ReturnType<typeof github>, method: string, path: string) =>
  fetch.mock.calls
    .map(([input, init]) => ({ url: urlOf(input), init }))
    .filter(({ url, init }) => (init?.method ?? 'GET') === method && url.pathname === path)

const ISSUES = '/repos/Merkur39/Foelore/issues'

const post = (body: string, type = 'application/json') =>
  new Request('https://foelore.test/api/feedback', {
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

    const [created, ...more] = calls(fetch, 'POST', ISSUES)
    expect(more).toEqual([])
    expect(created?.url.origin).toBe('https://api.github.com')
    expect(new Headers(created?.init?.headers).get('Authorization')).toBe('Bearer ghs_installation')
    expect(typeof created?.init?.body === 'string' && JSON.parse(created.init.body)).toEqual(
      issueOf(report),
    )
  })

  it('looks for the line among the open wrong-data issues the app opened', async () => {
    const fetch = github()
    await handle(post(JSON.stringify(report)), { env, fetch, now })
    const [listed] = calls(fetch, 'GET', ISSUES)
    expect(listed?.url.searchParams.get('labels')).toBe('from:app,data')
    expect(listed?.url.searchParams.get('state')).toBe('open')
    expect(new Headers(listed?.init?.headers).get('Authorization')).toBe('Bearer ghs_installation')
  })

  it('adds a +1 to the open issue on the same line, and answers its number', async () => {
    const fetch = github({ open: [...elsewhere, { number: 47, body: issueOf(report).body }] })

    const response = await handle(post(JSON.stringify(report)), { env, fetch, now })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ number: 47 })
    const [comment] = calls(fetch, 'POST', `${ISSUES}/47/comments`)
    expect(new Headers(comment?.init?.headers).get('Authorization')).toBe('Bearer ghs_installation')
    expect(typeof comment?.init?.body === 'string' && JSON.parse(comment.init.body)).toEqual(
      commentOf(report),
    )
    expect(calls(fetch, 'POST', ISSUES)).toEqual([])
  })

  it('opens a new issue when the open ones are on other lines or other creatures', async () => {
    const fetch = github({ open: elsewhere })
    const response = await handle(post(JSON.stringify(report)), { env, fetch, now })
    expect(await response.json()).toEqual({ number: 48 })
    expect(calls(fetch, 'POST', ISSUES)).toHaveLength(1)
  })

  it('takes no pull request for an issue', async () => {
    const pull = { number: 47, body: issueOf(report).body, pull_request: { url: 'x' } }
    const fetch = github({ open: [pull] })
    const response = await handle(post(JSON.stringify(report)), { env, fetch, now })
    expect(await response.json()).toEqual({ number: 48 })
  })

  it('looks for nothing when the report names no line', async () => {
    const fetch = github({ open: [{ number: 47, body: issueOf(report).body }] })
    const response = await handle(post(JSON.stringify(earlier)), { env, fetch, now })
    expect(await response.json()).toEqual({ number: 48 })
    expect(calls(fetch, 'GET', ISSUES)).toEqual([])
  })

  it('reads a key whose line breaks were pasted as \\n', async () => {
    const fetch = github()
    const flat = { ...env, GITHUB_APP_PRIVATE_KEY: privateKey.replaceAll('\n', '\\n') }
    const response = await handle(post(JSON.stringify(report)), { env: flat, fetch, now })
    expect(response.status).toBe(201)
  })

  it('takes POST only', async () => {
    const fetch = github()
    const response = await handle(new Request('https://foelore.test/api/feedback'), {
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
    ['the open issues', { list: 500 }],
    ['the issue', { issue: 500 }],
    ['the +1', { comment: 500, open: [{ number: 47, body: issueOf(report).body }] }],
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
