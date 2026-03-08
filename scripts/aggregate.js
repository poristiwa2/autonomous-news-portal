import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import slugify from 'slugify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  timeout: 15000
});

const DATA_DIR = path.resolve(__dirname, '../src/data/articles');

// SWAPPING ANTARA FOR REPUBLIKA & EXTRA SINDONEWS
const sources = [
  { name: 'Sindonews Nasional', url: 'https://www.sindonews.com/feed', category: 'Nasional' },
  { name: 'Sindonews Ekonomi', url: 'https://ekonomi.sindonews.com/feed', category: 'Ekonomi' },
  { name: 'Republika', url: 'https://www.republika.co.id/rss', category: 'Umum' },
  { name: 'Okezone', url: 'https://www.okezone.com/rss/berita.xml', category: 'Populer' }
];

async function runAggregator() {
  console.log(`🚀 Aggregating to: ${DATA_DIR}`);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const source of sources) {
    try {
      console.log(`📡 Connecting to ${source.name}...`);
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
      // If it's an XML error, it's a bot-block. We just log it and move on.
      console.error(`⚠️ ${source.name} blocked or invalid: ${err.message}`);
    }
  }
}

runAggregator();
