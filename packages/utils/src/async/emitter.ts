export class Emitter<T> {
    #listeners: ((value: T) => void)[] = []
    #emit: (value: T) => void = () => {}

    #emitFew = (value: T) => {
        // avoid the overhead of looping for few listeners (up to 5)
        const len = this.#listeners.length
        this.#listeners[0](value)

        len > 1 && this.#listeners[1](value)
        len > 2 && this.#listeners[2](value)
        len > 3 && this.#listeners[3](value)
        len > 4 && this.#listeners[4](value)
    }

    #emitAll = (value: T) => {
        const len = this.#listeners.length
        for (let i = 0; i < len; i++) {
            this.#listeners[i](value)
        }
    }

    get length(): number {
        return this.#listeners.length
    }

    add(listener: (value: T) => void): void {
        this.#listeners.push(listener)

        if (this.#listeners.length === 1) {
            this.#emit = listener
        } else if (this.#listeners.length <= 5) {
            this.#emit = this.#emitFew
        } else {
            this.#emit = this.#emitAll
        }
    }

    forwardTo(emitter: Emitter<T>): void {
        this.add(emitter.emit.bind(emitter))
    }

    remove(listener: (value: T) => void): void {
        const idx = this.#listeners.indexOf(listener)
        if (idx === -1) return
        this.#listeners.splice(idx, 1)

        if (this.#listeners.length === 0) {
            this.#emit = () => {}
        } else if (this.#listeners.length === 1) {
            this.#emit = this.#listeners[0]
        } else if (this.#listeners.length <= 5) {
            this.#emit = this.#emitFew
        } else {
            this.#emit = this.#emitAll
        }
    }

    emit(value: T): void {
        this.#emit(value)
    }

    once(listener: (value: T) => void): void {
        const once = (value: T) => {
            this.remove(once)
            listener(value)
        }

        this.add(once)
    }

    listeners(): readonly ((value: T) => void)[] {
        return this.#listeners
    }

    clear(): void {
        this.#listeners.length = 0
        this.#emit = () => {}
    }
}
