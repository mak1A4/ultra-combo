import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fixture, html, fixtureCleanup } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import { categoryOptions, getToggleBtn } from './test-utils.js'

// Helper to wait for dependency setup
const waitForSetup = async (el: UltraCombo) => {
  await new Promise(resolve => setTimeout(resolve, 10))
  await el.updateComplete
}

// Unique ID counter to avoid ID collisions between tests
let testIdCounter = 0
const uniqueId = (prefix: string) => `${prefix}-url-${++testIdCounter}-${Date.now()}`

describe('UltraCombo - {depends} URL Placeholder', () => {
  let originalFetch: typeof fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalFetch = globalThis.fetch
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
    globalThis.fetch = mockFetch as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    mockFetch.mockClear()
    fixtureCleanup()
  })

  it('{depends} replaced with parent value in fetch-url', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ value: '1', label: 'Item 1' }]),
    })

    const parentId = uniqueId('parent')
    const childId = uniqueId('child')

    const container = await fixture(html`
      <div>
        <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
        <ultra-combo
          id=${childId}
          depends-on=${parentId}
          fetch-url="https://api.example.com/items?category={depends}&q={search}"
          debounce="0"
        ></ultra-combo>
      </div>
    `)

    const parent = container.querySelector(`#${parentId}`) as UltraCombo
    const child = container.querySelector(`#${childId}`) as UltraCombo

    await waitForSetup(child)

    // Set parent value
    parent.value = 'electronics'
    parent.dispatchEvent(new CustomEvent('change', {
      detail: { value: 'electronics', label: 'Electronics' },
      bubbles: true, composed: true,
    }))
    await child.updateComplete

    // Open child dropdown
    getToggleBtn(child).click()
    await child.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/items?category=electronics&q='
    )
  })

  it('returns empty options when {depends} present but no parent value', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ value: '1', label: 'Item 1' }]),
    })

    const parentId = uniqueId('parent')
    const childId = uniqueId('child')

    const container = await fixture(html`
      <div>
        <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
        <ultra-combo
          id=${childId}
          depends-on=${parentId}
          fetch-url="https://api.example.com/items?category={depends}"
          debounce="0"
        ></ultra-combo>
      </div>
    `)

    const child = container.querySelector(`#${childId}`) as UltraCombo

    await waitForSetup(child)

    // Open child dropdown without parent value
    getToggleBtn(child).click()
    await child.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))

    // Fetch should not be called because {depends} has no value
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('{depends} works combined with {search}, {offset}, {limit}', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ value: '1', label: 'Test Item' }]),
    })

    const parentId = uniqueId('parent')
    const childId = uniqueId('child')

    const container = await fixture(html`
      <div>
        <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
        <ultra-combo
          id=${childId}
          depends-on=${parentId}
          fetch-url="https://api.example.com/items?cat={depends}&q={search}&skip={offset}&take={limit}"
          .pageSize=${10}
          debounce="0"
        ></ultra-combo>
      </div>
    `)

    const parent = container.querySelector(`#${parentId}`) as UltraCombo
    const child = container.querySelector(`#${childId}`) as UltraCombo

    await waitForSetup(child)

    parent.value = 'clothing'
    parent.dispatchEvent(new CustomEvent('change', {
      detail: { value: 'clothing', label: 'Clothing' },
      bubbles: true, composed: true,
    }))
    await child.updateComplete

    getToggleBtn(child).click()
    await child.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/items?cat=clothing&q=&skip=0&take=10'
    )
  })

  it('{depends} value is URL-encoded', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    const specialOptions = [
      { value: 'category with spaces', label: 'Category With Spaces' },
    ]

    const parentId = uniqueId('parent')
    const childId = uniqueId('child')

    const container = await fixture(html`
      <div>
        <ultra-combo id=${parentId} .options=${specialOptions}></ultra-combo>
        <ultra-combo
          id=${childId}
          depends-on=${parentId}
          fetch-url="https://api.example.com/items?category={depends}"
          debounce="0"
        ></ultra-combo>
      </div>
    `)

    const parent = container.querySelector(`#${parentId}`) as UltraCombo
    const child = container.querySelector(`#${childId}`) as UltraCombo

    await waitForSetup(child)

    parent.value = 'category with spaces'
    parent.dispatchEvent(new CustomEvent('change', {
      detail: { value: 'category with spaces', label: 'Category With Spaces' },
      bubbles: true, composed: true,
    }))
    await child.updateComplete

    getToggleBtn(child).click()
    await child.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/items?category=category%20with%20spaces'
    )
  })

  it('refetches when parent value changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ value: '1', label: 'Item' }]),
    })

    const parentId = uniqueId('parent')
    const childId = uniqueId('child')

    const container = await fixture(html`
      <div>
        <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
        <ultra-combo
          id=${childId}
          depends-on=${parentId}
          fetch-url="https://api.example.com/items?category={depends}"
          debounce="0"
        ></ultra-combo>
      </div>
    `)

    const parent = container.querySelector(`#${parentId}`) as UltraCombo
    const child = container.querySelector(`#${childId}`) as UltraCombo

    await waitForSetup(child)

    // Select first parent
    parent.value = 'electronics'
    parent.dispatchEvent(new CustomEvent('change', {
      detail: { value: 'electronics', label: 'Electronics' },
      bubbles: true, composed: true,
    }))
    await child.updateComplete

    getToggleBtn(child).click()
    await child.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://api.example.com/items?category=electronics'
    )

    mockFetch.mockClear()

    // Change parent - should trigger auto-fetch since dropdown is open
    parent.value = 'clothing'
    parent.dispatchEvent(new CustomEvent('change', {
      detail: { value: 'clothing', label: 'Clothing' },
      bubbles: true, composed: true,
    }))
    await child.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/items?category=clothing'
    )
  })
})
