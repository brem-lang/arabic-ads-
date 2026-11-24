import { handleSubmitLead } from '../../lib/lead-proxy.server';

export function POST(request: Request) {
  return handleSubmitLead(request);
}
