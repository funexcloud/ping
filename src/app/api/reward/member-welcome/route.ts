import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { memberWelcomeHandler } = require("../../../../../benefits-api.js") as {
      memberWelcomeHandler: (
        req: { body: Record<string, unknown> },
        res: {
          status: (code: number) => { json: (payload: unknown) => void };
        },
      ) => void;
    };

    let statusCode = 200;
    let payload: unknown = { ok: false };

    memberWelcomeHandler(
      { body },
      {
        status: (code: number) => ({
          json: (data: unknown) => {
            statusCode = code;
            payload = data;
          },
        }),
      },
    );

    return NextResponse.json(payload, { status: statusCode });
  } catch (e) {
    console.error("[api/reward/member-welcome]", e);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
