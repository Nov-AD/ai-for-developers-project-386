import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import Fastify, {
  type FastifyInstance,
  type HTTPMethods
} from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import app from '../src/app.ts'

const specPath = resolve(
  import.meta.dirname,
  '../../../packages/contract/tsp-output/openapi3/openapi.yaml'
)
const spec = parse(readFileSync(specPath, 'utf8'))

type JsonSchema = Record<string, unknown>

type Operation = {
  responses: Record<string, {
    content?: Record<string, { schema?: JsonSchema }>
  }>
}

type PathItem = Partial<Record<HttpMethod, Operation>>

const httpMethods = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace'
] as const

type HttpMethod = (typeof httpMethods)[number]

const paths = spec.paths as Record<string, PathItem>

/** OpenAPI uses `{id}` for path parameters, Fastify uses `:id`. */
function toFastifyUrl (openapiPath: string): string {
  return openapiPath.replace(/\{([^}]+)\}/g, ':$1')
}

function operations (): Array<{
  method: HttpMethod
  path: string
  operation: Operation
}> {
  return Object.entries(paths).flatMap(([path, item]) =>
    httpMethods.flatMap((method) => {
      const operation = item[method]
      return operation ? [{ method, path, operation }] : []
    })
  )
}

const instances: FastifyInstance[] = []

async function build (): Promise<{
  instance: FastifyInstance
  routes: Array<{ method: HttpMethod; url: string }>
}> {
  const instance = Fastify()
  const routes: Array<{ method: HttpMethod; url: string }> = []

  instance.addHook('onRoute', (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method]
    for (const method of methods) {
      routes.push({
        method: method.toLowerCase() as HttpMethod,
        url: route.url
      })
    }
  })

  await instance.register(app)
  await instance.ready()
  instances.push(instance)

  return { instance, routes }
}

afterEach(async () => {
  await Promise.all(instances.splice(0).map(async (instance) => instance.close()))
})

describe('API contract', () => {
  it('is OpenAPI 3.1', () => {
    expect(spec.openapi).toBe('3.1.0')
  })

  it('implements every operation declared in the contract', async () => {
    const { instance } = await build()

    for (const { method, path } of operations()) {
      expect(
        instance.hasRoute({
          method: method.toUpperCase() as HTTPMethods,
          url: toFastifyUrl(path)
        }),
        `${method.toUpperCase()} ${path} is declared in the contract but not implemented`
      ).toBe(true)
    }
  })

  it('exposes no routes missing from the contract', async () => {
    const { routes } = await build()
    const declared = new Set(
      operations().map(({ method, path }) => `${method.toUpperCase()} ${toFastifyUrl(path)}`)
    )

    for (const route of routes) {
      // Fastify adds HEAD routes for GET handlers and CORS adds `OPTIONS *`
      // for preflight requests; neither is an operation of the contract.
      if (route.method === 'head' || route.url === '*') continue

      expect(
        declared,
        `${route.method.toUpperCase()} ${route.url} is implemented but not declared in the contract`
      ).toContain(`${route.method.toUpperCase()} ${route.url}`)
    }
  })

  it('responds with statuses and bodies allowed by the contract', async () => {
    const { instance } = await build()
    const ajv = new Ajv2020({ allErrors: true, strict: false })

    for (const { method, path, operation } of operations()) {
      const response = await instance.inject({
        method: method.toUpperCase() as HTTPMethods,
        url: toFastifyUrl(path)
      })

      const declared = operation.responses[String(response.statusCode)]
      expect(
        declared,
        `${method.toUpperCase()} ${path} responded ${response.statusCode}, which the contract does not declare`
      ).toBeDefined()

      const schema = declared?.content?.['application/json']?.schema
      if (!schema) continue

      // Resolve `#/components/schemas/*` references against the contract.
      const validate = ajv.compile({ components: spec.components, ...schema })
      const body: unknown = response.body ? response.json() : undefined

      expect(
        validate(body),
        `${method.toUpperCase()} ${path} response violates the contract: ${ajv.errorsText(validate.errors ?? undefined)}`
      ).toBe(true)
    }
  })
})
