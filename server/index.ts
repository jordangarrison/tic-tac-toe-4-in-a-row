import { Effect, Schema } from 'effect'
import { resolve, sep } from 'node:path'

import { BunRuntime } from '@effect/platform-bun'

import { rulesSummary } from '../src/game'

export const HealthResponse = Schema.Struct({
  status: Schema.Literal('ok'),
  service: Schema.Literal('tic-tac-toe-4-in-a-row'),
})

export const RulesResponse = Schema.Struct({
  boardSize: Schema.Number,
  winLength: Schema.Number,
  axes: Schema.Array(Schema.String),
  exactLengthOnly: Schema.Boolean,
  gravity: Schema.Boolean,
  boardFullEndsGame: Schema.Boolean,
})

const jsonResponse = <A>(
  schema: Schema.Codec<A, A, never>,
  value: A,
): Response =>
  Response.json(Schema.encodeSync(schema)(value), {
    headers: { 'cache-control': 'public, max-age=300' },
  })

const apiResponse = (request: Request): Response | undefined => {
  const url = new URL(request.url)

  if (request.method === 'GET' && url.pathname === '/api/health') {
    return jsonResponse(HealthResponse, {
      status: 'ok',
      service: 'tic-tac-toe-4-in-a-row',
    })
  }

  if (request.method === 'GET' && url.pathname === '/api/rules') {
    return jsonResponse(RulesResponse, rulesSummary)
  }

  if (url.pathname.startsWith('/api/')) {
    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: { 'cache-control': 'no-store' } },
    )
  }

  return undefined
}

const contentTypeHeaders = (pathname: string): HeadersInit => {
  if (pathname.endsWith('.js')) {
    return { 'content-type': 'text/javascript; charset=utf-8' }
  }

  if (pathname.endsWith('.css')) {
    return { 'content-type': 'text/css; charset=utf-8' }
  }

  if (pathname.endsWith('.svg')) {
    return { 'content-type': 'image/svg+xml' }
  }

  return {}
}

const staticResponse = (
  request: Request,
  staticRoot: string,
): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const url = new URL(request.url)
    const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname
    const normalizedRoot = resolve(staticRoot)
    const candidate = resolve(normalizedRoot, `.${requestedPath}`)
    const isInsideRoot =
      candidate === normalizedRoot ||
      candidate.startsWith(`${normalizedRoot}${sep}`)

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' },
      })
    }

    if (isInsideRoot) {
      const file = Bun.file(candidate)
      if (yield* Effect.promise(() => file.exists())) {
        return new Response(request.method === 'HEAD' ? null : file, {
          headers: contentTypeHeaders(candidate),
        })
      }
    }

    const index = Bun.file(resolve(normalizedRoot, 'index.html'))
    if (yield* Effect.promise(() => index.exists())) {
      return new Response(request.method === 'HEAD' ? null : index, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    }

    return new Response('Frontend build not found', { status: 404 })
  })

export const handleRequest = (
  request: Request,
  staticRoot: string,
): Effect.Effect<Response> => {
  const response = apiResponse(request)
  return response === undefined
    ? staticResponse(request, staticRoot)
    : Effect.succeed(response)
}

const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? '3000')
const staticRoot = process.env.STATIC_ROOT ?? resolve(import.meta.dir, '..')

const serverProgram = Effect.acquireRelease(
  Effect.sync(() =>
    Bun.serve({
      hostname: host,
      port,
      fetch: request => Effect.runPromise(handleRequest(request, staticRoot)),
    }),
  ),
  server => Effect.sync(() => server.stop()),
).pipe(
  Effect.tap(() => Effect.log(`Listening on http://${host}:${port}`)),
  Effect.flatMap(() => Effect.never),
  Effect.scoped,
)

if (import.meta.main) {
  BunRuntime.runMain(serverProgram)
}
