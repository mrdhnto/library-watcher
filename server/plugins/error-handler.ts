export default defineNitroPlugin(() => {
  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error && reason.message.includes('read ECONNRESET')) {
      return
    }
    console.error('[unhandledRejection]', reason)
  })
})
