import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from './server';

export async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Authentication is required.' }, { status: 401 }),
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }),
    };
  }

  return {
    user: data.user,
    response: null,
  };
}
