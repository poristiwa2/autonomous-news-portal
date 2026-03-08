import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import slugify from 'slugify';
import { SocksProxyAgent } from 'socks-proxy-agent';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- PROXY CONFIGURATION ---
const proxyUrl = 'socks5://tfpggoop-rotate:28794ef4pew3@p.webshare.io:80';
const agent = new SocksProxyAgent(proxyUrl);

const parser = new Parser({
  requestOptions: {
    agent: agent,
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
  timeout: 15000
});

const DATA_DIR = path.resolve(__dirname, '../src/data/articles');

const sources = [
  { name: 'Sindonews Nasional', url: 'https://www.sindonews.com/feed', category: 'Nasional' },
  { name: 'Republika', url: 'https://www.republika.co.id/rss', category: 'Umum' },
  { name: 'Suara News', url: 'https://www.suara.com/rss/news', category: 'Terkini' },
  { name: 'Viva News', url: 'https://www.viva.co.id/get/all', category: 'Headline' }
];

async function runAggregator() {
  console.log(`🚀 Aggregating via Proxy to: ${DATA_DIR}`);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const source of sources) {
    try {
      console.log(`📡 [PROXY ACTIVE] Connecting to ${source.name}...`);
      const feed = await parser.parseURL(source.url);
      
      let count = 0;
      feed.items.slice(0, 15).forEach(item => {
        const title = item.title?.trim();
        if (!title) return;

        const slug = slugify(title, { lower: true, strict: true });
        const filePath = path.join(DATA_DIR, `${slug}.json`);

        if (fs.existsSync(filePath)) return;

        const articleData = {
          title,
          slug,
          link: item.link || '#',
          content: (item.contentSnippet || item.content || '').replace(/<[^>]*>?/gm, '').substring(0, 450),
          pubDate: item.isoDate || new Date().toISOString(),
          source: source.name,
          category: source.category
        };

        fs.writeFileSync(filePath, JSON.stringify(articleData, null, 2));
        count++;
      });
      console.log(`✅ ${source.name}: +${count} articles.`);
    } catch (err) {
      console.error(`⚠️ ${source.name} failed: ${err.message}`);
    }
  }
  console.log('🏁 Aggregation Complete!');
}

runAggregator();
