import type { FfetchAddon } from './types.js'
import { setHeader } from './_utils.js'

export interface MultipartAddon {
  /**
   * shorthand for sending multipart form body,
   * useful for file uploads and similar.
   * mutually exclusive with other body options
   *
   * if multipart is passed in base options, passing one
   * in the request options will override it completely
   */
  multipart?: Record<string, unknown>
}

export interface MultipartAddonOptions {
  /**
   * serializer for the form data.
   * given the form data it should return the body
   *
   * @defaults basic `FormData`-based serializer
   */
  serialize?: (data: Record<string, unknown>) => FormData
}

function defaultSerialize(data: Record<string, unknown>) {
  const formData = new FormData()

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        formData.append(key, String(value[i]))
      }
    } else if (value instanceof File) {
      formData.append(key, value, value.name)
    } else {
      formData.append(key, String(value))
    }
  }

  return formData
}

export function multipart(options: MultipartAddonOptions = {}): FfetchAddon<MultipartAddon, object> {
  const { serialize = defaultSerialize } = options

  return {
    beforeRequest: (ctx) => {
      if (ctx.options.multipart != null || ctx.baseOptions.multipart != null) {
        if (ctx.options.body != null) {
          throw new Error('Cannot set both multipart and body')
        }

        // at least one of the two is set
        // eslint-disable-next-line ts/no-non-null-assertion
        const obj = (ctx.options.multipart ?? ctx.baseOptions.multipart)!
        ctx.options.body = serialize(obj)
        ctx.options.method ??= 'POST'
        // we want fetch implementation to handle content-type on its own
        setHeader(ctx.options, 'Content-Type', null)
      }
    },
  }
}
