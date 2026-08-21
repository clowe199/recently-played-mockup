import type { NextRequest } from 'next/server'

/**
 * Bearer check for the write endpoints.
 *
 * The secret is CRON_SECRET (see .env.example) and it is the same value you
 * paste into stylo under Settings → Connections → Your server → Private Key.
 *
 * With no secret configured, writes are REFUSED rather than waved through.
 * The alternative is a fresh deploy that silently accepts anonymous writes to
 * your listening history, which is a worse default than one that does not work
 * until you configure it — that failure at least tells you it happened.
 */
export function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = req.headers.get('authorization') ?? ''
  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return false

  return timingSafeEqual(header.slice(prefix.length), secret)
}

/** Constant-time compare, so a wrong secret cannot be guessed a byte at a time. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Distinguishes "you sent no secret" from "you sent the wrong one". */
export function authFailureReason(req: NextRequest): string {
  if (!process.env.CRON_SECRET) {
    return 'CRON_SECRET is not set on the server. See .env.example.'
  }
  return 'Missing or invalid Authorization: Bearer <secret> header.'
}
