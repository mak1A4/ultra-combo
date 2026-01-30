import { defineConfig } from 'vite'
import { resolve } from 'path'
import UnoCSS from 'unocss/vite'
import remToPx from './vite/rem-to-px'

export default defineConfig({
  plugins: [
    UnoCSS({
      mode: 'shadow-dom',
    }),
    remToPx({ baseFontSize: 16 }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index-angular.ts'),
      name: 'UltraComboAngular',
      formats: ['iife'],
      fileName: () => 'ultra-combo-angular.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
    minify: 'esbuild',
  },
})
