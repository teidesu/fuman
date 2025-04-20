import { utf8 } from '@fuman/utils'

export const BPLIST_MAGIC: Uint8Array = /* @__PURE__ */ utf8.encoder.encode('bplist')
export const CORE_DATA_EPOCH = 978307200000 // 2001-01-01 00:00:00
export const MAX_OBJECT_COUNT: number = 1024 * 1024
export const NS_KEYED_ARCHIVER_VERSION = 100000
