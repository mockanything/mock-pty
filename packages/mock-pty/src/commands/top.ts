import type { CommandHandler } from './index'

export const handleTop: CommandHandler = (_args, { startTime, writeOutput }) => {
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

  const totalMem = 16384000
  const freeMem = 8200000
  const usedMem = totalMem - freeMem
  const uptime = Math.floor((Date.now() - startTime) / 1000)
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const mins = Math.floor((uptime % 3600) / 60)

  writeOutput(
    `top - ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(uptime % 60).padStart(2, '0')} up ${days ? days + ' days, ' : ''}${hours}:${String(mins).padStart(2, '0')},  1 user,  load average: 0.00, 0.00, 0.00\r\n` +
    `Tasks: ${processes.length} total,   1 running, ${processes.length - 1} sleeping,   0 stopped,   0 zombie\r\n` +
    `%Cpu(s):  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\r\n` +
    `MiB Mem :   ${(totalMem / 1024).toFixed(1)} total,   ${(freeMem / 1024).toFixed(1)} free,   ${(usedMem / 1024).toFixed(1)} used\r\n` +
    `MiB Swap:   4096.0 total,   4096.0 free,      0.0 used\r\n\r\n`
  )

  writeOutput(
    '  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\r\n'
  )

  for (const p of processes) {
    writeOutput(
      `${String(p.pid).padStart(5)} ${p.user.padEnd(9)} ${String(p.pr).padStart(2)} ${String(p.ni).padStart(2)} ${String(p.virt).padStart(7)} ${String(p.res).padStart(6)} ${String(p.shr).padStart(5)} S ${String(p.cpu).padStart(4)} ${String(p.mem).padStart(4)} ${p.time.padStart(8)} ${p.cmd}\r\n`
    )
  }
}
