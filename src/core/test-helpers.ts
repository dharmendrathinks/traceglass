export function entry(
  url = "https://app.test/api/users/123?access_token=SECRET",
  overrides: Record<string, unknown> = {},
) {
  return {
    request: {
      method: "GET",
      url,
      headers: [{ name: "Authorization", value: "SECRET" }],
      cookies: [{ name: "session", value: "SECRET" }],
      postData: { text: "SECRET" },
    },
    response: {
      status: 200,
      bodySize: 1000,
      headersSize: 200,
      content: { text: "SECRET", size: 5000, mimeType: "application/json" },
      headers: [{ name: "Set-Cookie", value: "SECRET" }],
    },
    startedDateTime: "2026-10-03T10:00:00Z",
    time: 150,
    timings: { wait: 80 },
    ...overrides,
  };
}
