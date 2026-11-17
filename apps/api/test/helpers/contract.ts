import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { expect } from 'vitest'
import { parse } from 'yaml'

type JsonSchema = Record<string, unknown>
export type MediaType = {
  schema?: JsonSchema
  example?: unknown
  examples?: Record<string, { value: unknown }>
}
type ContractRequest = { query?: Record<string, unknown>; body?: unknown }

export type ContractScenario = {
  name: string
  request?: ContractRequest
  requestValid?: boolean
  status: number
  body: unknown
}

export type ContractOperation = {
  operationId: string
  parameters?: Array<{
    name: string
    in: string
    required?: boolean
    schema: JsonSchema
  }>
  requestBody?: { required?: boolean; content: Record<string, MediaType> }
  responses: Record<string, { content?: Record<string, MediaType> }>
  'x-contract-scenarios'?: ContractScenario[]
}

export const contract = parse(
  readFileSync(
    resolve(import.meta.dirname, '../../../../packages/contract/tsp-output/openapi3/openapi.yaml'),
    'utf8'
  )
)

const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const
export type HttpMethod = (typeof httpMethods)[number]

export const contractOperations = Object.entries(
  contract.paths as Record<string, Partial<Record<HttpMethod, ContractOperation>>>
).flatMap(([path, item]) =>
  httpMethods.flatMap((method) => {
    const operation = item[method]
    return operation ? [{ method, path, operation }] : []
  })
)

const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)

export function validateContractSchema(schema: JsonSchema, value: unknown): boolean {
  const validate = ajv.compile({ components: contract.components, ...schema })
  return validate(value) === true
}

export function validateContractRequest(
  operation: ContractOperation,
  request: ContractRequest = {}
): boolean {
  const parameters = operation.parameters?.filter((parameter) => parameter.in === 'query') ?? []
  const body = operation.requestBody?.content['application/json']?.schema
  return validateContractSchema(
    {
      type: 'object',
      properties: {
        query: {
          type: 'object',
          properties: Object.fromEntries(parameters.map(({ name, schema }) => [name, schema])),
          required: parameters.filter(({ required }) => required).map(({ name }) => name),
          additionalProperties: false
        },
        ...(body ? { body } : {})
      },
      required: ['query', ...(operation.requestBody?.required ? ['body'] : [])],
      additionalProperties: false
    },
    { ...request, query: request.query ?? {} }
  )
}

export function assertContractResponse(
  operation: ContractOperation,
  status: number,
  body: unknown
): void {
  const response = operation.responses[String(status)]
  expect(response, `${operation.operationId}: undeclared HTTP ${status}`).toBeDefined()
  const schema = response?.content?.['application/json']?.schema
  expect(schema, `${operation.operationId}: HTTP ${status} must declare JSON`).toBeDefined()
  const validate = ajv.compile({ components: contract.components, ...schema })
  expect(
    validate(body),
    `${operation.operationId}: HTTP ${status} body violates contract: ${ajv.errorsText(validate.errors ?? undefined)}`
  ).toBe(true)
}
