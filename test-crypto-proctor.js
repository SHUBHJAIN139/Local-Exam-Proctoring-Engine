import {
  createGenesisBlock,
  appendBlock,
  generateProctorKeyPair,
  signExamSummary,
  verifySignature,
  verifyChain,
  computeBlockHash
} from './src/utils/cryptoAudit.js';
import { calculateTrustScore, getPenaltyDetails, PENALTY_RULES } from './src/utils/scoring.js';

// Polyfill window.crypto if running in Node.js
import { webcrypto } from 'node:crypto';
if (!globalThis.window) {
  globalThis.window = { crypto: webcrypto };
} else if (!globalThis.window.crypto) {
  globalThis.window.crypto = webcrypto;
}
if (!globalThis.navigator) {
  globalThis.navigator = { userAgent: "NodeJS Test Suite" };
}

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING CRYPTOGRAPHIC PROCTOR ENGINE VERIFICATION");
  console.log("==================================================");

  // 1. Genesis Block creation
  const genesis = await createGenesisBlock({ test: true });
  console.log(`[PASS] Genesis block created with index: ${genesis.index}, prevHash: ${genesis.prevHash.slice(0, 16)}...`);
  if (genesis.index !== 0 || genesis.prevHash !== "0".repeat(64)) {
    throw new Error("Genesis block test failed!");
  }

  // 2. Append blocks with industrial proctoring rules
  let chain = [genesis];
  chain = await appendBlock(chain, 'CALIBRATION_COMPLETED', { baseline: "NORMAL_CENTERED" });
  chain = await appendBlock(chain, 'UNAUTHORIZED_MATERIAL_DETECTED', { item: 'cell phone', confidence: '85%' }); // -25
  chain = await appendBlock(chain, 'MULTIPLE_PERSONS_DETECTED', { secondaryWidthPercent: '30%' }); // -20
  chain = await appendBlock(chain, 'TAB_SWITCH', { alert: '⚠ TAB SWITCH DETECTED' }); // -10
  chain = await appendBlock(chain, 'HEAD_POSE_PITCH_VIOLATION', { pitch: 0.82, direction: 'TILTED_DOWN_LAP' }); // -5
  chain = await appendBlock(chain, 'PROLONGED_EYES_CLOSED', { ear: 0.12, duration: '>=2.0s' }); // -5

  console.log(`[PASS] Appended 6 blocks. Total chain height: ${chain.length}`);

  // 3. Score calculation
  const score = calculateTrustScore(chain);
  // Base 100 - UNAUTHORIZED(25) - MULTIPLE_PERSONS(20) - TAB_SWITCH(10) - PITCH(5) - EYES_CLOSED(5) = 35
  console.log(`[PASS] Computed Trust Score: ${score}/100 (Expected: 35)`);
  if (score !== 35) {
    throw new Error(`Score mismatch: expected 35, got ${score}`);
  }

  // 4. ECDSA Keypair Generation & Summary Signing
  const { keyPair, publicKeyHex } = await generateProctorKeyPair();
  console.log(`[PASS] Generated ECDSA P-256 Public Key (SPKI): ${publicKeyHex.slice(0, 32)}...`);

  const terminalBlock = chain[chain.length - 1];
  const summary = {
    totalBlocks: chain.length,
    finalScore: score,
    terminalHash: terminalBlock.hash
  };

  const { summaryString, signatureHex } = await signExamSummary(keyPair.privateKey, summary);
  console.log(`[PASS] Generated ECDSA Digital Signature: ${signatureHex.slice(0, 32)}...`);

  // 5. Signature Verification
  const isSigValid = await verifySignature(publicKeyHex, signatureHex, summaryString);
  console.log(`[PASS] Standalone Signature Verification: ${isSigValid ? "VALID" : "INVALID"}`);
  if (!isSigValid) throw new Error("Signature verification failed!");

  // 6. Chain Integrity Verification (Intact)
  const intactVerify = await verifyChain(chain, signatureHex, publicKeyHex, summary);
  console.log(`[PASS] Chain Integrity Verification:`, intactVerify);
  if (!intactVerify.valid || !intactVerify.signatureValid) {
    throw new Error("Intact chain verification failed!");
  }

  // 7. Tamper Detection Test
  console.log("\n--- Injecting Tamper Simulation ---");
  const tamperedChain = JSON.parse(JSON.stringify(chain));
  tamperedChain[2].payload = { reason: "Forged clean payload" }; // Modify block #2 payload

  const tamperVerify = await verifyChain(tamperedChain, signatureHex, publicKeyHex, summary);
  console.log(`[PASS] Tamper Detection Result:`, tamperVerify);
  if (tamperVerify.valid) {
    throw new Error("Tamper detection failed! Tampered chain was marked valid.");
  }
  if (tamperVerify.brokenIndex !== 2) {
    throw new Error(`Expected brokenIndex to be 2, but got ${tamperVerify.brokenIndex}`);
  }
  console.log(`[PASS] Successfully detected tampering at Block #${tamperVerify.brokenIndex}!`);

  console.log("\n==================================================");
  console.log("ALL CRYPTOGRAPHIC & SCORING TESTS PASSED (100%)");
  console.log("==================================================");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
