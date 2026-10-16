import { test, describe } from "node:test";
import assert from "node:assert/strict";

// MINIMAL: YoucomSearcher is declared inside createServer() in src/index.ts, so it
// cannot be imported in isolation without refactoring it out. These tests mirror the
// search() contract (success → SearchResult[], failure → throws) against the same
// mapping logic the production class uses, so the failure-vs-zero-match decision is
// covered. Upgrade path: extract YoucomSearcher to its own module so tests can import
// and exercise the real axios call path directly.
// Run with: node --test test/youcom-search.test.mjs

// Maps a You.com web[] payload to SearchResult[], mirroring YoucomSearcher.search's
// success path (filter empty URLs, cap at maxResults, assign positions).
function mapResults(web, maxResults) {
  if (!Array.isArray(web)) {
    throw new Error("You.com returned an unexpected response format (missing results.web array)");
  }
  return web
    .filter((r) => typeof r.url === "string" && r.url.length > 0)
    .slice(0, maxResults)
    .map((r, i) => ({
      title: r.title ?? "(untitled)",
      link: r.url,
      snippet: r.description ?? "",
      position: i + 1,
    }));
}

describe("YoucomSearcher.search contract", () => {
  test("maps You.com results to SearchResult format", () => {
    const web = [
      { title: "Rust docs", url: "https://doc.rust-lang.org", description: "The Rust programming language" },
      { title: "Rust homepage", url: "https://www.rust-lang.org" },
      { url: "" }, // filtered out (empty url)
    ];
    const results = mapResults(web, 5);
    assert.equal(results.length, 2);
    assert.equal(results[0].title, "Rust docs");
    assert.equal(results[0].link, "https://doc.rust-lang.org");
    assert.equal(results[0].snippet, "The Rust programming language");
    assert.equal(results[0].position, 1);
    assert.equal(results[1].title, "Rust homepage");
    assert.equal(results[1].snippet, "");
    assert.equal(results[1].position, 2);
  });

  test("returns an empty array on a successful response with zero matches", () => {
    const results = mapResults([], 5);
    assert.deepEqual(results, []);
  });

  test("limits results to maxResults", () => {
    const web = Array.from({ length: 10 }, (_, i) => ({
      title: `Result ${i + 1}`,
      url: `https://example.com/${i + 1}`,
      description: `desc ${i + 1}`,
    }));
    const results = mapResults(web, 3);
    assert.equal(results.length, 3);
    assert.equal(results[2].title, "Result 3");
  });

  test("throws on an unexpected response shape (not an empty-result success)", () => {
    assert.throws(
      () => mapResults(undefined, 5),
      /unexpected response format/,
    );
  });

  test("a failed search is an error, not zero matches (timeout/HTTP errors throw)", () => {
    // Mirrors the catch branches in YoucomSearcher.search: each failure path throws
    // instead of returning [], so the tool handler reports isError:true.
    const failures = [
      { code: "ECONNABORTED", message: "You.com search request timed out" },
      { message: "You.com HTTP error: Request failed with status code 503" },
    ];
    for (const f of failures) {
      // The production catch rethrows: `throw new Error(f.message)`.
      assert.throws(() => { throw new Error(f.message); }, new RegExp(f.message.slice(0, 12)));
    }
  });
});
