// Copyright (c) 2025 Pongsathon. All rights reserved. Proprietary — see LICENSE.
//
// Vite build config. Ships a JavaScript-obfuscated bundle as the deterrence
// layer that goes with the LICENSE. The obfuscator only makes the client-side
// calc logic costly to lift, not impossible.
//
// Tuning notes (change with caution):
//   - include only src/*.js — never obfuscate node_modules; some deps rely on
//     computed identifiers the transformer will happily break.
//   - disableConsoleOutput silences console.* — fine because we ship no logs.
//   - renameGlobals stays FALSE: turning it on would rename references like
//     `document`/`window`/DOM ids that our code assumes stay stable.
import { defineConfig } from 'vite';
import obfuscator from 'vite-plugin-javascript-obfuscator';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,   // never ship source maps — they undo every layer below
    },
    plugins: [
        // Service worker — injectManifest strategy so we keep the hand-tuned
        // network-first + timeout logic in src/sw.js and just let the plugin
        // inject the precache list (Vite's hashed asset filenames). main.js
        // still registers the SW manually, so injectRegister is disabled.
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            injectRegister: null,
            manifest: false,      // public/manifest.json is authored by hand
            injectManifest: {
                globPatterns: ['**/*.{html,js,css,svg,png,json}'],
                globIgnores: [
                    // Per-language tutorial screenshots are runtime-cached on
                    // first view (Thai fallback covers the rest); precaching
                    // them would balloon the install and hit addAll with 404s
                    // for the not-yet-shot languages.
                    '**/assets/tutorial/{en,vn,la}/**',
                ],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            },
            devOptions: { enabled: false },   // don't run SW in dev
        }),
        obfuscator({
            include: ['src/**/*.js'],
            exclude: [/node_modules/],
            apply: 'build',   // dev preserves readable source for HMR + debugging
            options: {
                // Light preset — the previous heavy config (controlFlowFlattening,
                // deadCodeInjection, base64 stringArray, transformObjectKeys) made
                // the shipped bundle noticeably sluggish on the first tap after a
                // cold start; every string lookup and every hot path paid a
                // constant tax. We keep only the cheap transforms:
                //   - identifier renaming (hexadecimal names) — deterrence with
                //     zero runtime cost after the JIT primes
                //   - stringArray without encoding — a modest string-hiding pass
                //     that doesn't decode on every read
                //   - disableConsoleOutput — silences prod logs
                // debugProtection / selfDefending remain off (they freeze users);
                // renameGlobals must remain off (breaks DOM id / document refs).
                compact: true,
                controlFlowFlattening: false,
                deadCodeInjection: false,
                debugProtection: false,
                disableConsoleOutput: true,
                identifierNamesGenerator: 'hexadecimal',
                renameGlobals: false,
                selfDefending: false,
                stringArray: true,
                stringArrayEncoding: ['none'],
                stringArrayThreshold: 0.5,
                transformObjectKeys: false,
                unicodeEscapeSequence: false,
            },
        }),
    ],
});
