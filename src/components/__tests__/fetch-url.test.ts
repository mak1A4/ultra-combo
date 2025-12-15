import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import {
  getInput,
  getDropdownItems,
  getToggleBtn,
} from './test-utils.js'

describe('UltraCombo - Fetch URL Mode', () => {
  let originalFetch: typeof fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    originalFetch = globalThis.fetch
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
  })

  it('fetch-url fetches with placeholders replaced', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { value: '1', label: 'Item 1' },
      ]),
    })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        fetch-url="https://api.example.com/search?q={search}&skip={offset}&take={limit}"
        autoload
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/search?q=&skip=0&take=20'
    )
  })

  it('value-key and label-key extract correct fields', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'abc', name: 'Test Item' },
      ]),
    })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        fetch-url="https://api.example.com/items"
        value-key="id"
        label-key="name"
        autoload
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete
    await vi.runAllTimersAsync()
    await el.updateComplete

    const items = getDropdownItems(el)
    expect(items.length).toBe(1)
    expect(items[0].textContent).toContain('Test Item')
  })

  it('results-path extracts nested array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          items: [
            { value: '1', label: 'Nested Item 1' },
            { value: '2', label: 'Nested Item 2' },
          ],
        },
      }),
    })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        fetch-url="https://api.example.com/items"
        results-path="data.items"
        autoload
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete
    await vi.runAllTimersAsync()
    await el.updateComplete

    const items = getDropdownItems(el)
    expect(items.length).toBe(2)
    expect(items[0].textContent).toContain('Nested Item 1')
  })

  it('label-key supports dot notation for nested properties', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { code: 'US', name: { common: 'United States' } },
      ]),
    })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        fetch-url="https://api.example.com/countries"
        value-key="code"
        label-key="name.common"
        autoload
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete
    await vi.runAllTimersAsync()
    await el.updateComplete

    const items = getDropdownItems(el)
    expect(items.length).toBe(1)
    expect(items[0].textContent).toContain('United States')
  })

  it('total-path calculates hasMore correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        items: [
          { value: '1', label: 'Item 1' },
          { value: '2', label: 'Item 2' },
        ],
        meta: { total: 10 },
      }),
    })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        fetch-url="https://api.example.com/items"
        results-path="items"
        total-path="meta.total"
        page-size="2"
        autoload
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete
    await vi.runAllTimersAsync()
    await el.updateComplete

    // Track initial call count (toggle + focus can both trigger)
    const initialCallCount = mockFetch.mock.calls.length

    // Navigate to end and verify more can be loaded
    const input = getInput(el)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete

    // Should have made one additional fetch for more items
    expect(mockFetch).toHaveBeenCalledTimes(initialCallCount + 1)
  })

  it('prefers fetchOptions over fetch-url when both provided', async () => {
    const customFetch = vi.fn().mockResolvedValue({
      options: [{ value: 'custom', label: 'Custom Result' }],
      hasMore: false,
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ value: 'url', label: 'URL Result' }]),
    })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        fetch-url="https://api.example.com/items"
        .fetchOptions=${customFetch}
        autoload
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete
    await vi.runAllTimersAsync()
    await el.updateComplete

    // Custom fetchOptions should be used, not fetch-url
    expect(customFetch).toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()

    const items = getDropdownItems(el)
    expect(items[0].textContent).toContain('Custom Result')
  })
})
