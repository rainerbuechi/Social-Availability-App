// api/overpass.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const OVERPASS_ENDPOINT = "https://overpass.kumi.systems/api/interpreter";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: req.body,
      // No AbortController needed — Vercel functions have their own timeout
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Overpass error" });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=900"); // cache 15 min on CDN edge
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Proxy failed" });
  }
}