# @gausszhou/mock-pty

A mock PTY implementation compatible with the [node-pty](https://github.com/microsoft/node-pty) API. Works in both **Node.js** and **browser** environments — zero native dependencies.

## Install

```bash
npm install @gausszhou/mock-pty
# or
pnpm add @gausszhou/mock-pty
```

## Quick Start

```ts
import { spawn } from '@gausszhou/mock-pty'

const pty = spawn('/bin/sh', [], {
  name: 'xterm-256color',
  cols: 80,
  rows: 24,
})

pty.onData((data) => {
  console.log('Output:', data)
})

pty.write('ls\r')
```

## API

### `spawn(file, args, options?)`

Creates a new mock PTY instance. Signature matches `node-pty`:

| Param | Type | Description |
|---|---|---|
| `file` | `string` | The program to launch |
| `args` | `string[] \| string` | Arguments (or pre-escaped CommandLine on Windows) |
| `options` | `IPtyForkOptions` | Terminal options |

### `fork(file, args, options?)`

Deprecated alias for `spawn`.

### `open(options?)`

Creates an open mock PTY (no child process).

### Events

```ts
interface IPty {
  readonly onData: IEvent<string>
  readonly onExit: IEvent<{ exitCode: number, signal?: number }>
}
```

Subscriptions return an `IDisposable` for easy cleanup:

```ts
const disposable = pty.onData((data) => { ... })
// later:
disposable.dispose()
```

### Methods

| Method | Description |
|---|---|
| `write(data)` | Write data to the PTY (`string \| Buffer`) |
| `resize(cols, rows)` | Resize terminal dimensions |
| `clear()` | Clear screen |
| `kill(signal?)` | Terminate the process |
| `pause()` / `resume()` | Flow control |

### Properties

| Property | Type | Description |
|---|---|---|
| `pid` | `number` | Mock process ID |
| `cols` | `number` | Terminal columns |
| `rows` | `number` | Terminal rows |
| `process` | `string` | Process name |
| `handleFlowControl` | `boolean` | Flow control flag |

## Browser Usage

`@gausszhou/mock-pty` has zero Node.js dependencies. When running in the browser, it gracefully falls back for `process.cwd()` and `process.env`:

```ts
// Works in browser — no build-time polyfills needed
import { spawn } from '@gausszhou/mock-pty'

const pty = spawn('/bin/sh', [])
pty.onData((data) => {
  // data comes here
})
```

### Integration with xterm.js

```ts
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { spawn } from '@gausszhou/mock-pty'

const terminal = new Terminal({ allowProposedApi: true })
terminal.loadAddon(new FitAddon())
terminal.loadAddon(new Unicode11Addon())
terminal.unicode.activeVersion = '11'
terminal.open(document.getElementById('terminal'))

const pty = spawn('/bin/sh', [], {
  cols: terminal.cols,
  rows: terminal.rows,
})

pty.onData((data) => terminal.write(data))
terminal.onData((data) => pty.write(data))
```

## License

MIT
