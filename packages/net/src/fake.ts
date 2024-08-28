import type { IConnection } from './types.js'
import { Bytes } from '@fuman/io'

import { ConditionVariable } from '@fuman/utils'
import { ConnectionClosedError } from './errors.js'

export class FakeConnection<Address = string> implements IConnection<Address, Address> {
    constructor(readonly address: Address) {}
    private rx = Bytes.alloc()
    private tx = Bytes.alloc()
    private closed = false
    private cv = new ConditionVariable()

    get localAddress(): Address {
        return this.address
    }

    get remoteAddress(): Address {
        return this.address
    }

    close(): void {
        this.closed = true
        this.cv.notify()
    }

    async read(into: Uint8Array): Promise<number> {
        if (this.closed) throw new ConnectionClosedError()
        if (!this.rx.available) await this.cv.wait()
        if (this.closed) throw new ConnectionClosedError()
        return this.rx.read(into)
    }

    async write(bytes: Uint8Array): Promise<void> {
        await this.tx.write(bytes)
        this.cv.notify()
    }

    writeIntoRx(bytes: Uint8Array): void {
        this.rx.writeSync(bytes.length).set(bytes)
        this.cv.notify()
    }

    getTx(): Uint8Array {
        return this.tx.result()
    }
}
