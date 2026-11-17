#!/usr/bin/env node
// Fail when a change to the TypeSpec contract removes or changes API surface
// in a way that breaks existing clients. The generated OpenAPI file is the
// comparison point, so the check runs against the base branch.
import { execFileSync, spawnSync } from 'node:child_process'

const spec = 'packages/contract/tsp-output/openapi3/openapi.yaml'
const candidates = [process.env.BASE_REF, 'origin/main', 'main'].filter(Boolean)
const isCI = process.env.CI === 'true'

function hasSpec(ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { stdio: 'ignore' })
    execFileSync('git', ['cat-file', '-e', `${ref}:${spec}`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const baseRef = candidates.find(hasSpec)

if (!baseRef) {
  const message = `Cannot find ${spec} in ${candidates.join(', ')}. Fetch the base branch first.`
  if (isCI) {
    console.error(message)
    process.exit(1)
  }
  console.warn(`Skipping breaking-contract check: ${message}`)
  process.exit(0)
}

console.log(`Comparing ${baseRef}:${spec} -> ${spec}`)
const result = spawnSync(
  'oasdiff',
  ['breaking', `${baseRef}:${spec}`, spec, '--fail-on', 'ERR', '--format', 'text'],
  { stdio: 'inherit' }
)

if (result.error) {
  console.error(`Failed to run oasdiff: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
