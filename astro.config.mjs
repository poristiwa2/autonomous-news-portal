import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static', // Forces pure HTML generation
  integrations: [tailwind()],
});
