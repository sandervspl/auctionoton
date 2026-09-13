import { createFileRoute } from '@tanstack/react-router';
import { getSiteUrl } from 'services/site.server';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          `User-agent: *\nAllow: /\nDisallow: /user/\n\nSitemap: ${getSiteUrl()}/sitemap.xml\n`,
          { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        ),
    },
  },
});
