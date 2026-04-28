import { NextRequest, NextResponse } from "next/server";
import { ProviderRepository } from "@/src/infra/db/repositories/provider.repository";

const providerRepo = new ProviderRepository();

interface ProviderSettingsBody {
  provider?: string;
  defaultMargin?: number;
  marginType?: "FIXED" | "PERCENTAGE" | string;
  isActive?: boolean;
}

/**
 * GET /api/admin/providers/settings
 * Get all provider settings (margin configuration)
 */
export async function GET() {
  try {
    const settings = await providerRepo.getAllProviderSettings();

    // Convert Decimal to number for JSON serialization
    const serializedSettings = settings.map((setting) => ({
      ...setting,
      defaultMargin: Number(setting.defaultMargin),
      lastBalance: setting.lastBalance ? Number(setting.lastBalance) : null,
    }));

    return NextResponse.json({
      success: true,
      data: serializedSettings,
    });
  } catch (error: unknown) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to get provider settings"
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/providers/settings
 * Update provider settings (margin configuration)
 * 
 * Body: {
 *   provider: string,
 *   defaultMargin: number,
 *   marginType: "FIXED" | "PERCENTAGE",
 *   isActive: boolean
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as ProviderSettingsBody;

    // Validate required fields
    if (!body.provider || body.defaultMargin === undefined || !body.marginType) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: provider, defaultMargin, marginType" 
        },
        { status: 400 }
      );
    }

    const marginType = body.marginType;

    // Validate marginType
    if (marginType !== "FIXED" && marginType !== "PERCENTAGE") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid marginType. Must be FIXED or PERCENTAGE" 
        },
        { status: 400 }
      );
    }

    // Validate defaultMargin is a positive number
    if (typeof body.defaultMargin !== "number" || body.defaultMargin < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "defaultMargin must be a positive number" 
        },
        { status: 400 }
      );
    }

    const setting = await providerRepo.upsertProviderSetting({
      provider: body.provider,
      defaultMargin: body.defaultMargin,
      marginType,
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    // Convert Decimal to number for JSON serialization
    const serializedSetting = {
      ...setting,
      defaultMargin: Number(setting.defaultMargin),
      lastBalance: setting.lastBalance ? Number(setting.lastBalance) : null,
    };

    return NextResponse.json({
      success: true,
      data: serializedSetting,
    });
  } catch (error: unknown) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to update provider settings"
      },
      { status: 500 }
    );
  }
}
