// ABI of SealedInvoiceRegistry v3 (contracts/legacy/SealedInvoiceRegistryV3.sol).
// Kept only to read and pay invoices anchored on the v3 testnet registry;
// v3 is never deployed again, so no bytecode is kept.
export const REGISTRY_V3_ABI = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "firstInvoiceKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "firstFingerprint",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "invoiceKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "fingerprint",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "anchoredAt",
        "type": "uint64"
      }
    ],
    "name": "InvoiceAnchored",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "invoiceKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "payer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "payee",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "InvoicePaid",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "invoiceKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "fingerprint",
        "type": "bytes32"
      }
    ],
    "name": "anchorInvoice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "invoiceKey",
        "type": "bytes32"
      }
    ],
    "name": "getAnchor",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "fingerprint",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "anchoredAt",
        "type": "uint64"
      },
      {
        "internalType": "bool",
        "name": "paid",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "paidAmount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "payer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "payee",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "operator",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "invoiceKey",
        "type": "bytes32"
      },
      {
        "internalType": "address payable",
        "name": "payee",
        "type": "address"
      }
    ],
    "name": "payInvoice",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;
