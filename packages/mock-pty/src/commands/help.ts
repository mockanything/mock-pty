import type { CommandHandler } from './index'

export const handleHelp: CommandHandler = (_args, { writeOutput }) => {
  writeOutput(
    'Built-in commands:\r\n' +
    '  ls, ll, cd, pwd, cat, whoami, echo, touch, mkdir, rm, rmdir,\r\n' +
    '  clear, exit, help, history, top\r\n'
  )
}
