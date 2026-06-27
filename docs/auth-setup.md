# Auth Setup

Card Reader uses Supabase Auth for real users and \`public.profiles\` for app profile data.

## Required URL Configuration

In Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: \`https://card-reader-xi.vercel.app\`
- Redirect URLs:
  - \`https://card-reader-xi.vercel.app/**\`
  - \`http://localhost:3000/**\`
  - \`http://localhost:3001/**\`
  - \`http://localhost:3010/**\`

The local ports cover the ports this project has used during development.

## Email / Manual Sign-Up

In Supabase Dashboard -> Authentication -> Providers -> Email:

- Enable Email provider.
- For fastest testing, use magic links / OTP.
- Keep email confirmation enabled for production.

The current app calls \`supabase.auth.signInWithOtp()\` for manual email auth, so Gmail, iCloud, and other email addresses work through the same flow.

## Google OAuth

In Supabase Dashboard -> Authentication -> Providers -> Google:

1. Enable Google.
2. Create a Google OAuth client in Google Cloud Console.
3. Add this authorized redirect URI in Google:
   - \`https://hitihjihepmwzwyoggbj.supabase.co/auth/v1/callback\`
4. Copy the Google Client ID and Client Secret into Supabase's Google provider settings.
5. Save.

After this, the app's "Continue with Google" button uses Supabase OAuth and writes the profile row after the user completes profile setup.

## Apple OAuth

In Supabase Dashboard -> Authentication -> Providers -> Apple:

1. Enable Apple.
2. In Apple Developer, create/configure:
   - App ID or Services ID for web sign-in
   - Sign in with Apple capability
   - private key for Sign in with Apple
3. Add this return URL in Apple:
   - \`https://hitihjihepmwzwyoggbj.supabase.co/auth/v1/callback\`
4. Copy the Apple team ID, key ID, services ID/client ID, and private key into Supabase's Apple provider settings.
5. Save.

After this, the app's "Continue with Apple" button uses Supabase OAuth and writes the profile row after the user completes profile setup.

## Verification

After provider setup:

1. Open \`https://card-reader-xi.vercel.app\`.
2. Start profile sign-in.
3. Complete email, Google, or Apple auth.
4. Finish profile setup.
5. Verify a row appears in \`public.profiles\`.

## Notes

- \`profiles\` writes happen client-side with the signed-in user's JWT and RLS.
- Plaid item/account writes should happen server-side with the service role key after public-token exchange.
- Do not expose Plaid access tokens or Supabase service role keys to browser code.
