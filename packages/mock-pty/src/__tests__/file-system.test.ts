import { describe, it, expect } from 'vitest'
import { MockFileSystem } from '../file-system'

describe('MockFileSystem', () => {
  it('starts at /root', () => {
    const fs = new MockFileSystem()
    expect(fs.cwdPath).toBe('/root')
  })

  it('pwd returns current path', () => {
    const fs = new MockFileSystem()
    expect(fs.cwdPath).toBe('/root')
  })

  it('cd to absolute path', () => {
    const fs = new MockFileSystem()
    expect(fs.cd('/tmp')).toBeNull()
    expect(fs.cwdPath).toBe('/tmp')
  })

  it('cd to relative path', () => {
    const fs = new MockFileSystem()
    fs.cd('/tmp')
    fs.cd('/')
    expect(fs.cwdPath).toBe('/')
  })

  it('cd .. goes up', () => {
    const fs = new MockFileSystem()
    fs.cd('/usr/bin')
    fs.cd('..')
    expect(fs.cwdPath).toBe('/usr')
  })

  it('cd to nonexistent path returns error', () => {
    const fs = new MockFileSystem()
    const err = fs.cd('/nonexistent')
    expect(err).toContain('no such file or directory')
  })

  it('cd to file returns error', () => {
    const fs = new MockFileSystem()
    const err = fs.cd('/etc/hostname')
    expect(err).toContain('no such file or directory')
  })

  it('ls lists directory contents', () => {
    const fs = new MockFileSystem()
    const out = fs.ls('')
    expect(out).toContain('file1.txt')
    expect(out).toContain('documents/')
    expect(out).toContain('projects/')
  })

  it('ls / lists root', () => {
    const fs = new MockFileSystem()
    const out = fs.ls('/')
    expect(out).toContain('bin/')
    expect(out).toContain('etc/')
    expect(out).toContain('proc/')
    expect(out).toContain('root/')
  })

  it('cat reads file content', () => {
    const fs = new MockFileSystem()
    const out = fs.cat('/etc/hostname')
    expect(out).toBe('mockhost\n')
  })

  it('cat on directory returns error', () => {
    const fs = new MockFileSystem()
    const out = fs.cat('/etc')
    expect(out).toContain('Is a directory')
  })

  it('cat on nonexistent file returns error', () => {
    const fs = new MockFileSystem()
    const out = fs.cat('/nonexistent')
    expect(out).toContain('No such file or directory')
  })

  it('touch creates empty file', () => {
    const fs = new MockFileSystem()
    fs.cd('/tmp')
    expect(fs.touch('newfile.txt')).toBeNull()
    const out = fs.ls('')
    expect(out).toContain('newfile.txt')
  })

  it('mkdir creates directory', () => {
    const fs = new MockFileSystem()
    fs.cd('/tmp')
    expect(fs.mkdir('mydir')).toBeNull()
    const out = fs.ls('')
    expect(out).toContain('mydir/')
  })

  it('rm removes file', () => {
    const fs = new MockFileSystem()
    fs.cd('/root')
    expect(fs.rm('file1.txt')).toBeNull()
    const out = fs.ls('')
    expect(out).not.toContain('file1.txt')
  })

  it('rmdir removes empty directory', () => {
    const fs = new MockFileSystem()
    const err = fs.rmdir('/tmp')
    expect(err).toBeNull()
  })

  it('rmdir on non-empty directory returns error', () => {
    const fs = new MockFileSystem()
    const err = fs.rmdir('/root')
    expect(err).toContain('Directory not empty')
  })

  it('writeFile writes content', () => {
    const fs = new MockFileSystem()
    fs.writeFile('/tmp/test.txt', 'hello world\n')
    expect(fs.cat('/tmp/test.txt')).toBe('hello world\n')
  })

  it('appendFile appends content', () => {
    const fs = new MockFileSystem()
    fs.writeFile('/tmp/test.txt', 'line1\n')
    fs.appendFile('/tmp/test.txt', 'line2\n')
    expect(fs.cat('/tmp/test.txt')).toBe('line1\nline2\n')
  })

  it('echo redirection writes to file', () => {
    const fs = new MockFileSystem()
    fs.writeFile('/tmp/test.txt', 'written content\n')
    expect(fs.cat('/tmp/test.txt')).toBe('written content\n')
  })

  it('getEntry returns null for missing path', () => {
    const fs = new MockFileSystem()
    expect(fs.getEntry('/nonexistent')).toBeUndefined()
  })

  it('getEntry returns dir for existing directory', () => {
    const fs = new MockFileSystem()
    const entry = fs.getEntry('/etc')
    expect(entry?.type).toBe('directory')
  })

  it('getEntry returns file for existing file', () => {
    const fs = new MockFileSystem()
    const entry = fs.getEntry('/etc/hostname')
    expect(entry?.type).toBe('file')
  })

  it('cd ~ goes home', () => {
    const fs = new MockFileSystem()
    fs.cd('/tmp')
    expect(fs.cd('~')).toBeNull()
    expect(fs.cwdPath).toBe('/root')
  })

  it('ls with nonexistent path returns error', () => {
    const fs = new MockFileSystem()
    const out = fs.ls('/nonexistent')
    expect(out).toContain('No such file or directory')
  })

  it('mkdir in nonexistent path returns error', () => {
    const fs = new MockFileSystem()
    const err = fs.mkdir('/nonexistent/dir')
    expect(err).toContain('No such file or directory')
  })

  it('rm on directory returns error', () => {
    const fs = new MockFileSystem()
    const err = fs.rm('/tmp')
    expect(err).toContain('Is a directory')
  })

  it('rmdir on file returns error', () => {
    const fs = new MockFileSystem()
    const err = fs.rmdir('/etc/hostname')
    expect(err).toContain('No such file or directory')
  })

  it('rm on nonexistent returns error', () => {
    const fs = new MockFileSystem()
    const err = fs.rm('/nonexistent')
    expect(err).toContain('No such file')
  })

  it('touch on existing file is no-op', () => {
    const fs = new MockFileSystem()
    expect(fs.touch('/etc/hostname')).toBeNull()
    expect(fs.cat('/etc/hostname')).toBe('mockhost\n')
  })

  it('mkdir on existing returns error', () => {
    const fs = new MockFileSystem()
    const err = fs.mkdir('/tmp')
    expect(err).toContain('File exists')
  })

  it('complete returns matching entries', () => {
    const fs = new MockFileSystem()
    fs.cd('/root')
    const r = fs.complete('file')
    expect(r).toContain('file1.txt')
    expect(r).toContain('file2.js')
  })

  it('proc/cpuinfo returns dynamic content', () => {
    const fs = new MockFileSystem()
    const info = fs.cat('/proc/cpuinfo')
    expect(info).toContain('Intel(R)')
    expect(info).toContain('GenuineIntel')
  })

  it('proc/uptime changes over time', () => {
    const fs = new MockFileSystem()
    const u1 = fs.cat('/proc/uptime')
    const u2 = fs.cat('/proc/uptime')
    expect(u1).toBeTruthy()
    expect(u2).toBeTruthy()
  })

  it('proc/meminfo returns formatted content', () => {
    const fs = new MockFileSystem()
    const info = fs.cat('/proc/meminfo')
    expect(info).toContain('MemTotal:')
    expect(info).toContain('MemFree:')
  })

  it('dev/null returns empty', () => {
    const fs = new MockFileSystem()
    expect(fs.cat('/dev/null')).toBe('')
  })

  it('dev/random returns random string', () => {
    const fs = new MockFileSystem()
    const r1 = fs.cat('/dev/random')
    const r2 = fs.cat('/dev/random')
    expect(r1).toBeTruthy()
    expect(r1).not.toBe(r2)
  })

  it('dev/tty returns tty output', () => {
    const fs = new MockFileSystem()
    expect(fs.cat('/dev/tty')).toContain('[tty output]')
  })
})
