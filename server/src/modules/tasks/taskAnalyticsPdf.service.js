import puppeteer from "puppeteer";
import { renderTaskAnalyticsPdfHtml } from "./taskAnalyticsPdf.template.js";

function getLaunchOptions() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  return {
    headless: "new",
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=medium",
    ],
  };
}

export async function generateTaskAnalyticsPdfBuffer(reportData) {
  let browser;

  try {
    const html = renderTaskAnalyticsPdfHtml(reportData);
    browser = await puppeteer.launch(getLaunchOptions());
    const page = await browser.newPage();

    await page.setViewport({
      width: 1240,
      height: 1754,
      deviceScaleFactor: 2,
    });
    await page.setContent(html, {
      waitUntil: ["load", "domcontentloaded", "networkidle0"],
      timeout: 60000,
    });
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "16mm",
        left: "10mm",
      },
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width:100%;font-family:Arial,sans-serif;font-size:9px;color:#64748b;padding:0 12mm;display:flex;justify-content:space-between;">
          <span>TheHRSaathi Task Analytics</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      timeout: 60000,
    });

    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
