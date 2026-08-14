import { NextResponse } from 'next/server';

export function middleware(request) {
  const secret = request.headers.get('x-sentinel-secret');

  // Jika secret key tidak cocok atau tidak ada, tendang ke halaman 403 atau blokir
  if (secret !== 'S3CR3T_K3Y_H1DR0P0N1K_2026') {
    return new NextResponse('403 Forbidden: Direct access denied.', {
      status: 403,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
