import { Deque } from '../structures/deque.js'

/**
 * Ownership token of an {@link AsyncLock}, returned by {@link AsyncLock.acquire}
 */
export class AsyncLockGuard implements Disposable {
  private _released = false

  constructor(private readonly _releaseLock: () => void) {}

  /**
   * Release the lock. Subsequent calls are no-op
   */
  release(): void {
    if (this._released) return

    this._released = true
    this._releaseLock()
  }

  [Symbol.dispose](): void {
    this.release()
  }
}

/**
 * Simple class implementing a semaphore like
 * behaviour.
 */
export class AsyncLock {
  private _locked = false
  private _waiters = new Deque<(guard: AsyncLockGuard) => void>()

  private _release = (): void => {
    const next = this._waiters.popFront()
    if (next) {
      next(new AsyncLockGuard(this._release))
    } else {
      this._locked = false
    }
  }

  async acquire(): Promise<AsyncLockGuard> {
    if (!this._locked) {
      this._locked = true
      return new AsyncLockGuard(this._release)
    }

    return new Promise((resolve) => {
      this._waiters.pushBack(resolve)
    })
  }

  async with<T>(func: () => Promise<T>): Promise<T> {
    const guard = await this.acquire()
    try {
      return await func()
    } finally {
      guard.release()
    }
  }
}
