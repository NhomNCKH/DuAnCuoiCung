import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getBackendOrigin() {
  const origin =
    process.env.BACKEND_ORIGIN ||
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
    'http://144.91.104.237';

  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

function buildTargetUrl(request: NextRequest, path: string[]) {
  const pathname = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const search = searchParams ? `?${searchParams}` : '';

  return `${getBackendOrigin()}/${pathname}${search}`;
}

function buildProxyHeaders(request: NextRequest) {
  const headers = new Headers();

  const headerNames = [
    'authorization',
    'content-type',
    'accept',
    'cookie',
    'user-agent',
    'x-requested-with',
  ];

  for (const name of headerNames) {
    const value = request.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  }

  return headers;
}

async function proxyRequest(
  request: NextRequest,
  params: { path: string[] },
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
) {
  try {
    const url = buildTargetUrl(request, params.path);
    const body =
      method === 'GET' || method === 'DELETE'
        ? undefined
        : Buffer.from(await request.arrayBuffer());

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('Proxy timeout'), 20000);
    const response = await fetch(url, {
      method,
      headers: buildProxyHeaders(request),
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const responseHeaders = new Headers();
    const contentType = response.headers.get('content-type');
    const cacheControl = response.headers.get('cache-control');

    if (contentType) {
      responseHeaders.set('content-type', contentType);
    }

    if (cacheControl) {
      responseHeaders.set('cache-control', cacheControl);
    }

    responseHeaders.set('x-toeic-proxy-origin', getBackendOrigin());

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    if ((error as any)?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Gateway timeout', message: 'Backend response timeout' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params, 'DELETE');
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'x-toeic-proxy-origin': getBackendOrigin(),
    },
  });
}
