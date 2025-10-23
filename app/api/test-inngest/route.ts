// app/api/test-inngest/route.ts
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";

export async function GET() {
  // Send a test event to Inngest
  await inngest.send({
    name: "test/hello.world",
    data: { name: "Annalogica" },
  });

  return NextResponse.json({ status: "Event sent!" });
}
