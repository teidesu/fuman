import type { CookieJar } from 'tough-cookie'

import type { FfetchMiddleware } from '../_types.js'

import type { FfetchAddon } from './types.js'

export interface FfetchToughCookieAddon {
    /** cookie jar to use */
    cookies: CookieJar
}

function cookieJarMiddleware(jar: CookieJar): FfetchMiddleware {
    return async (ctx, next) => {
        ctx.headers.append('Cookie', await jar.getCookieString(ctx.url))

        const res = await next(ctx)

        for (const header of res.headers.getSetCookie()) {
            await jar.setCookie(header, res.url)
        }

        return res
    }
}

export function toughCookieAddon(): FfetchAddon<FfetchToughCookieAddon, object> {
    return {
        beforeRequest(ctx) {
            if (ctx.options.cookies != null || ctx.baseOptions.cookies != null) {
                const jar = ctx.options.cookies ?? ctx.baseOptions.cookies
                ctx.options.middlewares ??= []
                ctx.options.middlewares.push(cookieJarMiddleware(jar))
            }
        },
    }
}
