import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
    ...nextVitals,
    {
        linterOptions: {
            // Preserve the previous ESLint 8 behavior for legacy inline
            // suppressions while the runtime migration remains the only scope.
            reportUnusedDisableDirectives: false,
        },
        rules: {
            'import/no-anonymous-default-export': 'off',
            '@next/next/no-page-custom-font': 'off',
            '@next/next/no-img-element': 'off',
            '@next/next/no-html-link-for-pages': 'off',
            'react-hooks/exhaustive-deps': 'off',
            // eslint-plugin-react-hooks 7 enables React Compiler diagnostics in
            // the Next 16 preset. Keep the repo's established lint contract;
            // compiler adoption requires its own behavior-preserving refactor.
            'react-hooks/immutability': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
            'react-hooks/purity': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/static-components': 'off',
            'react-hooks/use-memo': 'off',
            'jsx-a11y/alt-text': 'off',
        },
    },
    globalIgnores([
        '.next/**',
        '.next-*/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
]);
