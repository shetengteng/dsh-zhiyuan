// 夹具 worker：连续发送超限大帧，父进程累计限额必须被触发。

process.on('message', (raw) => {
  let index = 0
  const sendNext = () => {
    if (index >= 3) return
    index += 1
    process.send({
      type: 'output',
      outputName: 'a.md',
      byteLength: raw.chunkBytes,
      digest: '0'.repeat(64),
      bytes: Buffer.alloc(raw.chunkBytes, 1),
    })
    setTimeout(sendNext, 10)
  }
  sendNext()
})

process.on('disconnect', () => process.exit(0))
