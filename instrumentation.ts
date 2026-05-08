export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureUploadsDir } = await import('@/lib/uploads')
    ensureUploadsDir()
  }
}
