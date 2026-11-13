import { defineConfig } from 'vite';
export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { rollupOptions: {
    onwarn(warning, warn) {
      // Fluent v9 marks browser modules for React Server Components. This is a client-only app.
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('"use client"')) return;
      warn(warning);
    }
  } }
});
