import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import slugify from 'slugify';

const parser = new Parser({
  timeout: 5000, // 5 second limit per source to prevent hanging
});
const DATA_DIR = path.resolve('./src/data/articles');

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
      
      feed.items.slice(0, 15).forEach(item => {
        const title = item.title || 'Judul Tidak Tersedia';
        const slug = slugify(title, { lower: true, strict: true });
        if (!slug) return;

        const filePath = path.join(DATA_DIR, `${slug}.json`);
        
        // Don't overwrite existing files to save build time
        if (fs.existsSync(filePath)) return;

        const articleData = {
          title: title,
          slug: slug,
          link: item.link || '#',
          content: (item.contentSnippet || item.content || 'Klik sumber asli untuk membaca selengkapnya.').substring(0, 500),
          pubDate: item.isoDate || new Date().toISOString(),
          source: source.name,
          category: source.category
        };

        fs.writeFileSync(filePath, JSON.stringify(articleData, null, 2));
      });
    } catch (err) {
      // If one source fails, the whole build doesn't crash
      console.error(`⚠️ Skipping ${source.name} due to error: ${err.message}`);
    }
  }

  // PRUNING: Only keep the latest 100 articles to prevent GitHub/Astro bloat
  const files = fs.readdirSync(DATA_DIR)
    .map(name => ({ name, path: path.join(DATA_DIR, name), mtime: fs.statSync(path.join(DATA_DIR, name)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length > 100) {
    files.slice(100).forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`🗑️ Pruned old local data: ${file.name}`);
    });
  }

  console.log('🏁 Aggregation Complete!');
}

runAggregator();
