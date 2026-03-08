import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import slugify from 'slugify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  }
});

// Force pathing relative to the script location to find /src/data/articles
const DATA_DIR = path.resolve(__dirname, '../src/data/articles');

const sources = [
  { name: 'Sindonews', url: 'https://www.sindonews.com/feed', category: 'Nasional' },
  { name: 'VOA Indonesia', url: 'https://www.voaindonesia.com/api/z-_oqyum_v', category: 'Internasional' }, // Updated Link
  { name: 'BBC Indonesia', url: 'https://www.bbc.com/indonesia/index.xml', category: 'Dunia' },
  { name: 'Antara', url: 'https://www.antaranews.com/rss/terkini.xml', category: 'Terkini' }
];

async function runAggregator() {
  console.log(`🚀 Writing to: ${DATA_DIR}`);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const source of sources) {
    try {
      console.log(`📡 Connecting: ${source.name}`);
      const feed = await parser.parseURL(source.url);
      
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
          content: (item.contentSnippet || item.content || '').replace(/<[^>]*>?/gm, '').substring(0, 400),
          pubDate: item.isoDate || new Date().toISOString(),
          source: source.name,
          category: source.category
        };

        fs.writeFileSync(filePath, JSON.stringify(articleData, null, 2));
      });
      console.log(`✅ ${source.name} synced.`);
    } catch (err) {
      console.error(`❌ ${source.name} failed: ${err.message}`);
    }
  }
}

runAggregator();
