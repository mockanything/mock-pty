import type { CommandHandler } from './index'

export const handleLess: CommandHandler = (args, { fs, writeOutput }) => {
  if (!args.trim()) {
    writeOutput('less: missing file operand\r\n')
    return
  }

  const content = fs.readFile(args.trim())
  if (content === null) {
    writeOutput(`less: ${args.trim()}: No such file or directory\r\n`)
    return
  }

  writeOutput(content.endsWith('\n') ? content : content + '\n')
}
