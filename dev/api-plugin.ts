import type { IncomingMessage } from 'node:http'
import { loadEnv, type Plugin } from 'vite'

/**
 * Dev only: serve api/<name>.ts the way Vercel does (exported GET/POST taking a Web Request),
 * so `npm run dev` + ngrok is the whole local backend. Production uses Vercel's own runtime.
 */
export function apiPlugin(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        // Re-read .env per request: editing it (new ngrok URL, keys) needs no dev-server restart.
        Object.assign(process.env, loadEnv('development', process.cwd(), ''))

        const url = new URL(req.originalUrl ?? req.url ?? '/', `http://${req.headers.host}`)
        const name = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '')
        const notFound = () => {
          res.statusCode = 404 // never fall through to the SPA's index.html for /api/*
          res.end('Not found')
        }
        if (!/^[a-z-]+$/.test(name)) return notFound()

        let mod: Record<string, unknown>
        try {
          mod = await server.ssrLoadModule(`/api/${name}.ts`)
        } catch {
          return notFound()
        }
        const handler = mod[req.method ?? 'GET']
        if (typeof handler !== 'function') {
          res.statusCode = 405
          return res.end()
        }

        const headers = new Headers()
        for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, String(v))
        const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
        const request = new Request(url, { method: req.method, headers, body: hasBody ? new Uint8Array(await readBody(req)) : undefined })

        try {
          const response: Response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          server.config.logger.error(`[api/${name}] ${(e as Error).stack}`)
          res.statusCode = 500
          res.end('Internal error')
        }
      })
    },
  }
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
