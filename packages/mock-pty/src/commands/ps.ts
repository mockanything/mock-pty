import type { CommandHandler } from './index'

const processes = [
  { pid: 1, user: 'root', pr: 20, ni: 0, virt: 10000, res: 5000, shr: 3000, cpu: 0.0, mem: 0.1, time: '0:00.01', cmd: 'init' },
  { pid: 2, user: 'root', pr: 20, ni: 0, virt: 0, res: 0, shr: 0, cpu: 0.0, mem: 0.0, time: '0:00.00', cmd: 'kthreadd' },
  { pid: 100, user: 'root', pr: 20, ni: 0, virt: 50000, res: 20000, shr: 8000, cpu: 0.3, mem: 0.1, time: '0:02.34', cmd: 'bash' },
  { pid: 101, user: 'root', pr: 20, ni: 0, virt: 25000, res: 10000, shr: 5000, cpu: 0.0, mem: 0.1, time: '0:00.12', cmd: 'sshd' },
  { pid: 102, user: 'root', pr: 20, ni: 0, virt: 80000, res: 35000, shr: 12000, cpu: 1.2, mem: 0.2, time: '0:05.67', cmd: 'nginx' },
  { pid: 200, user: 'root', pr: 20, ni: 0, virt: 40000, res: 15000, shr: 6000, cpu: 0.0, mem: 0.1, time: '0:00.45', cmd: 'cron' },
  { pid: 201, user: 'root', pr: 20, ni: 0, virt: 30000, res: 12000, shr: 4000, cpu: 0.0, mem: 0.1, time: '0:00.03', cmd: 'getty' },
  { pid: 300, user: 'root', pr: 20, ni: 0, virt: 60000, res: 25000, shr: 9000, cpu: 0.5, mem: 0.2, time: '0:01.23', cmd: 'python3' },
]

export const handlePs: CommandHandler = (args, { writeOutput }) => {
  const isAux = args.includes('aux') || args.includes('-ef')

  if (isAux) {
    writeOutput(
      'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\r\n'
    )
    for (const p of processes) {
      writeOutput(
        `${p.user.padEnd(11)} ${String(p.pid).padStart(5)} ${String(p.cpu).padStart(4)} ${String(p.mem).padStart(4)} ${String(p.virt).padStart(6)} ${String(p.res).padStart(5)} pts/0    S    Jun08 ${p.time} ${p.cmd}\r\n`
      )
    }
    return
  }

  writeOutput(
    '  PID TTY          TIME CMD\r\n'
  )
  for (const p of processes) {
    writeOutput(
      `${String(p.pid).padStart(5)} pts/0      00:${p.time} ${p.cmd}\r\n`
    )
  }
}
