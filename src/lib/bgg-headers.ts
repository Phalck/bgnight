// Headers for BoardGameGeek XML API requests.
//
// Do NOT spoof a browser User-Agent/Referer here: BGG sits behind Cloudflare, which answers
// browser-looking requests that lack a real browser fingerprint with a 403 "Just a moment..."
// challenge page. An honest API client UA plus the Bearer token goes straight through.
export function bggHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'bgnight/1.0 (+https://bgnight.vercel.app)',
    'Accept': 'application/xml, text/xml, */*',
  };

  const token = process.env.BGG_API_TOKEN?.trim();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}
