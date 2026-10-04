// 夹具 worker：只挂住事件循环不发任何帧，用于超时硬终止。

process.on('message', () => {
  // 不响应，等待父进程超时终止
})

process.on('disconnect', () => process.exit(0))

setInterval(() => undefined, 1000)
