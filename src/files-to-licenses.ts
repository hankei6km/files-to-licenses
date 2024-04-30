import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { readPackageUp } from 'read-package-up'

export class FilesToLicenses {
  /**
   * @type {Map<string, import('read-package-up').NormalizedReadResult>}
   */
  private packages: Map<
    string,
    import('read-package-up').NormalizedReadResult
  > = new Map()
  /**
   * @type {string}
   */
  private baseDir: string = ''
  /**
   * @type {AsyncGenerator<string>}
   */
  private files: AsyncGenerator<string>
  constructor(baseDir: string, files: AsyncGenerator<string>) {
    this.baseDir = baseDir
    this.files = files
  }

  /**
   * Returns the top directory of a given file path.
   * @param {string} filePath - The file path.
   * @returns {string} The top directory of the file path.
   */
  private getTopDir(filePath: string): string {
    let p = filePath
    let d = path.dirname(filePath)
    while (d !== this.baseDir) {
      p = d
      d = path.dirname(d)
      if (p == d) {
        throw new Error(
          `Could not retrieve the top directory: baseDir: ${this.baseDir}, filePath: ${filePath}`
        )
      }
    }
    return path.basename(p)
  }

  /**
   * Reads the LICENSE file in the directory of the filePath.
   * Tries file names like 'LICENSE' to find the file.
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  private async readLICENSE(filePath: string): Promise<string> {
    const dir = path.dirname(filePath)
    const files = [
      'LICENSE',
      'LICENSE.txt',
      'LICENSE.md',
      'LICENSE.rst',
      'license',
      'license.txt',
      'license.md',
      'license.rst'
    ]
    for (const f of files) {
      try {
        return await fs.readFile(path.join(dir, f), 'utf-8')
      } catch (e) {}
    }
    return ''
  }

  private packageJsonInBaseDir(packageJsonPath: string): boolean {
    const relative = path.relative(this.baseDir, path.dirname(packageJsonPath))
    return !relative.startsWith('..') && !path.isAbsolute(relative)
  }

  /**
   * Generates the license information of the packages.
   * @returns {AsyncGenerator<string>}
   */
  async *generate(): AsyncGenerator<string> {
    for await (const i of this.files) {
      if (this.getTopDir(i) !== 'node_modules') {
        continue
      }
      let p = await readPackageUp({
        cwd: path.dirname(i)
      })
      // dual package 対策.
      // "type": "module" のみ指定するような package.json がある.
      if (p?.packageJson.name === '') {
        if (p) {
          const up = path.dirname(p.path)
          if (this.getTopDir(up) === 'node_modules') {
            p = await readPackageUp({
              cwd: path.dirname(up)
            })
          }
        }
      }
      if (p === undefined || p.packageJson.name === '') {
        throw new Error(
          `Valid package.json not found: path: ${
            p?.path
          }, package.json: ${JSON.stringify(p?.packageJson, null, 2)}`
        )
      }
      if (!this.packageJsonInBaseDir(p.path)) {
        throw new Error(
          `package.json is outside of the baseDir: filePath: ${i}, package.json: ${p?.path}`
        )
      }
      const pkgKey = `${p.packageJson.name}@${p.packageJson.version}  `
      if (!this.packages.has(pkgKey)) {
        this.packages.set(pkgKey, p)
      }
    }

    const sortedPackages = Array.from(this.packages.entries()).sort(
      ([keyA], [keyB]) => keyA.localeCompare(keyB)
    )

    for (const [path, packageJson] of sortedPackages) {
      yield `name: ${packageJson.packageJson.name}
version: ${packageJson.packageJson.version}
license: ${packageJson.packageJson.license}
description: ${packageJson.packageJson.description}
repository: ${JSON.stringify(packageJson.packageJson.repository, null, 2)}
homepage: ${packageJson.packageJson.homepage}
author: ${JSON.stringify(packageJson.packageJson.author, null, 2)}
contributors: ${JSON.stringify(packageJson.packageJson.contributors, null, 2)}
===
${await this.readLICENSE(packageJson.path)}
`
    }
  }
}
