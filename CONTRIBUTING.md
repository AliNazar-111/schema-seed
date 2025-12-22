# Contributing to schema-seed

Thank you for your interest in contributing to `schema-seed`! We welcome contributions from everyone.

## Development Setup

This project uses a monorepo structure managed by `pnpm` and `turborepo`.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-repo/schema-seed.git
    cd schema-seed
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

3.  **Build all packages**:
    ```bash
    pnpm build
    ```

4.  **Run tests**:
    ```bash
    pnpm test
    ```

## Project Structure

- `packages/core`: Core seeding logic, dependency graph, and types.
- `packages/cli`: Command-line interface.
- `packages/generators`: Semantic data generators and inference.
- `packages/adapter-*`: Database-specific adapters (Postgres, MySQL, SQLite, etc.).

## Contribution Workflow

1.  **Create a branch**:
    ```bash
    git checkout -b feat/your-feature-name
    ```

2.  **Make your changes**:
    Ensure your code follows the project's linting and formatting rules.

3.  **Add tests**:
    We aim for high test coverage. Please add tests for any new features or bug fixes.

4.  **Submit a Pull Request**:
    Provide a clear description of your changes and why they are needed.

## Release Process

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

If your PR includes user-facing changes, please add a changeset:
```bash
pnpm changeset
```
Follow the prompts to select the packages and the type of change (patch, minor, or major).
