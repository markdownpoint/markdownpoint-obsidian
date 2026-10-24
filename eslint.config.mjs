/*
 * MarkdownPoint - Plugin for Obsidian
 * Copyright (c) 2026 Johan Sanneblad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
  { ignores: ["main.js", "dist/**", "coverage/**", "test-vault/**", ".verification/**"] },
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: { parserOptions: { project: "./tsconfig.json" } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "obsidianmd/prefer-file-manager-trash-file": "error",
      "obsidianmd/ui/sentence-case": "error",
    },
  },
  {
    files: ["src/**/*.ts"],
    rules: { "obsidianmd/no-nodejs-modules": "error" },
  },
  {
    files: ["tests/**/*.ts", "*.mjs"],
    languageOptions: { globals: globals.node },
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
      "obsidianmd/prefer-active-doc": "off",
      "no-restricted-imports": "off",
      "@typescript-eslint/no-restricted-imports": "off",
    },
  },
]);
