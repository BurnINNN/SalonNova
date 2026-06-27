import crypto from 'crypto'

export function verifyMetaSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) return false

  const expected = crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expected, 'hex')
  )
}
