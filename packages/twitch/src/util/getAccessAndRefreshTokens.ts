import axios from 'axios';

export async function getAccessAndRefreshTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; tokenExpiry: Date }> {
  const response = await axios.post(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}`,
  );

  const accessToken = response.data.access_token;
  const refreshToken = response.data.refresh_token;
  const tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

  return { accessToken, refreshToken, tokenExpiry };
}
