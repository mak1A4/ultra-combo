import { describe, it, expect, vi } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import {
  sampleOptions,
  getInput,
  getDropdown,
  getDropdownItems,
  getToggleBtn,
} from './test-utils.js'

describe('UltraCombo - Local Mode', () => {
  it('renders with placeholder', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo placeholder="Select something..."></ultra-combo>
    `)

    const input = getInput(el)
    expect(input.placeholder).toBe('Select something...')
  })

  it('opens dropdown on focus', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    expect(getDropdown(el)).toBeNull()

    input.focus()
    input.dispatchEvent(new FocusEvent('focus'))
    await el.updateComplete

    expect(getDropdown(el)).not.toBeNull()
  })

  it('opens dropdown on toggle button click', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    expect(getDropdown(el)).toBeNull()

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    expect(getDropdown(el)).not.toBeNull()
    expect(getDropdownItems(el).length).toBe(4)
  })

  it('filters options on input', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    input.focus()
    input.value = 'united'
    input.dispatchEvent(new InputEvent('input'))
    await el.updateComplete

    const items = getDropdownItems(el)
    expect(items.length).toBe(2) // United States, United Kingdom
  })

  it('selects option on click', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const items = getDropdownItems(el)
    ;(items[1] as HTMLElement).click()
    await el.updateComplete

    expect(el.value).toBe('uk')
    expect(getDropdown(el)).toBeNull() // Dropdown closes after selection
  })

  it('dispatches change event on selection', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const changeHandler = vi.fn()
    el.addEventListener('change', changeHandler)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const items = getDropdownItems(el)
    ;(items[2] as HTMLElement).click()
    await el.updateComplete

    expect(changeHandler).toHaveBeenCalledTimes(1)
    expect(changeHandler.mock.calls[0][0].detail).toEqual({
      value: 'ca',
      label: 'Canada',
    })
  })

  it('shows "No results found" when filter matches nothing', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    input.focus()
    input.value = 'xyz'
    input.dispatchEvent(new InputEvent('input'))
    await el.updateComplete

    const noResults = el.shadowRoot!.querySelector('.no-results')
    expect(noResults).not.toBeNull()
    expect(noResults!.textContent).toContain('No results found')
  })
})
