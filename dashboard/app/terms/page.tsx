import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { TERMS_TEXT } from "./text";

// Read LEGAL_PAGES_LIVE on each request, so the page is a 404 whenever it is unset.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms of Use — Paragraph Dashboard" };

export default function Terms() {
  return <LegalPage title="Terms" text={TERMS_TEXT} />;
}
