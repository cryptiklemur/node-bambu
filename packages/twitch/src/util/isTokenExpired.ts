export function isTokenExpired(tokenExpiry: Date) {
  if (!(tokenExpiry instanceof Date) || Number.isNaN(tokenExpiry.getTime())) {
    return true;
  }

  const expiresIn = (tokenExpiry.getTime() - Date.now()) / 1000;

  return expiresIn <= 60;
}
