name: Run Tests
on:
  workflow_dispatch:

jobs:
  test:
    name: Testing
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      CI: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'yarn'
          cache-dependency-path: 'tests/yarn.lock'
      - name: install dependencies
        run: yarn --frozen-lockfile
        working-directory: tests
      - name: test
        run: yarn test
        working-directory: tests
