import { describe, it, expect } from 'vitest'
import { spawn, fork, createTerminal, open, MockPty } from '../index'

describe('index exports', () => {
  describe('spawn', () => {
    it('should return a MockPty instance', () => {
      const pty = spawn('/bin/bash', [])
      expect(pty).toBeInstanceOf(MockPty)
    })

    it('should set pid', () => {
      const pty = spawn('/bin/bash', [])
      expect(pty.pid).toBeGreaterThan(0)
    })

    it('should accept string args', () => {
      const pty = spawn('/bin/bash', '-c "echo hi"')
      expect(pty).toBeInstanceOf(MockPty)
    })

    it('should accept options with cols and rows', () => {
      const pty = spawn('/bin/bash', [], { cols: 100, rows: 50 })
      expect(pty.cols).toBe(100)
      expect(pty.rows).toBe(50)
    })
  })

  describe('fork', () => {
    it('should return a MockPty instance', () => {
      const pty = fork('/bin/bash', [])
      expect(pty).toBeInstanceOf(MockPty)
    })

    it('should work with options', () => {
      const pty = fork('/bin/bash', [], { name: 'xterm' })
      expect(pty).toBeInstanceOf(MockPty)
    })
  })

  describe('createTerminal', () => {
    it('should return a MockPty instance', () => {
      const pty = createTerminal('/bin/bash', [])
      expect(pty).toBeInstanceOf(MockPty)
    })
  })

  describe('open', () => {
    it('should return a MockPty instance', () => {
      const pty = open()
      expect(pty).toBeInstanceOf(MockPty)
    })

    it('should accept options', () => {
      const pty = open({ cols: 120, rows: 30 })
      expect(pty.cols).toBe(120)
      expect(pty.rows).toBe(30)
    })
  })
})
