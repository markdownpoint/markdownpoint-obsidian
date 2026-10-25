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

import { build, context } from "esbuild";
import { readFile } from "node:fs/promises";

const stylesheet = await build({ entryPoints: ["styles.css"], write: false, logLevel: "warning" });
if (stylesheet.warnings.length) throw new Error("Stylesheet validation produced warnings");

const notices = await readFile(new URL("./THIRD_PARTY_NOTICES.md", import.meta.url), "utf8");

const options = {
  entryPoints: ["src/main.ts"],
  outfile: "main.js",
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2022",
  external: ["obsidian", "@codemirror/*", "@lezer/*"],
  logLevel: "info",
  sourcemap: process.argv.includes("--watch") ? "inline" : false,
  legalComments: "inline",
  // Obsidian installs the bundle without npm's package license files.
  banner: { js: `/*\n${notices}\n*/` },
};

if (process.argv.includes("--watch")) {
  const buildContext = await context(options);
  await buildContext.watch();
} else {
  await build(options);
}
