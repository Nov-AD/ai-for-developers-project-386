import assert from 'node:assert/strict'

// Writes synthetic data through the public API; use only on this training app.
const base = process.argv[2]
assert(base, 'Usage: pnpm test:deployment <http(s)://host:port>')
assert.match(base, /^https?:\/\//)

async function json(path, status = 200, body) {
  const response = await fetch(new URL(path, base), {
    ...(body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })
  })
  assert.equal(response.status, status, `${path}: unexpected HTTP status`)
  assert.match(response.headers.get('content-type') ?? '', /application\/json/)
  return response.json()
}

assert.deepEqual(await json('/health'), { status: 'ok' })
for (const path of ['/', '/book', '/owner']) {
  const response = await fetch(new URL(path, base))
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('content-type') ?? '', /text\/html/)
  const html = await response.text()
  const assetPath = /<script[^>]+src="([^"]+)"/.exec(html)?.[1]
  assert(assetPath, `${path}: missing SPA script`)
  const asset = await fetch(new URL(assetPath, base))
  assert.equal(asset.status, 200)
  assert.match(asset.headers.get('content-type') ?? '', /javascript/)
  assert(!(await asset.text()).includes('http://localhost:3000'), 'SDK must use the same origin')
}

const meeting = await json('/meeting-types', 201, {
  name: `Deployment smoke ${Date.now()}`,
  description: 'Synthetic deployment check; safe to discard on restart.',
  durationMinutes: 30
})
assert((await json('/meeting-types')).some(({ id }) => id === meeting.id))
const availabilityPath = `/availability?meetingTypeId=${meeting.id}`
const { slots } = await json(availabilityPath)
assert(slots.length > 0, 'Expected an available slot')
const request = { meetingTypeId: meeting.id, start: slots[0].start, guestName: 'Demo Guest' }
const booking = await json('/bookings', 201, request)
assert.equal(booking.meetingType.id, meeting.id)
assert.equal(booking.guestName, request.guestName)
assert.equal(booking.start, request.start)

const conflict = await json('/bookings', 409, request)
assert.equal(conflict.code, 'SLOT_CONFLICT')
const updated = await json(availabilityPath)
assert(!updated.slots.some(({ start }) => start === request.start), 'Booked slot must disappear')
assert((await json('/bookings')).some(({ id }) => id === booking.id))
console.log(`PASS ${base}: SPA routes/assets, health, owner → guest → owner, repeat booking → 409`)
