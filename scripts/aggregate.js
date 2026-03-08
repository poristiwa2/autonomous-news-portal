import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import slugify from 'slugify';

const parser = new Parser();
const DATA_DIR = path.resolve('./src/data/articles');

// 1. Define Premium Sources
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

  // 2. Fetch and Save Articles
  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      feed.items.slice(0, 15).forEach(item => { // Get top 15 from each
        const slug = slugify(item.title, { lower: true, strict: true });
        const filePath = path.join(DATA_DIR, `${slug}.json`);
        
        // Skip if we already scraped this
        if (fs.existsSync(filePath)) return;

        const articleData = {
          title: item.title,
          slug: slug,
          link: item.link,
          content: item.contentSnippet || item.content || '',
          pubDate: item.isoDate || new Date().toISOString(),
          source: source.name,
          category: source.category
        };

        fs.writeFileSync(filePath, JSON.stringify(articleData, null, 2));
      });
      console.log(`✅ Fetched ${source.name}`);
    } catch (err) {
      console.error(`❌ Failed to fetch ${source.name}:`, err.message);
    }
  }

  // 3. Prune Old Articles (Keep repo lean, delete > 7 days old)
  const files = fs.readdirSync(DATA_DIR);
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  files.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const articleDate = new Date(data.pubDate).getTime();
    
    if (articleDate < oneWeekAgo) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Pruned old article: ${file}`);
    }
  });

  console.log('🏁 Aggregation Complete!');
}

runAggregator();
