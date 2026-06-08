import type { CommandHandler } from './index'

export const handleDate: CommandHandler = (args, { writeOutput }) => {
  const now = new Date()
  const parts = args.trim().split(/\s+/)

  if (parts.length > 0 && parts[0] === '-u') {
    const d = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    )
    writeOutput(d.toString() + '\r\n')
    return
  }

  writeOutput(now.toString() + '\r\n')
}
