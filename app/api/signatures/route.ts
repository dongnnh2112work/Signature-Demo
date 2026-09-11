import { addLocalSignature, listLocalSignatures } from "@/lib/signatures/local-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(listLocalSignatures());
}

export async function POST(request: Request) {
  const body = (await request.json()) as { svg?: unknown };
  const svg = typeof body.svg === "string" ? body.svg : "";

  if (svg.length < 40) {
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }

  return Response.json(addLocalSignature(svg), { status: 201 });
}
