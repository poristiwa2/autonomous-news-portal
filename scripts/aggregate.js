import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import slugify from 'slugify';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  timeout: 15000,
});

const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'articles');

const sources = [
  { name: 'Sindonews', url: 'https://www.sindonews.com/feed', category: 'Nasional' },
  { name: 'VOA Indonesia', url: 'https://www.voaindonesia.com/api/zmg-ome_vi', category: 'Internasional' },
  { name: 'Republika', url: 'https://www.republika.co.id/rss', category: 'Umum' },
  { name: 'Antara', url: 'https://www.antaranews.com/rss/terkini.xml', category: 'Terkini' }
];

async function runAggregator() {
  console.log(`🚀 Aggregating to: ${DATA_DIR}`);
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  for (const source of sources) {
    try {
      console.log(`📡 Connecting to ${source.name}...`);
      const feed = await parser.parseURL(source.url);
      
      feed.items.slice(0, 20).forEach(item => {
        const title = item.title?.trim() || 'Laporan Terbaru';
        // Generate a cleaner slug
        const slug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
        if (!slug) return;

        const filePath = path.join(DATA_DIR, `${slug}.json`);
        
        // Prevent unnecessary overwriting if the file is already there
        if (fs.existsSync(filePath)) return;

        // SANITIZATION: Clean HTML tags and excessive whitespace
        let rawContent = item.contentSnippet || item.content || '';
        let cleanContent = rawContent
          .replace(/<[^>]*>?/gm, '') // Remove HTML
          .replace(/\s+/g, ' ')      // Collapse whitespace
          .trim();

        const articleData = {
          title: title,
          slug: slug,
          link: item.link || '#',
          content: cleanContent.substring(0, 450), // Standard snippet length
          pubDate: item.isoDate || new Date().toISOString(),
          source: source.name,
          category: source.category
        };

        fs.writeFileSync(filePath, JSON.stringify(articleData, null, 2));
      });
      console.log(`✅ ${source.name} synchronized successfully.`);
    } catch (err) {
      console.error(`⚠️ ${source.name} error: ${err.message}`);
    }
  }

  // PRUNING: Keep repo clean by only holding the 150 freshest files
  const files = fs.readdirSync(DATA_DIR)
    .map(name => ({ name, path: path.join(DATA_DIR, name), mtime: fs.statSync(path.join(DATA_DIR, name)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length > 150) {
    files.slice(150).forEach(file => fs.unlinkSync(file.path));
    console.log(`🗑️ Pruned oldest records.`);
  }
}

runAggregator();
