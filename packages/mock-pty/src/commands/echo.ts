import type { CommandHandler } from './index'

export const handleEcho: CommandHandler = (args, { fs, writeOutput }) => {
  const redirectMatch = args.match(/^(.+?)\s*(>>?)\s*(.+)$/)
  if (redirectMatch) {
    const text = redirectMatch[1]
    const op = redirectMatch[2]
    const target = redirectMatch[3].trim()
    const err = op === '>>' ? fs.appendFile(target, text + '\n') : fs.writeFile(target, text + '\n')
    if (err) writeOutput(err + '\r\n')
  } else {
    writeOutput(args + '\r\n')
  }
}
