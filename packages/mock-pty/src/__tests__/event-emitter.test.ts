import { describe, it, expect, vi } from 'vitest'
import { EventEmitter2 } from '../event-emitter'

describe('EventEmitter2', () => {
  it('should fire event to listener', () => {
    const emitter = new EventEmitter2<string>()
    const listener = vi.fn()
    emitter.event(listener)
    emitter.fire('hello')
    expect(listener).toHaveBeenCalledWith('hello')
  })

  it('should fire event to multiple listeners', () => {
    const emitter = new EventEmitter2<number>()
    const a = vi.fn()
    const b = vi.fn()
    emitter.event(a)
    emitter.event(b)
    emitter.fire(42)
    expect(a).toHaveBeenCalledWith(42)
    expect(b).toHaveBeenCalledWith(42)
  })

  it('should not fire after dispose', () => {
    const emitter = new EventEmitter2<string>()
    const listener = vi.fn()
    const disposable = emitter.event(listener)
    disposable.dispose()
    emitter.fire('hello')
    expect(listener).not.toHaveBeenCalled()
  })

  it('should return IDisposable from event', () => {
    const emitter = new EventEmitter2<string>()
    const disposable = emitter.event(() => {})
    expect(disposable).toHaveProperty('dispose')
    expect(typeof disposable.dispose).toBe('function')
  })

  it('should clear all listeners on dispose', () => {
    const emitter = new EventEmitter2<string>()
    const a = vi.fn()
    const b = vi.fn()
    emitter.event(a)
    emitter.event(b)
    emitter.dispose()
    emitter.fire('hello')
    expect(a).not.toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
  })

  it('should fire only remaining listeners after one is disposed', () => {
    const emitter = new EventEmitter2<string>()
    const a = vi.fn()
    const b = vi.fn()
    emitter.event(a)
    const disposable = emitter.event(b)
    disposable.dispose()
    emitter.fire('hello')
    expect(a).toHaveBeenCalledWith('hello')
    expect(b).not.toHaveBeenCalled()
  })

  it('should fire with object type', () => {
    const emitter = new EventEmitter2<{ x: number; y: number }>()
    const listener = vi.fn()
    emitter.event(listener)
    emitter.fire({ x: 1, y: 2 })
    expect(listener).toHaveBeenCalledWith({ x: 1, y: 2 })
  })

  it('should fire with undefined', () => {
    const emitter = new EventEmitter2<undefined>()
    const listener = vi.fn()
    emitter.event(listener)
    emitter.fire(undefined)
    expect(listener).toHaveBeenCalledWith(undefined)
  })

  it('should handle dispose during fire gracefully', () => {
    const emitter = new EventEmitter2<string>()
    let disposable: { dispose: () => void }
    const a = vi.fn(() => disposable.dispose())
    const b = vi.fn()
    disposable = emitter.event(a)
    emitter.event(b)
    emitter.fire('hello')
    expect(a).toHaveBeenCalledWith('hello')
    expect(b).toHaveBeenCalledWith('hello')
    emitter.fire('world')
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledWith('world')
  })
})
