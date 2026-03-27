import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:8001";
  const { pathname, search } = request.nextUrl;

  const url = `${apiUrl}${pathname}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
    // @ts-expect-error duplex is needed for streaming body
    duplex: "half",
  });

  const responseHeaders = new Headers(res.headers);
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export const config = {
  matcher: "/api/:path*",
};
