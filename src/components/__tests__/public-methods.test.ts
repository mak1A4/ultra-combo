import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fixture, html, fixtureCleanup } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import { sampleOptions, getInput, getDropdown, getToggleBtn } from './test-utils.js'

// Helper to wait for dependency setup
const waitForSetup = async (el: UltraCombo) => {
  await new Promise(resolve => setTimeout(resolve, 10))
  await el.updateComplete
}

// Unique ID counter to avoid ID collisions between tests
let testIdCounter = 0
const uniqueId = (prefix: string) => `${prefix}-pm-${++testIdCounter}-${Date.now()}`

describe('UltraCombo - Public Methods', () => {
  afterEach(() => {
    fixtureCleanup()
  })

  describe('clear()', () => {
    it('clears value property', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
      `)

      expect(el.value).toBe('us')

      el.clear()
      await el.updateComplete

      expect(el.value).toBe('')
    })

    it('clears input value', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
      `)

      const input = getInput(el)
      expect(input.value).toBe('United States')

      el.clear()
      await el.updateComplete

      expect(input.value).toBe('')
    })

    it('closes dropdown', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
      `)

      // Open dropdown
      getToggleBtn(el).click()
      await el.updateComplete
      expect(getDropdown(el)).not.toBeNull()

      el.clear()
      await el.updateComplete

      expect(getDropdown(el)).toBeNull()
    })

    it('dispatches change event with empty value', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
      `)

      const changeHandler = vi.fn()
      el.addEventListener('change', changeHandler)

      el.clear()
      await el.updateComplete

      expect(changeHandler).toHaveBeenCalledTimes(1)
      expect(changeHandler.mock.calls[0][0].detail).toEqual({
        value: '',
        label: '',
      })
    })

    it('works even when no value is selected', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${sampleOptions}></ultra-combo>
      `)

      const changeHandler = vi.fn()
      el.addEventListener('change', changeHandler)

      // Should not throw
      el.clear()
      await el.updateComplete

      expect(changeHandler).toHaveBeenCalledTimes(1)
      expect(el.value).toBe('')
    })
  })

  describe('refresh()', () => {
    let mockFetch: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockFetch = vi.fn().mockResolvedValue({
        options: [{ value: 'new', label: 'New Item' }],
        hasMore: false,
      })
    })

    it('calls fetch in remote mode', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .fetchOptions=${mockFetch} debounce="0"></ultra-combo>
      `)

      mockFetch.mockClear()

      el.refresh()
      await new Promise(resolve => setTimeout(resolve, 50))
      await el.updateComplete

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('', 0, 20, null)
    })

    it('reloads options even when dropdown is closed', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .fetchOptions=${mockFetch} debounce="0"></ultra-combo>
      `)

      // Dropdown is closed
      expect(getDropdown(el)).toBeNull()

      mockFetch.mockClear()

      el.refresh()
      await new Promise(resolve => setTimeout(resolve, 50))
      await el.updateComplete

      expect(mockFetch).toHaveBeenCalled()
    })

    it('does nothing harmful in local mode', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${sampleOptions} value="us"></ultra-combo>
      `)

      // Should not throw
      el.refresh()
      await el.updateComplete

      // Value should be preserved
      expect(el.value).toBe('us')
      // Options should be preserved
      expect(el.options).toEqual(sampleOptions)
    })

    it('uses current parentValue when refreshing', async () => {
      const categoryOptions = [
        { value: 'electronics', label: 'Electronics' },
      ]

      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId} .fetchOptions=${mockFetch} debounce="0"></ultra-combo>
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

      mockFetch.mockClear()

      child.refresh()
      await new Promise(resolve => setTimeout(resolve, 50))
      await child.updateComplete

      expect(mockFetch).toHaveBeenCalledWith('', 0, 20, 'electronics')
    })
  })

  describe('parentValue getter', () => {
    it('returns null when no dependency configured', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${sampleOptions}></ultra-combo>
      `)

      expect(el.parentValue).toBeNull()
    })

    it('returns null initially when dependency configured but parent has no value', async () => {
      const categoryOptions = [
        { value: 'electronics', label: 'Electronics' },
      ]

      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId}></ultra-combo>
        </div>
      `)

      const child = container.querySelector(`#${childId}`) as UltraCombo

      await waitForSetup(child)

      expect(child.parentValue).toBeNull()
    })

    it('returns parent value after parent selection', async () => {
      const categoryOptions = [
        { value: 'electronics', label: 'Electronics' },
      ]

      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId}></ultra-combo>
        </div>
      `)

      const parent = container.querySelector(`#${parentId}`) as UltraCombo
      const child = container.querySelector(`#${childId}`) as UltraCombo

      await waitForSetup(child)

      parent.value = 'electronics'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'electronics', label: 'Electronics' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      expect(child.parentValue).toBe('electronics')
    })

    it('is readonly (no setter)', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${sampleOptions}></ultra-combo>
      `)

      // Attempting to set should throw since it's a getter-only property
      expect(() => {
        (el as any).parentValue = 'test'
      }).toThrow()

      // Value should still be null
      expect(el.parentValue).toBeNull()
    })
  })
})
