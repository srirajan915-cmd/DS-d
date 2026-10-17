import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { status, nextFollowUpDate } = await request.json();

    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: "Follow-up record not found" }, { status: 404 });
    }

    const followedUpAt = status === "FOLLOWED_UP" ? new Date() : null;

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        status,
        followedUpAt,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : existing.nextFollowUpDate,
      },
    });

    // If marked done and next follow-up date requested, auto-schedule next follow-up
    if (status === "FOLLOWED_UP" && nextFollowUpDate) {
      await prisma.followUp.create({
        data: {
          type: existing.type,
          personType: existing.personType,
          directSellerId: existing.directSellerId,
          customerId: existing.customerId,
          productId: existing.productId,
          followUpDate: new Date(nextFollowUpDate),
          status: "PENDING",
          notes: `Follow-up continuing from previous completed on ${new Date().toLocaleDateString("en-IN")}`,
        },
      });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error("Update follow-up status error:", error);
    return NextResponse.json({ error: "Failed to update follow-up status" }, { status: 500 });
  }
}
