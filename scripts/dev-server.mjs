// Server locale per vedere il sito come su Cloudflare: URL senza estensione (/servizi → servizi.html) e 404 con la pagina 404.html.
// Uso: npm run dev  (porta 8788, oppure PORT=3000 npm run dev)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public');
const port = Number(process.env.PORT) || 8788;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };
const exists = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, rel);
  let status = 200;
  if (rel.endsWith('/') || rel === '') file = join(root, rel, 'index.html');
  else if (!extname(rel) && (await exists(file + '.html'))) file += '.html';
  if (!file.startsWith(root) || !(await exists(file))) { file = join(root, '404.html'); status = 404; }
  const data = await readFile(file);
  const range = req.headers.range;
  const type = types[extname(file)] || 'application/octet-stream';
  if (range && status === 200) { // i video chiedono intervalli di byte
    const [a, b] = range.replace('bytes=', '').split('-');
    const start = Number(a) || 0; const end = b ? Number(b) : data.length - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return res.end(data.subarray(start, end + 1));
  }
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': data.length, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
  res.end(data);
}).listen(port, () => console.log(`http://localhost:${port}`));
