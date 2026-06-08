import type { CommandHandler } from './index'

export const handleFind: CommandHandler = (args, { fs, writeOutput }) => {
  const parts = args.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    writeOutput('find: missing operand\r\n')
    return
  }

  let basePath = '.'
  let name: string | null = null

  if (parts.length === 1) {
    name = parts[0]
  } else if (parts.length === 2 && parts[0] === '-name') {
    name = parts[1]
  } else if (parts.length >= 2 && !parts[0].startsWith('-')) {
    basePath = parts[0]
    if (parts[1] === '-name' && parts[2]) {
      name = parts[2]
    } else {
      name = parts[1]
    }
  }

  if (name === null) {
    writeOutput('find: missing expression\r\n')
    return
  }

  const results = fs.find(basePath, name)
  if (results.length === 0) {
    return
  }
  writeOutput(results.join('\r\n') + '\r\n')
}
