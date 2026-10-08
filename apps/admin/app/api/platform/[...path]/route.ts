import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{path:string[]}> };
const api = process.env.API_URL ?? "http://127.0.0.1:4000";
async function forward(request:NextRequest, context:Context) {
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin && origin !== request.nextUrl.origin) return NextResponse.json({error:{code:"forbidden"}},{status:403});
  const token = (await cookies()).get("bazaar_platform_session")?.value;
  if (!token) return NextResponse.json({error:{code:"invalid_session"}},{status:401});
  const {path} = await context.params;
  if (!path.length || path.some(part => !/^[a-zA-Z0-9_-]+$/.test(part))) return NextResponse.json({error:{code:"invalid_request"}},{status:400});
  const url = new URL(api+"/platform/"+path.map(encodeURIComponent).join("/"));
  url.search = request.nextUrl.search;
  try {
    const upstream = await fetch(url, {
      method:request.method,
      headers:{authorization:"Bearer "+token, ...(request.method==="GET"?{}:{"content-type":"application/json"})},
      body:request.method==="GET"?undefined:await request.text(),
      cache:"no-store"
    });
    return new NextResponse(upstream.body, {status:upstream.status,headers:{"content-type":upstream.headers.get("content-type")??"application/json","cache-control":"no-store"}});
  } catch {return NextResponse.json({error:{code:"service_unavailable"}},{status:503});}
}
export const GET=forward;
export const POST=forward;
export const PUT=forward;
export const PATCH=forward;
export const DELETE=forward;
