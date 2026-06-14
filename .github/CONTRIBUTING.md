# Contributing

Thanks for your interest in contributing to skedge.

## Setup

You'll need [mise](https://mise.jdx.dev) to manage the Node runtime (Node 26).

```sh
git clone <your-fork>
cd skedge
mise install
npm install
```

Start the dev server:

```sh
mise run dev
```

Opens at `http://localhost:5173`.

## Running tests

```sh
mise run test
```

Tests use [Vitest](https://vitest.dev). Please include tests for new behavior or bug fixes.

## Submitting a PR

1. Fork the repo and create a branch for your change.
2. Make your changes and ensure tests pass.
3. Open a PR against `main`.
4. In the PR description, explain what changed and why - enough context for someone unfamiliar with the problem.
