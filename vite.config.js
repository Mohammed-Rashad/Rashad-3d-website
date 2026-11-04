import { defineConfig } from 'vite';
import path from 'path';
import { pathToFileURL } from 'url';

const root = process.cwd();

// Injects the build-time rendered paper (from content/*.json) into index.html.
function contentPlugin() {
  let dev = false;
  return {
    name: 'paper-content',
    configResolved(cfg) { dev = cfg.command === 'serve'; },
    async transformIndexHtml(html) {
      const url = pathToFileURL(path.join(root, 'src/render/page.mjs')).href + (dev ? `?t=${Date.now()}` : '');
      const { renderPage, loadContent } = await import(url);
      const { icon } = await import(pathToFileURL(path.join(root, 'src/icons.mjs')).href + (dev ? `?t=${Date.now()}` : ''));
      return html.replace('<!--APP-->', renderPage(loadContent(root), { dev })).replace(/<!--ICON:(\w+)-->/g, (_, n) => icon(n));
    },
    configureServer(server) {
      server.watcher.add([path.join(root, 'content'), path.join(root, 'CREDITS.md')]);
      server.watcher.on('change', (f) => {
        if (f.includes(`${path.sep}content${path.sep}`) || f.endsWith('CREDITS.md') || f.includes(`${path.sep}render${path.sep}`) || f.endsWith('chapters.mjs')) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

export default defineConfig({
  plugins: [contentPlugin()],
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
