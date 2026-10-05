export const EXAM_METADATA = {
  courseCode: "CS 401",
  title: "Advanced Distributed Systems & Cryptographic Verification",
  totalDurationMinutes: 15,
  instructions: [
    "This examination runs under local-first cryptographic proctoring.",
    "Zero outbound network packets are dispatched; all anomaly detection runs in-browser.",
    "Remain within frame and maintain focused orientation on the viewport.",
    "Navigation outside the exam window, unauthorized devices, or multiple individuals will be logged on the SHA-256 ledger."
  ]
};

export const EXAM_QUESTIONS = [
  {
    id: 1,
    title: "Consensus in Asynchronous Distributed Systems",
    question: "According to the Fischer-Lynch-Paterson (FLP) impossibility result, what is the fundamental guarantee regarding consensus in an asynchronous network?",
    options: [
      {
        id: "A",
        text: "Deterministic asynchronous consensus is impossible in the presence of even a single unannounced crash failure."
      },
      {
        id: "B",
        text: "Byzantine fault tolerance requires a minimum of 2f + 1 nodes to achieve liveness and safety."
      },
      {
        id: "C",
        text: "Partitions in network topology can always be resolved using Raft leader lease timeouts."
      },
      {
        id: "D",
        text: "Vector clocks can guarantee total ordering across arbitrary crash-recovery topologies."
      }
    ],
    correctAnswer: "A",
    explanationPrompt: "Briefly explain the trade-off between safety and liveness in FLP and how partial synchrony models (e.g., Paxos/Raft) bypass it:"
  },
  {
    id: 2,
    title: "Cryptographic Hash-Chaining & Merkle Structures",
    question: "In an append-only audit ledger where block_i.hash = H(i || timestamp || prevHash || payload), how does tamper-evidence protect against historical modification?",
    options: [
      {
        id: "A",
        text: "Any alteration of payload in block_k produces an avalanche effect altering H_k, immediately invalidating block_{k+1}'s prevHash reference."
      },
      {
        id: "B",
        text: "Symmetric AES-GCM encryption tags prevent the reader from computing subsequent SHA-256 hashes."
      },
      {
        id: "C",
        text: "The browser's IndexedDB engine locks mutated rows with an immutable OS-level write fence."
      },
      {
        id: "D",
        text: "ECDSA keypairs automatically re-sign the entire blockchain whenever a bit-flip occurs."
      }
    ],
    correctAnswer: "A",
    explanationPrompt: "Explain why verifying the terminal ECDSA digital signature over the latest block transitively validates every preceding transaction in the chain:"
  },
  {
    id: 3,
    title: "Client-Side Zero-Knowledge Inference & WebAssembly",
    question: "Why does running inference exclusively via WebAssembly/WebGL on client hardware provide structural privacy guarantees over server-streamed proctoring?",
    options: [
      {
        id: "A",
        text: "Raw pixel buffers never traverse the network stack; only cryptographically signed telemetry leaves the client device if submitted."
      },
      {
        id: "B",
        text: "WebAssembly completely eliminates GPU memory consumption during matrix multiplication."
      },
      {
        id: "C",
        text: "TensorFlow.js WebGL shaders automatically mask user IP addresses at the TCP layer."
      },
      {
        id: "D",
        text: "Browser sandboxes natively prevent webcam frames from being read by JavaScript execution threads."
      }
    ],
    correctAnswer: "A",
    explanationPrompt: "Discuss the security trade-offs of local client inference regarding client tampering vs. candidate biometric data privacy:"
  }
];
