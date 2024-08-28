import { ffetch } from '@fuman/fetch'

export const NPM_PACKAGE_NAME_REGEX = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

/** check if a specific version is available in the jsr registry */
export async function npmCheckVersion(params: {
    registry?: string
    package: string
    version: string
}): Promise<boolean> {
    const {
        registry = 'https://registry.npmjs.org',
        package: packageName,
        version,
    } = params

    const res = await ffetch(`/${packageName}/${version}`, {
        baseUrl: registry,
        validateResponse: false,
    })
    return res.status === 200
}
