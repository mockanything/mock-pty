type MockEntry = MockDirectory | MockFile

interface MockDirectory {
  type: 'directory'
  name: string
  parent: MockDirectory | null
  children: Map<string, MockEntry>
}

interface MockFile {
  type: 'file'
  name: string
  parent: MockDirectory
  content?: string
  provider?: () => string
}

function createDir(name: string, parent: MockDirectory | null): MockDirectory {
  return { type: 'directory', name, parent, children: new Map() }
}

function createFile(name: string, parent: MockDirectory, content?: string, provider?: () => string): MockFile {
  return { type: 'file', name, parent, content, provider }
}

function addChild(parent: MockDirectory, child: MockEntry): void {
  parent.children.set(child.name, child)
}

export class MockFileSystem {
  private _root: MockDirectory
  private _cwd: MockDirectory
  private _startTime: number

  constructor() {
    this._startTime = Date.now()
    this._root = this._buildTree()
    this._cwd = this._resolveDir('/root')!
    this._cwd = this._cwd
  }

  get cwdPath(): string {
    return this._pathOf(this._cwd)
  }

  private _pathOf(entry: MockEntry): string {
    const parts: string[] = []
    let cur: MockEntry | null = entry
    while (cur) {
      parts.unshift(cur.name)
      cur = cur.type === 'directory' ? cur.parent : cur.parent
    }
    return '/' + parts.filter(Boolean).join('/')
  }

  cd(path: string): string | null {
    const dir = this._resolveDir(this._resolvePath(path))
    if (!dir) return `cd: no such file or directory: ${path}`
    this._cwd = dir
    return null
  }

  ls(args: string): string {
    const parts = args.trim().split(/\s+/).filter(Boolean)
    const showAll = parts.includes('-a') || parts.includes('-la') || parts.includes('-al')
    const long = parts.includes('-l') || parts.includes('-la') || parts.includes('-al')
    const rest = parts.filter(a => !a.startsWith('-'))
    const targetPath = rest[0] || '.'
    const dir = this._resolveDir(this._resolvePath(targetPath))
    if (!dir) return `ls: cannot access '${targetPath}': No such file or directory`

    const names = [...dir.children.keys()].sort()
    const entries = names.map(n => dir.children.get(n)!)

    if (!showAll) {
      const filtered = entries.filter(e => !e.name.startsWith('.'))
      if (long) return this._formatLong(filtered)
      return this._formatShort(filtered)
    }

    // Include . and ..
    const allEntries: MockFile[] | MockDirectory[] = []
    if (long) {
      const dots = [
        { type: 'directory' as const, name: '.', parent: dir.parent, children: dir.children } as MockDirectory,
        { type: 'directory' as const, name: '..', parent: null, children: new Map() } as MockDirectory,
      ]
      return this._formatLong([...dots, ...entries])
    }
    return this._formatShort(entries)
  }

  private _formatShort(entries: MockEntry[]): string {
    return entries.map(e => e.type === 'directory' ? e.name + '/' : e.name).join('  ') + '\r\n'
  }

  private _formatLong(entries: MockEntry[]): string {
    const lines = entries.map(e => {
      const perms = e.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--'
      const links = e.type === 'directory' ? '2' : '1'
      const size = e.type === 'file' ? (e.content?.length ?? (e.provider?.().length ?? 0)).toString().padStart(5) : '   40'
      const date = 'Jun  8 10:00'
      const name = e.type === 'directory' ? e.name + '/' : e.name
      return `${perms}  ${links} root  root  ${size} ${date} ${name}`
    })
    return lines.join('\r\n') + '\r\n'
  }

  cat(path: string): string | null {
    const entry = this._resolveEntry(this._resolvePath(path))
    if (!entry) return `cat: ${path}: No such file or directory`
    if (entry.type === 'directory') return `cat: ${path}: Is a directory`
    return entry.provider ? entry.provider() : (entry.content ?? '')
  }

  touch(path: string): string | null {
    const resolved = this._resolvePath(path)
    const existing = this._resolveEntry(resolved)
    if (existing) return null
    const parentPath = this._dirname(resolved)
    const name = this._basename(resolved)
    const parent = this._resolveDir(parentPath)
    if (!parent) return `touch: cannot touch '${path}': No such file or directory`
    const file = createFile(name, parent, '')
    addChild(parent, file)
    return null
  }

  mkdir(path: string): string | null {
    const resolved = this._resolvePath(path)
    const existing = this._resolveEntry(resolved)
    if (existing) return `mkdir: cannot create directory '${path}': File exists`
    const parentPath = this._dirname(resolved)
    const name = this._basename(resolved)
    const parent = this._resolveDir(parentPath)
    if (!parent) return `mkdir: cannot create directory '${path}': No such file or directory`
    const dir = createDir(name, parent)
    addChild(parent, dir)
    return null
  }

  rm(path: string): string | null {
    const resolved = this._resolvePath(path)
    const entry = this._resolveEntry(resolved)
    if (!entry) return `rm: cannot remove '${path}': No such file`
    if (entry.type === 'directory') return `rm: cannot remove '${path}': Is a directory`
    entry.parent.children.delete(entry.name)
    return null
  }

  rmdir(path: string): string | null {
    const resolved = this._resolvePath(path)
    const entry = this._resolveDir(resolved)
    if (!entry) return `rmdir: failed to remove '${path}': No such file or directory`
    if (entry.children.size > 0) return `rmdir: failed to remove '${path}': Directory not empty`
    entry.parent!.children.delete(entry.name)
    return null
  }

  writeFile(path: string, content: string): string | null {
    const resolved = this._resolvePath(path)
    const existing = this._resolveEntry(resolved)
    if (existing && existing.type === 'file') {
      existing.content = content
      return null
    }
    return this.touch(path) ?? (() => {
      const e = this._resolveEntry(resolved) as MockFile
      e.content = content
      return null
    })()
  }

  appendFile(path: string, content: string): string | null {
    const resolved = this._resolvePath(path)
    const existing = this._resolveEntry(resolved)
    if (existing && existing.type === 'file') {
      existing.content = (existing.content ?? '') + content
      return null
    }
    return this.writeFile(path, content)
  }

  complete(prefix: string): string[] {
    const hasSlash = prefix.includes('/')
    if (!hasSlash) {
      const candidates: string[] = []
      for (const name of this._cwd.children.keys()) {
        if (name.startsWith(prefix)) {
          candidates.push(name + (this._cwd.children.get(name)!.type === 'directory' ? '/' : ''))
        }
      }
      return candidates
    }

    const idx = prefix.lastIndexOf('/')
    const dirPart = prefix.slice(0, idx) || '/'
    const filePart = prefix.slice(idx + 1)
    const resolved = dirPart.startsWith('/') ? dirPart : this._resolvePath(dirPart)
    const dir = this._resolveDir(resolved)
    if (!dir) return []

    const candidates: string[] = []
    const base = dirPart === '/' ? '/' : (dirPart.startsWith('/') ? dirPart + '/' : dirPart + '/')
    for (const name of dir.children.keys()) {
      if (name.startsWith(filePart)) {
        candidates.push(base + name + (dir.children.get(name)!.type === 'directory' ? '/' : ''))
      }
    }
    return candidates
  }

  getEntry(path: string): MockEntry | undefined {
    const resolved = this._resolvePath(path)
    const entry = this._resolveEntry(resolved)
    return entry ?? undefined
  }

  readFile(path: string): string | null {
    const resolved = this._resolvePath(path)
    const entry = this._resolveEntry(resolved)
    if (!entry) return null
    if (entry.type === 'directory') return null
    return entry.provider ? entry.provider() : (entry.content ?? '')
  }

  cp(src: string, dest: string): string | null {
    const srcResolved = this._resolvePath(src)
    const srcEntry = this._resolveEntry(srcResolved)
    if (!srcEntry) return `cp: cannot stat '${src}': No such file or directory`
    if (srcEntry.type === 'directory') return `cp: omitting directory '${src}'`

    const content = srcEntry.provider ? srcEntry.provider() : (srcEntry.content ?? '')
    return this.writeFile(dest, content)
  }

  mv(src: string, dest: string): string | null {
    const srcResolved = this._resolvePath(src)
    const srcEntry = this._resolveEntry(srcResolved)
    if (!srcEntry) return `mv: cannot stat '${src}': No such file or directory`
    if (srcEntry.type === 'directory') return `mv: cannot move '${src}': Is a directory`

    const content = srcEntry.provider ? srcEntry.provider() : (srcEntry.content ?? '')
    const writeErr = this.writeFile(dest, content)
    if (writeErr) return writeErr

    srcEntry.parent.children.delete(srcEntry.name)
    return null
  }

  find(basePath: string, name: string): string[] {
    const resolved = this._resolvePath(basePath)
    const dir = this._resolveDir(resolved)
    if (!dir) return []

    const results: string[] = []
    this._findRecursive(dir, name, results)
    return results
  }

  private _findRecursive(dir: MockDirectory, name: string, results: string[]): void {
    for (const entry of dir.children.values()) {
      const fullPath = this._pathOf(entry)
      if (entry.type === 'file' && entry.name.includes(name)) {
        results.push(fullPath)
      }
      if (entry.type === 'directory') {
        this._findRecursive(entry, name, results)
      }
    }
  }

  // ── path utils ──

  private _resolvePath(path: string): string {
    if (path === '~') return '/root'
    if (path.startsWith('~/')) return '/root/' + path.slice(2)
    if (path.startsWith('/')) return path

    const parts = path.split('/').filter(Boolean)
    const cwdParts = this.cwdPath.split('/').filter(Boolean)
    for (const p of parts) {
      if (p === '.') continue
      if (p === '..') { cwdParts.pop(); continue }
      cwdParts.push(p)
    }
    return '/' + cwdParts.join('/')
  }

  private _dirname(p: string): string {
    const parts = p.replace(/\/$/, '').split('/')
    parts.pop()
    return parts.join('/') || '/'
  }

  private _basename(p: string): string {
    return p.replace(/\/$/, '').split('/').pop() || ''
  }

  private _resolveEntry(path: string): MockEntry | null {
    if (path === '/') return this._root
    const parts = path.split('/').filter(Boolean)
    let cur: MockEntry = this._root
    for (const part of parts) {
      if (cur.type !== 'directory') return null
      const child = cur.children.get(part)
      if (!child) return null
      cur = child
    }
    return cur
  }

  private _resolveDir(path: string): MockDirectory | null {
    const entry = this._resolveEntry(path)
    return entry?.type === 'directory' ? entry : null
  }

  // ── build initial tree ──

  private _buildTree(): MockDirectory {
    const r = createDir('', null)
    const bin = createDir('bin', r); const boot = createDir('boot', r)
    const dev = createDir('dev', r); const etc = createDir('etc', r)
    const home = createDir('home', r); const proc = createDir('proc', r)
    const root = createDir('root', r); const sbin = createDir('sbin', r)
    const tmp = createDir('tmp', r); const usr = createDir('usr', r)
    const var_ = createDir('var', r)
    addChild(r, bin); addChild(r, boot); addChild(r, dev); addChild(r, etc)
    addChild(r, home); addChild(r, proc); addChild(r, root); addChild(r, sbin)
    addChild(r, tmp); addChild(r, usr); addChild(r, var_)

    // /bin/
    for (const name of ['bash','cat','chmod','cp','grep','ls','mkdir','mv','rmdir','rm','sh','sleep','touch']) {
      addChild(bin, createFile(name, bin, ''))
    }

    // /dev/
    addChild(dev, createFile('null', dev, '', () => ''))
    addChild(dev, createFile('zero', dev, '', () => ''))
    addChild(dev, createFile('random', dev, '', () => Math.random().toString(36).slice(2, 10) + '\n'))
    addChild(dev, createFile('urandom', dev, '', () => Math.random().toString(36).slice(2, 10) + '\n'))
    addChild(dev, createFile('tty', dev, '', () => '[tty output]\r\n'))

    // /etc/
    addChild(etc, createFile('hostname', etc, 'mockhost\n'))
    addChild(etc, createFile('hosts', etc, '127.0.0.1\tlocalhost\n::1\tlocalhost\n'))
    addChild(etc, createFile('passwd', etc, 'root:x:0:0:root:/root:/bin/bash\n'))
    addChild(etc, createFile('resolv.conf', etc, 'nameserver 8.8.8.8\nnameserver 8.8.4.4\n'))
    addChild(etc, createFile('issue', etc, 'mock-pty v0.1.0 \\n \\l\n'))
    addChild(etc, createFile('shells', etc, '/bin/bash\n/bin/sh\n'))
    addChild(etc, createFile('fstab', etc, '# /etc/fstab\nproc /proc proc defaults 0 0\n'))

    // /proc/
    addChild(proc, createFile('cpuinfo', proc, '',
      () => `processor\t: 0\nvendor_id\t: GenuineIntel\ncpu family\t: 6\nmodel\t\t: 158\nmodel name\t: Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz\nstepping\t: 3\ncpu MHz\t\t: 3600.000\ncache size\t: 12288 KB\nphysical id\t: 0\nsiblings\t: 1\ncore id\t\t: 0\ncpu cores\t: 1\nflags\t\t: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ss syscall nx pdpe1gb rdtscp lm constant_tsc arch_perfmon rep_good nopl cpuid tsc_known_freq\n`
    ))
    addChild(proc, createFile('meminfo', proc, '',
      () => `MemTotal:       16384000 kB\nMemFree:         8200000 kB\nMemAvailable:   12000000 kB\nBuffers:         1200000 kB\nCached:          3800000 kB\nSwapTotal:       4194304 kB\nSwapFree:        4194304 kB\n`
    ))
    addChild(proc, createFile('uptime', proc, '',
      () => {
        const secs = ((Date.now() - this._startTime) / 1000).toFixed(2)
        return `${secs} ${secs}\n`
      }
    ))
    addChild(proc, createFile('version', proc, 'Linux version 6.6.0-mock-pty (root@mockhost) (gcc 13.2.0) #1 SMP PREEMPT_DYNAMIC Mon Jun 8 10:00:00 UTC 2026\n'))
    addChild(proc, createFile('loadavg', proc, '0.00 0.00 0.00 1/1 1234\n'))
    addChild(proc, createFile('filesystems', proc, 'ext4\nproc\ntmpfs\ndevtmpfs\n'))
    addChild(proc, createFile('mounts', proc, 'rootfs / rootfs rw 0 0\nproc /proc proc rw,relatime 0 0\n'))

    // /root/
    addChild(root, createFile('.bashrc', root,
      'export PS1="\\u@\\h:\\w# "\nalias ll="ls -la"\n'
    ))
    addChild(root, createFile('.profile', root,
      'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n'
    ))

    const projects = createDir('projects', root)
    const documents = createDir('documents', root)
    const downloads = createDir('downloads', root)
    addChild(root, projects); addChild(root, documents); addChild(root, downloads)

    addChild(projects, createFile('hello.js', projects, 'console.log("Hello, world!")\n'))
    addChild(projects, createFile('README.md', projects, '# Projects\n\nMy projects directory\n'))

    addChild(documents, createFile('notes.txt', documents,
      'Mock PTY notes\n================\n- Works in browser\n- API compatible with node-pty\n- Zero native dependencies\n'))
    addChild(documents, createFile('todo.txt', documents,
      '- [x] Basic commands\n- [x] ls, cd, pwd, cat\n- [x] Touch, mkdir, rm\n- [ ] SSH support\n'))
    addChild(root, createFile('file1.txt', root, 'Hello from file1\n'))
    addChild(root, createFile('file2.js', root, 'const x = 42\nconsole.log(x)\n'))

    // /usr/
    const usrBin = createDir('bin', usr); const usrLib = createDir('lib', usr); const usrShare = createDir('share', usr)
    addChild(usr, usrBin); addChild(usr, usrLib); addChild(usr, usrShare)
    addChild(usrBin, createFile('python3', usrBin, ''))
    addChild(usrBin, createFile('vim', usrBin, ''))

    // /var/
    const varLog = createDir('log', var_); const varTmp = createDir('tmp', var_)
    addChild(var_, varLog); addChild(var_, varTmp)
    addChild(varLog, createFile('syslog', varLog,
      'Jun  8 10:00:00 mockhost kernel: boot...\nJun  8 10:00:01 mockhost sshd[123]: Server listening on 0.0.0.0 port 22.\n'))
    addChild(varLog, createFile('messages', varLog, ''))

    return r
  }
}
