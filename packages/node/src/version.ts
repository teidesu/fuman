/* eslint-disable node/prefer-global/process */

/** Node version as a string (e.g. `'18.16.0'`) */
export const NODE_VERSION: string | null
  = typeof process !== 'undefined' && 'node' in process.versions ? process.versions.node : null
/** Node version as a tuple (e.g. `[18, 16, 0]`) */
export const NODE_VERSION_TUPLE: number[] | null
  = NODE_VERSION != null ? /* #__PURE__ */ NODE_VERSION.split('.').map(Number) : null

export function isNodeVersionAfter(major: number, minor: number, patch: number): boolean {
  if (!NODE_VERSION_TUPLE) return true // assume non-node environment is always "after"

  const [a, b, c] = NODE_VERSION_TUPLE
  if (a > major) return true
  if (a < major) return false
  if (b > minor) return true
  if (b < minor) return false

  return c >= patch
}
