#!/usr/bin/env node
// Check the commit messages that a push or pull request adds. Existing history
// predates the Conventional Commits rule, so only the new range is checked.
import { execFileSync } from 'node:child_process'

const zero = /^0+$/
const event = process.env.GITHUB_EVENT_NAME
const sha = process.env.GITHUB_SHA || 'HEAD'
const base = process.env.GITHUB_BASE_SHA
const head = process.env.GITHUB_HEAD_SHA || sha
const before = process.env.GITHUB_BEFORE

function hasCommit(ref) {
  if (!ref || zero.test(ref)) return false
  try {
    execFileSync('git', ['cat-file', '-e', `${ref}^{commit}`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

let from
if (event === 'pull_request' && hasCommit(base)) {
  from = base
} else if (hasCommit(before)) {
  from = before
}

const args = ['exec', 'commitlint', '--verbose']
if (from) {
  args.push('--from', from, '--to', head)
} else if (hasCommit(`${head}~1`)) {
  args.push('--from', `${head}~1`, '--to', head)
} else {
  args.push('--last')
}

execFileSync('pnpm', args, { stdio: 'inherit' })
