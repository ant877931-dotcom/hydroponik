export function middleware(request) {
  const secret = request.headers.get('x-sentinel-secret');

  if (secret !== 'S3CR3T_K3Y_H1DR0P0N1K_2026') {
    return new Response('403 Forbidden: Direct access denied.', { status: 403 });
  }
}
