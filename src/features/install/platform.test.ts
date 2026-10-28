import { describe, expect, it } from 'vitest'
import { installWay, type Device } from './platform'

const IPHONE_SAFARI_26 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const IPHONE_SAFARI_18 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1'
const IPHONE_EDGE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/141.0.3537.40 Mobile/15E148 Safari/605.1.15'
// An iPad asks for the desktop site: it says Macintosh, and only its touch points give it away.
const MAC_SAFARI_26 =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
const MAC_SAFARI_16 =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15'
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
const WINDOWS_FIREFOX =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0'

const device = (userAgent: string, change: Partial<Device> = {}): Device => ({
  userAgent,
  maxTouchPoints: /iPhone|Android/.test(userAgent) ? 5 : 0,
  standalone: false,
  prompt: false,
  ...change,
})

describe('installWay', () => {
  it('takes the browser prompt wherever the browser offered one', () => {
    expect(installWay(device(ANDROID_CHROME, { prompt: true }))).toBe('prompt')
    expect(installWay(device(MAC_CHROME, { prompt: true }))).toBe('prompt')
  })

  it('gives Safari’s steps on an iPhone, through ⋯ since Safari 26', () => {
    expect(installWay(device(IPHONE_SAFARI_26))).toBe('ios-menu')
  })

  it('gives Safari’s steps on an iPhone, through its Share button before Safari 26', () => {
    expect(installWay(device(IPHONE_SAFARI_18))).toBe('ios-bar')
  })

  it('gives Safari’s steps on an iPad, through the Share button of its bar', () => {
    expect(installWay(device(MAC_SAFARI_26, { maxTouchPoints: 5 }))).toBe('ios-bar')
  })

  it('gives Safari’s steps on a Mac, from Safari 17 on', () => {
    expect(installWay(device(MAC_SAFARI_26))).toBe('mac')
    expect(installWay(device(MAC_SAFARI_16))).toBeNull()
  })

  it('offers nothing where the browser neither prompts nor has steps we know', () => {
    expect(installWay(device(ANDROID_CHROME))).toBeNull()
    expect(installWay(device(MAC_CHROME))).toBeNull()
    expect(installWay(device(WINDOWS_FIREFOX))).toBeNull()
    expect(installWay(device(IPHONE_CHROME))).toBeNull()
    expect(installWay(device(IPHONE_EDGE))).toBeNull()
  })

  it('offers nothing once the app runs installed', () => {
    expect(installWay(device(ANDROID_CHROME, { prompt: true, standalone: true }))).toBeNull()
    expect(installWay(device(IPHONE_SAFARI_26, { standalone: true }))).toBeNull()
  })
})
