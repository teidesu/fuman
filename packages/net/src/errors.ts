export class ConnectionClosedError extends Error {
  constructor(message?: string) {
    super(`Connection closed${message != null ? `: ${message}` : ''}`)
  }
}

export class ListenerClosedError extends Error {
  constructor() {
    super('Listener closed')
  }
}
