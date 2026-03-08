/**
 * Poristiwa.my.id — View Tracker API Endpoint
 * Async endpoint that increments view count for an article
 *
 * In Astro SSR mode, this would be at src/pages/api/track.js
 * Usage: POST /api/track with body { "slug": "article-slug" }
 *
 * For Cloudflare Pages, access D1 via:
 *   const db = Astro.locals.runtime.env.DB;
 *
 * This file serves as the reference implementation.
 */

export async function POST({ request, locals }) {
  try {
    const { slug } = await request.json();

    if (!slug || typeof slug !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid slug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = locals.runtime.env.DB;

    // Get article ID from slug
    const article = await db
      .prepare('SELECT id FROM articles WHERE slug = ?')
      .bind(slug)
      .first();

    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Increment views
    await db
      .prepare('UPDATE analytics SET views = views + 1 WHERE article_id = ?')
      .bind(article.id)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[Track API] Error:', e.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Reject non-POST methods
export async function ALL() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
