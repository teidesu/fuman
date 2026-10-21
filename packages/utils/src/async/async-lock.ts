import { Deque } from '../structures/deque.js'

/**
 * Simple class implementing a semaphore like
 * behaviour.
 */
export class AsyncLock {
  private _locked = false
  private _waiters = new Deque<() => void>()

  async acquire(): Promise<void> {
    if (!this._locked) {
      this._locked = true
      return
    }

    return new Promise<void>((resolve) => {
      this._waiters.pushBack(resolve)
    })
  }

  release(): void {
    if (!this._locked) throw new Error('Nothing to release')

    const next = this._waiters.popFront()
    if (next) {
      next()
    } else {
      this._locked = false
    }
  }

  with(func: () => Promise<void>): Promise<void> {
    return (async () => {
      let err: unknown = null

      await this.acquire()
      try {
        await func()
      } catch (e) {
        err = e
      } finally {
        this.release()
      }

      if (err != null) throw err
    })()
  }
}
