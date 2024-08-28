import type { FfetchAddon } from './addons/index.js'
import { ffetchAddons } from './addons/index.js'
import { createFfetch, type Ffetch } from './ffetch.js'

export const ffetchDefaultAddons: [
    FfetchAddon<ffetchAddons.TimeoutAddon, object>,
    FfetchAddon<ffetchAddons.QueryAddon, object>,
    FfetchAddon<ffetchAddons.FormAddon, object>,
    FfetchAddon<ffetchAddons.MultipartAddon, object>,
] = [
    /* #__PURE__ */ ffetchAddons.timeout(),
    /* #__PURE__ */ ffetchAddons.query(),
    /* #__PURE__ */ ffetchAddons.form(),
    /* #__PURE__ */ ffetchAddons.multipart(),
]

/**
 * the default ffetch instance with reasonable default set of addons
 */
export const ffetch: Ffetch<
    ffetchAddons.TimeoutAddon &
    ffetchAddons.QueryAddon &
    ffetchAddons.FormAddon &
    ffetchAddons.MultipartAddon,
    object
> = /* #__PURE__ */ createFfetch({
    addons: ffetchDefaultAddons,
})
