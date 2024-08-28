export type TypesEqual<T, V> = (() => T) extends () => V ? ((() => V) extends () => T ? true : false) : false
