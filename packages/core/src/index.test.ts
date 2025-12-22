import { describe, it, expect } from 'vitest'
import { defineSeed } from './index.js'

describe('core', () => {
    it('should define seed options', () => {
        const options = defineSeed({ rows: 10, dryRun: true })
        expect(options).toEqual({ rows: 10, dryRun: true })
    })
})
