// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SealedInvoiceRegistry v4 - anchor + payment registry for Envelo
/// @notice Runs on Arc, where USDC is the NATIVE currency (msg.value is USDC
///         with 18 decimals). Only a SHA-256 fingerprint of each invoice and a
///         hash commitment to its payment terms are stored - never the contents.
///
///         Changes from v3:
///         - Anchoring can be restricted to one `anchorer` address (Envelo's
///           operator wallet on mainnet). address(0) keeps it open, which is how
///           the testnet sandbox runs: every sender anchors from their own wallet.
///         - Every anchor carries `commitment = keccak256(abi.encode(invoiceKey,
///           payee, amount, salt))`. `payInvoice` only accepts a payment whose
///           payee, amount and salt reproduce that commitment, so nobody can
///           "pay" an invoice with 1 wei to themselves and lock out the real
///           payment. The salt keeps the amount and payee unguessable until the
///           payment itself makes them public.
contract SealedInvoiceRegistry {
    struct Anchor {
        bytes32 fingerprint; // SHA-256 of the canonical plaintext document
        bytes32 commitment; // keccak256(abi.encode(invoiceKey, payee, amount, salt))
        uint256 paidAmount; // in native USDC wei (18 decimals)
        address payer;
        uint64 anchoredAt;
        bool paid;
        address payee;
    }

    /// @notice May rotate the anchorer or hand over ownership.
    address public owner;
    /// @notice The only address allowed to anchor, or address(0) when anyone may.
    address public anchorer;

    // key: keccak256(bytes(invoiceId)) - the app's UUID hashed to 32 bytes
    mapping(bytes32 => Anchor) private anchors;

    event InvoiceAnchored(
        bytes32 indexed invoiceKey,
        bytes32 fingerprint,
        bytes32 commitment,
        uint64 anchoredAt
    );
    event InvoicePaid(
        bytes32 indexed invoiceKey,
        address indexed payer,
        address indexed payee,
        uint256 amount
    );
    event AnchorerChanged(address indexed previousAnchorer, address indexed newAnchorer);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not the owner");
        _;
    }

    /// @param anchorer_ The only address allowed to anchor, or address(0) for open anchoring.
    constructor(address anchorer_) {
        owner = msg.sender;
        anchorer = anchorer_;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AnchorerChanged(address(0), anchorer_);
    }

    /// @notice Rotate the anchoring key without redeploying. Old anchors are untouched.
    function setAnchorer(address newAnchorer) external onlyOwner {
        emit AnchorerChanged(anchorer, newAnchorer);
        anchorer = newAnchorer;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "bad owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice The exact preimage rule payInvoice checks against. Pure, so
    ///         the app can compute the same value off-chain.
    function paymentCommitment(
        bytes32 invoiceKey,
        address payee,
        uint256 amount,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(invoiceKey, payee, amount, salt));
    }

    /// @notice Record an invoice fingerprint plus its payment commitment.
    ///         First write wins; the key is unguessable before the sender acts.
    function anchorInvoice(
        bytes32 invoiceKey,
        bytes32 fingerprint,
        bytes32 commitment
    ) external {
        require(anchorer == address(0) || msg.sender == anchorer, "not the anchorer");
        require(anchors[invoiceKey].anchoredAt == 0, "already anchored");
        require(fingerprint != bytes32(0), "bad fingerprint");
        require(commitment != bytes32(0), "bad commitment");
        uint64 now64 = uint64(block.timestamp);
        anchors[invoiceKey] = Anchor({
            fingerprint: fingerprint,
            commitment: commitment,
            paidAmount: 0,
            payer: address(0),
            anchoredAt: now64,
            paid: false,
            payee: address(0)
        });
        emit InvoiceAnchored(invoiceKey, fingerprint, commitment, now64);
    }

    /// @notice Pay an anchored invoice. The attached native USDC is forwarded
    ///         to the payee in the same transaction, and only a payment that
    ///         matches the sender's commitment is accepted.
    function payInvoice(
        bytes32 invoiceKey,
        address payable payee,
        bytes32 salt
    ) external payable {
        Anchor storage a = anchors[invoiceKey];
        require(a.anchoredAt != 0, "invoice not anchored");
        require(!a.paid, "already paid");
        require(msg.value > 0, "no payment attached");
        require(payee != address(0), "bad payee");
        require(
            paymentCommitment(invoiceKey, payee, msg.value, salt) == a.commitment,
            "payment does not match invoice"
        );
        a.paid = true;
        a.paidAmount = msg.value;
        a.payer = msg.sender;
        a.payee = payee;
        emit InvoicePaid(invoiceKey, msg.sender, payee, msg.value);
        (bool ok, ) = payee.call{value: msg.value}("");
        require(ok, "transfer failed");
    }

    /// @notice Read back the public record for an invoice. Same shape as v3,
    ///         so one reader works for both registry versions.
    function getAnchor(bytes32 invoiceKey)
        external
        view
        returns (
            bytes32 fingerprint,
            uint64 anchoredAt,
            bool paid,
            uint256 paidAmount,
            address payer,
            address payee
        )
    {
        Anchor storage a = anchors[invoiceKey];
        return (a.fingerprint, a.anchoredAt, a.paid, a.paidAmount, a.payer, a.payee);
    }

    /// @notice The payment commitment recorded at anchor time (zero if not anchored).
    function getCommitment(bytes32 invoiceKey) external view returns (bytes32) {
        return anchors[invoiceKey].commitment;
    }
}
