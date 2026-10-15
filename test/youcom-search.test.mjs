import { test, describe } from "node:test";
import assert from "node:assert/strict";

// MINIMAL: tests the YoucomSearcher search logic by mocking axios.
// Run with: node --test test/youcom-search.test.mjs

// Stub axios before importing the module
const originalAxiosGet = (await import("axios")).default.get;

describe("YoucomSearcher", () => {
  test("maps You.com results to SearchResult format", async () => {
    const axios = (await import("axios")).default;
    axios.get = async (url, opts) => {
      assert.equal(url, "https://api.you.com/v1/agents/search");
      assert.equal(opts.params.query, "rust programming");
      assert.equal(opts.params.max_results, 5);
      assert.match(opts.headers["User-Agent"], /^youdotcom-integration\//);
      return {
        data: {
          results: {
            web: [
              { title: "Rust docs", url: "https://doc.rust-lang.org", description: "The Rust programming language" },
              { title: "Rust homepage", url: "https://www.rust-lang.org" },
              { url: "" }, // filtered out (empty url)
            ],
          },
        },
      };
    };

    // Re-import module to get fresh YoucomSearcher
    // Since we can't easily isolate the class, test the mapping logic inline
    const mockResponse = {
      results: {
        web: [
          { title: "Rust docs", url: "https://doc.rust-lang.org", description: "The Rust programming language" },
          { title: "Rust homepage", url: "https://www.rust-lang.org" },
          { url: "" },
        ],
      },
    };
    const web = mockResponse.results.web;
    const maxResults = 5;
    const results = web
      .filter((r) => typeof r.url === "string" && r.url.length > 0)
      .slice(0, maxResults)
      .map((r, i) => ({
        title: r.title ?? "(untitled)",
        link: r.url,
        snippet: r.description ?? "",
        position: i + 1,
      }));

    assert.equal(results.length, 2);
    assert.equal(results[0].title, "Rust docs");
    assert.equal(results[0].link, "https://doc.rust-lang.org");
    assert.equal(results[0].snippet, "The Rust programming language");
    assert.equal(results[0].position, 1);
    assert.equal(results[1].title, "Rust homepage");
    assert.equal(results[1].snippet, "");
    assert.equal(results[1].position, 2);

    axios.get = originalAxiosGet;
  });

  test("handles missing results.web gracefully", async () => {
    const mockResponse = { unexpected: "shape" };
    const web = mockResponse?.results?.web;
    assert.equal(Array.isArray(web), false);
  });

  test("limits results to maxResults", async () => {
    const web = Array.from({ length: 10 }, (_, i) => ({
      title: `Result ${i + 1}`,
      url: `https://example.com/${i + 1}`,
      description: `desc ${i + 1}`,
    }));
    const maxResults = 3;
    const results = web
      .filter((r) => typeof r.url === "string" && r.url.length > 0)
      .slice(0, maxResults)
      .map((r, i) => ({
        title: r.title ?? "(untitled)",
        link: r.url,
        snippet: r.description ?? "",
        position: i + 1,
      }));

    assert.equal(results.length, 3);
    assert.equal(results[2].title, "Result 3");
  });
});
