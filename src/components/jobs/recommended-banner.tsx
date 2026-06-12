"use client";

import type { SearchProfile } from "@/lib/validators/search-profile";

type RecommendedBannerProps = {
  searchProfile: SearchProfile | null;
  mode: "recommended" | "search";
  widenedFamilies?: boolean;
};

export function RecommendedBanner({
  searchProfile,
  mode,
  widenedFamilies = false,
}: RecommendedBannerProps) {
  if (mode === "search" || !searchProfile) return null;

  const roles = [
    ...searchProfile.primaryRoles.slice(0, 2),
    ...searchProfile.derivedRoles.slice(0, 2),
  ].filter(Boolean);

  const roleLabel =
    roles.length > 0
      ? roles.join(", ")
      : searchProfile.targetRoleFamilies.slice(0, 3).join(" · ");

  if (!roleLabel) return null;

  return (
    <div className="rounded-xl border border-guava-green/20 bg-guava-green-light/20 px-4 py-3 text-sm">
      <p className="font-medium text-guava-green-dark">Recommended for you</p>
      <p className="mt-1 text-muted-foreground">
        Matched because you&apos;re targeting{" "}
        <span className="font-medium text-foreground">{roleLabel}</span>
        {searchProfile.isCareerChange && searchProfile.bridgeRoles.length > 0 ? (
          <> — including bridge roles where your background is an asset</>
        ) : null}
        {widenedFamilies ? (
          <span className="mt-1 block text-xs text-muted-foreground/80">
            We widened role families to surface more relevant listings.
          </span>
        ) : null}
      </p>
    </div>
  );
}
