/** @type {import('@fuman/build').RootConfig} */
export default {
  versioning: {
    taggingSchema: 'date',
  },
  lint: {
    externalDependencies: {
      shouldSkip: (ctx) => {
        // skip @fuman/fetch because we test against 2 different zod versions
        if (ctx.package.json.name === '@fuman/fetch') return true
        return false
      },
    },
  },
  jsr: {
    exclude: ['**/*.{test,bench}.ts', '**/__fixtures__/**'],
    sourceDir: 'src',
    enableDenoDirectives: true,
  },
  typedoc: {
    validation: {
      notExported: true,
      invalidLink: true,
      notDocumented: false,
    },
  },
}
