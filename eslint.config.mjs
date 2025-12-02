import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// const eslintConfig = [
//   // ...compat.extends("next/core-web-vitals", "next/typescript"),
//     ...compat.extends([]), // This will disable the default rule sets
// ];

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Relax or disable specific rules
      "no-console": "off", // Disable the no-console rule
      "react/no-unused-vars": "warn", // Change from error to a warning
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }], // Ignore unused args starting with _
      "next/no-page-custom-font": "off", // Disable next specific rule
    },
  },
];

export default eslintConfig;
