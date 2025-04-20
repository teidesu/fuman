/**
 * Class implementing a condition variable like behaviour.
 */
export class ConditionVariable {
  #notify?: () => void

  wait(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.#notify = resolve
    })
  }

  notify(): void {
    this.#notify?.()
    this.#notify = undefined
  }
}
