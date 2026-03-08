import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import slugify from 'slugify';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
  timeout: 15000,
});

// Force absolute path relative to the project root
const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'articles');

const sources = [
  { name: 'Antara', url: 'https://www.antaranews.com/rss/terkini.xml', category: 'Terkini' },
  { name: 'CNBC', url: 'https://www.cnbcindonesia.com/news/rss', category: 'Ekonomi' },
  { name: 'Tempo', url: 'https://tempo.co/rss/terkini', category: 'Umum' }
];

async function runAggregator() {
  console.log(`📂 Target Directory: ${DATA_DIR}`);
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  for (const source of sources) {
    try {
      console.log(`📡 Fetching ${source.name}...`);
      const feed = await parser.parseURL(source.url);
      
      feed.items.slice(0, 15).forEach(item => {
        const title = item.title?.trim() || 'Judul Tidak Tersedia';
        const slug = slugify(title, { lower: true, strict: true });
        if (!slug) return;

        const filePath = path.join(DATA_DIR, `${slug}.json`);
        
        const articleData = {
          title: title,
          slug: slug,
          link: item.link || '#',
          content: (item.contentSnippet || item.content || '').replace(/<[^>]*>?/gm, '').substring(0, 300),
          pubDate: item.isoDate || new Date().toISOString(),
          source: source.name,
          category: source.category
        };

        fs.writeFileSync(filePath, JSON.stringify(articleData, null, 2));
      });
      console.log(`✅ ${source.name} processed.`);
    } catch (err) {
      console.error(`⚠️ ${source.name} failed: ${err.message}`);
    }
  }
}

runAggregator();
