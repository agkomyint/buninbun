# buninbun

An independent, deliberately small test runner written in TypeScript and executed by Bun. The differential harness runs each fixture with both `bun test` and this runner, comparing exit status, pass/fail/skip counts, and ordered `EVENT` lines emitted by fixtures. It prints the reference Bun version and exits nonzero on a mismatch.

## Benchmark: a workload where buninbun wins

On Windows x64 with Bun 1.4.4, the compiled binary ran this project's synthetic workload of simple passing synchronous tests faster at larger sizes. These are median process wall times, with 3 warmups and 30 measured runs per command:

| Tests | `bun test` | `bun test --dots` | `buninbun test` |
| ---: | ---: | ---: | ---: |
| 1,000 | 23.03 ms | 22.61 ms | 28.49 ms |
| 10,000 | 42.42 ms | 41.99 ms | **31.87 ms** |
| 100,000 | 311.94 ms | 292.94 ms | **70.08 ms** |

For the 100,000-test workload, buninbun took 24% of Bun's time with the dots reporter (about 4.18× faster). This is evidence for this specific workload, not a general speed claim: buninbun implements far fewer features and prints less output. Measurements include process startup and output, and vary by machine. The 1,000-test result shows Bun is faster on that workload. The reproducible benchmark and validation are in [`src/benchmark.ts`](src/benchmark.ts).

## Build and use

Build the executable with `bun run build`. Run a file with `dist/buninbun test path/to/file.test.ts` (on Windows, use `dist/buninbun.exe`). Tests import the supported API from `bun:test`; the CLI redirects those imports to its own implementation. The executable includes Bun, so end users do not need a separate Bun installation.

Run `bun run test` to compare fixtures with the installed Bun. Set `BUNINBUN_BINARY` to the executable path to test the compiled binary; otherwise it tests the source CLI. Add `.test.ts` files in `fixtures/` and emit `console.log("EVENT ...")` to compare observable ordering. Each run uses a separate process.

Run `bun run benchmark` after building. It compares process wall time for 1,000 passing tests, verifies successful counts, rotates execution order, and reports the median and range for Bun's default and dots reporters and buninbun. This includes startup and output overhead; it is not a general performance comparison because the runners have different features and reporting. Configure `BENCH_TESTS`, `BENCH_WARMUPS`, `BENCH_ITERATIONS`, and optionally `BUNINBUN_BINARY` via environment variables.

CI builds and compares the executable on Linux, macOS and Windows. Pushing a `v*` tag triggers a GitHub Release with Linux x64, macOS ARM64 and Windows x64 binaries and SHA-256 checksums. The release workflow can also be run manually to produce workflow artifacts without publishing a release.

The runner implements `test`, `it`, `describe`, `test.skip`, `test.only`, lifecycle hooks, async tests, and a small set of matchers. This is an experiment, not a drop-in replacement: discovery, timeouts, mocks, snapshots, error formatting, and many edge cases are not implemented. The import redirect is a simple textual substitution, so unusual import syntax and arbitrary source text containing that exact string are not fully supported. The current comparison checks aggregate outcomes, not individual test identities or exact errors; add explicit event markers where behavior matters.

Licensed under the [MIT License](LICENSE).
