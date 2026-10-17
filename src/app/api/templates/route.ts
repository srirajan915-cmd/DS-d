import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/templates
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Fetch templates error:", error);
    return NextResponse.json({ error: "Failed to fetch message templates" }, { status: 500 });
  }
}

// POST /api/templates
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, type, content, isDefault } = body;

    if (!name || !content) {
      return NextResponse.json({ error: "Name and message content are required." }, { status: 400 });
    }

    const created = await prisma.messageTemplate.create({
      data: {
        name: name.trim(),
        type: type || "GENERAL",
        content: content.trim(),
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({ success: true, template: created });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json({ error: "Failed to create message template" }, { status: 500 });
  }
}
