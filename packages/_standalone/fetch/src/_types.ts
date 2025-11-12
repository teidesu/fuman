/* eslint-disable ts/no-empty-object-type */

import type { Middleware } from '@fuman/utils'

import type { FfetchAddon } from './addons/types.js'

export type FetchLike = (req: Request) => Promise<Response>

export type FfetchMiddleware = Middleware<Request, Response>
export type CombineAddons<ResponseMixins extends FfetchAddon<any, any>[], AccRequest = {}, AccResponse = {}>
  = ResponseMixins extends [FfetchAddon<infer RequestMixin, infer ResponseMixin>, ...infer Rest extends FfetchAddon<any, any>[]]
    ? CombineAddons<Rest, AccRequest & RequestMixin, AccResponse & ResponseMixin>
    : {
        readonly request: AccRequest
        readonly response: AccResponse
      }
