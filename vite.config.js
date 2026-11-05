import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// build 값: Vercel이면 커밋 해시 앞 7자리, 아니면 빌드 날짜
const build =
  (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) ||
  new Date().toISOString().slice(0, 10);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD__: JSON.stringify(build),
  },
});
