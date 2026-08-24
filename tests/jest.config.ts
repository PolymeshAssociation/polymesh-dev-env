import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest/presets/js-with-babel",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transformIgnorePatterns: [
    "/node_modules/(?![@polymeshassociation/src]).+\\.js$",
  ],
  testMatch: ["**/__tests__/**/*.(ts|tsx)"],
  // testPathIgnorePatterns entries are unanchored regexes matched against the full path, so a
  // bare "dist" also excludes any test whose name merely contains that substring (e.g. a
  // "distributions" test) — anchor on the path separator to only exclude the actual dist/ dir.
  testPathIgnorePatterns: ["/dist/", "/\\.history/", "/utils\\.ts$"],
  moduleNameMapper: {
    "~/(.*)": "<rootDir>/src/$1",
  },
  testTimeout: 5 * 60 * 1000,
  globalSetup: "<rootDir>/src/helpers/admin-setup.ts",
};
export default config;
