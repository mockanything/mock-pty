# mock-pty

A mock PTY implementation compatible with the [node-pty](https://github.com/microsoft/node-pty) API. Works in both **Node.js** and **browser** environments — zero native dependencies.

This monorepo contains two packages:

- [`@gausszhou/mock-pty`](./packages/mock-pty) — The core library with a built-in mock shell and in-memory file system
- [`@gausszhou/mock-pty-playground`](./packages/playground) — A Vue 3 + xterm.js playground for testing the library

## Usage

```bash
# Install dependencies
pnpm install

# Start the playground
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test
```

## Packages

### `@gausszhou/mock-pty`

A drop-in replacement for `node-pty` for testing and browser environments. Includes:

- API-compatible `spawn`, `fork`, `open` functions
- Built-in mock shell with common Unix commands (`ls`, `cd`, `pwd`, `cat`, `echo`, `touch`, `mkdir`, `rm`, `rmdir`, `whoami`, `clear`, `help`, `history`, `exit`)
- In-memory file system with a realistic Linux-like directory tree (`/bin`, `/etc`, `/proc`, `/dev`, `/root`, `/usr`, `/var`, etc.)
- Dynamic file providers for `/proc/cpuinfo`, `/proc/meminfo`, `/proc/uptime`, `/dev/random`, etc.
- Flow control support (XON/XOFF)
- TypeScript types matching `node-pty`'s `IPty` interface

### `@gausszhou/mock-pty-playground`

A demo application built with Vue 3 and xterm.js that opens a full-screen terminal connected to a `MockPty` instance.

## License

MIT
