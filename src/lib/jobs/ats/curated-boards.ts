export type CuratedBoard = {
  provider: "greenhouse" | "lever";
  org: string;
  displayName: string;
};

/** Hand-picked boards — all levels ingested; experience filter at search time. */
export const CURATED_BOARDS: CuratedBoard[] = [
  { provider: "greenhouse", org: "stripe", displayName: "Stripe" },
  { provider: "greenhouse", org: "github", displayName: "GitHub" },
  { provider: "greenhouse", org: "figma", displayName: "Figma" },
  { provider: "greenhouse", org: "notion", displayName: "Notion" },
  { provider: "greenhouse", org: "anthropic", displayName: "Anthropic" },
  { provider: "greenhouse", org: "datadog", displayName: "Datadog" },
  { provider: "greenhouse", org: "hellofresh", displayName: "HelloFresh" },
  { provider: "greenhouse", org: "zalando", displayName: "Zalando" },
  { provider: "greenhouse", org: "contentful", displayName: "Contentful" },
  { provider: "greenhouse", org: "n26", displayName: "N26" },
  { provider: "greenhouse", org: "celonis", displayName: "Celonis" },
  { provider: "greenhouse", org: "deepl", displayName: "DeepL" },
  { provider: "greenhouse", org: "personio", displayName: "Personio" },
  { provider: "greenhouse", org: "deliveroo", displayName: "Deliveroo" },
  { provider: "greenhouse", org: "monzo", displayName: "Monzo Bank" },
  { provider: "greenhouse", org: "revolut", displayName: "Revolut" },
  { provider: "lever", org: "spotify", displayName: "Spotify" },
  { provider: "lever", org: "plaid", displayName: "Plaid" },
  { provider: "lever", org: "dropbox", displayName: "Dropbox" },
  { provider: "lever", org: "reddit", displayName: "Reddit" },
  { provider: "lever", org: "omio", displayName: "Omio" },
  { provider: "lever", org: "sennder", displayName: "sennder" },
  { provider: "lever", org: "deel", displayName: "Deel" },
];
