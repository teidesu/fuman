import type { FfetchAddon } from './addons/index.js'
import { ffetchAddons } from './addons/index.js'
import { createFfetch, type Ffetch } from './ffetch.js'

export const ffetchDefaultAddons: [
    FfetchAddon<ffetchAddons.TimeoutAddon, object>,
    FfetchAddon<ffetchAddons.QueryAddon, object>,
    FfetchAddon<ffetchAddons.FormAddon, object>,
    FfetchAddon<ffetchAddons.MultipartAddon, object>,
    FfetchAddon<ffetchAddons.RetryAddon, object>,
] = [
    /* #__PURE__ */ ffetchAddons.timeout(),
    /* #__PURE__ */ ffetchAddons.query(),
    /* #__PURE__ */ ffetchAddons.form(),
    /* #__PURE__ */ ffetchAddons.multipart(),
    /* #__PURE__ */ ffetchAddons.retry(),
]

/**
 * the default ffetch instance with a reasonable default set of addons
 *
 * you can use this as a base to create your project-specific fetch instance,
 * or use this as is.
 *
 * this is not exported as `ffetch` because most of the time you will want to extend it,
 * and exporting it as `ffetch` would make them clash in import suggestions,
 * and will also make it prone to subtle bugs.
 *
 * @example
 * ```ts
 * import { ffetchBase } from '@fuman/fetch'
 *
 * const ffetch = ffetchBase.extend({
 *   baseUrl: 'https://example.com',
 *   headers: { ... },
 *   addons: [ ... ],
 * })
 * ```
 */
export const ffetchBase: Ffetch<
    ffetchAddons.TimeoutAddon &
    ffetchAddons.QueryAddon &
    ffetchAddons.FormAddon &
    ffetchAddons.MultipartAddon &
    ffetchAddons.RetryAddon,
    object
> = /* #__PURE__ */ createFfetch({
    addons: ffetchDefaultAddons,
})
