import { EventEmitter2 } from './event-emitter'
import type { IPty, IPtyForkOptions } from './types'
import { getCwd, getEnv } from './platform'

export class MockPty implements IPty {
  public readonly pid: number
  public cols: number
  public rows: number
  public handleFlowControl: boolean = false

  private _name: string
  private _file: string
  private _args: string[]
  private _cwd: string
  private _env: Record<string, string | undefined>
  private _processTitle: string
  private _flowControlPause: string
  private _flowControlResume: string
  private _paused: boolean = false

  private _isDestroyed: boolean = false
  private _currentInput: string = ''
  private _isProcessing: boolean = false
  private _outputBuffer: string = ''
  private _history: string[] = []

  private _onData = new EventEmitter2<string>()
  public get onData() { return this._onData.event }

  private _onExit = new EventEmitter2<{ exitCode: number; signal?: number }>()
  public get onExit() { return this._onExit.event }

  constructor(file: string, args: string[] | string, options?: IPtyForkOptions) {
    this.pid = Math.floor(Math.random() * 10000) + 1000
    this.cols = options?.cols ?? 80
    this.rows = options?.rows ?? 24
    this._name = options?.name ?? 'xterm-256color'
    this._file = file
    this._args = Array.isArray(args) ? args : [args]
    this._cwd = options?.cwd ?? getCwd()
    this._env = options?.env ?? (getEnv() as Record<string, string | undefined>)
    this._processTitle = file.split('/').pop()?.split('\\').pop() ?? 'mock-pty'
    this.handleFlowControl = options?.handleFlowControl ?? false
    this._flowControlPause = options?.flowControlPause ?? '\x13'
    this._flowControlResume = options?.flowControlResume ?? '\x11'

    this._simulateStartup()
  }

  get process(): string {
    return this._processTitle
  }

  private _simulateStartup(): void {
    setTimeout(() => {
      this._writeOutput(`MockPty: Started ${this._file} with args [${this._args.join(', ')}]\r\n`)
      this._writeOutput(`Working directory: ${this._cwd}\r\n`)
      this._writePrompt()
    }, 50)
  }

  private _writeOutput(data: string): void {
    this._outputBuffer += data
    this._flushOutput()
  }

  private _flushOutput(): void {
    if (this._outputBuffer.length > 0 && !this._isProcessing && !this._paused) {
      this._isProcessing = true
      Promise.resolve().then(() => {
        const data = this._outputBuffer
        this._onData.fire(data)
        if (data === '\x1b[2J\x1b[0;0H') {
          this._history = []
        } else {
          this._history.push(data)
        }
        this._outputBuffer = ''
        this._isProcessing = false
      })
    }
  }

  private _writePrompt(): void {
    this._writeOutput('$ ')
  }

  write(data: string | Buffer): void {
    if (this._isDestroyed) {
      console.warn('Attempted to write to destroyed pty')
      return
    }

    if (this.handleFlowControl) {
      if (data === this._flowControlPause) {
        this.pause()
        return
      }
      if (data === this._flowControlResume) {
        this.resume()
        return
      }
    }

    const str = typeof data === 'string' ? data : data.toString()
    this._processInputData(str)
  }

  private _processInputData(data: string): void {
    for (const char of data) {
      this._processSingleCharacter(char)
    }
  }

  private _processSingleCharacter(char: string): void {
    switch (char) {
      case '\r':
      case '\n':
        this._handleEnter()
        return
      case '\x7f':
      case '\b':
        this._handleBackspace()
        return
      case '\x03':
        this._handleCtrlC()
        return
      case '\x04':
        this._handleCtrlD()
        return
      case '\t':
        this._handleTab()
        return
      case '\x1b':
        return
    }

    if (char >= ' ' && char <= '~') {
      this._handlePrintableChar(char)
    }
  }

  private _handleEnter(): void {
    const command = this._currentInput.trim()
    this._currentInput = ''
    this._handleCommandExecution(command)
  }

  private _handleBackspace(): void {
    if (this._currentInput.length > 0) {
      this._currentInput = this._currentInput.slice(0, -1)
      this._writeOutput('\b \b')
    }
  }

  private _handleCtrlC(): void {
    this._writeOutput('^C\r\n')
    this._currentInput = ''
    this._writePrompt()
  }

  private _handleCtrlD(): void {
    if (this._currentInput.length === 0) {
      this.destroy(0)
    } else {
      this._writeOutput('^D')
    }
  }

  private _handleTab(): void {
    const commands = ['ls', 'll', 'pwd', 'whoami', 'echo', 'clear', 'exit', 'help', 'cd']
    const matches = commands.filter((cmd) => cmd.startsWith(this._currentInput))

    if (matches.length === 1) {
      const completion = matches[0].slice(this._currentInput.length)
      this._currentInput = matches[0]
      this._writeOutput(completion)
    } else if (matches.length > 1) {
      this._writeOutput('\r\n')
      matches.forEach((cmd) => this._writeOutput(`${cmd}    `))
      this._writeOutput(`\r\n$ ${this._currentInput}`)
    }
  }

  private _handlePrintableChar(char: string): void {
    this._currentInput += char
    this._writeOutput(char)
  }

  private _handleCommandExecution(command: string): void {
    if (this._isDestroyed) return
    this._writeOutput('\r\n')

    switch (command.trim()) {
      case 'exit':
      case 'quit':
        this.destroy(0)
        return
      case 'clear':
      case 'cls':
        this._writeOutput('\x1b[2J\x1b[0;0H')
        break
      case 'pwd':
        this._writeOutput(`${this._cwd}\r\n`)
        break
      case 'whoami':
        this._writeOutput('mock-user\r\n')
        break
      case 'ls':
      case 'dir':
        this._writeOutput('file1.txt\tfile2.js\tREADME.md\tdocuments/\r\n')
        break
      case 'echo':
        this._writeOutput(`${command.substring(5)}\r\n`)
        break
      case 'history':
        this._writeOutput(`${this._history.join('')}\r\n`)
        break
      case 'help':
        this._writeOutput('Available commands: ls, ll, pwd, whoami, echo, clear, exit, help\r\n')
        break
      default:
        if (command.startsWith('echo ')) {
          this._writeOutput(`${command.substring(5)}\r\n`)
        } else if (command.startsWith('cd ')) {
          this._cwd = command.substring(3)
          this._writeOutput(`Changed directory to ${this._cwd}\r\n`)
        } else if (command.trim() === '') {
          // noop
        } else {
          this._writeOutput(`mockpty: command not found: ${command}\r\n`)
        }
    }

    if (!['exit', 'quit'].includes(command.trim())) {
      this._writePrompt()
    }
  }

  resize(columns: number, rows: number, _pixelSize?: { width: number; height: number }): void {
    if (this._isDestroyed) return
    this.cols = columns
    this.rows = rows
  }

  clear(): void {
    this._writeOutput('\x1b[2J\x1b[0;0H')
  }

  kill(signal?: string): void {
    const signalNumber = signal === 'SIGKILL' ? 9 : 1
    const exitCode = signal === 'SIGKILL' ? 137 : 1
    this.destroy(exitCode, signalNumber)
  }

  private destroy(exitCode: number = 0, signalNumber?: number): void {
    if (this._isDestroyed) return
    this._isDestroyed = true
    this._flushOutput()

    setTimeout(() => {
      const msg = `\r\nProcess exited with code ${exitCode}\r\n`
      this._onData.fire(msg)
      this._onExit.fire({ exitCode, signal: signalNumber })
      this._onData.dispose()
      this._onExit.dispose()
    }, 10)
  }

  pause(): void {
    this._paused = true
  }

  resume(): void {
    this._paused = false
    this._flushOutput()
  }

  getCurrentInput(): string {
    return this._currentInput
  }

  isDestroyed(): boolean {
    return this._isDestroyed
  }

  getHistory(): string[] {
    return this._history
  }
}
