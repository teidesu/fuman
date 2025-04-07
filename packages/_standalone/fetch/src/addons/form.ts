import type { FfetchAddon } from './types.js'
import { setHeader, urlencode } from './_utils.js'

export interface FormAddon {
    /**
     * shorthand for sending form body,
     * mutually exclusive with other body options
     *
     * if form is passed in base options, passing one
     * in the request options will override it completely
     */
    form?: Record<string, unknown>
}

export interface FormAddonOptions {
    /**
     * serializer for the form data.
     * given the form data it should return the serialized data
     *
     * @defaults `URLSearchParams`-based serializer
     * @example `serialize({ a: 123, b: 'hello' }) => 'a=123&b=hello'`
     */
    serialize?: (data: Record<string, unknown>) => BodyInit
}

function defaultSerialize(data: Record<string, unknown>) {
    return urlencode(data).toString()
}

export function form(options: FormAddonOptions = {}): FfetchAddon<FormAddon, object> {
    const { serialize = defaultSerialize } = options

    return {
        beforeRequest: (ctx) => {
            if (ctx.options.form != null || ctx.baseOptions.form != null) {
                if (ctx.options.body != null) {
                    throw new Error('Cannot set both form and body')
                }

                // at least one of the two is set
                // eslint-disable-next-line ts/no-non-null-assertion
                const obj = (ctx.options.form ?? ctx.baseOptions.form)!
                ctx.options.body = serialize(obj)
                ctx.options.method ??= 'POST'
                setHeader(ctx.options, 'Content-Type', 'application/x-www-form-urlencoded')
            }
        },
    }
}
