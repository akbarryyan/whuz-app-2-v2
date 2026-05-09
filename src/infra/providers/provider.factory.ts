import { IProviderPort } from "@/src/core/ports/provider.port";
import { ProviderType, ProviderMode } from "@/src/core/domain/enums/provider.enum";
import { DigiflazzAdapter } from "./digiflazz/digiflazz.adapter";
import { VipResellerAdapter } from "./vip/vip.adapter";
import { Agenh2hAdapter } from "./agenh2h/agenh2h.adapter";
import { MockProviderAdapter } from "./mock/mock-provider.adapter";

// ── Runtime mode override (admin toggle, survives hot-reload via globalThis) ──
const g = globalThis as unknown as {
  _providerModeOverride?: Partial<Record<ProviderType, ProviderMode>>;
  _providerModeInitialized?: boolean;
};
if (!g._providerModeOverride) g._providerModeOverride = {};

export function setProviderModeOverride(provider: ProviderType, mode: ProviderMode | null): void {
  if (!g._providerModeOverride) g._providerModeOverride = {};
  if (mode === null) {
    delete g._providerModeOverride[provider];
  } else {
    g._providerModeOverride[provider] = mode;
  }
  // Persist to DB (fire-and-forget — import dynamically to avoid circular deps)
  import("@/lib/site-config").then(({ setSiteConfig, deleteSiteConfig }) => {
    const key = provider === ProviderType.DIGIFLAZZ
      ? "PROVIDER_DIGIFLAZZ_MODE"
      : provider === ProviderType.VIP_RESELLER
        ? "PROVIDER_VIP_MODE"
        : "PROVIDER_AGENH2H_MODE";
    if (mode === null) {
      deleteSiteConfig(key).catch(() => {});
    } else {
      setSiteConfig(key, mode.toLowerCase()).catch(() => {});
    }
  }).catch(() => {});
}

export function getProviderModeOverrides(): Partial<Record<ProviderType, ProviderMode>> {
  return { ...(g._providerModeOverride ?? {}) };
}

/**
 * Load provider modes from DB into globalThis cache.
 * Call once on server init or when admin opens the settings page.
 */
export async function initProviderModesFromDB(): Promise<void> {
  try {
    const { getAllSiteConfig } = await import("@/lib/site-config");
    const cfg = await getAllSiteConfig();

    if (!g._providerModeOverride) g._providerModeOverride = {};

    const dfVal = cfg["PROVIDER_DIGIFLAZZ_MODE"];
    if (dfVal === "real") g._providerModeOverride[ProviderType.DIGIFLAZZ] = ProviderMode.REAL;
    else if (dfVal === "mock") g._providerModeOverride[ProviderType.DIGIFLAZZ] = ProviderMode.MOCK;

    const vipVal = cfg["PROVIDER_VIP_MODE"];
    if (vipVal === "real") g._providerModeOverride[ProviderType.VIP_RESELLER] = ProviderMode.REAL;
    else if (vipVal === "mock") g._providerModeOverride[ProviderType.VIP_RESELLER] = ProviderMode.MOCK;

    const agenh2hVal = cfg["PROVIDER_AGENH2H_MODE"];
    if (agenh2hVal === "real") g._providerModeOverride[ProviderType.AGENH2H] = ProviderMode.REAL;
    else if (agenh2hVal === "mock") g._providerModeOverride[ProviderType.AGENH2H] = ProviderMode.MOCK;

    g._providerModeInitialized = true;
  } catch {
    // Non-fatal — fall through to env defaults
  }
}

export class ProviderFactory {
  /**
   * Create provider instance based on type and environment mode
   */
  static create(providerType: ProviderType): IProviderPort {
    const mode = this.getProviderMode(providerType);

    if (mode === ProviderMode.MOCK) {
      return new MockProviderAdapter(providerType);
    }

    switch (providerType) {
      case ProviderType.DIGIFLAZZ:
        return new DigiflazzAdapter();
      case ProviderType.VIP_RESELLER:
        return new VipResellerAdapter();
      case ProviderType.AGENH2H:
        return new Agenh2hAdapter();
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }

  /**
   * Get all available providers
   */
  static getAllProviders(): IProviderPort[] {
    return [
      this.create(ProviderType.DIGIFLAZZ),
      this.create(ProviderType.VIP_RESELLER),
      this.create(ProviderType.AGENH2H),
    ];
  }

  /**
   * Get provider mode — runtime override (loaded from DB) takes precedence over env vars
   */
  static getProviderMode(providerType: ProviderType): ProviderMode {
    // 1. Admin runtime override (pre-loaded from DB at startup or on first admin access)
    const override = g._providerModeOverride?.[providerType];
    if (override) return override;

    // 2. Environment variable
    const envKey =
      providerType === ProviderType.DIGIFLAZZ
        ? "PROVIDER_DIGIFLAZZ_MODE"
        : providerType === ProviderType.VIP_RESELLER
          ? "PROVIDER_VIP_MODE"
          : providerType === ProviderType.AGENH2H
            ? "PROVIDER_AGENH2H_MODE"
          : "";
    const envMode = process.env[envKey];
    if (envMode?.toLowerCase() === ProviderMode.REAL) return ProviderMode.REAL;

    // 3. Default: mock (safe default)
    return ProviderMode.MOCK;
  }

  /**
   * Get provider mode info for all providers
   */
  static getProviderModes(): Record<string, ProviderMode> {
    return {
      [ProviderType.DIGIFLAZZ]: this.getProviderMode(ProviderType.DIGIFLAZZ),
      [ProviderType.VIP_RESELLER]: this.getProviderMode(ProviderType.VIP_RESELLER),
      [ProviderType.AGENH2H]: this.getProviderMode(ProviderType.AGENH2H),
    };
  }
}
