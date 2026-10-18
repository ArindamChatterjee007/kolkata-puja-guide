import { describe, expect, it, vi } from 'vitest'
import { ArrivalSound } from '../../src/hooks/useTripSession'

function audio() {
  const param = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
  const oscillator = { type: '', frequency: param, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }
  const gain = { gain: param, connect: vi.fn(), disconnect: vi.fn() }
  const context = { state: 'running', currentTime: 10, destination: {}, resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined), createOscillator: vi.fn(() => oscillator), createGain: () => gain }
  return { context, oscillator }
}

describe('gesture-gated arrival sound', () => {
  it('does not allocate or autoplay on load, and plays a short quiet tone only once per new arrival', async () => {
    const { context, oscillator } = audio()
    const factory = vi.fn(() => context as unknown as AudioContext)
    const sound = new ArrivalSound(factory)
    expect(sound.play('old', true)).toBe(false)
    expect(factory).not.toHaveBeenCalled()
    expect(await sound.unlock()).toBe(true)
    expect(sound.play('old', true)).toBe(false)
    expect(sound.play('new', true)).toBe(true)
    expect(sound.play('new', true)).toBe(false)
    expect(oscillator.start).toHaveBeenCalledTimes(1)
    expect(oscillator.stop).toHaveBeenCalledWith(10.24)
    sound.dispose()
    expect(context.close).toHaveBeenCalledTimes(1)
  })

  it('keeps muted and blocked arrivals visual-only without throwing or replaying them later', async () => {
    const { context } = audio()
    const sound = new ArrivalSound(() => context as unknown as AudioContext)
    await sound.unlock()
    expect(sound.play('muted', false)).toBe(false)
    expect(sound.play('muted', true)).toBe(false)
    expect(context.createOscillator).not.toHaveBeenCalled()
    const blocked = new ArrivalSound(() => { throw new Error('autoplay denied') })
    expect(await blocked.unlock()).toBe(false)
    expect(blocked.play('new', true)).toBe(false)
  })
})