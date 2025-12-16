import { describe, it, expect } from 'vitest'
import { fixture, html } from '@open-wc/testing'
import type { UltraCombo } from '../ultra-combo.js'
import { sampleOptions, getInput, getToggleBtn, getDropdown, getDropdownItems } from './test-utils.js'

describe('UltraCombo - Size Attribute', () => {
  it('defaults to md size', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    expect(input.className).toContain('px-2.5')
    expect(input.className).toContain('py-1.5')
  })

  it('size sm applies smaller classes', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo size="sm" .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)

    // Input should have sm classes
    expect(input.className).toContain('px-2')
    expect(input.className).toContain('py-1')
    expect(input.className).toContain('text-sm')

    // Button should have sm padding
    expect(toggleBtn.className).toContain('p-1')

    // Icon should have sm size
    const icon = toggleBtn.querySelector('svg')
    expect(icon?.className).toContain('w-3.5')
    expect(icon?.className).toContain('h-3.5')
  })

  it('size md applies medium classes', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo size="md" .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)

    expect(input.className).toContain('px-2.5')
    expect(input.className).toContain('py-1.5')
    expect(toggleBtn.className).toContain('p-1.5')

    const icon = toggleBtn.querySelector('svg')
    expect(icon?.className).toContain('w-4')
    expect(icon?.className).toContain('h-4')
  })

  it('size lg applies larger classes', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo size="lg" .options=${sampleOptions}></ultra-combo>
    `)

    const input = getInput(el)
    const toggleBtn = getToggleBtn(el)

    expect(input.className).toContain('px-3')
    expect(input.className).toContain('py-2')
    expect(input.className).toContain('text-base')
    expect(toggleBtn.className).toContain('p-2')
  })

  it('dropdown items have correct size classes', async () => {
    const el = await fixture<UltraCombo>(html`
      <ultra-combo size="sm" .options=${sampleOptions}></ultra-combo>
    `)

    const toggleBtn = getToggleBtn(el)
    toggleBtn.click()
    await el.updateComplete

    const items = getDropdownItems(el)
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].className).toContain('px-2')
    expect(items[0].className).toContain('py-1')
    expect(items[0].className).toContain('text-sm')
  })

  it('dropdown has correct max-height for each size', async () => {
    // Test sm
    const elSm = await fixture<UltraCombo>(html`
      <ultra-combo size="sm" .options=${sampleOptions}></ultra-combo>
    `)
    getToggleBtn(elSm).click()
    await elSm.updateComplete
    expect(getDropdown(elSm)?.className).toContain('max-h-[160px]')

    // Test md
    const elMd = await fixture<UltraCombo>(html`
      <ultra-combo size="md" .options=${sampleOptions}></ultra-combo>
    `)
    getToggleBtn(elMd).click()
    await elMd.updateComplete
    expect(getDropdown(elMd)?.className).toContain('max-h-[200px]')

    // Test lg
    const elLg = await fixture<UltraCombo>(html`
      <ultra-combo size="lg" .options=${sampleOptions}></ultra-combo>
    `)
    getToggleBtn(elLg).click()
    await elLg.updateComplete
    expect(getDropdown(elLg)?.className).toContain('max-h-[240px]')
  })
})
