import { createPrivateKey, sign } from 'node:crypto'
import type { Crash, Report } from '../src/features/report/model'

/**
 * POST /api/feedback: a report sent from the app becomes a public issue on the repository, written
 * as the GitHub App installed on it (see api/README.md), or a +1 on the open issue already about the
 * same line of the same creature. Self-contained: Vercel builds this file on its own, so it imports
 * nothing from the app but a type, and repeats its limits (a test holds them equal).
 */

export const KINDS = ['data', 'bug', 'idea'] as const
export const LIMITS = {
  text: 2000,
  game: 200,
  nickname: 40,
  website: 200,
  subject: 200,
  label: 100,
  shows: 600,
  /** Lines the screen showed. */
  lines: 60,
  crashMessage: 500,
  crashStack: 4000,
  /** The whole request, in characters. */
  body: 32_000,
} as const

const REPOSITORY = 'Merkur39/Battlewise'
const GITHUB = 'https://api.github.com'
const SCREENS = [
  'creature',
  'simulation',
  'settings',
  'app',
  'bestiary',
  'arsenal',
  'guide',
] as const
const LANGUAGES = ['fr', 'en'] as const
const ID = /^[A-Za-z0-9_]{1,100}$/
/** A line of the sheet: `health`, or a fighter and its attack, `Troll/troll_groundslam`. */
const LINE = /^[A-Za-z0-9_/]{1,200}$/
const VERSION = /^[\w.+-]{1,20}$/
const ZWSP = '​'
// eslint-disable-next-line no-control-regex -- control characters are what it removes
const CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F]/g

export type Validation = { ok: true; value: Report } | { ok: false; error: string }

class Invalid extends Error {}

const fail = (what: string): never => {
  throw new Invalid(what)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function string(value: unknown, max: number, what: string, { required = false } = {}): string {
  if (typeof value !== 'string' || value.length > max) return fail(what)
  return required && value.trim() === '' ? fail(what) : value
}

const optional = <T>(value: unknown, read: (value: unknown) => T): T | undefined =>
  value === undefined ? undefined : read(value)

const oneOf = <T extends string>(values: readonly T[], value: unknown, what: string): T =>
  values.find((candidate) => candidate === value) ?? fail(what)

const integer = (value: unknown, min: number, max: number, what: string): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fail(what)

const matching = (value: unknown, pattern: RegExp, what: string): string =>
  typeof value === 'string' && pattern.test(value) ? value : fail(what)

/** The report, if it is one the app could have sent: only its known fields, each within its limits. */
export function validate(input: unknown): Validation {
  try {
    if (!isRecord(input)) return fail('report')
    const context = isRecord(input.context) ? input.context : fail('context')
    const shows =
      Array.isArray(context.shows) && context.shows.length <= LIMITS.lines
        ? context.shows.map((line) => string(line, LIMITS.shows, 'context.shows'))
        : fail('context.shows')
    const game = optional(input.game, (value) => string(value, LIMITS.game, 'game'))
    const nickname = optional(input.nickname, (value) => string(value, LIMITS.nickname, 'nickname'))
    const subject = optional(input.subject, (value) => string(value, LIMITS.subject, 'subject'))
    const line = optional(input.line, (value) => {
      if (!isRecord(value)) return fail('line')
      const id = optional(value.id, (id) => matching(id, LINE, 'line.id'))
      return {
        ...(id !== undefined ? { id } : {}),
        label: string(value.label, LIMITS.label, 'line.label'),
        shows: string(value.shows, LIMITS.shows, 'line.shows'),
      }
    })
    const crash = optional(input.crash, (value) =>
      isRecord(value)
        ? {
            message: string(value.message, LIMITS.crashMessage, 'crash.message', {
              required: true,
            }),
            stack: string(value.stack, LIMITS.crashStack, 'crash.stack'),
          }
        : fail('crash'),
    )
    const creature = optional(context.creature, (value) => matching(value, ID, 'context.creature'))
    const stars = optional(context.stars, (value) => integer(value, 0, 10, 'context.stars'))
    const attack = optional(context.attack, (value) => matching(value, ID, 'context.attack'))
    return {
      ok: true,
      value: {
        kind: oneOf(KINDS, input.kind, 'kind'),
        // A crash tells what happened: the player's words are then optional.
        text: string(input.text, LIMITS.text, 'text', { required: crash === undefined }),
        ...(game !== undefined ? { game } : {}),
        ...(nickname !== undefined ? { nickname } : {}),
        website: string(input.website, LIMITS.website, 'website'),
        ...(subject !== undefined ? { subject } : {}),
        ...(line !== undefined ? { line } : {}),
        ...(crash !== undefined ? { crash } : {}),
        context: {
          version: matching(context.version, VERSION, 'context.version'),
          gameVersion: matching(context.gameVersion, VERSION, 'context.gameVersion'),
          language: oneOf(LANGUAGES, context.language, 'context.language'),
          width: integer(context.width, 1, 20_000, 'context.width'),
          screen: oneOf(SCREENS, context.screen, 'context.screen'),
          ...(creature !== undefined ? { creature } : {}),
          ...(stars !== undefined ? { stars } : {}),
          ...(attack !== undefined ? { attack } : {}),
          shows,
        },
      },
    }
  } catch (error) {
    if (error instanceof Invalid) return { ok: false, error: error.message }
    throw error
  }
}

/** A player's words as Markdown shows them, and nothing more: no mention, no reference to another
 * issue, no link, no image, no HTML. A zero-width space breaks what GitHub would link. */
export const neutralise = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL, '')
    .replace(/[\\`*_[\]()<>!#|~&]/g, '\\$&')
    .replaceAll('@', `@${ZWSP}`)
    .replaceAll('#', `#${ZWSP}`)
    .replaceAll('://', `:${ZWSP}//`)
    .replace(/www\./gi, (www) => `${www.slice(0, 3)}${ZWSP}.`)

const EXCERPT = 60

function excerpt(text: string): string {
  const flat = text.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim()
  return flat.length <= EXCERPT ? flat : `${flat.slice(0, EXCERPT).trimEnd()}…`
}

export interface Issue {
  readonly title: string
  readonly body: string
  readonly labels: readonly string[]
}

/** Where the next report on the same line of the same creature finds the issue, hidden in its body;
 * none for a report that names no line. Its ids are the validated ones: nothing in them closes it. */
function markOf({ kind, line, context }: Report): string | null {
  return kind === 'data' && line?.id !== undefined && context.creature !== undefined
    ? `<!-- battlewise-line: ${context.creature}/${line.id} -->`
    : null
}

/** The error and its stack as code, which GitHub shows as it is: in a fence longer than any run of
 * backticks in it, so that nothing in it closes the block. */
function crashBlock({ message, stack }: Crash): string[] {
  const code = (stack.startsWith(message) ? stack : [message, stack].filter(Boolean).join('\n'))
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL, '')
  const longest = Math.max(0, ...Array.from(code.matchAll(/`+/g), (run) => run[0].length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return ['**Crash:**', '', fence, code, fence, '']
}

/** The player's words first, then what the app attached, folded. */
function told(report: Report): string[] {
  const { kind, text, game, nickname, line, crash, context } = report
  const { version, gameVersion, language, screen, width, creature, stars, attack, shows } = context
  return [
    ...(text.trim() === '' ? [] : [neutralise(text), '']),
    ...(crash ? crashBlock(crash) : []),
    ...(kind === 'data' && game ? [`**What the game shows:** ${neutralise(game)}`, ''] : []),
    ...(line ? [`**Line:** ${neutralise(line.label)} · ${neutralise(line.shows)}`, ''] : []),
    nickname ? `Reported from the app by **${neutralise(nickname)}**.` : 'Reported from the app.',
    '',
    '<details>',
    '<summary>What the app attached</summary>',
    '',
    '| | |',
    '| --- | --- |',
    `| App | ${version} |`,
    `| Game data | Valheim ${gameVersion} |`,
    `| Language | ${language} |`,
    `| Screen | ${screen}, ${String(width)} px |`,
    ...(creature
      ? [`| Creature | \`${creature}\`${stars === undefined ? '' : ` · ${String(stars)}★`} |`]
      : []),
    ...(attack ? [`| Attack | \`${attack}\` |`] : []),
    '',
    ...(shows.length > 0
      ? ['What the screen showed:', '', ...shows.map((shown) => `- ${neutralise(shown)}`), '']
      : []),
    '</details>',
  ]
}

/** The issue a report opens: its kind and subject in the title, what it tells in the body, marked
 * with its line. Labelled for the Inbox of the board. */
export function issueOf(report: Report): Issue {
  const { kind, text, subject, crash } = report
  const about = subject ? `${subject.replace(CONTROL, ' ')} — ` : ''
  const title = crash
    ? `[${kind}] ${about}Crash « ${excerpt(crash.message)} »`
    : `[${kind}] ${about}« ${excerpt(text)} »`
  const mark = markOf(report)
  const body = [...told(report), ...(mark === null ? [] : ['', mark])].join('\n')
  return { title: title.slice(0, 256), body, labels: ['from:app', kind] }
}

/** The +1 a report on a line already reported adds to its issue: all it would have told. */
export const commentOf = (report: Report): { readonly body: string } => ({
  body: ['**+1**', '', ...told(report)].join('\n'),
})

class GitHubError extends Error {
  readonly status: number

  constructor(step: string, status: number) {
    super(`GitHub answered ${String(status)} to ${step}`)
    this.status = status
  }
}

const base64url = (data: string | Buffer) => Buffer.from(data).toString('base64url')

/** The app's own token, ten minutes at most: what asks for an installation's token. */
function appToken(appId: string, privateKey: string, now: number): string {
  // A minute back, for a clock a little ahead of GitHub's.
  const issued = Math.floor(now / 1000) - 60
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({ iat: issued, exp: issued + 600, iss: appId }))
  const key = createPrivateKey(privateKey.replaceAll('\\n', '\n'))
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), key)
  return `${header}.${payload}.${base64url(signature)}`
}

const headers = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'User-Agent': 'battlewise-reports',
  'X-GitHub-Api-Version': '2022-11-28',
})

async function answer(response: Response, step: string, field: string): Promise<unknown> {
  const body: unknown = response.ok ? await response.json().catch(() => null) : null
  if (!isRecord(body) || body[field] === undefined) throw new GitHubError(step, response.status)
  return body[field]
}

export interface Deps {
  readonly env: Readonly<Record<string, string | undefined>>
  readonly fetch: typeof fetch
  /** Milliseconds since the epoch. */
  readonly now: () => number
}

/** The open wrong-data issue from the app that bears the mark, if any. GitHub lists the most recent
 * hundred: an older one on the same line gets a new issue, which triage closes as its duplicate. */
async function issueMarked(
  mark: string,
  token: string,
  fetch: Deps['fetch'],
): Promise<number | undefined> {
  const query = new URLSearchParams({ labels: 'from:app,data', state: 'open', per_page: '100' })
  const response = await fetch(`${GITHUB}/repos/${REPOSITORY}/issues?${query.toString()}`, {
    headers: headers(token),
  })
  const issues: unknown = response.ok ? await response.json().catch(() => null) : null
  if (!Array.isArray(issues)) throw new GitHubError('the open issues', response.status)
  const marked = issues.find(
    (issue: unknown): issue is Record<string, unknown> =>
      isRecord(issue) &&
      // The list holds pull requests too.
      issue.pull_request === undefined &&
      typeof issue.body === 'string' &&
      issue.body.includes(mark),
  )
  return typeof marked?.number === 'number' ? marked.number : undefined
}

const reply = (body: unknown, status: number, headers?: Record<string, string>) =>
  Response.json(body, { status, ...(headers ? { headers } : {}) })

/** From the request to the issue, or to the +1 on the open issue about the same line, whose number
 * the app keeps. What fails on the way is answered so that the app keeps the report when sending it
 * again may work (503, 502), and drops it when it never will (400, 413, 415, 422). */
export async function handle(request: Request, { env, fetch, now }: Deps): Promise<Response> {
  if (request.method !== 'POST') return reply({ error: 'POST only' }, 405, { Allow: 'POST' })
  if (!(request.headers.get('Content-Type') ?? '').startsWith('application/json')) {
    return reply({ error: 'JSON only' }, 415)
  }
  const raw = await request.text()
  if (raw.length > LIMITS.body) return reply({ error: 'Too large' }, 413)
  let input: unknown
  try {
    input = JSON.parse(raw)
  } catch {
    return reply({ error: 'Not JSON' }, 400)
  }
  const validation = validate(input)
  if (!validation.ok) return reply({ error: `Invalid ${validation.error}` }, 422)
  const report = validation.value
  // A bot filled in the field people never see: it learns nothing.
  if (report.website !== '') return reply({ number: 0 }, 201)

  const appId = env.GITHUB_APP_ID
  const installation = env.GITHUB_APP_INSTALLATION_ID
  const privateKey = env.GITHUB_APP_PRIVATE_KEY
  if (!appId || !installation || !privateKey) {
    return reply({ error: 'Reports are not set up yet' }, 503)
  }

  try {
    const tokenResponse = await fetch(`${GITHUB}/app/installations/${installation}/access_tokens`, {
      method: 'POST',
      headers: headers(appToken(appId, privateKey, now())),
    })
    const token = String(await answer(tokenResponse, 'the installation token', 'token'))
    const mark = markOf(report)
    const open = mark === null ? undefined : await issueMarked(mark, token, fetch)
    if (open !== undefined) {
      const commentResponse = await fetch(
        `${GITHUB}/repos/${REPOSITORY}/issues/${String(open)}/comments`,
        { method: 'POST', headers: headers(token), body: JSON.stringify(commentOf(report)) },
      )
      await answer(commentResponse, 'the +1', 'id')
      return reply({ number: open }, 201)
    }
    const issueResponse = await fetch(`${GITHUB}/repos/${REPOSITORY}/issues`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(issueOf(report)),
    })
    const number = await answer(issueResponse, 'the issue', 'number')
    return reply({ number }, 201)
  } catch (error) {
    if (!(error instanceof GitHubError)) throw error
    console.error(error.message)
    return reply({ error: 'GitHub is unavailable' }, 502)
  }
}

export function POST(request: Request): Promise<Response> {
  return handle(request, { env: process.env, fetch, now: Date.now })
}
