import { defineConfig } from 'vite'
import { resolve } from 'path'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    UnoCSS({
      mode: 'shadow-dom',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'UltraCombo',
      formats: ['iife'],
      fileName: () => 'ultra-combo.js',
    },
    rollupOptions: {
      output: {
        // Ensure everything is bundled (no external dependencies)
        inlineDynamicImports: true,
      },
    },
    // Generate a single file with no code splitting
    cssCodeSplit: false,
    minify: 'esbuild',
  },
})
