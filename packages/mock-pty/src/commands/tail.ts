import type { CommandHandler } from './index'

export const handleTail: CommandHandler = (args, { fs, writeOutput }) => {
  const parts = args.trim().split(/\s+/).filter(Boolean)
  let lines = 10
  let fileArg = ''

  if (parts.length >= 2 && parts[0] === '-n') {
    lines = parseInt(parts[1], 10)
    if (isNaN(lines) || lines < 0) {
      writeOutput('tail: invalid number of lines\r\n')
      return
    }
    fileArg = parts.slice(2).join(' ')
  } else if (parts.length >= 1 && parts[0].startsWith('-')) {
    const n = parseInt(parts[0].replace(/^-/, ''), 10)
    if (!isNaN(n) && n >= 0) {
      lines = n
      fileArg = parts.slice(1).join(' ')
    }
  } else {
    fileArg = parts.join(' ')
  }

  if (!fileArg) {
    writeOutput('tail: missing file operand\r\n')
    return
  }

  const content = fs.readFile(fileArg)
  if (content === null) {
    writeOutput(`tail: cannot open '${fileArg}': No such file or directory\r\n`)
    return
  }

  const allLines = content.split('\n')
  const start = Math.max(0, allLines.length - lines)
  const shown = allLines.slice(start)
  writeOutput(shown.join('\n') + (content.endsWith('\n') ? '\n' : ''))
}
