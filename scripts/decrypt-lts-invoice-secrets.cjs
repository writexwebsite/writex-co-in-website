#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");

if (process.argv.length !== 6) {
  process.stderr.write(
    "Usage: decrypt-lts-invoice-secrets.cjs PACKAGE PEER_PUBLIC_KEY TLS_PRIVATE_KEY OUTPUT\n",
  );
  process.exit(2);
}

const [packagePath, peerPublicKeyPath, tlsPrivateKeyPath, outputPath] =
  process.argv.slice(2);
const envelope = JSON.parse(fs.readFileSync(packagePath, "utf8"));

if (
  envelope.version !== 1 ||
  envelope.algorithm !== "ECDH-P256+SHA256+AES-256-GCM" ||
  envelope.certificateSha1 !== "869130BE1DBB0597A0C634F9CE3BFE217DB94F6B"
) {
  throw new Error("Encrypted deployment envelope is not approved.");
}

const privateKey = crypto.createPrivateKey(
  fs.readFileSync(tlsPrivateKeyPath, "utf8"),
);
const publicKey = crypto.createPublicKey(
  fs.readFileSync(peerPublicKeyPath, "utf8"),
);
const sharedSecret = crypto.diffieHellman({ privateKey, publicKey });
const key = crypto.createHash("sha256").update(sharedSecret).digest();
const nonce = Buffer.from(envelope.nonce, "base64");
const tag = Buffer.from(envelope.tag, "base64");
const ciphertext = Buffer.from(envelope.ciphertext, "base64");
const aad = Buffer.from(envelope.aad, "utf8");
const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
decipher.setAAD(aad);
decipher.setAuthTag(tag);
const plaintext = Buffer.concat([
  decipher.update(ciphertext),
  decipher.final(),
]);

if (
  plaintext.includes(0) ||
  !plaintext.toString("utf8").includes("LTS_INVOICE_VERIFICATION_SHARED_SECRET=") ||
  !plaintext.toString("utf8").includes("LTS_REPRESENTATIVES_API_KEY=")
) {
  throw new Error("Decrypted deployment environment is invalid.");
}

fs.writeFileSync(outputPath, plaintext, { mode: 0o600, flag: "wx" });
fs.chmodSync(outputPath, 0o600);
process.stdout.write("DECRYPTED_ENVIRONMENT=READY\n");
