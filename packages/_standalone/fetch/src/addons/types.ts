import type { FfetchOptions, FfetchResult } from '../ffetch.js'

/**
 * context that is passed to each addon in the order they were added
 * you can safely modify anything in this object
 */
export interface FetchAddonCtx<RequestMixin extends object> {
  /** url of the request (with baseUrl already applied) */
  url: string
  /** options of this specific request */
  options: FfetchOptions & RequestMixin
  /** base options passed to `createFfetch` */
  baseOptions: FfetchOptions & RequestMixin
}

/** internals that are exposed to the functions in response mixin */
export type FfetchResultInternals<RequestMixin extends object> = FfetchResult & {
  /** final url of the request */
  _url: string
  /** request init object that will be passed to fetch */
  _init: RequestInit
  /** finalized and merged options */
  _options: FfetchOptions & RequestMixin
  /** finalized and merged headers */
  _headers?: Record<string, string>
}

export interface FfetchAddon<RequestMixin extends object, ResponseMixin extends object> {
  /** function that will be called before each request */
  beforeRequest?: (ctx: FetchAddonCtx<RequestMixin>) => void
  /** mixin functions that will be added to the response promise */
  response?: ResponseMixin
}
