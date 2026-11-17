import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { expect } from 'vitest'
import { parse } from 'yaml'

const contract = parse(
  readFileSync(
    resolve(import.meta.dirname, '../../../../packages/contract/tsp-output/openapi3/openapi.yaml'),
    'utf8'
  )
)
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)

/** Mock only HTTP, checking the status and body against generated OpenAPI first. */
export function meetingTypesResponse(
  name: 'empty' | 'populated' | 'unknown-query',
  body?: unknown
): Response {
  return meetingTypeResponse('get', name, body)
}

export function meetingTypeResponse(
  method: 'get' | 'post',
  name: string,
  bodyOverride?: unknown
): Response {
  const operation = contract.paths['/meeting-types'][method]
  const scenario = operation['x-contract-scenarios'].find(
    (scenario: { name: string }) => scenario.name === name
  )
  expect(scenario, `${method} /meeting-types: missing example ${name}`).toBeDefined()
  const { status } = scenario
  const body = bodyOverride ?? scenario.body
  const response = operation.responses[String(status)]
  expect(response, `GET /meeting-types: undeclared HTTP ${status}`).toBeDefined()
  const schema = response?.content?.['application/json']?.schema
  expect(schema).toBeDefined()
  const validate = ajv.compile({ components: contract.components, ...schema })
  expect(validate(body), ajv.errorsText(validate.errors ?? undefined)).toBe(true)
  return Response.json(body, { status })
}

export async function assertMeetingTypeRequest(request: Request): Promise<unknown> {
  expect(request.method).toBe('POST')
  expect(new URL(request.url).pathname).toBe('/meeting-types')
  expect(new URL(request.url).search).toBe('')
  expect(request.headers.get('content-type')).toMatch(/^application\/json\b/)
  const body = await request.json()
  const schema =
    contract.paths['/meeting-types'].post.requestBody.content['application/json'].schema
  const validate = ajv.compile({ components: contract.components, ...schema })
  expect(validate(body), ajv.errorsText(validate.errors ?? undefined)).toBe(true)
  return body
}

/** Availability response built from the TypeSpec scenario for `GET /availability`. */
export function availabilityResponse(name: string, body?: unknown): Response {
  const operation = contract.paths['/availability'].get
  const scenario = operation['x-contract-scenarios'].find(
    (candidate: { name: string }) => candidate.name === name
  )
  expect(scenario, `GET /availability: missing example ${name}`).toBeDefined()
  const { status } = scenario
  const payload = body ?? scenario.body
  const response = operation.responses[String(status)]
  const schema = response?.content?.['application/json']?.schema
  expect(schema, `GET /availability: undeclared HTTP ${status}`).toBeDefined()
  const validate = ajv.compile({ components: contract.components, ...schema })
  expect(validate(payload), ajv.errorsText(validate.errors ?? undefined)).toBe(true)
  return Response.json(payload, { status })
}
