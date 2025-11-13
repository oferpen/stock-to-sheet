import { google } from "googleapis";
import { JWT } from "google-auth-library";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

async function getAuthorizedJWT(): Promise<JWT> {
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!serviceEmail) {
    throw new Error("GOOGLE_SERVICE_EMAIL environment variable is not set");
  }
  if (!privateKey) {
    throw new Error("GOOGLE_PRIVATE_KEY environment variable is not set");
  }

  // Process the private key - handle both escaped newlines and actual newlines
  const processedKey = privateKey.replace(/\\n/g, "\n").trim();
  
  if (!processedKey || !processedKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error("GOOGLE_PRIVATE_KEY appears to be invalid or empty. It should start with '-----BEGIN PRIVATE KEY-----'");
  }

  const jwt = new google.auth.JWT({
    email: serviceEmail,
    key: processedKey,
    scopes: SCOPES,
  });
  
  await jwt.authorize();
  return jwt;
}

async function getSheetsClient() {
  const jwt = await getAuthorizedJWT();
  return google.sheets({ version: "v4", auth: jwt });
}

export async function readTickers(sheetId: string, tab: string): Promise<string[]> {
  const sheets = await getSheetsClient();
  const range = `${tab}!A2:A`;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    const rows = res.data.values ?? [];
    return rows.map(r => (r[0] ?? "").trim()).filter(Boolean);
  } catch (error: any) {
    if (error.code === 404) {
      const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL;
      // Try to get spreadsheet metadata to see if we can access it at all
      try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetNames = metadata.data.sheets?.map(s => s.properties?.title).filter(Boolean) || [];
        throw new Error(
          `Tab "${tab}" not found (404). Please verify:\n` +
          `1. The tab name "${tab}" exists in the sheet\n` +
          `2. Available tabs: ${sheetNames.join(", ")}\n` +
          `3. Service account: ${serviceEmail}`
        );
      } catch (metaError: any) {
        // If we can't even get metadata, it's a sharing or sheet ID issue
        if (metaError.code === 404 || metaError.code === 403) {
          throw new Error(
            `Sheet not found or access denied (${metaError.code}). Please verify:\n` +
            `1. SHEET_ID is correct: ${sheetId}\n` +
            `2. The sheet is shared with the service account: ${serviceEmail}\n` +
            `3. The service account has Editor access`
          );
        }
        throw error;
      }
    }
    throw error;
  }
}

export async function writeTickers(sheetId: string, tab: string, tickers: string[]) {
  // Read existing tickers to avoid duplicates
  const existingTickers = await readTickers(sheetId, tab);
  const existingSet = new Set(existingTickers.map(t => t.toUpperCase()));
  
  // Filter out tickers that already exist
  const newTickers = tickers.filter(t => !existingSet.has(t.toUpperCase()));
  
  if (newTickers.length === 0) {
    console.log("All tickers already exist in the sheet");
    return;
  }
  
  const sheets = await getSheetsClient();
  
  // Find the next empty row (starting from row 2)
  const startRow = existingTickers.length + 2;
  const range = `${tab}!A${startRow}:A${startRow + newTickers.length - 1}`;
  const values = newTickers.map(t => [t.toUpperCase()]);
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values
    }
  });
  
  console.log(`Added ${newTickers.length} new ticker(s): ${newTickers.join(", ")}`);
}

export async function writeResults(
  sheetId: string,
  tab: string,
  rows: Array<{ rowIndex: number; price?: number; changePct?: number; timestamp: string; error?: string }>
) {
  const sheets = await getSheetsClient();
  const updates = rows.map(r => {
    const price = Number.isFinite(r.price as number) ? (r.price as number) : "";
    const chg = Number.isFinite(r.changePct as number) ? (r.changePct as number) : "";
    const stamp = r.error ? `error: ${r.error} @ ${r.timestamp}` : r.timestamp;
    return {
      range: `${tab}!B${r.rowIndex}:D${r.rowIndex}`,
      values: [[price, chg, stamp]]
    };
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      data: updates,
      valueInputOption: "USER_ENTERED"
    }
  });
}
