/**
 * Sveltia CMS — GitHub OAuth Authentication Proxy
 *
 * Deploy this Worker to Cloudflare, then:
 *   1. Create a GitHub OAuth App whose callback URL is:
 *      https://<this-worker>.workers.dev/callback
 *   2. Set secrets (via `wrangler secret put`):
 *      GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 *   3. Put <this-worker>.workers.dev in public/admin/config.yml under base_url.
 *
 * Endpoints:
 *   GET /auth      — starts the OAuth flow (redirects to GitHub)
 *   GET /callback  — exchanges the code for an access token and posts it to the CMS
 */

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL     = 'https://github.com/login/oauth/access_token';

/** Tiny helper: wrap a postMessage script in a minimal HTML page. */
function postMsgPage(message) {
  const safeMsg = JSON.stringify(message);
  return new Response(
    `<!doctype html><html><body><script>
      (function () {
        function send() {
          window.opener.postMessage(${safeMsg}, '*');
          window.close();
        }
        if (window.opener) { send(); }
        else { window.addEventListener('load', send); }
      })();
    <\/script></body></html>`,
    { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── /auth ─────────────────────────────────────────────────
    // Redirect the browser to GitHub's authorization page.
    if (url.pathname === '/auth') {
      const params = new URLSearchParams({
        client_id:    env.GITHUB_CLIENT_ID,
        redirect_uri: `${url.origin}/callback`,
        scope:        'repo,user',
        state:        crypto.randomUUID(),
      });
      return Response.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`, 302);
    }

    // ── /callback ─────────────────────────────────────────────
    // GitHub redirects here with ?code=… after the user approves.
    if (url.pathname === '/callback') {
      const code  = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const errorDesc = url.searchParams.get('error_description');

      if (error || !code) {
        const msg = `authorization:github:error:${JSON.stringify({
          message: errorDesc ?? error ?? 'No authorisation code received.',
        })}`;
        return postMsgPage(msg);
      }

      let access_token;
      try {
        const res = await fetch(GITHUB_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept':       'application/json',
          },
          body: JSON.stringify({
            client_id:     env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri:  `${url.origin}/callback`,
          }),
        });
        const json = await res.json();
        access_token = json.access_token;
        if (!access_token) {
          throw new Error(json.error_description ?? json.error ?? 'Empty token response');
        }
      } catch (err) {
        const msg = `authorization:github:error:${JSON.stringify({ message: String(err) })}`;
        return postMsgPage(msg);
      }

      const msg = `authorization:github:success:${JSON.stringify({
        token:    access_token,
        provider: 'github',
      })}`;
      return postMsgPage(msg);
    }

    return new Response('Not found', { status: 404 });
  },
};
