import type { VercelRequest, VercelResponse } from "@vercel/node";

// Tell Vercel to parse the JSON body automatically
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Handle body whether it arrived as a parsed object or a raw string
  let query: string | undefined;

  if (typeof req.body === "string") {
    // Body parser was bypassed — body is raw string
    try {
      const parsed = JSON.parse(req.body);
      query = parsed?.query;
    } catch {
      query = req.body; // treat the whole body as the query
    }
  } else {
    query = req.body?.query;
  }

  if (!query || typeof query !== "string") {
    console.error("Missing or invalid query. req.body:", req.body);
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const upstream = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error(`Overpass returned ${upstream.status}:`, text);
      return res
        .status(upstream.status)
        .json({ error: `Overpass returned ${upstream.status}`, detail: text });
    }

    const data = await upstream.json();

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    console.error("Overpass proxy error:", err);
    return res.status(502).json({ error: "Failed to reach Overpass API" });
  }
}