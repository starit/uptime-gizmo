import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import visualizer from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";

const pkg = require("../package.json");
const postCssScss = require("postcss-scss");
const postcssRTLCSS = require("postcss-rtlcss");
const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");

const viteCompressionFilter = /\.(js|mjs|json|css|html|svg)$/i;

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        port: 3000,
    },
    define: {
        // Bake package.json here. `npm_package_version` is only set when a
        // package manager runs the script; `vite --config` and some CI paths
        // leave it undefined, which made About always warn.
        FRONTEND_VERSION: JSON.stringify(pkg.version),
        "process.env": {},
    },
    plugins: [
        vue(),
        visualizer({
            filename: "tmp/dist-stats.html",
        }),
        viteCompression({
            algorithm: "gzip",
            filter: viteCompressionFilter,
        }),
        viteCompression({
            algorithm: "brotliCompress",
            filter: viteCompressionFilter,
        }),
    ],
    css: {
        postcss: {
            parser: postCssScss,
            map: false,
            plugins: [tailwindcss, postcssRTLCSS, autoprefixer],
        },
    },
    build: {
        commonjsOptions: {
            include: [/.js$/],
        },
        rollupOptions: {
            output: {
                manualChunks(id, { getModuleInfo, getModuleIds }) {},
            },
        },
    },
});
