import { describe, it, expect, vi } from 'vitest'
import { MockPty } from '../mock-pty'

function tick(ms: number = 100): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForOutput(pty: MockPty): Promise<void> {
  await tick(100)
}

describe('MockPty', () => {
  function createPty(options?: Record<string, unknown>): MockPty {
    return new MockPty('/bin/bash', [], options as any)
  }

  describe('constructor', () => {
    it('should set pid', () => {
      const pty = new MockPty('/bin/bash', [], {})
      expect(pty.pid).toBeGreaterThanOrEqual(1000)
      expect(pty.pid).toBeLessThan(11000)
    })

    it('should set default cols and rows', () => {
      const pty = new MockPty('/bin/bash', [], {})
      expect(pty.cols).toBe(80)
      expect(pty.rows).toBe(24)
    })

    it('should use provided cols and rows', () => {
      const pty = new MockPty('/bin/bash', [], { cols: 120, rows: 40 } as any)
      expect(pty.cols).toBe(120)
      expect(pty.rows).toBe(40)
    })

    it('should set process title from file', () => {
      const pty = new MockPty('/usr/bin/python3', [], {})
      expect(pty.process).toBe('python3')
    })

    it('should accept string args', () => {
      const pty = new MockPty('/bin/bash', '-c "echo hi"')
      expect(pty).toBeDefined()
    })

    it('should set handleFlowControl default to false', () => {
      const pty = new MockPty('/bin/bash', [], {})
      expect(pty.handleFlowControl).toBe(false)
    })

    it('should set handleFlowControl from options', () => {
      const pty = new MockPty('/bin/bash', [], { handleFlowControl: true } as any)
      expect(pty.handleFlowControl).toBe(true)
    })
  })

  describe('onData', () => {
    it('should fire onData on startup', async () => {
      const events: string[] = []
      const pty = new MockPty('/bin/bash', [])
      pty.onData((e) => events.push(e))
      await waitForOutput(pty)
      expect(events.length).toBeGreaterThan(0)
      expect(events[0]).toContain('[mock-pty] /bin/bash started')
    })

    it('should fire onData for echo command', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('echo hello\r')
      await tick(50)
      expect(events.some((e) => e.includes('hello'))).toBe(true)
    })

    it('should fire onData for pwd command', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('pwd\r')
      await tick(50)
      expect(events.some((e) => e.includes('/root'))).toBe(true)
    })
  })

  describe('onExit', () => {
    it('should fire onExit on exit command', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const exitListener = vi.fn()
      pty.onExit(exitListener)
      pty.write('exit\r')
      await tick(50)
      expect(exitListener).toHaveBeenCalled()
      expect(exitListener).toHaveBeenCalledWith(
        expect.objectContaining({ exitCode: 0 })
      )
    })

    it('should fire onExit on quit command', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const exitListener = vi.fn()
      pty.onExit(exitListener)
      pty.write('quit\r')
      await tick(50)
      expect(exitListener).toHaveBeenCalled()
    })

    it('should fire onExit on Ctrl+D with empty input', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const exitListener = vi.fn()
      pty.onExit(exitListener)
      pty.write('\x04')
      await tick(50)
      expect(exitListener).toHaveBeenCalled()
    })

    it('should fire onExit on kill', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const exitListener = vi.fn()
      pty.onExit(exitListener)
      pty.kill()
      await tick(50)
      expect(exitListener).toHaveBeenCalled()
    })
  })

  describe('write', () => {
    it('should handle printable characters', () => {
      const pty = createPty()
      pty.write('hello')
      expect(pty.getCurrentInput()).toBe('hello')
    })

    it('should handle backspace', () => {
      const pty = createPty()
      pty.write('hello\x7f')
      expect(pty.getCurrentInput()).toBe('hell')
    })

    it('should handle Ctrl+C', () => {
      const pty = createPty()
      pty.write('hello\x03')
      expect(pty.getCurrentInput()).toBe('')
    })

    it('should handle Ctrl+D with input', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('hello\x04')
      await tick(50)
      expect(events.some((e) => e.includes('^D'))).toBe(true)
    })

    it('should ignore escape character', () => {
      const pty = createPty()
      pty.write('\x1b')
      expect(pty.getCurrentInput()).toBe('')
    })

    it('should ignore control characters (< 0x20) except handled ones', () => {
      const pty = createPty()
      pty.write('\x01\x02\x05\x06')
      expect(pty.getCurrentInput()).toBe('')
    })

    it('should warn when writing to destroyed pty', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const pty = createPty()
      await waitForOutput(pty)
      pty.write('exit\r')
      await tick(50)
      pty.write('hello')
      expect(warnSpy).toHaveBeenCalledWith('Attempted to write to destroyed pty')
      warnSpy.mockRestore()
    })

    it('should accept Buffer data', () => {
      const pty = createPty()
      pty.write(Buffer.from('hello'))
      expect(pty.getCurrentInput()).toBe('hello')
    })
  })

  describe('built-in commands', () => {
    it('pwd should print current directory', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('pwd\r')
      await tick(50)
      expect(events.some((e) => e.includes('/root'))).toBe(true)
    })

    it('whoami should print root', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('whoami\r')
      await tick(50)
      expect(events.some((e) => e.includes('root'))).toBe(true)
    })

    it('clear should output clear sequence', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('clear\r')
      await tick(50)
      expect(events.some((e) => e.includes('\x1b[2J\x1b[0;0H'))).toBe(true)
    })

    it('cls should also clear', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('cls\r')
      await tick(50)
      expect(events.some((e) => e.includes('\x1b[2J\x1b[0;0H'))).toBe(true)
    })

    it('echo should print the argument', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('echo Hello World\r')
      await tick(50)
      expect(events.some((e) => e.includes('Hello World'))).toBe(true)
    })

    it('echo with redirect > should write to file', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.onData(() => {})
      pty.write('echo hello > /tmp/test.txt\r')
      await tick(50)
      const fs = (pty as any)._fs
      expect(fs.cat('/tmp/test.txt')).toContain('hello')
    })

    it('echo with redirect >> should append to file', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.onData(() => {})
      pty.write('echo line1 > /tmp/test.txt\r')
      pty.write('echo line2 >> /tmp/test.txt\r')
      await tick(50)
      const fs = (pty as any)._fs
      expect(fs.cat('/tmp/test.txt')).toContain('line1')
      expect(fs.cat('/tmp/test.txt')).toContain('line2')
    })

    it('cd should change directory', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('cd /tmp\r')
      await tick(50)
      pty.write('pwd\r')
      await tick(50)
      expect(events.some((e) => e.includes('/tmp'))).toBe(true)
    })

    it('cd with no args should go to /root', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('cd /tmp\r')
      await tick(50)
      pty.write('cd\r')
      await tick(50)
      pty.write('pwd\r')
      await tick(50)
      const rootCount = events.filter((e) => e.includes('/root')).length
      expect(rootCount).toBeGreaterThanOrEqual(2)
    })

    it('cd to nonexistent should print error', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('cd /nonexistent\r')
      await tick(50)
      expect(events.some((e) => e.includes('no such file or directory'))).toBe(true)
    })

    it('ls should list directory', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('ls\r')
      await tick(50)
      expect(events.some((e) => e.includes('file1.txt'))).toBe(true)
    })

    it('ll should list with long format', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('ll\r')
      await tick(50)
      expect(events.some((e) => e.includes('drwxr-xr-x') || e.includes('-rw-r--r--'))).toBe(true)
    })

    it('dir should list directory', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('dir\r')
      await tick(50)
      expect(events.some((e) => e.includes('file1.txt'))).toBe(true)
    })

    it('cat should print file content', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('cat /etc/hostname\r')
      await tick(50)
      expect(events.some((e) => e.includes('mockhost'))).toBe(true)
    })

    it('cat with no operand should print error', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('cat\r')
      await tick(50)
      expect(events.some((e) => e.includes('missing operand'))).toBe(true)
    })

    it('touch should create file', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.onData(() => {})
      pty.write('touch /tmp/newfile\r')
      await tick(50)
      const fs = (pty as any)._fs
      expect(fs.getEntry('/tmp/newfile')).toBeDefined()
    })

    it('mkdir should create directory', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.onData(() => {})
      pty.write('mkdir /tmp/newdir\r')
      await tick(50)
      const fs = (pty as any)._fs
      expect(fs.getEntry('/tmp/newdir')).toBeDefined()
    })

    it('rm should remove file', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.onData(() => {})
      pty.write('rm /root/file1.txt\r')
      await tick(50)
      const fs = (pty as any)._fs
      expect(fs.getEntry('/root/file1.txt')).toBeUndefined()
    })

    it('rmdir should remove empty directory', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.onData(() => {})
      pty.write('rmdir /tmp\r')
      await tick(50)
      const fs = (pty as any)._fs
      expect(fs.getEntry('/tmp')).toBeUndefined()
    })

    it('help should print built-in commands', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('help\r')
      await tick(50)
      expect(events.some((e) => e.includes('Built-in commands'))).toBe(true)
    })

    it('history should print command history', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('echo test\r')
      await tick(50)
      pty.write('history\r')
      await tick(50)
      expect(events.some((e) => e.includes('[mock-pty]'))).toBe(true)
    })

    it('empty command should show prompt', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('\r')
      await tick(50)
      expect(events.some((e) => e.includes('root@mockhost'))).toBe(true)
    })
  })

  describe('new commands', () => {
    it('hostname should print hostname', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('hostname\r')
      await tick(50)
      expect(events.some((e) => e.includes('mockhost'))).toBe(true)
    })

    it('id should print user info', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('id\r')
      await tick(50)
      expect(events.some((e) => e.includes('uid=0(root)'))).toBe(true)
    })

    it('whoami should print root', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('whoami\r')
      await tick(50)
      expect(events.some((e) => e.includes('root'))).toBe(true)
    })

    it('date should print date', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('date\r')
      await tick(50)
      expect(events.some((e) => e.length > 0)).toBe(true)
    })

    it('uname should print Linux', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('uname\r')
      await tick(50)
      expect(events.some((e) => e.includes('Linux'))).toBe(true)
    })

    it('uname -a should print full info', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('uname -a\r')
      await tick(50)
      expect(events.some((e) => e.includes('x86_64'))).toBe(true)
    })

    it('ps should print process list', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('ps\r')
      await tick(50)
      expect(events.some((e) => e.includes('bash'))).toBe(true)
    })

    it('ps aux should print extended process list', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('ps aux\r')
      await tick(50)
      expect(events.some((e) => e.includes('VSZ'))).toBe(true)
    })

    it('head should print first lines of file', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('head /etc/hostname\r')
      await tick(50)
      expect(events.some((e) => e.includes('mockhost'))).toBe(true)
    })

    it('head -n 1 should limit lines', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('head -n 1 /etc/passwd\r')
      await tick(50)
      expect(events.some((e) => e.includes('root'))).toBe(true)
    })

    it('head on missing file should print error', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('head /nonexistent\r')
      await tick(50)
      expect(events.some((e) => e.includes('No such file'))).toBe(true)
    })

    it('tail should print last lines of file', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('tail /etc/passwd\r')
      await tick(50)
      expect(events.some((e) => e.includes('root'))).toBe(true)
    })

    it('less should print file content', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('less /etc/hostname\r')
      await tick(50)
      expect(events.some((e) => e.includes('mockhost'))).toBe(true)
    })

    it('less on missing file should print error', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('less /nonexistent\r')
      await tick(50)
      expect(events.some((e) => e.includes('No such file'))).toBe(true)
    })

    it('cp should copy file', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.onData(() => {})
      pty.write('cp /etc/hostname /tmp/hostname_copy\r')
      await tick(50)
      const fs = (pty as any)._fs
      expect(fs.readFile('/tmp/hostname_copy')).toBe('mockhost\n')
    })

    it('cp on missing file should print error', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('cp /nonexistent /tmp/x\r')
      await tick(50)
      expect(events.some((e) => e.includes('No such file'))).toBe(true)
    })

    it('mv should move file', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.onData(() => {})
      pty.write('cp /etc/hostname /tmp/to_move\r')
      await tick(50)
      pty.write('mv /tmp/to_move /tmp/moved\r')
      await tick(50)
      const fs = (pty as any)._fs
      expect(fs.readFile('/tmp/moved')).toBe('mockhost\n')
      expect(fs.readFile('/tmp/to_move')).toBeNull()
    })

    it('mv on missing file should print error', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('mv /nonexistent /tmp/x\r')
      await tick(50)
      expect(events.some((e) => e.includes('No such file'))).toBe(true)
    })

    it('find should search files by name in current dir', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('find file\r')
      await tick(50)
      expect(events.some((e) => e.includes('file1.txt') || e.includes('file2.js'))).toBe(true)
    })

    it('find with path should search in given directory', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('find /etc hostname\r')
      await tick(50)
      expect(events.some((e) => e.includes('/etc/hostname'))).toBe(true)
    })

    it('find -name should work', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('find /etc -name hostname\r')
      await tick(50)
      expect(events.some((e) => e.includes('/etc/hostname'))).toBe(true)
    })
  })

  describe('unknown commands', () => {
    it('should report command not found', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('nonexistentcmd\r')
      await tick(50)
      expect(events.some((e) => e.includes('command not found'))).toBe(true)
    })

    it('should report directory execution error', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('/root\r')
      await tick(50)
      expect(events.some((e) => e.includes('Is a directory'))).toBe(true)
    })

    it('should report simulated command output', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.write('bash\r')
      await tick(50)
      expect(events.some((e) => e.includes('command output simulated'))).toBe(true)
    })
  })

  describe('flow control', () => {
    it('should pause on flow control pause character', () => {
      const pty = new MockPty('/bin/bash', [], { handleFlowControl: true } as any)
      pty.write('\x13')
      expect((pty as any)._paused).toBe(true)
    })

    it('should resume on flow control resume character', () => {
      const pty = new MockPty('/bin/bash', [], { handleFlowControl: true } as any)
      pty.write('\x13')
      expect((pty as any)._paused).toBe(true)
      pty.write('\x11')
      expect((pty as any)._paused).toBe(false)
    })

    it('should NOT pause/resume when handleFlowControl is false', () => {
      const pty = createPty()
      pty.write('\x13')
      expect((pty as any)._paused).toBe(false)
    })

    it('should use custom flow control chars', () => {
      const pty = new MockPty('/bin/bash', [], {
        handleFlowControl: true,
        flowControlPause: '\x01',
        flowControlResume: '\x02',
      } as any)
      pty.write('\x01')
      expect((pty as any)._paused).toBe(true)
      pty.write('\x02')
      expect((pty as any)._paused).toBe(false)
    })
  })

  describe('resize', () => {
    it('should update cols and rows', () => {
      const pty = createPty()
      pty.resize(100, 50)
      expect(pty.cols).toBe(100)
      expect(pty.rows).toBe(50)
    })

    it('should ignore resize after destroy', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.write('exit\r')
      await tick(50)
      pty.resize(100, 50)
      expect(pty.cols).not.toBe(100)
    })
  })

  describe('clear', () => {
    it('should output clear sequence', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const events: string[] = []
      pty.onData((e) => events.push(e))
      pty.clear()
      await tick(50)
      expect(events.some((e) => e.includes('\x1b[2J\x1b[0;0H'))).toBe(true)
    })
  })

  describe('kill', () => {
    it('should destroy with exit code 1 by default', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const exitListener = vi.fn()
      pty.onExit(exitListener)
      pty.kill()
      await tick(50)
      expect(exitListener).toHaveBeenCalledWith(
        expect.objectContaining({ exitCode: 1 })
      )
    })

    it('should destroy with exit code 137 on SIGKILL', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const exitListener = vi.fn()
      pty.onExit(exitListener)
      pty.kill('SIGKILL')
      await tick(50)
      expect(exitListener).toHaveBeenCalledWith(
        expect.objectContaining({ exitCode: 137, signal: 9 })
      )
    })
  })

  describe('pause / resume', () => {
    it('should pause output', () => {
      const pty = createPty()
      pty.pause()
      expect((pty as any)._paused).toBe(true)
    })

    it('should resume output', () => {
      const pty = createPty()
      pty.pause()
      expect((pty as any)._paused).toBe(true)
      pty.resume()
      expect((pty as any)._paused).toBe(false)
    })
  })

  describe('getCurrentInput', () => {
    it('should return current input buffer', () => {
      const pty = createPty()
      expect(pty.getCurrentInput()).toBe('')
      pty.write('hello')
      expect(pty.getCurrentInput()).toBe('hello')
    })
  })

  describe('isDestroyed', () => {
    it('should return false initially', () => {
      const pty = createPty()
      expect(pty.isDestroyed()).toBe(false)
    })

    it('should return true after exit', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      pty.write('exit\r')
      await tick(50)
      expect(pty.isDestroyed()).toBe(true)
    })
  })

  describe('getHistory', () => {
    it('should return command history', async () => {
      const pty = createPty()
      await waitForOutput(pty)
      const history = pty.getHistory()
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
    })
  })
})
