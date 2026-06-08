export function getCwd(): string {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    return process.cwd()
  }
  return '/'
}

export function getEnv(): Record<string, string> {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string>
  }
  return {}
}

export function getProcessTitle(): string {
  if (typeof process !== 'undefined' && process.title) {
    return process.title
  }
  return 'mock-pty'
}
