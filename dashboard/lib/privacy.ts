import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { setMoneyMask } from "./format";

// One flag per request. Pages call loadPrivacy() first; money() and friends then read it while rendering.
const store = cache(() => ({ hide: false }));
setMoneyMask(() => store().hide);

/** Read the "hide financial data" switch (a cookie set by the eye button). Call at the top of every page. */
export async function loadPrivacy() {
  const hide = (await cookies()).get("hide_money")?.value === "1";
  store().hide = hide;
  return hide;
}
export const isPrivate = () => store().hide;
