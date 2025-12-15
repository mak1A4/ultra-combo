import { describe, it, expect } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import {
  sampleOptions,
  getInput,
  getDropdown,
  getToggleBtn,
} from './test-utils.js'

describe('UltraCombo - Keyboard Navigation', () => {
  it('ArrowDown opens dropdown when closed', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    expect(getDropdown(el)).toBeNull()

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete

    expect(getDropdown(el)).not.toBeNull()
  })

  it('ArrowDown moves highlight down', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    // First item should be highlighted initially
    let highlighted = el.shadowRoot!.querySelector('.dropdown-item.highlighted')
    expect(highlighted?.textContent).toContain('United States')

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete

    highlighted = el.shadowRoot!.querySelector('.dropdown-item.highlighted')
    expect(highlighted?.textContent).toContain('United Kingdom')
  })

  it('ArrowDown wraps to start when at end (no more items)', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    // Navigate to end
    for (let i = 0; i < 4; i++) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      await el.updateComplete
    }

    // Should wrap to start
    const highlighted = el.shadowRoot!.querySelector('.dropdown-item.highlighted')
    expect(highlighted?.textContent).toContain('United States')
  })

  it('ArrowUp moves highlight up', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    // Move down first
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete

    // Then move up
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    await el.updateComplete

    const highlighted = el.shadowRoot!.querySelector('.dropdown-item.highlighted')
    expect(highlighted?.textContent).toContain('United States')
  })

  it('ArrowUp wraps to end when at start', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    // Press up from start
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    await el.updateComplete

    const highlighted = el.shadowRoot!.querySelector('.dropdown-item.highlighted')
    expect(highlighted?.textContent).toContain('Australia')
  })

  it('Enter selects highlighted option', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    // Move to second item
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await el.updateComplete

    // Select with Enter
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await el.updateComplete

    expect(el.value).toBe('uk')
    expect(getDropdown(el)).toBeNull()
  })

  it('Escape closes dropdown', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    expect(getDropdown(el)).not.toBeNull()

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await el.updateComplete

    expect(getDropdown(el)).toBeNull()
  })

  it('Tab closes dropdown', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    expect(getDropdown(el)).not.toBeNull()

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    await el.updateComplete

    expect(getDropdown(el)).toBeNull()
  })
})
