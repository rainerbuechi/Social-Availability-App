import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body as { query?: string };

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const upstream = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Overpass returned ${upstream.status}` });
    }

    const data = await upstream.json();

    // Cache at CDN for 15 minutes so repeated map pans don't hammer Overpass
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=60");

    return res.status(200).json(data);
  } catch (err) {
    console.error("Overpass proxy error:", err);
    return res.status(502).json({ error: "Failed to reach Overpass API" });
  }
}