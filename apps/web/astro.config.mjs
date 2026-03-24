// apps/web/astro.config.mjs
import { defineConfig, envField } from 'astro/config';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

import vercel from '@astrojs/vercel';
import icon from 'astro-icon';

import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // SSR — needed for token-gated pages
  output: 'server',

  site: 'https://wedding.aazucena.com',

  integrations: [icon()],

  env: {
    schema: {
      // Server-only — never exposed to the browser
      DIRECTUS_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://localhost:8055',
      }),
      DIRECTUS_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        default: '',
      }),
      INTERNAL_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://localhost:4321',
      }),
      MAINTENANCE_MODE: envField.boolean({
        context: 'server',
        access: 'secret',
        optional: true,
        default: false,
      }),
    },
  },

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    }
  },

  vite: {
    resolve: {
      alias: {
        '@lib':        resolve(__dirname, 'src/lib'),
        '@components': resolve(__dirname, 'src/components'),
        '@styles':     resolve(__dirname, 'src/styles'),
        '@layouts':     resolve(__dirname, 'src/layouts'),
        '@assets':     resolve(__dirname, 'src/assets'),
      },
    },

    plugins: [
      // Restore Vite 7's @vite/env resolution lost in Astro's config merge
      {
        name: 'vite-env-resolve',
        enforce: 'pre',
        resolveId(id) {
          if (id === '@vite/env') return _require.resolve('vite/dist/client/env.mjs');
        },
      },
      tailwindcss(),
      visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true })
    ],
  },

  adapter: vercel(),
});