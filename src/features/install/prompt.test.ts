import { describe, expect, it, vi } from 'vitest'
import { listenForInstallPrompt } from './prompt'

/** What Chrome and Edge fire once the page can be installed. */
function beforeInstallPrompt() {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  return Object.assign(event, {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
}

describe('listenForInstallPrompt', () => {
  it('has no prompt until the browser offers one', () => {
    const install = listenForInstallPrompt(new EventTarget())

    expect(install.canPrompt()).toBe(false)
    expect(install.installed()).toBe(false)
  })

  it('keeps the browser’s prompt for the app, instead of the browser’s own banner', () => {
    const target = new EventTarget()
    const install = listenForInstallPrompt(target)
    const listener = vi.fn()
    install.subscribe(listener)
    const event = beforeInstallPrompt()

    target.dispatchEvent(event)

    expect(install.canPrompt()).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('opens the browser’s prompt once: the browser offers another if it will', async () => {
    const target = new EventTarget()
    const install = listenForInstallPrompt(target)
    const event = beforeInstallPrompt()
    target.dispatchEvent(event)

    await install.prompt()

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(install.canPrompt()).toBe(false)
  })

  it('knows the app installed, and then prompts no more', () => {
    const target = new EventTarget()
    const install = listenForInstallPrompt(target)
    const listener = vi.fn()
    install.subscribe(listener)
    target.dispatchEvent(beforeInstallPrompt())

    target.dispatchEvent(new Event('appinstalled'))

    expect(install.installed()).toBe(true)
    expect(install.canPrompt()).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('stops telling a subscriber who leaves', () => {
    const target = new EventTarget()
    const install = listenForInstallPrompt(target)
    const listener = vi.fn()
    const leave = install.subscribe(listener)

    leave()
    target.dispatchEvent(beforeInstallPrompt())

    expect(listener).not.toHaveBeenCalled()
  })
})
