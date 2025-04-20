/// <reference types="vitest" />

import { fumanBuild } from '@fuman/build/vite-internal'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const config = defineConfig(() => {
  return {
    test: {
      include: [
        'packages/**/*.test.ts',
      ],
      coverage: {
        include: [
          'packages/**/*.ts',
        ],
        exclude: [
          'packages/**/index.ts',
          'packages/**/*.test.ts',
          'packages/**/*.bench.ts',
          '**/dist',
        ],
      },
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          // re-exported namespaces can't be tree-shaken when bundled
          // see: https://github.com/rollup/rollup/issues/5161
          preserveModules: true,
        },
      },
    },
    plugins: [
      nodeExternals(),
      fumanBuild({
        root: __dirname,
        insertTypesEntry: true,
      }),
      dts({
        exclude: ['**/*.test.ts'],
      }),
    ],
  }
})

export default config
