import { NextResponse } from "next/server";
import { ProviderManagementService } from "@/src/core/services/provider/provider-management.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/providers/logs
 * Get provider operation logs
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") || undefined;
    const action = searchParams.get("action") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const service = new ProviderManagementService();
    const logs = await service.getProviderLogs({
      provider,
      action,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: logs,
      meta: {
        limit,
        offset,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error("Failed to get provider logs:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get provider logs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
