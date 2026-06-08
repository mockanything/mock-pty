import { EventEmitter2 } from './event-emitter'
import type { IPty, IPtyForkOptions } from './types'
import { getEnv } from './platform'
import { MockFileSystem } from './file-system'

export class MockPty implements IPty {
  public readonly pid: number
  public cols: number
  public rows: number
  public handleFlowControl: boolean = false

  private _name: string
  private _file: string
  private _args: string[]
  private _fs: MockFileSystem
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
    this._fs = new MockFileSystem()
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
      this._writeOutput(`[mock-pty] ${this._file} started\r\n`)
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
    this._writeOutput(`root@mockhost:${this._fs.cwdPath}# `)
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

    if (char.length === 1 && char.charCodeAt(0) < 0x20) {
      return
    }
    this._handlePrintableChar(char)
  }

  private _handleEnter(): void {
    const command = this._currentInput.trim()
    this._currentInput = ''
    this._handleCommandExecution(command)
  }

  private static _charWidth(char: string): number {
    const code = char.codePointAt(0)!
    if (code < 0x20 || (code >= 0x7F && code < 0xA0)) return 0
    if (code < 0x7F) return 1
    if (code === 0x00AD || code === 0x200B || code === 0x200C || code === 0x200D || code === 0xFEFF) return 0
    if ((code >= 0x0300 && code <= 0x036F) || (code >= 0xFE00 && code <= 0xFE0F)) return 0
    if (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE10 && code <= 0xFE19) ||
      (code >= 0xFE30 && code <= 0xFE6F) ||
      (code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6) ||
      (code >= 0x1F000 && code <= 0x1F9FF) ||
      (code >= 0x1FA00 && code <= 0x1FBFF) ||
      (code >= 0x20000 && code <= 0x2FA1F) ||
      (code >= 0x2600 && code <= 0x27BF) ||
      (code >= 0x2300 && code <= 0x23FF)
    ) return 2
    return 1
  }

  private _handleBackspace(): void {
    const chars = Array.from(this._currentInput)
    if (chars.length > 0) {
      const lastChar = chars.pop()!
      this._currentInput = chars.join('')
      const width = MockPty._charWidth(lastChar)
      for (let i = 0; i < width; i++) {
        this._writeOutput('\b \b')
      }
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
    const builtins = ['ls', 'll', 'cd', 'pwd', 'cat', 'whoami', 'echo', 'touch', 'mkdir', 'rm', 'rmdir', 'clear', 'exit', 'help', 'history']
    const fsCompletions = this._fs.complete(this._currentInput)
    const all = [...builtins.filter((c) => c.startsWith(this._currentInput)), ...fsCompletions].sort()
    const matches = [...new Set(all)]

    if (matches.length === 1) {
      const completion = matches[0].slice(this._currentInput.length)
      this._currentInput = matches[0].replace(/\/$/, '')
      this._writeOutput(completion)
    } else if (matches.length > 1) {
      this._writeOutput('\r\n')
      matches.forEach((cmd) => this._writeOutput(`${cmd}    `))
      this._writeOutput(`\r\nroot@mockhost:${this._fs.cwdPath}# ${this._currentInput}`)
    }
  }

  private _handlePrintableChar(char: string): void {
    this._currentInput += char
    this._writeOutput(char)
  }

  private _handleCommandExecution(command: string): void {
    if (this._isDestroyed) return
    this._writeOutput('\r\n')

    const trimmed = command.trim()
    if (!trimmed) { this._writePrompt(); return }

    // Parse command and args
    const parts = this._parseCommandLine(trimmed)
    const cmd = parts[0]
    const args = parts.slice(1).join(' ')

    switch (cmd) {
      case 'exit':
      case 'quit':
        this.destroy(0)
        return
      case 'clear':
      case 'cls':
        this._writeOutput('\x1b[2J\x1b[0;0H')
        break
      case 'pwd':
        this._writeOutput(`${this._fs.cwdPath}\r\n`)
        break
      case 'whoami':
        this._writeOutput('root\r\n')
        break
      case 'history':
        this._writeOutput(`${this._history.join('')}\r\n`)
        break
      case 'help':
        this._writeOutput(
          'Built-in commands:\r\n' +
          '  ls, ll, cd, pwd, cat, whoami, echo, touch, mkdir, rm, rmdir,\r\n' +
          '  clear, exit, help, history\r\n'
        )
        break
      case 'echo':
        this._handleEcho(args)
        break
      case 'cd':
        this._handleCd(args)
        break
      case 'ls':
      case 'll':
      case 'dir':
        this._writeOutput(this._fs.ls((cmd === 'll' ? '-l ' : '') + args))
        break
      case 'cat':
        this._handleCat(args)
        break
      case 'touch':
        this._handleFsCmd('touch', args)
        break
      case 'mkdir':
        this._handleFsCmd('mkdir', args)
        break
      case 'rm':
        this._handleFsCmd('rm', args)
        break
      case 'rmdir':
        this._handleFsCmd('rmdir', args)
        break
      default:
        this._handleUnknown(cmd, trimmed)
    }

    this._writePrompt()
  }

  private _parseCommandLine(input: string): string[] {
    const parts: string[] = []
    let cur = ''
    let inQuote = false
    for (const ch of input) {
      if (ch === '"' || ch === "'") { inQuote = !inQuote; continue }
      if (ch === ' ' && !inQuote) { if (cur) { parts.push(cur); cur = '' }; continue }
      cur += ch
    }
    if (cur) parts.push(cur)
    return parts
  }

  private _handleEcho(args: string): void {
    const redirectMatch = args.match(/^(.+?)\s*(>>?)\s*(.+)$/)
    if (redirectMatch) {
      const text = redirectMatch[1]
      const op = redirectMatch[2]
      const target = redirectMatch[3].trim()
      const err = op === '>>' ? this._fs.appendFile(target, text + '\n') : this._fs.writeFile(target, text + '\n')
      if (err) this._writeOutput(err + '\r\n')
    } else {
      this._writeOutput(args + '\r\n')
    }
  }

  private _handleCd(args: string): void {
    const target = args || '/root'
    const err = this._fs.cd(target)
    if (err) this._writeOutput(err + '\r\n')
  }

  private _handleCat(args: string): void {
    if (!args) { this._writeOutput('cat: missing operand\r\n'); return }
    const files = args.split(/\s+/)
    for (const file of files) {
      const result = this._fs.cat(file)
      if (result === null) {
        this._writeOutput(`cat: ${file}: No such file or directory\r\n`)
      } else {
        this._writeOutput(result.endsWith('\n') ? result : result + '\n')
      }
    }
  }

  private _handleFsCmd(cmd: string, args: string): void {
    const targets = args.split(/\s+/).filter(Boolean)
    if (targets.length === 0) {
      this._writeOutput(`${cmd}: missing operand\r\n`)
      return
    }
    for (const target of targets) {
      let err: string | null = null
      switch (cmd) {
        case 'touch': err = this._fs.touch(target); break
        case 'mkdir': err = this._fs.mkdir(target); break
        case 'rm': err = this._fs.rm(target); break
        case 'rmdir': err = this._fs.rmdir(target); break
      }
      if (err) this._writeOutput(err + '\r\n')
    }
  }

  private _handleUnknown(cmd: string, full: string): void {
    if (this._fs.getEntry(cmd)) {
      this._writeOutput(`bash: ${cmd}: Is a directory\r\n`)
    } else if (this._fs.getEntry('/bin/' + cmd)) {
      this._writeOutput(`bash: ${cmd}: command output simulated\r\n`)
    } else {
      this._writeOutput(`bash: ${cmd}: command not found\r\n`)
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
