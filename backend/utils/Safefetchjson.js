async function safeFetchJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    return {
      ok: false,
      data: null,
      error: `Network error reaching ${url}: ${networkError.message}`,
    };
  }

  const rawText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (parseError) {
    return {
      ok: false,
      data: null,
      error: `Non-JSON response from ${url} (status ${response.status}): ${rawText.slice(0, 200)}`,
    };
  }

  return { ok: response.ok, data: parsed, error: null };
}

module.exports = { safeFetchJson };
