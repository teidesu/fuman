/** @type {import('@fuman/build/vite').CustomBuildConfig} */
export default {
  preparePackageJson({ packageJson, jsr }) {
    if (jsr) {
      packageJson.peerDependencies ??= {}
      packageJson.peerDependencies['@xmldom/xmldom'] = packageJson.devDependencies['@xmldom/xmldom']
      delete packageJson.devDependencies['@xmldom/xmldom']
    }
  },
}
