import { readFile, writeFile } from "node:fs/promises";

const packagePath = new URL("../package.json", import.meta.url);
const cargoPath = new URL("../src-tauri/Cargo.toml", import.meta.url);
const tauriConfigPath = new URL("../src-tauri/tauri.conf.json", import.meta.url);

const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const version = packageJson.version;

if (!version) {
  throw new Error("package.json must define a version");
}

const tauriConfig = JSON.parse(await readFile(tauriConfigPath, "utf8"));
tauriConfig.version = version;
await writeFile(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`, "utf8");

const cargoToml = await readFile(cargoPath, "utf8");
const nextCargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`);

if (!/^version = ".*"$/m.test(cargoToml)) {
  throw new Error("Unable to locate version field in src-tauri/Cargo.toml");
}

await writeFile(cargoPath, nextCargoToml, "utf8");

console.log(`Synchronized desktop app version ${version}`);
