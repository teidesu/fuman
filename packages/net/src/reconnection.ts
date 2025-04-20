import type { IClosable } from '@fuman/io'

import type { MaybePromise, UnsafeMutable } from '@fuman/utils'

import { Deferred, timers } from '@fuman/utils'
import { ConnectionClosedError } from './errors.js'

interface ReconnectionState {
  readonly previousWait: number | null
  readonly consequentFails: number
  readonly lastError: Error | null
}

/**
 * Declares a strategy to handle reconnection.
 * When a number is returned, that number of MS will be waited before trying to reconnect.
 * When `false` is returned, connection is not reconnected
 */
export type ReconnectionStrategy = (state: ReconnectionState) => number | false

/**
 * Declares an action to take when an error occurs.
 *
 * - `reconnect` - reconnect using the current strategy
 * - `reconnect-now` - reconnect immediately, ignoring the current strategy
 * - `close` - close the connection
 */
export type OnErrorAction = 'reconnect' | 'reconnect-now' | 'close'

/**
 * default reconnection strategy: first - immediate reconnection,
 * then 1s with linear increase up to 5s (with 1s step)
 */
export const defaultReconnectionStrategy: ReconnectionStrategy = ({ previousWait }) => {
  if (previousWait === null) return 0
  if (previousWait === 0) return 1000
  if (previousWait >= 5000) return 5000

  return Math.min(5000, previousWait + 1000)
}

function defaultOnError(err: Error): OnErrorAction {
  return err instanceof ConnectionClosedError ? 'reconnect' : 'close'
}

export class PersistentConnection<ConnectAddress, Connection extends IClosable> {
  #state: UnsafeMutable<ReconnectionState> = {
    previousWait: null,
    lastError: null,
    consequentFails: 0,
  }

  #connect: (address: ConnectAddress) => Promise<Connection>

  #lastAddress?: ConnectAddress
  #connection?: Connection
  #connecting = false
  #strategy: ReconnectionStrategy
  #onError
  // boolean represents whether the timer is clean
  // true - resolved because timer is up
  // false - resolved because .close()/.reconnect() was called
  #sleep?: Deferred<boolean>
  #closed?: Deferred<void>

  constructor(readonly params: {
    connect: (address: ConnectAddress) => Promise<Connection>
    strategy?: ReconnectionStrategy

    /**
     * Function to call once the connection is open
     *
     * As soon as the promise is resolved the connection will be closed (and will *not*
     * be re-opened automatically), so this is the best place to put your recv loop
     */
    onOpen: (connection: Connection) => Promise<void>

    onClose?: () => MaybePromise<void>
    onWait?: (wait: number) => void

    /**
     * Function that will be called whenever an error happens while connecting
     * (in which case `connection` will be null) or inside `onOpen`.
     *
     * @default  `(err) => err instanceof ConnectionClosedError ? 'reconnect' : 'close'`
     */
    onError?: (error: Error, connection: Connection | null, state: ReconnectionState) => MaybePromise<OnErrorAction>
  }) {
    this.#strategy = params.strategy ?? defaultReconnectionStrategy
    this.#connect = params.connect
    this.#onError = params.onError ?? defaultOnError
  }

  get isConnected(): boolean {
    return this.#connection !== undefined
  }

  get isConnecting(): boolean {
    return this.#connection === undefined && this.#connecting
  }

  get isWaiting(): boolean {
    return this.#connection === undefined && this.#lastAddress !== undefined && !this.#connecting
  }

  get connection(): Connection | null {
    return this.#connection ?? null
  }

  get state(): ReconnectionState {
    return this.#state
  }

  #resetState() {
    this.#state.previousWait = null
    this.#state.lastError = null
    this.#state.consequentFails = 0
    this.#connecting = false
  }

  async #loop() {
    // NB: this function should *never* throw

    while (true) {
      try {
        this.#connecting = true
        // eslint-disable-next-line ts/no-non-null-assertion
        this.#connection = await this.#connect(this.#lastAddress!)
        if (this.#closed) {
          // .close() was called while we were connecting. do not proceed and exit the loop
          this.#closed.resolve()
          break
        }

        this.#resetState()

        await this.params.onOpen?.(this.#connection)

        this.#connection.close()
        this.#connection = undefined
        break
      } catch (err) {
        const oldConnection = this.#connection

        this.#connection = undefined
        await this.params.onClose?.()

        if (this.#closed) {
          // .close() was called, don't do anything
          this.#closed.resolve()
          break
        }

        const action = await this.#onError(err as Error, oldConnection ?? null, this.#state)

        if (action === 'close') {
          break
        }

        const wait = action === 'reconnect-now' ? 0 : this.#strategy(this.#state)
        if (wait === false) {
          break
        }

        this.params.onWait?.(wait)

        if (wait !== 0) {
          this.#sleep = new Deferred()
          const timer = timers.setTimeout(this.#sleep.resolve, wait, true)

          const sleepResult = await this.#sleep.promise
          this.#sleep = undefined

          if (!sleepResult) {
            timers.clearTimeout(timer)

            if (this.#closed != null) {
              // .close() was called while we were sleeping. do not proceed and exit the loop
              // ts doesn't realize that our check above isn't enough and complains
              (this.#closed as Deferred<void>).resolve()
              break
            } else {
              continue
            }
          }
        }

        this.#state.previousWait = wait
        this.#state.consequentFails = 1

        continue
      }
    }

    this.#lastAddress = undefined
    this.#resetState()
  }

  connect(address: ConnectAddress): void {
    if (this.#lastAddress !== undefined && this.#lastAddress !== address) {
      throw new Error('Connection is already open to another address')
    }

    this.#closed = undefined
    this.#lastAddress = address
    void this.#loop()
  }

  /**
   * @param force  Whether to close the existing connection if there is one
   */
  reconnect(force: boolean): void {
    if (this.#sleep) {
      // there's a pending reconnection timer, force it to reconnect right now
      this.#sleep.resolve(false)
    } else if (this.#connection && force) {
      // there's a connection pending, we need to close it
      this.#connection.close()
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return this.#closed.promise
    if (this.#lastAddress == null) return // already closed

    this.#closed = new Deferred()

    if (this.#sleep) {
      // there's a pending reconnection timer, skip it and break out
      this.#sleep.resolve(false)
    } else if (this.#connection) {
      // there's a connection pending, we need to close it
      this.#connection.close()
    } else if (this.#connecting) {
      // we are connecting. todo: we should cancel that probably
    }

    return this.#closed.promise
  }

  async changeTransport(connect: (address: ConnectAddress) => Promise<Connection>): Promise<void> {
    this.#connect = connect
    const addr = this.#lastAddress

    await this.close()

    if (addr != null) {
      this.connect(addr)
    }
  }
}
