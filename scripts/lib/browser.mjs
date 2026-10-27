import { chromium } from 'playwright';

// PW_CHANNEL=chrome uses system Chrome (needed where cdn.playwright.dev is blocked).
export async function launch() {
  const channel = process.env.PW_CHANNEL || undefined;
  const browser = await chromium.launch({ headless: true, channel });
  const context = await browser.newContext({ locale: 'fa-IR', viewport: { width: 1366, height: 900 } });
  return { browser, context };
}
