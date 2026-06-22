const STORAGE_KEY = "jilson.attribution";

export type Attribution = {
  source: string | null;
  campaign: string | null;
  capturedAt: string;
};

// First-touch attribution. On the first visit that carries UTM params we read
// utm_source/utm_campaign from the URL and persist them in localStorage; we
// never overwrite (the first touch wins). Consumed later at checkout/user
// creation (Stripe webhook, P4) -> User.acquisitionSource/acquisitionCampaign.
// Best-effort: any storage error is swallowed (private mode, disabled storage).
export function captureUtmOnce(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(STORAGE_KEY)) return; // first-touch wins
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    const campaign = params.get("utm_campaign");
    if (!source && !campaign) return; // nothing to capture
    const attribution: Attribution = {
      source,
      campaign,
      capturedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    /* storage unavailable — attribution is best-effort */
  }
}

export function getStoredAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}
