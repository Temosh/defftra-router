import { describe, expect, it } from 'vitest';

import { applyHeaderTransformations } from './headerTransform.js';

describe('applyHeaderTransformations', () => {
  it('applies SET, APPEND, and REMOVE sequentially without casing differences', () => {
    const result = applyHeaderTransformations(
      { 'X-Mode': 'original', 'x-remove': ['one', 'two'] },
      [
        { operation: 'SET', name: 'x-mode', value: 'replaced' },
        { operation: 'APPEND', name: 'X-Mode', value: 'second' },
        { operation: 'REMOVE', name: 'X-REMOVE' },
      ],
    );
    expect(result).toEqual({ 'x-mode': ['replaced', 'second'] });
  });
});
