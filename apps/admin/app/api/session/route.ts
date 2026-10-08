import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const cookieName = "bazaar_platform_session";
const api = process.env.API_URL ?? "http://127.0.0.1:4000";
function validOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}
function clear(response: NextResponse) {
  response.cookies.set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({error:{code:"forbidden"}}, {status:403});
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error:{code:"invalid_request"}},{status:400});
  try {
    const upstream = await fetch(api + "/auth/login", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
    const data = await upstream.json();
    if (!upstream.ok) return NextResponse.json({error:data.error ?? {code:"invalid_credentials"}},{status:upstream.status});
    const roles: string[] = data.user?.roles ?? [];
    if (!roles.some(role => ["platform_support","platform_admin","super_admin"].includes(role))) return NextResponse.json({error:{code:"forbidden"}},{status:403});
    const response = NextResponse.json({user:data.user});
    const expire = Date.parse(data.session.expiresAt);
    response.cookies.set(cookieName, data.session.token, {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",expires:Number.isFinite(expire)?new Date(expire):undefined});
    return response;
  } catch { return NextResponse.json({error:{code:"service_unavailable"}},{status:503}); }
}
export async function GET() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return NextResponse.json({error:{code:"invalid_session"}},{status:401});
  try {
    const upstream = await fetch(api+"/auth/session",{headers:{authorization:"Bearer "+token},cache:"no-store"});
    if (!upstream.ok) return clear(NextResponse.json({error:{code:"invalid_session"}},{status:401}));
    const data = await upstream.json();
    if (!data.user?.roles?.some((role:string) => ["platform_support","platform_admin","super_admin"].includes(role))) return clear(NextResponse.json({error:{code:"forbidden"}},{status:403}));
    return NextResponse.json({user:data.user});
  } catch { return NextResponse.json({error:{code:"service_unavailable"}},{status:503}); }
}
export async function DELETE(request:NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({error:{code:"forbidden"}},{status:403});
  const token = (await cookies()).get(cookieName)?.value;
  if (token) await fetch(api+"/auth/logout",{method:"POST",headers:{authorization:"Bearer "+token}}).catch(()=>undefined);
  return clear(NextResponse.json({ok:true}));
}
