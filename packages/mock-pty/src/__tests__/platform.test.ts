import { describe, it, expect } from 'vitest'
import { getCwd, getEnv, getProcessTitle } from '../platform'

describe('platform', () => {
  describe('getCwd', () => {
    it('should return current working directory', () => {
      const cwd = getCwd()
      expect(cwd).toBeTruthy()
      expect(typeof cwd).toBe('string')
    })
  })

  describe('getEnv', () => {
    it('should return environment variables', () => {
      const env = getEnv()
      expect(env).toBeTruthy()
      expect(typeof env).toBe('object')
    })
  })

  describe('getProcessTitle', () => {
    it('should return a string', () => {
      const title = getProcessTitle()
      expect(typeof title).toBe('string')
    })
  })
})
