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
export function meetingTypesResponse(name: 'empty' | 'unknown-query'): Response {
  const operation = contract.paths['/meeting-types'].get
  const scenario = operation['x-contract-scenarios'].find(
    (scenario: { name: string }) => scenario.name === name
  )
  expect(scenario, `GET /meeting-types: missing example ${name}`).toBeDefined()
  const { status, body } = scenario
  const response = operation.responses[String(status)]
  expect(response, `GET /meeting-types: undeclared HTTP ${status}`).toBeDefined()
  const schema = response?.content?.['application/json']?.schema
  expect(schema).toBeDefined()
  const validate = ajv.compile({ components: contract.components, ...schema })
  expect(validate(body), ajv.errorsText(validate.errors ?? undefined)).toBe(true)
  return Response.json(body, { status })
}
