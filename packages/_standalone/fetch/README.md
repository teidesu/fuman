# `@fuman/fetch`

![bundlejs](https://deno.bundlejs.com/badge?q=@fuman/fetch&treeshake=[{+ffetchBase+}])

no-bullshit minimal wrapper around `window.fetch` that aims to improve dx
by adding commonly used features, while having low runtime overhead,
small bundle size and staying close to the web standards.

## features
- no more `(await fetch(url)).json()` - just `await ffetch(url).json()`
- sugar for common request body types (json, form, multipart)
- base url, base headers, etc.
- retries, timeouts, validation built in
- basic middlewares
- **type-safe** compatibility with popular parsing libraries thanks to [standard-schema](https://github.com/standard-schema/standard-schema)
