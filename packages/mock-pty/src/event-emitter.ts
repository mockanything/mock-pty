import type { IEvent, IDisposable } from './types'

export class EventEmitter2<T> {
  private _listeners: Array<(e: T) => void> = []

  get event(): IEvent<T> {
    return (listener) => {
      this._listeners.push(listener)
      return {
        dispose: () => {
          const idx = this._listeners.indexOf(listener)
          if (idx !== -1) this._listeners.splice(idx, 1)
        },
      } satisfies IDisposable
    }
  }

  fire(e: T): void {
    this._listeners.slice().forEach((l) => l(e))
  }

  dispose(): void {
    this._listeners = []
  }
}
