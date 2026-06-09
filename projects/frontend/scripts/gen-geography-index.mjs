import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const URLS = {
  provinces:
    'https://raw.githubusercontent.com/nixing87/area/main/json/all_province_with_adcode_key.json',
  cities:
    'https://raw.githubusercontent.com/nixing87/area/main/json/all_city_with_adcode_key.json',
  districts:
    'https://raw.githubusercontent.com/nixing87/area/main/json/all_district_with_adcode_key.json',
}

const fetchJson = async (url) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText} (${url})`)
  }
  return await res.json()
}

const esc = (s) => String(s).replaceAll('`', '\\`').replaceAll('${', '\\${')

const toSortedLines = (obj, pick) =>
  Object.values(obj)
    .map(pick)
    .sort((a, b) => a[0] - b[0])
    .map((row) => row.map(esc).join('\t'))
    .join('\n')

const main = async () => {
  const [provinces, cities, districts] = await Promise.all([
    fetchJson(URLS.provinces),
    fetchJson(URLS.cities),
    fetchJson(URLS.districts),
  ])

  const provincesTsv = toSortedLines(provinces, (p) => [
    Number(p.province_adcode),
    p.province_name,
  ])
  const citiesTsv = toSortedLines(cities, (c) => [
    Number(c.city_adcode),
    c.city_name,
    Number(c.province_adcode),
  ])
  const districtsTsv = toSortedLines(districts, (d) => [
    Number(d.district_adcode),
    d.district_name,
    Number(d.city_adcode),
  ])

  const out = `export interface AreaNode {
  name: string
  adcode: number
  children?: Record<number, AreaNode>
}

export type AreaTree = Record<number, AreaNode>

// 数据来源：公开的省市区(adcode)数据表（用于生成硬编码常量）
// 说明：本文件不依赖任何其它本地数据文件；仅在构建时由脚本生成一次。
const PROVINCES_TSV = \`${provincesTsv}\`
const CITIES_TSV = \`${citiesTsv}\`
const DISTRICTS_TSV = \`${districtsTsv}\`

const ensureChild = (
  parent: AreaNode,
  adcode: number,
  name: string
): AreaNode => {
  if (!parent.children) parent.children = {}
  if (!parent.children[adcode]) {
    parent.children[adcode] = { adcode, name }
  }
  return parent.children[adcode]
}

export const AREA_TREE: AreaTree = (() => {
  const tree: AreaTree = {}

  for (const line of PROVINCES_TSV.split('\\n')) {
    if (!line) continue
    const [codeStr, name] = line.split('\\t')
    const adcode = Number(codeStr)
    tree[adcode] = { adcode, name }
  }

  for (const line of CITIES_TSV.split('\\n')) {
    if (!line) continue
    const [codeStr, name, provinceStr] = line.split('\\t')
    const adcode = Number(codeStr)
    const provinceAdcode = Number(provinceStr)
    const province = tree[provinceAdcode] || (tree[provinceAdcode] = { adcode: provinceAdcode, name: String(provinceAdcode) })
    ensureChild(province, adcode, name)
  }

  for (const line of DISTRICTS_TSV.split('\\n')) {
    if (!line) continue
    const [codeStr, name, cityStr] = line.split('\\t')
    const adcode = Number(codeStr)
    const cityAdcode = Number(cityStr)
    const provinceAdcode = Math.floor(cityAdcode / 10000) * 10000
    const province = tree[provinceAdcode] || (tree[provinceAdcode] = { adcode: provinceAdcode, name: String(provinceAdcode) })
    const city = province.children?.[cityAdcode] || ensureChild(province, cityAdcode, String(cityAdcode))
    ensureChild(city, adcode, name)
  }

  return tree
})()

export default AREA_TREE
`

  const target = path.join(__dirname, '..', 'src', 'geography', 'index.ts')
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, out, 'utf8')
  process.stdout.write(`Generated: ${target}\\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

