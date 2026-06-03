// Rebuild better-sqlite3 native bindings for the Node version running npm install.
const { execSync } = require("child_process");

try {
  execSync("npm rebuild better-sqlite3", { stdio: "inherit" });
} catch {
  console.warn(
    "[postinstall] better-sqlite3 rebuild failed — if APIs return HTML errors, run: npm rebuild better-sqlite3",
  );
}
