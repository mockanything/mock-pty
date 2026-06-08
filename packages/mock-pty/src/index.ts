import { MockPty } from './mock-pty'
import { MockFileSystem } from './file-system'
import type {
  IPty,
  IPtyForkOptions,
  IPtyOpenOptions,
  IBasePtyForkOptions,
  IWindowsPtyForkOptions,
  IEvent,
  IDisposable,
} from './types'

export { MockPty }
export { MockFileSystem }
export type {
  IPty,
  IBasePtyForkOptions,
  IPtyForkOptions,
  IWindowsPtyForkOptions,
  IPtyOpenOptions,
  IEvent,
  IDisposable,
}

export function spawn(
  file: string,
  args: string[] | string,
  options?: IPtyForkOptions,
): IPty {
  return new MockPty(file, args, options)
}

/** @deprecated Use `spawn` instead. */
export function fork(
  file: string,
  args: string[] | string,
  options?: IPtyForkOptions,
): IPty {
  return new MockPty(file, args, options)
}

/** @deprecated Use `spawn` instead. */
export function createTerminal(
  file: string,
  args: string[] | string,
  options?: IPtyForkOptions,
): IPty {
  return new MockPty(file, args, options)
}

export function open(options?: IPtyOpenOptions): IPty {
  return new MockPty('', [], options)
}
