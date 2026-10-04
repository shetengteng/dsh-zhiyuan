// 夹具 worker：发送不符合契约的负载，父进程必须拒绝。

process.on('message', () => {
  process.send({ type: 'what-is-this' })
})

process.on('disconnect', () => process.exit(0))
