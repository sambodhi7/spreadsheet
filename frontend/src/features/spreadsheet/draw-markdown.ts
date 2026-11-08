import type { DataEditorProps } from '@glideapps/glide-data-grid'

type DrawArgs = Parameters<NonNullable<DataEditorProps['drawCell']>>[0]

/** Inline Markdown subset. Never evaluates HTML, links, scripts or remote images. */
export function drawMarkdown({ ctx, rect, theme }: DrawArgs, raw: string): void {
  const tokens = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2)
  ctx.clip()
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.textDark
  let x = rect.x + theme.cellHorizontalPadding
  for (const token of tokens) {
    const bold = token.startsWith('**') && token.endsWith('**')
    const italic = !bold && token.startsWith('*') && token.endsWith('*')
    const code = token.startsWith('`') && token.endsWith('`')
    const text = bold ? token.slice(2, -2) : italic || code ? token.slice(1, -1) : token
    ctx.font = `${italic ? 'italic ' : ''}${bold ? '600 ' : ''}${theme.baseFontStyle} ${code ? 'monospace' : theme.fontFamily}`
    ctx.fillText(text.replace(/\r?\n/g, ' '), x, rect.y + rect.height / 2)
    x += ctx.measureText(text).width
    if (x >= rect.x + rect.width) break
  }
  ctx.restore()
}
