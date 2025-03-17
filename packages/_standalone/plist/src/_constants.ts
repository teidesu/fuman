import { utf8 } from '@fuman/utils'

export const BPLIST_MAGIC = /* @__PURE__ */ utf8.encoder.encode('bplist')
export const CORE_DATA_EPOCH = /* @__PURE__ */ new Date(2001, 1, 1).getTime()
export const MAX_OBJECT_COUNT = 1024 * 1024
export const NS_KEYED_ARCHIVER_VERSION = 100000
