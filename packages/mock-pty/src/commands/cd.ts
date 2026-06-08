import type { CommandHandler } from './index'

export const handleCd: CommandHandler = (args, { fs, writeOutput }) => {
  const target = args || '/root'
  const err = fs.cd(target)
  if (err) writeOutput(err + '\r\n')
}
