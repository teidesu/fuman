export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never
export type LastOfUnion<T> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R : never
export type UnionToTuple<
  Union,
  Acc extends any[] = [],
  Last = LastOfUnion<Union>,
> = [Union] extends [never] ? Acc : UnionToTuple<Exclude<Union, Last>, [Last, ...Acc]>
