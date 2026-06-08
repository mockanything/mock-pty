export interface IDisposable {
  dispose(): void
}

export interface IEvent<T> {
  (listener: (e: T) => unknown): IDisposable
}

export interface IBasePtyForkOptions {
  name?: string
  cols?: number
  rows?: number
  cwd?: string
  env?: Record<string, string | undefined>
  encoding?: string | null
  handleFlowControl?: boolean
  flowControlPause?: string
  flowControlResume?: string
}

export interface IPtyForkOptions extends IBasePtyForkOptions {
  uid?: number
  gid?: number
}

export interface IWindowsPtyForkOptions extends IBasePtyForkOptions {
  useConpty?: boolean
  useConptyDll?: boolean
  conptyInheritCursor?: boolean
}

export interface IPtyOpenOptions {
  cols?: number
  rows?: number
  encoding?: string | null
}

export interface IPty {
  readonly pid: number
  readonly cols: number
  readonly rows: number
  readonly process: string
  handleFlowControl: boolean

  readonly onData: IEvent<string>
  readonly onExit: IEvent<{ exitCode: number; signal?: number }>

  write(data: string | Buffer): void
  resize(columns: number, rows: number, pixelSize?: { width: number; height: number }): void
  clear(): void
  kill(signal?: string): void
  pause(): void
  resume(): void
}
