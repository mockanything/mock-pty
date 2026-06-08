import type { MockFileSystem } from '../file-system'

export interface CommandContext {
  fs: MockFileSystem
  history: string[]
  startTime: number
  writeOutput(data: string): void
  destroy(exitCode?: number): void
}

export type FsCmdContext = Pick<CommandContext, 'fs' | 'writeOutput'>

export type CommandHandler = (args: string, ctx: CommandContext) => void
