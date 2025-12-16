import { describe, it, expect, vi, afterEach } from 'vitest'
import { fixture, html, fixtureCleanup } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import { categoryOptions, productOptions, getInput, getToggleBtn, getDropdownItems } from './test-utils.js'

// Helper to wait for dependency setup
const waitForSetup = async (el: UltraCombo) => {
  await new Promise(resolve => setTimeout(resolve, 10))
  await el.updateComplete
}

// Unique ID counter to avoid ID collisions between tests
let testIdCounter = 0
const uniqueId = (prefix: string) => `${prefix}-${++testIdCounter}-${Date.now()}`

// Helper to create a cascading fixture with unique IDs
async function createCascadingFixture(
  parentAttrs = '',
  childAttrs = '',
  parentOptions = categoryOptions,
  childOptions = productOptions
) {
  const parentId = uniqueId('parent')
  const childId = uniqueId('child')

  const container = await fixture(html`
    <div>
      <ultra-combo id=${parentId} .options=${parentOptions}></ultra-combo>
      <ultra-combo id=${childId} depends-on=${parentId} .options=${childOptions}></ultra-combo>
    </div>
  `)

  const parent = container.querySelector(`#${parentId}`) as UltraCombo
  const child = container.querySelector(`#${childId}`) as UltraCombo

  await waitForSetup(child)

  return { container, parent, child, parentId, childId }
}

describe('UltraCombo - Cascading/Dependent Combos', () => {
  // Clean up fixtures after each test to prevent ID collisions
  afterEach(() => {
    fixtureCleanup()
  })

  describe('Setup and Wiring', () => {
    it('depends-on finds parent element by ID', async () => {
      const { parent, child } = await createCascadingFixture()

      // Select a value in parent
      parent.value = 'electronics'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'electronics', label: 'Electronics' },
        bubbles: true,
        composed: true,
      }))
      await child.updateComplete

      // Child should know about parent's value
      expect(child.parentValue).toBe('electronics')
    })

    it('warns if parent not found', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const el = await fixture<UltraCombo>(html`
        <ultra-combo depends-on="nonexistent-parent-xyz"></ultra-combo>
      `)

      // Wait for dependency setup
      await waitForSetup(el)

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('depends-on="nonexistent-parent-xyz" not found')
      )

      warnSpy.mockRestore()
    })

    it('parentValue is null when no dependency configured', async () => {
      const el = await fixture<UltraCombo>(html`
        <ultra-combo .options=${categoryOptions}></ultra-combo>
      `)

      expect(el.parentValue).toBeNull()
    })
  })

  describe('Parent Change Behavior', () => {
    it('child value clears when parent changes', async () => {
      const { parent, child } = await createCascadingFixture()

      // Set initial values
      parent.value = 'electronics'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'electronics', label: 'Electronics' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      child.value = 'phone'
      await child.updateComplete

      expect(child.value).toBe('phone')

      // Change parent
      parent.value = 'clothing'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'clothing', label: 'Clothing' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      // Child value should be cleared
      expect(child.value).toBe('')
    })

    it('child dispatches change event when cleared by parent change', async () => {
      const { parent, child } = await createCascadingFixture()

      // Set child value
      parent.value = 'electronics'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'electronics', label: 'Electronics' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      child.value = 'phone'
      await child.updateComplete

      const changeHandler = vi.fn()
      child.addEventListener('change', changeHandler)

      // Change parent
      parent.value = 'clothing'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'clothing', label: 'Clothing' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { value: '', label: '' },
        })
      )
    })

    it('parentValue reflects current parent selection', async () => {
      const { parent, child } = await createCascadingFixture()

      expect(child.parentValue).toBeNull()

      parent.value = 'electronics'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'electronics', label: 'Electronics' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      expect(child.parentValue).toBe('electronics')

      parent.value = 'clothing'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'clothing', label: 'Clothing' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      expect(child.parentValue).toBe('clothing')
    })
  })

  describe('Disabled State (disable-without-parent)', () => {
    it('input disabled when parent has no value', async () => {
      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId} disable-without-parent .options=${productOptions}></ultra-combo>
        </div>
      `)

      const child = container.querySelector(`#${childId}`) as UltraCombo
      await waitForSetup(child)

      const input = getInput(child)
      expect(input.disabled).toBe(true)
    })

    it('placeholder shows "Select parent first..." when disabled', async () => {
      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId} disable-without-parent placeholder="Select product..."></ultra-combo>
        </div>
      `)

      const child = container.querySelector(`#${childId}`) as UltraCombo
      await waitForSetup(child)

      const input = getInput(child)
      expect(input.placeholder).toBe('Select parent first...')
    })

    it('container has reduced opacity when disabled', async () => {
      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId} disable-without-parent></ultra-combo>
        </div>
      `)

      const child = container.querySelector(`#${childId}`) as UltraCombo
      await waitForSetup(child)

      const wrapper = child.shadowRoot!.querySelector('.flex.items-center')
      expect(wrapper?.className).toContain('opacity-60')
    })

    it('input enabled after parent selection', async () => {
      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId} disable-without-parent .options=${productOptions}></ultra-combo>
        </div>
      `)

      const parent = container.querySelector(`#${parentId}`) as UltraCombo
      const child = container.querySelector(`#${childId}`) as UltraCombo
      await waitForSetup(child)

      // Initially disabled
      expect(getInput(child).disabled).toBe(true)

      // Select parent value
      parent.value = 'electronics'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'electronics', label: 'Electronics' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      // Should be enabled now
      expect(getInput(child).disabled).toBe(false)
    })

    it('input becomes disabled again when parent cleared', async () => {
      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId} disable-without-parent .options=${productOptions}></ultra-combo>
        </div>
      `)

      const parent = container.querySelector(`#${parentId}`) as UltraCombo
      const child = container.querySelector(`#${childId}`) as UltraCombo
      await waitForSetup(child)

      // Select parent
      parent.value = 'electronics'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'electronics', label: 'Electronics' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      expect(getInput(child).disabled).toBe(false)

      // Clear parent
      parent.value = ''
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: '', label: '' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      expect(getInput(child).disabled).toBe(true)
    })
  })

  describe('Local Mode Filtering', () => {
    it('options filtered by parentValue property', async () => {
      const { parent, child } = await createCascadingFixture()

      // Select electronics
      parent.value = 'electronics'
      parent.dispatchEvent(new CustomEvent('change', {
        detail: { value: 'electronics', label: 'Electronics' },
        bubbles: true, composed: true,
      }))
      await child.updateComplete

      // Open child dropdown
      getToggleBtn(child).click()
      await child.updateComplete

      const items = getDropdownItems(child)
      expect(items.length).toBe(2) // phone and laptop
      expect(items[0].textContent).toContain('Phone')
      expect(items[1].textContent).toContain('Laptop')
    })

    it('filterOptions callback is called with options and parentValue', async () => {
      const filterFn = vi.fn().mockImplementation((options, parentValue) => {
        return options.filter((opt: any) => opt.parentValue === parentValue)
      })

      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId} .options=${productOptions} .filterOptions=${filterFn}></ultra-combo>
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

      getToggleBtn(child).click()
      await child.updateComplete

      expect(filterFn).toHaveBeenCalledWith(productOptions, 'electronics')
    })

    it('shows all non-parented options when no parent selected', async () => {
      const mixedOptions = [
        { value: 'global', label: 'Global Item' }, // No parentValue
        { value: 'phone', label: 'Phone', parentValue: 'electronics' },
      ]

      const parentId = uniqueId('parent')
      const childId = uniqueId('child')

      const container = await fixture(html`
        <div>
          <ultra-combo id=${parentId} .options=${categoryOptions}></ultra-combo>
          <ultra-combo id=${childId} depends-on=${parentId} .options=${mixedOptions}></ultra-combo>
        </div>
      `)

      const child = container.querySelector(`#${childId}`) as UltraCombo
      await waitForSetup(child)

      getToggleBtn(child).click()
      await child.updateComplete

      const items = getDropdownItems(child)
      expect(items.length).toBe(1)
      expect(items[0].textContent).toContain('Global Item')
    })
  })
})
