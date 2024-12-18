/** @type {import('@fuman/build/vite').CustomBuildConfig} */
export default {
    preparePackageJson({ packageJson, jsr }) {
        if (jsr) {
            packageJson.peerDependencies['tough-cookie'] = '^5.0.0'
            packageJson.peerDependencies['@badrap/valita'] = '^0.4.0'
        }
    },
}
