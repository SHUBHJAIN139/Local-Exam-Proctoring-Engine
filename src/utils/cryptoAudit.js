/**
 * Cryptographic Audit Engine
 * 100% Client-Side Real Cryptography using Web Crypto API (window.crypto.subtle)
 * SHA-256 hash-chaining and ECDSA (P-256 / SHA-256) keypair signing.
 */

// Buffer to Hex string
export function bufferToHex(buffer) {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Hex string to Uint8Array
export function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Compute SHA-256 hash of a string
export async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

// Compute hash of a block
// Format: `${index}|${timestamp}|${prevHash}|${event}|${JSON.stringify(payload)}`
export async function computeBlockHash(block) {
  const rawString = `${block.index}|${block.timestamp}|${block.prevHash}|${block.event}|${JSON.stringify(block.payload)}`;
  return await sha256(rawString);
}

// Create Genesis Block
export async function createGenesisBlock(initialPayload = {}) {
  const genesis = {
    index: 0,
    timestamp: Date.now(),
    prevHash: "0".repeat(64),
    event: "SESSION_INIT",
    payload: {
      clientAgent: navigator.userAgent,
      resolution: `${window.innerWidth}x${window.innerHeight}`,
      ...initialPayload
    }
  };
  genesis.hash = await computeBlockHash(genesis);
  return genesis;
}

// Append new block to chain
export async function appendBlock(chain, event, payload = {}) {
  const prevBlock = chain[chain.length - 1];
  const newIndex = chain.length;
  const timestamp = Date.now();
  const prevHash = prevBlock ? prevBlock.hash : "0".repeat(64);

  const block = {
    index: newIndex,
    timestamp,
    prevHash,
    event,
    payload
  };

  block.hash = await computeBlockHash(block);
  return [...chain, block];
}

// Generate ECDSA (P-256 / SHA-256) Keypair
export async function generateProctorKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true, // extractable
    ["sign", "verify"]
  );

  const exportedPub = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyHex = bufferToHex(exportedPub);

  return {
    keyPair,
    publicKeyHex
  };
}

// Sign final exam summary
// Summary object: { totalBlocks, finalScore, terminalHash, candidateId, timestamp }
export async function signExamSummary(privateKey, summaryObj) {
  const summaryString = JSON.stringify(summaryObj, Object.keys(summaryObj).sort());
  const encoder = new TextEncoder();
  const data = encoder.encode(summaryString);

  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }
    },
    privateKey,
    data
  );

  return {
    summaryString,
    signatureHex: bufferToHex(signatureBuffer)
  };
}

// Verify ECDSA signature
export async function verifySignature(publicKeyHex, signatureHex, summaryString) {
  try {
    const pubKeyBuffer = hexToBuffer(publicKeyHex);
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      pubKeyBuffer,
      {
        name: "ECDSA",
        namedCurve: "P-256"
      },
      true,
      ["verify"]
    );

    const sigBuffer = hexToBuffer(signatureHex);
    const encoder = new TextEncoder();
    const data = encoder.encode(summaryString);

    const isValid = await window.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" }
      },
      publicKey,
      sigBuffer,
      data
    );

    return isValid;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

/**
 * Chain Verifier Function
 * Recomputes all hashes sequentially and verifies the signature if provided.
 * @param {Array} chain Array of blocks
 * @param {string} [signatureHex]
 * @param {string} [publicKeyHex]
 * @param {object} [summaryObj]
 * @returns {Promise<{ valid: boolean, brokenIndex: number | null, signatureValid: boolean, details: string }>}
 */
export async function verifyChain(chain, signatureHex = null, publicKeyHex = null, summaryObj = null) {
  if (!Array.isArray(chain) || chain.length === 0) {
    return {
      valid: false,
      brokenIndex: 0,
      signatureValid: false,
      details: "Audit ledger is empty or not an array."
    };
  }

  // 1. Verify Genesis Block
  const genesis = chain[0];
  if (genesis.index !== 0) {
    return {
      valid: false,
      brokenIndex: 0,
      signatureValid: false,
      details: `Genesis block index must be 0, found ${genesis.index}.`
    };
  }
  if (genesis.prevHash !== "0".repeat(64)) {
    return {
      valid: false,
      brokenIndex: 0,
      signatureValid: false,
      details: "Genesis block prevHash does not match 64 zeroes."
    };
  }

  const expectedGenesisHash = await computeBlockHash(genesis);
  if (expectedGenesisHash !== genesis.hash) {
    return {
      valid: false,
      brokenIndex: 0,
      signatureValid: false,
      details: `Genesis block hash mismatch. Expected ${expectedGenesisHash.slice(0, 16)}..., found ${genesis.hash?.slice(0, 16)}...`
    };
  }

  // 2. Sequentially verify subsequent blocks
  for (let i = 1; i < chain.length; i++) {
    const currentBlock = chain[i];
    const prevBlock = chain[i - 1];

    if (currentBlock.index !== i) {
      return {
        valid: false,
        brokenIndex: i,
        signatureValid: false,
        details: `Block index sequence mismatch at #${i}. Found ${currentBlock.index}.`
      };
    }

    if (currentBlock.prevHash !== prevBlock.hash) {
      return {
        valid: false,
        brokenIndex: i,
        signatureValid: false,
        details: `PrevHash mismatch at block #${i}. Block prevHash (${currentBlock.prevHash.slice(0, 10)}...) != Prev block hash (${prevBlock.hash.slice(0, 10)}...).`
      };
    }

    const computedHash = await computeBlockHash(currentBlock);
    if (computedHash !== currentBlock.hash) {
      return {
        valid: false,
        brokenIndex: i,
        signatureValid: false,
        details: `Hash mismatch at block #${i} ("${currentBlock.event}"). Computed ${computedHash.slice(0, 12)}... but stored ${currentBlock.hash?.slice(0, 12)}...`
      };
    }
  }

  // 3. Verify ECDSA signature if provided
  let signatureValid = true;
  if (signatureHex && publicKeyHex && summaryObj) {
    const summaryString = JSON.stringify(summaryObj, Object.keys(summaryObj).sort());
    signatureValid = await verifySignature(publicKeyHex, signatureHex, summaryString);
    if (!signatureValid) {
      return {
        valid: false,
        brokenIndex: null,
        signatureValid: false,
        details: "Cryptographic hash chain is intact, but ECDSA digital signature verification failed!"
      };
    }
  }

  return {
    valid: true,
    brokenIndex: null,
    signatureValid,
    details: `Chain integrity verified across all ${chain.length} blocks. Zero tampering detected.`
  };
}
