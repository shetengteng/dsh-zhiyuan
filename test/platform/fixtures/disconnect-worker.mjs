// 夹具 worker：验证 IPC 断开后自动退出（disconnect → exit 0）。

process.on('message', () => {
  process.send({ ready: true })
})

process.on('disconnect', () => process.exit(0))

setInterval(() => undefined, 1000)
