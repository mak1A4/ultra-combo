import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import type { FetchResult } from '../ultra-combo.types.js'
import {
  sampleOptions,
  getInput,
  getDropdown,
  getToggleBtn,
} from './test-utils.js'

describe('UltraCombo - Remote Mode', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows skeleton loading on initial fetch', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    const el = await fixture<UltraCombo>(html`
      <ultra-combo .fetchOptions=${mockFetch}></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const skeleton = el.shadowRoot!.querySelector('.skeleton-container')
    expect(skeleton).not.toBeNull()
  })

  it('shows "Type to search..." when no autoload', async () => {
    mockFetch.mockResolvedValue({ options: [], hasMore: false })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo .fetchOptions=${mockFetch} .autoload=${false}></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    // Wait for the fetch to complete
    await vi.runAllTimersAsync()
    await el.updateComplete

    const noResults = el.shadowRoot!.querySelector('.no-results')
    expect(noResults?.textContent).toContain('Type to search...')
  })

  it('autoload fetches on dropdown open', async () => {
    mockFetch.mockResolvedValue({
      options: [{ value: '1', label: 'Result 1' }],
      hasMore: false,
    })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo .fetchOptions=${mockFetch} .autoload=${true}></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    // The fetch should have been called with empty search string
    expect(mockFetch).toHaveBeenCalledWith('', 0, 20, null)
  })

  it('debounces input for remote fetch', async () => {
    mockFetch.mockResolvedValue({ options: [], hasMore: false })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo .fetchOptions=${mockFetch} .debounce=${150}></ultra-combo>
    `)

    const input = getInput(el)
    input.focus()
    input.dispatchEvent(new FocusEvent('focus'))
    await el.updateComplete

    // Clear the initial fetch call
    mockFetch.mockClear()

    // Type rapidly
    input.value = 'a'
    input.dispatchEvent(new InputEvent('input'))
    input.value = 'ab'
    input.dispatchEvent(new InputEvent('input'))
    input.value = 'abc'
    input.dispatchEvent(new InputEvent('input'))

    // Fetch should not have been called yet
    expect(mockFetch).not.toHaveBeenCalled()

    // Advance timers past debounce
    await vi.advanceTimersByTimeAsync(150)

    // Now fetch should have been called once with final value
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('abc', 0, 20, null)
  })

  it('shows "Loading more..." during pagination', async () => {
    let resolveSecondFetch: (value: FetchResult) => void

    mockFetch
      .mockResolvedValueOnce({
        options: [
          { value: '1', label: 'Item 1' },
          { value: '2', label: 'Item 2' },
        ],
        hasMore: true,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondFetch = resolve
          })
      )

    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        .fetchOptions=${mockFetch}
        .autoload=${true}
        .pageSize=${2}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete
    await vi.runAllTimersAsync()
    await el.updateComplete

    // Trigger load more via keyboard (ArrowDown to end)
    const input = getInput(el)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete

    const loadingMore = el.shadowRoot!.querySelector('.loading-more')
    expect(loadingMore).not.toBeNull()
    expect(loadingMore?.textContent).toContain('Loading more...')

    // Cleanup
    resolveSecondFetch!({ options: [], hasMore: false })
    await vi.runAllTimersAsync()
  })

  it('keyboard ArrowDown at end triggers fetch when hasMore', async () => {
    mockFetch
      .mockResolvedValue({
        options: [
          { value: '1', label: 'Item 1' },
          { value: '2', label: 'Item 2' },
        ],
        hasMore: true,
      })

    const el = await fixture<UltraCombo>(html`
      <ultra-combo
        .fetchOptions=${mockFetch}
        .autoload=${true}
        .pageSize=${2}
      ></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete
    await vi.runAllTimersAsync()
    await el.updateComplete

    // Clear the initial fetch calls (toggle + focus can both trigger)
    const initialCallCount = mockFetch.mock.calls.length
    mockFetch.mockResolvedValue({
      options: [{ value: '3', label: 'Item 3' }],
      hasMore: false,
    })

    // Navigate to end
    const input = getInput(el)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete

    // At last item now, press down again to trigger fetch
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete

    // Should have one more call than initial
    expect(mockFetch).toHaveBeenCalledTimes(initialCallCount + 1)
  })
})

describe('UltraCombo - Click Outside', () => {
  it('closes dropdown when clicking outside', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    expect(getDropdown(el)).not.toBeNull()

    // Simulate click outside
    document.body.click()
    await el.updateComplete

    expect(getDropdown(el)).toBeNull()
  })
})
