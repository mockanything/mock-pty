import type { CommandHandler } from './index'

export const handleCp: CommandHandler = (args, { fs, writeOutput }) => {
  const parts = args.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) {
    writeOutput('cp: missing file operand\r\n')
    return
  }

  const src = parts[0]
  const dest = parts[1]
  const err = fs.cp(src, dest)
  if (err) {
    writeOutput(err + '\r\n')
  }
}
