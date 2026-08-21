/**
 * Prettier Configuration for Uptime Kuma
 *
 * Usage:
 *   pnpm run fmt             - Format all files
 *   pnpm run fmt --check     - Check formatting without making changes
 */
module.exports = {
    // Core formatting options - matching original ESLint rules
    semi: true,
    singleQuote: false,
    trailingComma: "es5",
    printWidth: 120,
    tabWidth: 4,
    useTabs: false,
    endOfLine: "lf",
    arrowParens: "always",
    bracketSpacing: true,
    bracketSameLine: false,

    // Vue-specific settings
    vueIndentScriptAndStyle: false,
    singleAttributePerLine: false,
    htmlWhitespaceSensitivity: "ignore", // More forgiving with whitespace in HTML

    // Override settings for specific file types
    overrides: [
        {
            files: "*.vue",
            options: {
                parser: "vue",
            },
        },
        {
            files: ["*.json"],
            options: {
                tabWidth: 4,
                trailingComma: "none",
            },
        },
        {
            files: ["*.yml", "*.yaml"],
            options: {
                tabWidth: 2,
                trailingComma: "none",
            },
        },
        {
            files: ["src/icon.js"],
            options: {
                trailingComma: "all",
            },
        },
        {
            files: ["*.md"],
            options: {
                printWidth: 100,
                proseWrap: "preserve",
                tabWidth: 2,
            },
        },
    ],
};
