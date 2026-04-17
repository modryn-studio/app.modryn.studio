import { fixupConfigRules } from '@eslint/compat';
import nextConfig from 'eslint-config-next';

export default [
  ...fixupConfigRules(nextConfig),
  {
    rules: {
      // Disabled: false positive in Next.js SSR context. localStorage and URL params
      // are only available client-side, so useEffect is the correct initialization
      // pattern  lazy useState initializers would crash on the server.
      'react-hooks/set-state-in-effect': 'off',
      // Disabled: refs in event handlers and transport callbacks are the correct
      // React pattern for imperative access without stale closure issues. The rule
      // is overly strict — these callbacks are never called during render, so there
      // is no React Compiler optimization hazard.
      'react-hooks/refs': 'off',
    },
  },
];
