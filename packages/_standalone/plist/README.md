## @fuman/plist

modern typescript utilities for working with property lists (the `.plist` files used in apple operating systems),
both reading and writing, both binary and xml-based. also supports NSKeyedArchiver/NSKeyedUnarchiver.

### binary plist

```ts
import { readBinaryPlist, writeBinaryPlist } from '@fuman/plist'

const data = writeBinaryPlist({ meow: 'purr' })
console.log(readBinaryPlist(data))
```

### xml plist

```ts
import { readXmlPlist, writeXmlPlist } from '@fuman/plist'

const data = writeXmlPlist({ meow: 'purr' })
console.log(readXmlPlist(data))
```

> note: `readXmlPlist` uses [`DOMParser`](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser), which
> might not be available in your environment (notably, under node.js as of writing). consider using `@xmldom/xmldom`:
>
> ```ts
> import { DOMParser } from '@xmldom/xmldom'
>
> console.log(readXmlPlist(data, { DOMParser }))
> ```

### NSKeyedArchiver

```ts
import { nsKeyedArchive, nsKeyedUnarchive, readBinaryPlist, writeBinaryPlist } from '@fuman/plist'

const file = nsKeyedUnarchive(readBinaryPlist(await readFile('meow.plist')))
console.log(file)
file.foo = 123
await writeFile('meow2.plist', writeBinaryPlist(nsKeyedArchive(file)))
```
