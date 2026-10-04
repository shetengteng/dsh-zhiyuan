// 夹具 worker：立即发送 failed 帧，code 不在白名单内。

process.on('message', (raw) => {
  process.send({ type: 'failed', code: raw.code, message: raw.message })
  if (process.connected) process.disconnect()
})

process.on('disconnect', () => process.exit(0))
