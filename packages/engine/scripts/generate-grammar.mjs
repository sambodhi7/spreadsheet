import { readFile, writeFile } from 'node:fs/promises'

const grammarUrl = new URL('../src/grammar/spreadsheet.ohm', import.meta.url)
const generatedUrl = new URL('../src/grammar/generated-spreadsheet-grammar.ts', import.meta.url)
const grammarSource = await readFile(grammarUrl, 'utf8')

const generatedSource = [
  '// Generated from spreadsheet.ohm by scripts/generate-grammar.mjs. Do not edit directly.',
  `export const spreadsheetGrammar = ${JSON.stringify(grammarSource)}`,
  '',
].join('\n')

await writeFile(generatedUrl, generatedSource, 'utf8')
