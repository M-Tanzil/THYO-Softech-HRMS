
import js from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/**",
      "prisma/migrations/**",
      "uploads/**",
    ],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
