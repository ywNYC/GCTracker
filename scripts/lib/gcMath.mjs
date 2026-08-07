// Re-export only. The canonical implementation lives in functions/api/_gcMath.js so the
// Pages Functions bundle never has to import across the functions/ boundary; Node
// scripts (this side) can import across directories freely.
export * from '../../functions/api/_gcMath.js';
