"use client";

import dynamic from "next/dynamic";

const CustomCursor = dynamic(
  () => import("@/components/landing/CustomCursor"),
  { ssr: false }
);

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CustomCursor />
      {children}
    </>
  );
}