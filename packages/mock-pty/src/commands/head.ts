import type { CommandHandler } from './index'

export const handleHead: CommandHandler = (args, { fs, writeOutput }) => {
  const parts = args.trim().split(/\s+/).filter(Boolean)
  let lines = 10
  let fileArg = ''

  if (parts.length >= 2 && parts[0] === '-n') {
    lines = parseInt(parts[1], 10)
    if (isNaN(lines) || lines < 0) {
      writeOutput('head: invalid number of lines\r\n')
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
    writeOutput('head: missing file operand\r\n')
    return
  }

  const content = fs.readFile(fileArg)
  if (content === null) {
    writeOutput(`head: cannot open '${fileArg}': No such file or directory\r\n`)
    return
  }

  const allLines = content.split('\n')
  const shown = allLines.slice(0, lines)
  writeOutput(shown.join('\n') + (content.endsWith('\n') ? '\n' : ''))
}
