/* eslint-disable no-cond-assign */

import { Deque } from '../structures/deque.js'

type LockInfo = [Promise<void>, () => void]

/**
 * Simple class implementing a semaphore like
 * behaviour.
 */
export class AsyncLock {
    private _queue = new Deque<LockInfo>()

    async acquire(): Promise<void> {
        let info

        while ((info = this._queue.peekFront())) {
            await info[0]
        }

        let unlock: () => void
        const prom = new Promise<void>((resolve) => {
            unlock = resolve
        })

        // eslint-disable-next-line ts/no-non-null-assertion
        this._queue.pushBack([prom, unlock!])
    }

    release(): void {
        if (!this._queue.length) throw new Error('Nothing to release')

        // eslint-disable-next-line ts/no-non-null-assertion
        this._queue.popFront()![1]()
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
