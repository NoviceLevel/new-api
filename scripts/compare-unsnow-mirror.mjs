import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const projectRoot = join(import.meta.dirname, '..')
const sourceRoot = join(projectRoot, 'web', 'src')
const referencePath = join(
  projectRoot,
  'docs',
  'reference-unsnow-inventory.json'
)
const outputPath = join(
  projectRoot,
  'docs',
  'reference-unsnow-comparison.json'
)

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

function normalizePath(value) {
  return value
    .replace(/\$[A-Za-z_][\w]*/g, ':param')
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/\$\([^)]*\)/g, ':param')
}

function compareSets(left, right) {
  return [...left].filter((item) => !right.has(item)).sort()
}

function extractLocalRequests(content, file) {
  const requests = []
  const requestPattern =
    /\bapi\.(get|post|put|patch|delete)(?:<[\s\S]{0,300}?>)?\(\s*(["'`])(\/api\/[^"'`]+)\2/g

  for (const match of content.matchAll(requestPattern)) {
    requests.push({
      file,
      method: match[1].toUpperCase(),
      path: normalizePath(match[3]),
    })
  }

  return requests
}

const reference = JSON.parse(await readFile(referencePath, 'utf8'))
const routeTree = await readFile(join(sourceRoot, 'routeTree.gen.ts'), 'utf8')
const localRoutes = new Set(
  [...routeTree.matchAll(/fullPath: '([^']+)'/g)].map((match) =>
    normalizePath(match[1])
  )
)
const referenceRoutes = new Set(reference.routes.map(normalizePath))

const files = (await collectFiles(sourceRoot)).filter((file) =>
  /\.(?:ts|tsx)$/.test(file)
)
const localRequests = (
  await Promise.all(
    files.map(async (file) =>
      extractLocalRequests(
        await readFile(file, 'utf8'),
        relative(projectRoot, file).replaceAll('\\', '/')
      )
    )
  )
).flat()
const localRequestKeys = new Set(
  localRequests.map((request) => `${request.method} ${request.path}`)
)
const referenceRequestKeys = new Set(
  reference.requests.map((request) => `${request.method} ${request.path}`)
)

const report = {
  reference: reference.reference,
  generatedAt: new Date().toISOString(),
  routes: {
    local: [...localRoutes].sort(),
    reference: [...referenceRoutes].sort(),
    referenceOnly: compareSets(referenceRoutes, localRoutes),
    localOnly: compareSets(localRoutes, referenceRoutes),
  },
  requests: {
    local: [...localRequestKeys].sort(),
    localSources: localRequests.sort((left, right) =>
      `${left.method} ${left.path} ${left.file}`.localeCompare(
        `${right.method} ${right.path} ${right.file}`
      )
    ),
    reference: [...referenceRequestKeys].sort(),
    referenceOnly: compareSets(referenceRequestKeys, localRequestKeys),
    localOnly: compareSets(localRequestKeys, referenceRequestKeys),
  },
}

await mkdir(join(projectRoot, 'docs'), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(
  JSON.stringify(
    {
      referenceRoutes: report.routes.reference.length,
      localRoutes: report.routes.local.length,
      referenceRequests: report.requests.reference.length,
      localRequests: report.requests.local.length,
      referenceOnlyRoutes: report.routes.referenceOnly.length,
      localOnlyRoutes: report.routes.localOnly.length,
      referenceOnlyRequests: report.requests.referenceOnly.length,
      localOnlyRequests: report.requests.localOnly.length,
      outputPath,
    },
    null,
    2
  )
)
