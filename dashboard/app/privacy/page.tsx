import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY_TEXT } from "./text";

// Read LEGAL_PAGES_LIVE on each request, so the page is a 404 whenever it is unset.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy Policy — Paragraph Dashboard" };

export default function Privacy() {
  return <LegalPage title="Privacy" text={PRIVACY_TEXT} />;
}
