async function safeFetchJson(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    "X-Internal-Secret": process.env.QUERY_ENGINE_SECRET,
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
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
