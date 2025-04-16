import type { CookieJar, GetCookiesOptions, SetCookieOptions } from 'tough-cookie'

import type { FfetchMiddleware } from '../_types.js'

import type { FfetchAddon } from './types.js'

export interface FfetchToughCookieAddon {
    /** cookie jar to use, or extended config */
    cookies?: CookieJar | {
        jar: CookieJar
        getCookiesOptions?: GetCookiesOptions
        setCookieOptions?: SetCookieOptions
    }
}

function cookieJarMiddleware({
    jar,
    getCookiesOptions,
    setCookieOptions = { ignoreError: true },
}: NonNullable<Exclude<FfetchToughCookieAddon['cookies'], CookieJar>>): FfetchMiddleware {
    return async (ctx, next) => {
        ctx.headers.append('Cookie', await jar.getCookieString(ctx.url, getCookiesOptions))

        const res = await next(ctx)

        for (const header of res.headers.getSetCookie()) {
            await jar.setCookie(header, res.url, setCookieOptions)
        }

        return res
    }
}

export function toughCookieAddon(): FfetchAddon<FfetchToughCookieAddon, object> {
    return {
        beforeRequest(ctx) {
            if (ctx.options.cookies != null || ctx.baseOptions.cookies != null) {
                // eslint-disable-next-line ts/no-non-null-assertion
                let cfg = (ctx.options.cookies ?? ctx.baseOptions.cookies)!
                if (!('jar' in cfg)) {
                    cfg = { jar: cfg }
                }
                ctx.options.middlewares ??= []
                ctx.options.middlewares.push(cookieJarMiddleware(cfg))
            }
        },
    }
}
