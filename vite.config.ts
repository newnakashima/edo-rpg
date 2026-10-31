import { defineConfig } from 'vitest/config';

// GitHub Pages ではリポジトリ名のパス（/edo-rpg/）の下で配信するため、相対パスで出力する
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
