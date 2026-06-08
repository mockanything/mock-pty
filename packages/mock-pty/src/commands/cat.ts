import type { CommandHandler } from './index'

export const handleCat: CommandHandler = (args, { fs, writeOutput }) => {
  if (!args) { writeOutput('cat: missing operand\r\n'); return }
  const files = args.split(/\s+/)
  for (const file of files) {
    const result = fs.cat(file)
    if (result === null) {
      writeOutput(`cat: ${file}: No such file or directory\r\n`)
    } else {
      writeOutput(result.endsWith('\n') ? result : result + '\n')
    }
  }
}
