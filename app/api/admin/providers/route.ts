import { NextResponse } from "next/server";
import { ProviderManagementService } from "@/src/core/services/provider/provider-management.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/providers
 * Get all providers info (balance, health, mode)
 */
export async function GET() {
  try {
    const service = new ProviderManagementService();
    const providersInfo = await service.getAllProvidersInfo();

    return NextResponse.json({
      success: true,
      data: providersInfo.map((info) => ({
        type: info.type,
        mode: info.mode,
        balance: {
          amount: info.balance.balance,
          currency: info.balance.currency,
          lastUpdated: info.balance.lastUpdated,
        },
        health: {
          status: info.health.status,
          latency: info.health.latency,
          lastCheck: info.health.lastCheck,
          message: info.health.message,
        },
      })),
    });
  } catch (error) {
    console.error("Failed to get providers info:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get providers info",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
