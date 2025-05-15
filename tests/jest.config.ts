import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest/presets/js-with-babel",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transformIgnorePatterns: [
    "/node_modules/(?![@polymeshassociation/src]).+\\.js$",
  ],
  testMatch: ["**/__tests__/**/*.(ts|tsx)"],
  testPathIgnorePatterns: ["dist", ".history", "utils.ts"],
  moduleNameMapper: {
    "~/(.*)": "<rootDir>/src/$1",
  },
  testTimeout: 5 * 60 * 1000,
  globalSetup: "<rootDir>/src/helpers/admin-setup.ts",
};
export default config;
