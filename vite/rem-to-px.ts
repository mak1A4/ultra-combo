interface RemToPxOptions {
  /**
   * Base font size for rem conversion (default: 16px)
   */
  baseFontSize?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Vite plugin that converts rem units to px units in generated CSS files.
 *
 * This is particularly useful for ServiceNow Service Portal where rem units
 * may not behave consistently due to non-standard root font sizes.
 *
 * @param options - Configuration options
 * @returns Vite plugin
 *
 * @example
 * ```ts
 * import remToPx from './vite/rem-to-px';
 *
 * export default defineConfig({
 *   plugins: [
 *     remToPx({ baseFontSize: 16 })
 *   ]
 * });
 * ```
 */
export default function remToPxPlugin(options: RemToPxOptions = {}) {
  const { baseFontSize = 16, debug = false } = options;

  return {
    name: 'vite-plugin-rem-to-px',
    enforce: 'post' as const, // Run after all other plugins including CSS processors

    generateBundle(_outputOptions: any, bundle: any) {
      // Regex to convert rem to px
      // Matches decimal/integer numbers followed by 'rem'
      // Handles negative values, decimals, and integers
      const remRegex = /(-?\d*\.?\d+)rem\b/g;

      const convertRem = (content: string): { result: string; count: number } => {
        let count = 0;
        const result = content.replace(remRegex, (_match: string, value: string) => {
          const remValue = parseFloat(value);
          const pxValue = remValue * baseFontSize;
          count++;
          return Number.isInteger(pxValue)
            ? `${pxValue}px`
            : `${pxValue.toFixed(3)}px`;
        });
        return { result, count };
      };

      // Process all files in the bundle (CSS and JS)
      // JS files may contain inline CSS (e.g., Lit shadow-dom components)
      for (const fileName of Object.keys(bundle)) {
        const file = bundle[fileName];

        // Process CSS assets
        if (fileName.endsWith('.css') && file.type === 'asset') {
          let cssContent = typeof file.source === 'string'
            ? file.source
            : new TextDecoder().decode(file.source);

          const { result, count } = convertRem(cssContent);
          file.source = result;

          if (debug && count > 0) {
            console.log(`[rem-to-px] Converted ${count} rem unit(s) in ${fileName}`);
          }
        }

        // Process JS chunks (for inline CSS in Lit components)
        if (fileName.endsWith('.js') && file.type === 'chunk') {
          const { result, count } = convertRem(file.code);
          file.code = result;

          if (debug && count > 0) {
            console.log(`[rem-to-px] Converted ${count} rem unit(s) in ${fileName} (inline CSS)`);
          }
        }
      }

      if (debug) {
        console.log(`[rem-to-px] Conversion complete (base: ${baseFontSize}px)`);
      }
    },
  };
}
