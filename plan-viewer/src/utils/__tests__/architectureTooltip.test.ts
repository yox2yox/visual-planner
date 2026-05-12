import { describe, expect, it } from 'vitest'
import type { GlossaryItem } from '../../types'
import {
  findArchitectureTooltipItem,
  isArchitectureTooltipCloseKey,
  isArchitectureTooltipOpenKey,
} from '../architectureTooltip'

const glossary: GlossaryItem[] = [
  { id: 'api-gateway', type: 'server', name: 'API Gateway', description: '' },
  { id: 'user-auth', type: 'class', name: 'User Auth', description: '' },
]

describe('architecture tooltip helpers', () => {
  it('uses node id as the glossary lookup key', () => {
    expect(findArchitectureTooltipItem('user-auth', glossary)?.name).toBe('User Auth')
    expect(findArchitectureTooltipItem('User Auth', glossary)).toBeUndefined()
    expect(findArchitectureTooltipItem('missing', glossary)).toBeUndefined()
  })

  it('recognizes keyboard open and close keys', () => {
    expect(isArchitectureTooltipOpenKey('Enter')).toBe(true)
    expect(isArchitectureTooltipOpenKey(' ')).toBe(true)
    expect(isArchitectureTooltipOpenKey('Spacebar')).toBe(true)
    expect(isArchitectureTooltipOpenKey('Escape')).toBe(false)

    expect(isArchitectureTooltipCloseKey('Escape')).toBe(true)
    expect(isArchitectureTooltipCloseKey('Enter')).toBe(false)
  })
})
