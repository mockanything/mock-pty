<template>
  <div ref="terminalContainer" class="terminal-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { spawn } from 'mock-pty'
import type { IDisposable } from 'mock-pty'
import '@xterm/xterm/css/xterm.css'

const terminalContainer = ref<HTMLDivElement>()

let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
const disposables: IDisposable[] = []

onMounted(() => {
  if (!terminalContainer.value) return

  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontSize: 14,
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
    theme: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      cursor: '#c9d1d9',
      selectionBackground: '#3b4048',
      black: '#484f58',
      red: '#ff7b72',
      green: '#3fb950',
      yellow: '#d29922',
      blue: '#58a6ff',
      magenta: '#bc8cff',
      cyan: '#39c5cf',
      white: '#b1bac4',
      brightBlack: '#6e7681',
      brightRed: '#ffa198',
      brightGreen: '#56d364',
      brightYellow: '#e3b341',
      brightBlue: '#79c0ff',
      brightMagenta: '#d2a8ff',
      brightCyan: '#56d4dd',
      brightWhite: '#f0f6fc',
    },
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(terminalContainer.value)
  fitAddon.fit()

  const pty = spawn('/bin/sh', [], {
    name: 'xterm-256color',
    cols: terminal.cols,
    rows: terminal.rows,
  })

  disposables.push(
    pty.onData((data) => {
      terminal?.write(data)
    }),
  )

  terminal.onData((data) => {
    pty.write(data)
  })

  disposables.push(
    pty.onExit(({ exitCode, signal }) => {
      terminal?.writeln(`\r\n[Process exited with code ${exitCode}${signal !== undefined ? `, signal ${signal}` : ''}]`)
    }),
  )

  const ro = new ResizeObserver(() => {
    fitAddon?.fit()
  })
  ro.observe(terminalContainer.value)
})

onBeforeUnmount(() => {
  disposables.forEach((d) => d.dispose())
  terminal?.dispose()
})
</script>

<style scoped>
.terminal-container {
  width: calc(100vw - 32px);
  height: calc(100vh - 32px);
  margin: 16px;
}
</style>
