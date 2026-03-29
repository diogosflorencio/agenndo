/**
 * Next.js faz sempre path.join(projeto, distDir). Caminhos absolutos em outro disco no Windows
 * viram Z:\projeto\C:\Users\... (inválido). Solução: manter distDir como ".next" e criar
 * junction (Win) ou symlink (Unix) .next -> pasta em disco local.
 *
 * AGENNDO_LOCAL_NEXT_DIST=0 — não usa junction (recomendado: .next fica ao lado de node_modules).
 * AGENNDO_LOCAL_NEXT_DIST=1 — junction .next → AppData (só use se souber o impacto; em projeto em Z: e
 *   node_modules em Z:, emitir server em C:\ quebra require('next/...') nas API routes → 404).
 */
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const root = process.cwd();
const linkPath = path.join(root, ".next");

const projectId = crypto.createHash("sha256").update(path.resolve(root).toLowerCase()).digest("hex").slice(0, 12);

function localTargetDir() {
  const base =
    process.platform === "win32"
      ? process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local")
      : path.join(os.homedir(), ".cache");
  return path.join(base, "agenndo-next", projectId);
}

function shouldUseLocal() {
  if (process.env.AGENNDO_LOCAL_NEXT_DIST === "0") return false;
  if (process.env.AGENNDO_LOCAL_NEXT_DIST === "1") return true;
  return false;
}

function readLinkTarget(p) {
  try {
    const raw = fs.readlinkSync(p);
    return path.isAbsolute(raw) ? raw : path.resolve(path.dirname(p), raw);
  } catch {
    return null;
  }
}

function sameResolved(a, b) {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

function createLink(targetAbs) {
  if (process.platform === "win32") {
    fs.symlinkSync(targetAbs, linkPath, "junction");
  } else {
    fs.symlinkSync(targetAbs, linkPath, "dir");
  }
}

function main() {
  const targetAbs = path.resolve(localTargetDir());

  if (!shouldUseLocal()) {
    if (fs.existsSync(linkPath)) {
      const linkTarget = readLinkTarget(linkPath);
      if (linkTarget !== null && sameResolved(linkTarget, targetAbs)) {
        fs.unlinkSync(linkPath);
        console.log(
          "[agenndo] Junction .next → disco local removido. Output fica no projeto (mesmo volume que node_modules); evita 404 em rotas /api."
        );
      }
    }
    return;
  }

  fs.mkdirSync(targetAbs, { recursive: true });

  if (!fs.existsSync(linkPath)) {
    createLink(targetAbs);
    console.log(`[agenndo] .next → build em disco local:\n  ${targetAbs}`);
    return;
  }

  const linkTarget = readLinkTarget(linkPath);
  if (linkTarget !== null) {
    if (sameResolved(linkTarget, targetAbs)) return;
    fs.unlinkSync(linkPath);
    createLink(targetAbs);
    console.log(`[agenndo] .next atualizado → ${targetAbs}`);
    return;
  }

  const st = fs.lstatSync(linkPath);
  if (st.isDirectory()) {
    console.warn(
      "[agenndo] A pasta .next já existe como diretório (não é atalho ao disco local). " +
        "Para usar build em AppData e evitar erros em drive de rede, apague a pasta .next e rode npm run dev de novo."
    );
  }
}

main();
