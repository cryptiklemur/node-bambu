import * as http from 'node:http';

export async function getAuthorizationCode(
  clientId: string,
  redirectUri: string,
  port = Number.parseInt(process.env['PORT'] ?? '3000', 10),
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (request, result) => {
      const url = new URL(request.url ?? '', `http://${request.headers.host}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');

        if (code) {
          result.writeHead(200, { 'Content-Type': 'text/plain' });
          result.end('Tokens received. You can close this window.');
          server.close();
          resolve(code);
        } else {
          console.error('Invalid response from twitch:', url);
          result.writeHead(400, { 'Content-Type': 'text/plain' });
          result.end('Error: Invalid response from Twitch. Please try again.');
          server.close();
          reject(new Error('Invalid response from Twitch'));
        }
      }
    });

    server.listen(port, () => {
      console.log(`Server listening on http://localhost:${process.env['PORT'] ?? 3000}`);
      console.log(`Please visit the following URL to authorize the Twitch bot:`);
      console.log(
        `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}&response_type=code&scope=chat:read+chat:edit+channel:moderate+channel:manage:broadcast`,
      );
    });
  });
}
