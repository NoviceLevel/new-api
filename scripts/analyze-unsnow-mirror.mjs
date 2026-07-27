import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const projectRoot = join(import.meta.dirname, '..')
const staticRoot = join(projectRoot, 'web', 'public', 'static')
const outputPath = join(projectRoot, 'docs', 'reference-unsnow-inventory.json')

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? collectFiles(path) : [path]
    })
  )
  return files.flat()
}

function normalizedEndpoint(endpoint) {
  return endpoint.replace(/\$\{[^}]+\}/g, ':param')
}

function extractRequests(bundle) {
  const requests = []
  const quotedCall = /FH\.(get|post|put|patch|delete)\(\s*["'](\/api\/[^"']+)/g
  const templateCall = /FH\.(get|post|put|patch|delete)\(\s*`(\/api\/[^`]+)/g

  for (const match of bundle.matchAll(quotedCall)) {
    requests.push({ method: match[1].toUpperCase(), path: normalizedEndpoint(match[2]) })
  }
  for (const match of bundle.matchAll(templateCall)) {
    requests.push({ method: match[1].toUpperCase(), path: normalizedEndpoint(match[2]) })
  }
  return requests
}

const files = await collectFiles(staticRoot)
const javascriptFiles = files.filter((file) => file.endsWith('.js'))
const cssFiles = files.filter((file) => file.endsWith('.css'))
const mainBundle = javascriptFiles.find((file) => /static[\\/]js[\\/]index\.[^.]+\.js$/.test(file))
if (!mainBundle) throw new Error('Reference main bundle was not found')

const bundles = await Promise.all(
  javascriptFiles.map(async (file) => ({
    file,
    content: await readFile(file, 'utf8'),
  }))
)
const routePaths = [
  ...new Set(
    [...bundles.find(({ file }) => file === mainBundle).content.matchAll(/path:"([^"]+)"/g)]
      .map((match) => match[1])
      .filter((path) => path.startsWith('/'))
  ),
].sort()
const requests = bundles
  .flatMap(({ content }) => extractRequests(content))
  .sort((left, right) => `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`))
const uniqueRequests = requests.filter(
  (request, index) =>
    index === 0 ||
    request.method !== requests[index - 1].method ||
    request.path !== requests[index - 1].path
)

const inventory = {
  reference: 'https://api.unsnow.org/',
  assets: {
    javascript: javascriptFiles.length,
    stylesheet: cssFiles.length,
    total: files.length,
  },
  mainBundle: relative(projectRoot, mainBundle).replaceAll('\\', '/'),
  routes: routePaths,
  requests: uniqueRequests,
}

await mkdir(join(projectRoot, 'docs'), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`)
console.log(`Wrote ${routePaths.length} routes and ${uniqueRequests.length} API calls to ${outputPath}`)
