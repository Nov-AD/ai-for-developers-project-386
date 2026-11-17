import { describe, expect, it } from 'vitest'
import {
  assertContractResponse,
  contract,
  contractOperations,
  type MediaType,
  validateContractRequest,
  validateContractSchema
} from './helpers/contract.ts'

describe('calendar contract design', () => {
  it('defines the complete public boundary before functional implementation', () => {
    const operations = contractOperations.map(
      ({ method, path, operation }) => `${method.toUpperCase()} ${path} ${operation.operationId}`
    )

    expect(operations.sort()).toEqual(
      [
        'GET /health getHealth',
        'GET /meeting-types listMeetingTypes',
        'POST /meeting-types createMeetingType',
        'GET /availability getAvailability',
        'POST /bookings createBooking',
        'GET /bookings listUpcomingBookings'
      ].sort()
    )
  })

  it('validates name length after trimming, rather than limiting the raw input length', () => {
    const operation = contractOperations.find(
      ({ operation }) => operation.operationId === 'createMeetingType'
    )!.operation
    expect(
      validateContractRequest(operation, {
        body: { name: `  ${'A'.repeat(100)}  `, durationMinutes: 45 }
      })
    ).toBe(true)
    expect(
      validateContractRequest(operation, {
        body: { name: `  ${'A'.repeat(101)}  `, durationMinutes: 45 }
      })
    ).toBe(false)
  })

  it.each(contractOperations)(
    '$operation.operationId examples cover every declared status and validate against generated schemas',
    ({ operation }) => {
      const examples = operation['x-contract-scenarios'] ?? []
      expect(examples.length).toBeGreaterThan(0)
      expect([...new Set(examples.map(({ status }) => String(status)))].sort()).toEqual(
        Object.keys(operation.responses).sort()
      )
      expect(new Set(examples.map(({ name }) => name)).size).toBe(examples.length)

      for (const example of examples) {
        expect(
          validateContractRequest(operation, example.request),
          `${operation.operationId}/${example.name}: unexpected request validity`
        ).toBe(example.requestValid !== false)
        assertContractResponse(operation, example.status, example.body)
      }
    }
  )

  it('preserves the health response schema', () => {
    expect(contract.components.schemas.HealthResponse).toEqual({
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ok'], description: 'Service status.' } },
      description: 'Health check response.'
    })
  })

  it.each([
    ['Uuid', 'not-a-uuid'],
    ['UtcInstant', '2026-11-18T09:00:00+03:00'],
    ['UtcInstant', '2026-02-30T06:00:00Z'],
    ['UtcInstant', '2026-11-18T06:00Z'],
    ['UtcInstant', '2026-11-18T06:00:00Z\n'],
    ['OwnerDate', '2026-02-30'],
    ['TrimmedName', ' Alex '],
    ['TrimmedName', 'Alex\n'],
    ['NameInput', '   '],
    ['DurationMinutes', 0],
    ['DurationMinutes', 541],
    ['DurationMinutes', 1.5]
  ])('rejects invalid %s value %s in the generated schema', (name, value) => {
    expect(validateContractSchema({ $ref: `#/components/schemas/${name}` }, value)).toBe(false)
  })

  it.each([
    ['Uuid', '11111111-1111-4111-8111-111111111111'],
    ['UtcInstant', '2026-11-18T06:00:00.123Z'],
    ['OwnerDate', '2026-12-02'],
    ['NameInput', '\t Alex \n'],
    ['TrimmedName', 'Alex'],
    ['DurationMinutes', 1],
    ['DurationMinutes', 540],
    ['MeetingDescription', '']
  ])('accepts valid %s value %s in the generated schema', (name, value) => {
    expect(validateContractSchema({ $ref: `#/components/schemas/${name}` }, value)).toBe(true)
  })

  it('rejects fixture status/body mismatches rather than accepting arbitrary error JSON', () => {
    const operation = contractOperations.find(
      ({ operation }) => operation.operationId === 'createBooking'
    )!.operation
    expect(() =>
      assertContractResponse(operation, 409, { code: 'INVALID_SLOT', message: 'Wrong code.' })
    ).toThrow()
    expect(() =>
      assertContractResponse(operation, 418, { code: 'SLOT_CONFLICT', message: 'Wrong status.' })
    ).toThrow()
    expect(() => assertContractResponse(operation, 201, { id: 'not-a-uuid' })).toThrow()
  })

  it('rejects guest-supplied server fields and missing required inputs', () => {
    const operation = contractOperations.find(
      ({ operation }) => operation.operationId === 'createBooking'
    )!.operation
    const validBody = {
      meetingTypeId: '11111111-1111-4111-8111-111111111111',
      start: '2026-11-18T06:00:00Z',
      guestName: 'Alex'
    }
    expect(validateContractRequest(operation, { body: validBody })).toBe(true)
    for (const extra of [
      { id: '22222222-2222-4222-8222-222222222222' },
      { end: '2026-11-18T06:45:00Z' },
      { durationMinutes: 45 },
      { email: 'example@example.test' }
    ]) {
      expect(validateContractRequest(operation, { body: { ...validBody, ...extra } })).toBe(false)
    }
    expect(validateContractRequest(operation)).toBe(false)
    expect(validateContractRequest(operation, { body: { start: validBody.start } })).toBe(false)
  })

  it('validates native OpenAPI schema and media-type examples too', () => {
    for (const [name, schema] of Object.entries(
      contract.components.schemas as Record<string, { examples?: unknown[] }>
    )) {
      for (const example of schema.examples ?? []) {
        expect(
          validateContractSchema({ $ref: `#/components/schemas/${name}` }, example),
          `${name} native schema example`
        ).toBe(true)
      }
    }

    const validateMediaExamples = (media: MediaType) => {
      const examples = Object.values(media.examples ?? {}).map(({ value }) => value)
      if (media.example !== undefined) examples.push(media.example)
      for (const example of examples) {
        expect(media.schema).toBeDefined()
        expect(validateContractSchema(media.schema!, example)).toBe(true)
      }
    }

    for (const { operation } of contractOperations) {
      for (const media of Object.values(operation.requestBody?.content ?? {})) {
        validateMediaExamples(media)
      }
      for (const response of Object.values(operation.responses)) {
        for (const media of Object.values(response.content ?? {})) validateMediaExamples(media)
      }
    }
  })
})
