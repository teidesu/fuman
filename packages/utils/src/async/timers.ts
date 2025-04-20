/* eslint-disable ts/no-implied-eval */
import type { Brand } from '../types/brand.js'

// timers typings are mixed up across different runtimes, which leads
// to the globals being typed incorrectly.
// instead, we can treat the timers as opaque objects, and expose
// them through the `timers` esm namespace.
// this has near-zero runtime cost, but makes everything type-safe
//
// NB: we are using wrapper functions instead of...
//   - directly exposing the globals because the standard doesn't allow that
//   - .bind()-ing because it makes it harder to mock the timer globals

export type Timer = Brand<object, 'Timer'>
export type Interval = Brand<object, 'Interval'>

/* c8 ignore start */

const setTimeoutWrap = (
  (...args: Parameters<typeof setTimeout>) => setTimeout(...args)
) as unknown as <T extends (...args: any[]) => any>(
  fn: T,
  ms: number,
  ...args: Parameters<T>
) => Timer
const setIntervalWrap = (
  (...args: Parameters<typeof setInterval>) => setInterval(...args)
) as unknown as <T extends (...args: any[]) => any>(
  fn: T,
  ms: number,
  ...args: Parameters<T>
) => Interval

const clearTimeoutWrap = (
  (...args: Parameters<typeof clearTimeout>) => clearTimeout(...args)
) as unknown as (timer?: Timer) => void
const clearIntervalWrap = (
  (...args: Parameters<typeof clearInterval>) => clearInterval(...args)
) as unknown as (timer?: Interval) => void

export {
  clearIntervalWrap as clearInterval,
  clearTimeoutWrap as clearTimeout,
  setIntervalWrap as setInterval,
  setTimeoutWrap as setTimeout,
}
