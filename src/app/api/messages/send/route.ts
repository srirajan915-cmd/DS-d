import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMessagingProvider } from "@/lib/messaging";
import { formatDateIST } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { followUpIds, templateId, customText, channel = "WHATSAPP_LINK" } = await request.json();

    if (!Array.isArray(followUpIds) || followUpIds.length === 0) {
      return NextResponse.json({ error: "No follow-up recipients selected." }, { status: 400 });
    }

    // Fetch template if provided
    let rawTemplate = customText || "";
    if (templateId) {
      const tpl = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
      if (tpl) {
        rawTemplate = tpl.content;
      }
    }

    if (!rawTemplate.trim()) {
      return NextResponse.json({ error: "Message text or template is required." }, { status: 400 });
    }

    // Fetch follow-ups with related persons
    const followUps = await prisma.followUp.findMany({
      where: { id: { in: followUpIds }, isDeleted: false },
      include: {
        customer: true,
        directSeller: true,
        product: true,
      },
    });

    const provider = getMessagingProvider(channel);
    const results = [];

    for (const fu of followUps) {
      const isCust = fu.personType === "CUSTOMER";
      const name = isCust ? fu.customer?.name : fu.directSeller?.name;
      const phone = isCust ? fu.customer?.phone : fu.directSeller?.phone;
      const dsCode = isCust ? "" : fu.directSeller?.dsCode || "";
      const product = fu.product?.name || "your direct-selling wellness products";
      const date = formatDateIST(fu.followUpDate);

      if (!phone) continue;

      const variables = {
        name: name || "Partner",
        product,
        ds_code: dsCode,
        date,
      };

      const sendResult = await provider.send({
        to: phone,
        text: rawTemplate,
        recipientName: name,
        variables,
      });

      // Log in MessageLog
      const logged = await prisma.messageLog.create({
        data: {
          followUpId: fu.id,
          recipientName: name || "Unknown",
          recipientPhone: phone,
          channel: sendResult.channel,
          templateId: templateId || null,
          messageText: rawTemplate,
          status: sendResult.success ? "SENT" : "FAILED",
        },
      });

      results.push({
        followUpId: fu.id,
        recipientName: name,
        recipientPhone: phone,
        channel: sendResult.channel,
        whatsAppUrl: sendResult.whatsAppUrl,
        success: sendResult.success,
        error: sendResult.error,
        logId: logged.id,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      channel: provider.channel,
      messages: results,
    });
  } catch (error) {
    console.error("Send messages error:", error);
    return NextResponse.json({ error: "Failed to process messages" }, { status: 500 });
  }
}
