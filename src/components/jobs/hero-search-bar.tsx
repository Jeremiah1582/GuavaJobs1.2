"use client";

import { Briefcase, Loader2, MapPin, Search } from "lucide-react";

import type { ExperienceLevel, JobCountry } from "@/lib/validators/jobs";

type HeroSearchBarProps = {
  query: string;
  where: string;
  country: JobCountry;
  experienceLevel: ExperienceLevel;
  onQueryChange: (value: string) => void;
  onWhereChange: (value: string) => void;
  onCountryChange: (value: JobCountry) => void;
  onExperienceLevelChange: (value: ExperienceLevel) => void;
  onSubmit: () => void;
  isScanning?: boolean;
};

const COUNTRY_OPTIONS: { value: JobCountry; label: string }[] = [
  { value: "gb", label: "United Kingdom" },
  { value: "de", label: "Germany" },
  { value: "us", label: "United States" },
  { value: "global", label: "Global" },
];

const LEVEL_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: "ANY", label: "Any level" },
  { value: "INTERN", label: "Intern / Trainee" },
  { value: "JUNIOR", label: "Graduate / Junior" },
  { value: "MID", label: "Mid-level" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead / Staff" },
];

export function HeroSearchBar({
  query,
  where,
  country,
  experienceLevel,
  onQueryChange,
  onWhereChange,
  onCountryChange,
  onExperienceLevelChange,
  onSubmit,
  isScanning = false,
}: HeroSearchBarProps) {
  const cityPlaceholder =
    country === "de" ? "City, e.g. Berlin" : "City, e.g. London";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex w-full flex-col gap-3 rounded-2xl border border-guava-green/20 bg-card/95 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-end lg:flex-nowrap lg:gap-4"
    >
      <div className="relative min-w-0 w-full sm:flex-[2_1_16rem] lg:flex-[2.5]">
        <Briefcase
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-guava-pink/70"
          aria-hidden
        />
        <input
          id="hero-search-q"
          name="q"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Junior AI engineer, React developer, solutions engineer…"
          className="flex h-12 w-full min-w-0 rounded-xl border border-input/80 bg-background py-2 pl-11 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-guava-green/35"
        />
      </div>
      <div className="relative min-w-0 w-full sm:flex-[1.5_1_12rem] lg:flex-[1.5]">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-guava-green/80"
          aria-hidden
        />
        <input
          id="hero-search-where"
          name="where"
          type="search"
          value={where}
          onChange={(e) => onWhereChange(e.target.value)}
          placeholder={cityPlaceholder}
          className="flex h-12 w-full min-w-0 rounded-xl border border-input/80 bg-background py-2 pl-11 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-guava-green/35"
        />
      </div>
      <div className="relative w-full sm:flex-[1_1_10rem] sm:min-w-[10rem] sm:max-w-[12rem] lg:flex-none lg:w-40">
        <label htmlFor="hero-search-country" className="sr-only">
          Market
        </label>
        <select
          id="hero-search-country"
          name="country"
          value={country}
          onChange={(e) => onCountryChange(e.target.value as JobCountry)}
          className="flex h-12 w-full min-w-0 rounded-xl border border-input/80 bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-guava-green/35"
        >
          {COUNTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="relative w-full sm:flex-[1_1_10rem] sm:min-w-[10rem] sm:max-w-[12rem] lg:flex-none lg:w-36">
        <label htmlFor="hero-search-level" className="sr-only">
          Experience level
        </label>
        <select
          id="hero-search-level"
          name="level"
          value={experienceLevel}
          onChange={(e) =>
            onExperienceLevelChange(e.target.value as ExperienceLevel)
          }
          className="flex h-12 w-full min-w-0 rounded-xl border border-input/80 bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-guava-green/35"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isScanning}
        className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-guava-green-gradient px-6 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:min-w-[9.5rem] lg:flex-none"
      >
        {isScanning ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            <span className="whitespace-nowrap">Scanning…</span>
          </>
        ) : (
          <>
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">Search</span>
          </>
        )}
      </button>
    </form>
  );
}
