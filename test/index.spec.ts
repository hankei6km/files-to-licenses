import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FilesToLicenses } from '../src'

const baseDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'assets'
)

describe('FilesToLicenses', () => {
  it('should generate licenses', async () => {
    const workBaseDir = path.join(baseDir, 'normal')
    async function* files() {
      const dummy = [
        'node_modules/pkg1/dist/index.js',
        'node_modules/pkg2/index.js',
        'node_modules/pkg3/dist/esm/lib/index.js',
        'node_modules/pkg4/dist/index.js',
        'node_modules/pkg4/node_modules/pkg1/dist/index.js',
        'src/index.js'
      ]
      for (const file of dummy) {
        yield path.join(workBaseDir, file)
      }
    }
    const filesToLicenses = new FilesToLicenses(workBaseDir, files())
    expect(filesToLicenses).toBeInstanceOf(FilesToLicenses)
    const res: string[] = []
    for await (const license of filesToLicenses.generate()) {
      res.push(license)
      // console.log(license)
    }
    expect(res).toEqual([
      `name: pkg1
version: 1.0.0
license: ISC
description: package1
repository: undefined
homepage: undefined
author: {
  "name": "hankei6km"
}
contributors: undefined
===
package1 lic
`,
      `name: pkg1
version: 1.0.1
license: MIT
description: package1
repository: undefined
homepage: undefined
author: {
  "name": "hankei6km"
}
contributors: undefined
===
package1 v1.0.1 lic
`,
      `name: pkg2
version: 1.0.0
license: ISC
description: 
repository: undefined
homepage: undefined
author: ""
contributors: undefined
===

`,
      `name: pkg3
version: 1.0.0
license: ISC
description: 
repository: undefined
homepage: undefined
author: ""
contributors: undefined
===
package3 lic
`,
      `name: pkg4
version: 1.0.0
license: ISC
description: 
repository: undefined
homepage: undefined
author: ""
contributors: undefined
===

`
    ])
  })

  it('should throw error(outside)', async () => {
    const workBaseDir = path.join(baseDir, 'abend-outside')
    async function* files() {
      const dummy = ['node_modules/pkg1/dist/index.js', 'src/index.js']
      for (const file of dummy) {
        yield path.join(workBaseDir, file)
      }
    }
    const filesToLicenses = new FilesToLicenses(workBaseDir, files())
    expect(filesToLicenses).toBeInstanceOf(FilesToLicenses)
    await expect(filesToLicenses.generate().next()).rejects.toThrow(
      /^package\.json is outside of the baseDir: filePath: .+\/abend-outside\/node_modules\/pkg1\/dist\/index\.js, package.json/u
    )
  })

  it('should throw error(invalid))', async () => {
    const workBaseDir = path.join(baseDir, 'abend-invalid')
    async function* files() {
      const dummy = ['node_modules/pkg1/dist/esm/index.js', 'src/index.js']
      for (const file of dummy) {
        yield path.join(workBaseDir, file)
      }
    }
    const filesToLicenses = new FilesToLicenses(workBaseDir, files())
    expect(filesToLicenses).toBeInstanceOf(FilesToLicenses)
    await expect(filesToLicenses.generate().next()).rejects.toThrow(
      // /^Valid package\.json not found: path: .+\/abend-invalid\/node_modules\/pkg1\/package\.json package\.json/u
      /^Valid package\.json not found: path: .+\/abend-invalid\/node_modules\/pkg1\/package\.json, package\.json/u
    )
  })

  it('should throw error(reached))', async () => {
    const workBaseDir = path.join(baseDir, 'abend-reached')
    async function* files() {
      const dummy = ['node_modules/pkg1/dist/index.js', 'src/index.js']
      for (const file of dummy) {
        yield path.join(workBaseDir, file)
      }
    }
    const filesToLicenses = new FilesToLicenses('/path/to', files())
    expect(filesToLicenses).toBeInstanceOf(FilesToLicenses)
    await expect(filesToLicenses.generate().next()).rejects.toThrow(
      /^Could not retrieve the top directory: baseDir: \/path\/to, filePath: .+\/abend-reached\/node_modules\/pkg1\/dist\/index\.js/u
    )
  })
})
