import { defineConfig } from 'unocss'
import presetWind from '@unocss/preset-wind'

export default defineConfig({
  mode: 'shadow-dom',
  presets: [
    presetWind(),
  ],
  theme: {
    animation: {
      keyframes: {
        shimmer: '{0% { background-position: 200% 0 } 100% { background-position: -200% 0 }}',
      },
      durations: {
        shimmer: '1.5s',
      },
      timingFns: {
        shimmer: 'linear',
      },
      counts: {
        shimmer: 'infinite',
      },
    },
  },
})
