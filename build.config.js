/** @type {import('@fuman/build').RootConfig} */
export default {
  versioning: {
    taggingSchema: 'date',
  },
  jsr: {
    exclude: ['**/*.{test,bench}.ts', '**/__fixtures__/**'],
    sourceDir: 'src',
  },
  typedoc: {
    validation: {
      notExported: true,
      invalidLink: true,
      notDocumented: false,
    },
  },
}
