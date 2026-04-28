import { NextResponse } from "next/server";
import { ProviderManagementService } from "@/src/core/services/provider/provider-management.service";
import { ProviderType } from "@/src/core/domain/enums/provider.enum";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/providers/[type]
 * Get specific provider info
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const providerType = type.toUpperCase() as ProviderType;

    // Validate provider type
    if (!Object.values(ProviderType).includes(providerType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid provider type",
          validTypes: Object.values(ProviderType),
        },
        { status: 400 }
      );
    }

    const service = new ProviderManagementService();
    const info = await service.getProviderInfo(providerType);

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error(`Failed to get provider info:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get provider info",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
