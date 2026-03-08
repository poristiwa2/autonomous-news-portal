import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import slugify from 'slugify';

// 1. Configure the Parser with "Human" Headers
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Referer': 'https://www.google.com/',
  },
  timeout: 10000, // Increased to 10s for slower local feeds
});

const DATA_DIR = path.resolve('./src/data/articles');

// 2. Verified 2026 RSS Feed URLs
const sources = [
  { name: 'Antara', url: 'https://www.antaranews.com/rss/terkini.xml', category: 'Terkini' },
  { name: 'CNBC', url: 'https://www.cnbcindonesia.com/news/rss', category: 'Ekonomi' },
  { name: 'Tempo', url: 'https://tempo.co/rss/terkini', category: 'Umum' }
];

async function runAggregator() {
  console.log('🚀 Starting Brute Aggregation...');
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  for (const source of sources) {
    try {
      console.log(`📡 Fetching ${source.name}...`);
      const feed = await parser.parseURL(source.url);
      
      console.log(`✅ Success! Processing ${feed.items.length} items from ${source.name}`);

      feed.items.slice(0, 15).forEach(item => {
        const title = item.title || 'Judul Tidak Tersedia';
        const slug = slugify(title, { lower: true, strict: true });
        if (!slug) return;

        const filePath = path.join(DATA_DIR, `${slug}.json`);
        
        // Skip if already exists to save build time
        if (fs.existsSync(filePath)) return;

        const articleData = {
          title: title,
          slug: slug,
          link: item.link || '#',
          // Clean up HTML tags from content snippets
          content: (item.contentSnippet || item.content || 'Klik sumber asli untuk membaca selengkapnya.').replace(/<[^>]*>?/gm, '').substring(0, 500),
          pubDate: item.isoDate || new Date().toISOString(),
          source: source.name,
          category: source.category
        };

        fs.writeFileSync(filePath, JSON.stringify(articleData, null, 2));
      });
    } catch (err) {
      console.error(`⚠️ Skipping ${source.name} due to error: ${err.message}`);
    }
  }

  // 3. Keep exactly 100 latest items to prevent build bloat
  const files = fs.readdirSync(DATA_DIR)
    .map(name => ({ name, path: path.join(DATA_DIR, name), mtime: fs.statSync(path.join(DATA_DIR, name)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length > 100) {
    files.slice(100).forEach(file => {
      fs.unlinkSync(file.path);
    });
    console.log(`🗑️ Pruned old local data.`);
  }

  console.log('🏁 Aggregation Complete!');
}

runAggregator();
