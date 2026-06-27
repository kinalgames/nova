import 'vitest'

// Type augmentation for the vitest-axe matcher we register in test/setup.ts.
declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
