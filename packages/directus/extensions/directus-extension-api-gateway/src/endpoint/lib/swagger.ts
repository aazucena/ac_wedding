import type { Router, Request, Response } from 'express';

export const SWAGGER_UI_VERSION = '5.18.2';
export const SWAGGER_CDN        = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

const assetCache = new Map<string, string>();

async function fetchAsset(url: string): Promise<string> {
	const cached = assetCache.get(url);
	if (cached) return cached;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	const body = await res.text();
	assetCache.set(url, body);
	return body;
}

/**
 * Registers all /docs/* routes.
 * Assets are proxied from the Swagger UI CDN on first request and cached
 * in memory, so all requests are same-origin and pass Directus's CSP.
 */
export function registerSwaggerRoutes(
	router: Router,
	ctx: { logger: any },
): void {

	router.get('/docs', (_req: Request, res: Response) => {
		const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Gateway — Docs</title>
  <link rel="stylesheet" href="/api/docs/swagger-ui.css" />
  <style>body{margin:0}.swagger-ui .topbar{display:none}</style>
</head>
<body>
  <div id="swagger-ui" data-spec-url="/api/openapi.json"></div>
  <script src="/api/docs/swagger-ui-bundle.js"></script>
  <script src="/api/docs/init.js"></script>
</body>
</html>`;
		res.status(200).set('Content-Type', 'text/html; charset=utf-8').send(html);
	});

	router.get('/docs/swagger-ui.css', async (_req: Request, res: Response) => {
		try {
			const body = await fetchAsset(`${SWAGGER_CDN}/swagger-ui.css`);
			res.status(200)
				.set('Content-Type', 'text/css; charset=utf-8')
				.set('Cache-Control', 'public, max-age=604800, immutable')
				.send(body);
		} catch (err) {
			ctx.logger.error('[api-gateway] Failed to fetch swagger-ui.css:', err);
			res.status(502).send('/* Failed to load Swagger UI CSS */');
		}
	});

	router.get('/docs/swagger-ui-bundle.js', async (_req: Request, res: Response) => {
		try {
			const body = await fetchAsset(`${SWAGGER_CDN}/swagger-ui-bundle.js`);
			res.status(200)
				.set('Content-Type', 'application/javascript; charset=utf-8')
				.set('Cache-Control', 'public, max-age=604800, immutable')
				.send(body);
		} catch (err) {
			ctx.logger.error('[api-gateway] Failed to fetch swagger-ui-bundle.js:', err);
			res.status(502).send('// Failed to load Swagger UI bundle');
		}
	});

	router.get('/docs/init.js', (_req: Request, res: Response) => {
		const js = `(function () {
  var el = document.getElementById('swagger-ui');
  var specUrl = el ? el.dataset.specUrl : '/api/openapi.json';
  SwaggerUIBundle({
    url: specUrl,
    dom_id: '#swagger-ui',
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout: 'BaseLayout',
    tryItOutEnabled: true,
    persistAuthorization: true,
    deepLinking: true,
    filter: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: -1,
  });
})();`;
		res.status(200)
			.set('Content-Type', 'application/javascript; charset=utf-8')
			.set('Cache-Control', 'no-store')
			.send(js);
	});
}
