import { describe, it, expect, vi, afterEach } from 'vitest'
import { fixture, html, fixtureCleanup } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import { sampleOptions, getInput, getDropdown, getToggleBtn, getDropdownItems, getClearBtn } from './test-utils.js'

// Helper to get badge elements
const getBadges = (el: UltraCombo) =>
  el.shadowRoot!.querySelectorAll('.flex.flex-wrap.gap-1 > span')

// Helper to get badge remove buttons
const getBadgeRemoveBtn = (badge: Element) =>
  badge.querySelector('button') as HTMLButtonElement

describe('UltraCombo - Multiselect', () => {
  afterEach(() => {
    fixtureCleanup()
  })

  describe('multiple attribute', () => {
    it('multiple attribute enables multiselect mode', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions}></ultra-combo>
      `)

      expect(el.multiple).toBe(true)
    })

    it('multiple defaults to false', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${sampleOptions}></ultra-combo>
      `)

      expect(el.multiple).toBe(false)
    })
  })

  describe('Selection behavior', () => {
    it('selecting adds value to comma-separated string', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions}></ultra-combo>
      `)

      // Open dropdown
      getToggleBtn(el).click()
      await el.updateComplete

      // Select first option
      let items = getDropdownItems(el)
      ;(items[0] as HTMLElement).click()
      await el.updateComplete

      expect(el.value).toBe('us')

      // Open dropdown again and select second option
      getToggleBtn(el).click()
      await el.updateComplete
      await new Promise(resolve => setTimeout(resolve, 10))
      await el.updateComplete

      items = getDropdownItems(el)
      expect(items.length).toBeGreaterThan(1)
      ;(items[1] as HTMLElement).click()
      await el.updateComplete

      expect(el.value).toBe('us,uk')
    })

    it('selecting already-selected item removes it', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions} value="us,uk"></ultra-combo>
      `)

      // Open dropdown
      getToggleBtn(el).click()
      await el.updateComplete

      // Click on already-selected "us" (first item)
      const items = getDropdownItems(el)
      ;(items[0] as HTMLElement).click()
      await el.updateComplete

      expect(el.value).toBe('uk')
    })

    it('dropdown closes after each selection', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions}></ultra-combo>
      `)

      // Open dropdown
      getToggleBtn(el).click()
      await el.updateComplete
      expect(getDropdown(el)).not.toBeNull()

      // Select an option
      const items = getDropdownItems(el)
      ;(items[0] as HTMLElement).click()
      await el.updateComplete

      // Dropdown should be closed
      expect(getDropdown(el)).toBeNull()
    })
  })

  describe('Badges', () => {
    it('badges render for each selected value', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions} value="us,uk"></ultra-combo>
      `)

      const badges = getBadges(el)
      expect(badges.length).toBe(2)
      expect(badges[0].textContent).toContain('United States')
      expect(badges[1].textContent).toContain('United Kingdom')
    })

    it('no badges when no value selected', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions}></ultra-combo>
      `)

      const badges = getBadges(el)
      expect(badges.length).toBe(0)
    })

    it('X button on badge removes that selection', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions} value="us,uk,ca"></ultra-combo>
      `)

      expect(el.value).toBe('us,uk,ca')

      const badges = getBadges(el)
      const removeBtn = getBadgeRemoveBtn(badges[1]) // Remove "uk"
      removeBtn.click()
      await el.updateComplete

      expect(el.value).toBe('us,ca')

      // Badge count should decrease
      const newBadges = getBadges(el)
      expect(newBadges.length).toBe(2)
    })
  })

  describe('Change event', () => {
    it('change event includes value, values, and labels', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions}></ultra-combo>
      `)

      const changeHandler = vi.fn()
      el.addEventListener('change', changeHandler)

      // Open and select
      getToggleBtn(el).click()
      await el.updateComplete

      const items = getDropdownItems(el)
      ;(items[0] as HTMLElement).click()
      await el.updateComplete

      expect(changeHandler).toHaveBeenCalledTimes(1)
      const detail = changeHandler.mock.calls[0][0].detail
      expect(detail.value).toBe('us')
      expect(detail.values).toEqual(['us'])
      expect(detail.labels).toEqual(['United States'])
    })

    it('change event on badge removal includes updated arrays', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions} value="us,uk"></ultra-combo>
      `)

      const changeHandler = vi.fn()
      el.addEventListener('change', changeHandler)

      const badges = getBadges(el)
      const removeBtn = getBadgeRemoveBtn(badges[0]) // Remove "us"
      removeBtn.click()
      await el.updateComplete

      expect(changeHandler).toHaveBeenCalledTimes(1)
      const detail = changeHandler.mock.calls[0][0].detail
      expect(detail.value).toBe('uk')
      expect(detail.values).toEqual(['uk'])
      expect(detail.labels).toEqual(['United Kingdom'])
    })
  })

  describe('clear() method', () => {
    it('clear() removes all selections', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions} value="us,uk,ca"></ultra-combo>
      `)

      expect(el.value).toBe('us,uk,ca')
      expect(getBadges(el).length).toBe(3)

      el.clear()
      await el.updateComplete

      expect(el.value).toBe('')
      expect(getBadges(el).length).toBe(0)
    })

    it('clear button is hidden in multiselect mode', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions} value="us,uk"></ultra-combo>
      `)

      expect(el.value).toBe('us,uk')
      expect(getClearBtn(el)).toBeNull()
    })
  })

  describe('Input display', () => {
    it('input shows placeholder (not selected values) in multi mode', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions} value="us,uk" placeholder="Select countries..."></ultra-combo>
      `)

      const input = getInput(el)
      // Input should be empty, showing placeholder
      expect(input.value).toBe('')
      expect(input.placeholder).toBe('Select countries...')
    })
  })

  describe('Dropdown selected state', () => {
    it('selected items show checkmark in dropdown', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions} value="us,ca"></ultra-combo>
      `)

      // Open dropdown
      getToggleBtn(el).click()
      await el.updateComplete

      const items = getDropdownItems(el)

      // First item (us) should have checkmark
      expect(items[0].textContent).toContain('✓')
      expect(items[0].textContent).toContain('United States')

      // Second item (uk) should not have checkmark
      expect(items[1].textContent).not.toContain('✓')

      // Third item (ca) should have checkmark
      expect(items[2].textContent).toContain('✓')
      expect(items[2].textContent).toContain('Canada')
    })

    it('selected items have selected styling in dropdown', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo multiple .options=${sampleOptions} value="us"></ultra-combo>
      `)

      // Open dropdown
      getToggleBtn(el).click()
      await el.updateComplete
      await new Promise(resolve => setTimeout(resolve, 10))
      await el.updateComplete

      const items = getDropdownItems(el)
      expect(items.length).toBeGreaterThan(1)

      // First item should have selected class
      expect(items[0].className).toContain('selected')
      expect(items[0].className).toContain('bg-blue-50')

      // Second item should not have selected class
      expect(items[1].className).not.toContain('selected')
    })
  })
})
