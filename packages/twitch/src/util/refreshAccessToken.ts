import axios from 'axios';

export async function refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const response = await axios.post(
    `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}`,
  );

  console.log(response);

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    tokenExpiry: new Date(Date.now() + response.data.expires_in * 1000),
  };
}
