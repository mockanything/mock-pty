import type { CommandHandler, CommandContext, FsCmdContext } from './index'
import { handleEcho } from './echo'
import { handleCd } from './cd'
import { handleCat } from './cat'
import { handleTop } from './top'
import { handleDate } from './date'
import { handlePs } from './ps'
import { handleHead } from './head'
import { handleTail } from './tail'
import { handleLess } from './less'
import { handleCp } from './cp'
import { handleMv } from './mv'
import { handleFind } from './find'

function handleFsCmd(cmd: string, args: string, { fs, writeOutput }: FsCmdContext): void {
  const targets = args.split(/\s+/).filter(Boolean)
  if (targets.length === 0) {
    writeOutput(`${cmd}: missing operand\r\n`)
    return
  }
  for (const target of targets) {
    let err: string | null = null
    switch (cmd) {
      case 'touch': err = fs.touch(target); break
      case 'mkdir': err = fs.mkdir(target); break
      case 'rm': err = fs.rm(target); break
      case 'rmdir': err = fs.rmdir(target); break
    }
    if (err) writeOutput(err + '\r\n')
  }
}

const commandMap: Record<string, CommandHandler> = {
  echo: handleEcho,
  cd: handleCd,
  cat: handleCat,
  top: handleTop,
  date: handleDate,
  ps: handlePs,
  head: handleHead,
  tail: handleTail,
  less: handleLess,
  cp: handleCp,
  mv: handleMv,
  find: handleFind,

  pwd: (_args, { fs, writeOutput }) => {
    writeOutput(`${fs.cwdPath}\r\n`)
  },

  whoami: (_args, { writeOutput }) => {
    writeOutput('root\r\n')
  },

  hostname: (_args, { fs, writeOutput }) => {
    const content = fs.readFile('/etc/hostname')
    writeOutput(content ?? 'mockhost\n')
  },

  id: (_args, { writeOutput }) => {
    writeOutput('uid=0(root) gid=0(root) groups=0(root)\r\n')
  },

  which: (args, { fs, writeOutput }) => {
    const cmd = args.trim()
    if (!cmd) {
      writeOutput('which: missing operand\r\n')
      return
    }
    const builtins = ['ls','ll','cd','pwd','cat','whoami','echo','touch','mkdir','rm','rmdir','clear','cls','exit','quit','help','history','top','date','ps','head','tail','less','cp','mv','find','hostname','id','uname','which','where']
    if (builtins.includes(cmd)) {
      writeOutput(`${cmd}: shell built-in command\r\n`)
      return
    }
    const entry = fs.getEntry('/bin/' + cmd)
    if (entry) {
      writeOutput(`/bin/${cmd}\r\n`)
      return
    }
    writeOutput(`which: no ${cmd} in (/bin)\r\n`)
  },

  where: (args, { fs, writeOutput }) => {
    const cmd = args.trim()
    if (!cmd) {
      writeOutput('where: missing operand\r\n')
      return
    }
    const builtins = ['ls','ll','cd','pwd','cat','whoami','echo','touch','mkdir','rm','rmdir','clear','cls','exit','quit','help','history','top','date','ps','head','tail','less','cp','mv','find','hostname','id','uname','which','where']
    let found = false
    if (builtins.includes(cmd)) {
      writeOutput(`${cmd}: shell built-in command\r\n`)
      found = true
    }
    const entry = fs.getEntry('/bin/' + cmd)
    if (entry) {
      writeOutput(`/bin/${cmd}\r\n`)
      found = true
    }
    if (!found) {
      writeOutput(`where: no ${cmd} found\r\n`)
    }
  },

  uname: (args, { writeOutput }) => {
    const opts = args.trim()
    if (opts === '-a' || opts === '--all') {
      writeOutput('Linux mockhost 6.6.0-mock-pty #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\r\n')
    } else if (opts === '-s' || opts === '--kernel-name') {
      writeOutput('Linux\r\n')
    } else if (opts === '-r' || opts === '--kernel-release') {
      writeOutput('6.6.0-mock-pty\r\n')
    } else if (opts === '-m' || opts === '--machine') {
      writeOutput('x86_64\r\n')
    } else {
      writeOutput('Linux\r\n')
    }
  },

  help: (_args, { writeOutput }) => {
    writeOutput(
      'Built-in commands:\r\n' +
      '  ls, ll, cd, pwd, cat, whoami, echo, touch, mkdir, rm, rmdir,\r\n' +
      '  clear, exit, help, history, top, date, ps, head, tail, less,\r\n' +
      '  cp, mv, find, hostname, id, uname, which, where\r\n'
    )
  },

  history: (_args, { history, writeOutput }) => {
    writeOutput(`${history.join('')}\r\n`)
  },

  clear: (_args, { writeOutput }) => {
    writeOutput('\x1b[2J\x1b[0;0H')
  },
  cls: (_args, { writeOutput }) => {
    writeOutput('\x1b[2J\x1b[0;0H')
  },

  ls: (args, { fs, writeOutput }) => {
    writeOutput(fs.ls(args))
  },
  ll: (args, { fs, writeOutput }) => {
    writeOutput(fs.ls('-l ' + args))
  },
  dir: (args, { fs, writeOutput }) => {
    writeOutput(fs.ls(args))
  },

  touch: (args, ctx) => handleFsCmd('touch', args, ctx),
  mkdir: (args, ctx) => handleFsCmd('mkdir', args, ctx),
  rm: (args, ctx) => handleFsCmd('rm', args, ctx),
  rmdir: (args, ctx) => handleFsCmd('rmdir', args, ctx),
}

export function lookupHandler(cmd: string): CommandHandler | undefined {
  return commandMap[cmd]
}
