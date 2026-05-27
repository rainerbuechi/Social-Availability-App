import type { VercelRequest, VercelResponse } from "@vercel/node";

const OVERPASS_ENDPOINT = "https://overpass.kumi.systems/api/interpreter";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Vercel parses the body automatically — extract the query string safely
    let query: string | undefined;

    if (typeof req.body === "object" && req.body !== null) {
      query = req.body.data; // body was parsed as { data: "..." }
    } else if (typeof req.body === "string") {
      query = new URLSearchParams(req.body).get("data") ?? undefined;
    }

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Overpass upstream error:", response.status, text);
      return res.status(response.status).json({ error: `Overpass ${response.status}` });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=900");
    return res.status(200).json(data);
  } catch (err) {
    console.error("Proxy failed:", err);
    return res.status(500).json({ error: String(err) });
  }
}