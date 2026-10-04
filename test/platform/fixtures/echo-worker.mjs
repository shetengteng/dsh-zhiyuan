// 夹具 worker：立即回传一帧产物与一帧警告，然后 done。

process.on('message', (raw) => {
  const request = raw
  process.send({ type: 'diagnostic', message: request.warnings[0] })
  const bytes = Buffer.from(request.bytes)
  process.send({
    type: 'output',
    outputName: request.outputName,
    byteLength: bytes.length,
    digest: '0'.repeat(64),
    bytes,
  })
  process.send({ type: 'done' })
  if (process.connected) process.disconnect()
})

process.on('disconnect', () => process.exit(0))
