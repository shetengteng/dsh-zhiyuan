import { SECTION_LABEL } from '../identity.ts'
import { BOOK_COVER_D, BOOK_RIBBON_D, BOOK_SPINE_D } from './settings/SectionIcon.tsx'

const NS = 'http://www.w3.org/2000/svg'
const MARK = 'data-zhiyuan-book'

function createBookSvg(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute(MARK, '1')

  const cover = document.createElementNS(NS, 'path')
  cover.setAttribute('d', BOOK_COVER_D)
  cover.setAttribute('fill', 'currentColor')
  cover.setAttribute('fill-rule', 'evenodd')
  cover.setAttribute('clip-rule', 'evenodd')

  const spine = document.createElementNS(NS, 'path')
  spine.setAttribute('d', BOOK_SPINE_D)
  spine.setAttribute('fill', 'currentColor')

  const ribbon = document.createElementNS(NS, 'path')
  ribbon.setAttribute('d', BOOK_RIBBON_D)
  ribbon.setAttribute('fill', 'currentColor')

  svg.append(cover, spine, ribbon)
  return svg
}

function isZhiyuanNavButton(button: Element, label: string): boolean {
  if (button.getAttribute('data-zhiyuan-nav') === '1') return true
  return button.querySelector('span')?.textContent?.trim() === label
}

function syncNav(getLabel: () => string, originals: Array<{ button: Element; svg: Element }>): void {
  const label = getLabel()
  for (const button of document.querySelectorAll('button')) {
    if (!isZhiyuanNavButton(button, label)) continue
    button.setAttribute('data-zhiyuan-nav', '1')
    const span = button.querySelector('span')
    if (span && span.textContent !== label) span.textContent = label
    const svg = button.querySelector('svg')
    if (!svg || svg.getAttribute(MARK) === '1') continue
    const keep = svg.cloneNode(true) as Element
    const next = createBookSvg()
    const cls = svg.getAttribute('class')
    if (cls) next.setAttribute('class', cls)
    next.setAttribute('width', svg.getAttribute('width') ?? '16')
    next.setAttribute('height', svg.getAttribute('height') ?? '16')
    svg.replaceWith(next)
    originals.push({ button, svg: keep })
  }
}

/** DSH 导航图标按 section id 写死；未知页是齿轮。这里换成书本。 */
export function installZhiyuanNavIcon(getLabel: () => string = () => SECTION_LABEL): () => void {
  if (typeof document === 'undefined' || !document.body) return () => undefined
  const originals: Array<{ button: Element; svg: Element }> = []
  const sync = () => syncNav(getLabel, originals)
  const observer = new MutationObserver(sync)
  observer.observe(document.body, { childList: true, subtree: true })
  sync()
  return () => {
    observer.disconnect()
    for (const { button, svg } of originals) {
      button.querySelector(`svg[${MARK}]`)?.replaceWith(svg)
      button.removeAttribute('data-zhiyuan-nav')
    }
  }
}
