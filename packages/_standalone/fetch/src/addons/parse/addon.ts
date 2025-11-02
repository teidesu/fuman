import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { FfetchResult } from '../../ffetch.js'
import type { FfetchAddon } from '../types.js'

/** Schema validation failed when calling `parsedJson` */
export class SchemaValidationError extends Error {
  constructor(readonly issues: ReadonlyArray<StandardSchemaV1.Issue>) {
    let message = 'Schema validation failed'
    for (const issue of issues) {
      message += `: ${issue.message}`
      if (issue.path) {
        const pathStr: string[] = []
        for (const path of issue.path) {
          if (typeof path === 'object') {
            pathStr.push(String(path.key))
          } else {
            pathStr.push(String(path))
          }
        }

        message += ` at .${pathStr.join('.')}`
      }
    }
    super(message)
  }
}

export interface ParserAddon {
  parsedJson: <T extends StandardSchemaV1>(schema: T) => Promise<StandardSchemaV1.InferOutput<T>>
  safelyParsedJson: <T extends StandardSchemaV1>(schema: T) => Promise<StandardSchemaV1.Result<StandardSchemaV1.InferOutput<T>>>
}

export function parser(): FfetchAddon<object, ParserAddon> {
  return {
    response: {
      async parsedJson(this: FfetchResult, schema: StandardSchemaV1) {
        const res = await schema['~standard'].validate(await this.json())
        if (res.issues) {
          throw new SchemaValidationError(res.issues)
        }
        return res.value
      },
      async safelyParsedJson(this: FfetchResult, schema: StandardSchemaV1) {
        return schema['~standard'].validate(await this.json())
      },
    },
  }
}
