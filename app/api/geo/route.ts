import { geolocation } from '@vercel/functions';
import { COUNTRY_BY_CODE } from '../../lib/countries';

// The visitor's country (ISO code, e.g. "CA") from Vercel's IP geolocation headers.
// Returns { country: null } when it's unknown, e.g. in local dev where there are no geo headers.
export function GET(request: Request) {
  const code = geolocation(request).country?.toUpperCase();
  const country = code && COUNTRY_BY_CODE.has(code) ? code : null;
  return Response.json(
    { country },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
