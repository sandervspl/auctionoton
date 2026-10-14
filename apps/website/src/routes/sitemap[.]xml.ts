import { createFileRoute } from '@tanstack/react-router';
import { getSiteUrl } from 'services/site.server';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const origin = getSiteUrl()
          .replaceAll('&', '&amp;')
          .replaceAll('"', '&quot;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;');
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>`,
          { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
        );
      },
    },
  },
});
