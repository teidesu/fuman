/**
 * Class implementing a condition variable like behaviour.
 */
export class ConditionVariable {
  #notify?: () => void
  #promise?: Promise<void>

  wait(): Promise<void> {
    if (this.#promise) {
      return this.#promise
    }
    return this.#promise = new Promise<void>((resolve) => {
      this.#notify = resolve
    })
  }

  notify(): void {
    this.#notify?.()
    this.#notify = undefined
    this.#promise = undefined
  }
}
