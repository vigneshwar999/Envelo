// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SealedInvoiceRegistry - minimal anchor + payment registry for Sealed Invoices
/// @notice Runs on the Arc testnet where USDC is the NATIVE currency (msg.value is USDC).
///         Only a SHA-256 fingerprint of each invoice is stored - never the contents.
contract SealedInvoiceRegistry {
    struct Anchor {
        bytes32 fingerprint; // SHA-256 of the canonical plaintext document
        uint64 anchoredAt;
        bool paid;
        uint256 paidAmount; // in native USDC wei (18 decimals)
        address payer;
        address payee;
    }

    address public immutable operator;

    // key: keccak256(bytes(invoiceId)) - the app's UUID hashed to 32 bytes
    mapping(bytes32 => Anchor) private anchors;

    event InvoiceAnchored(bytes32 indexed invoiceKey, bytes32 fingerprint, uint64 anchoredAt);
    event InvoicePaid(bytes32 indexed invoiceKey, address indexed payer, address indexed payee, uint256 amount);

    /// @notice The first invoice sender deploys the shared registry and anchors
    ///         their invoice in this same transaction. Passing a zero key is
    ///         reserved for a future infrastructure-only upgrade.
    constructor(bytes32 firstInvoiceKey, bytes32 firstFingerprint) {
        operator = msg.sender;
        if (firstInvoiceKey != bytes32(0)) {
            _anchorInvoice(firstInvoiceKey, firstFingerprint);
        }
    }

    /// @notice Record an invoice fingerprint. Anyone may anchor and pays their
    ///         own gas - in this app the invoice sender's wallet submits it.
    ///         First write wins; the key is unguessable before the sender acts.
    function anchorInvoice(bytes32 invoiceKey, bytes32 fingerprint) external {
        _anchorInvoice(invoiceKey, fingerprint);
    }

    function _anchorInvoice(bytes32 invoiceKey, bytes32 fingerprint) private {
        require(anchors[invoiceKey].anchoredAt == 0, "already anchored");
        anchors[invoiceKey] = Anchor({
            fingerprint: fingerprint,
            anchoredAt: uint64(block.timestamp),
            paid: false,
            paidAmount: 0,
            payer: address(0),
            payee: address(0)
        });
        emit InvoiceAnchored(invoiceKey, fingerprint, uint64(block.timestamp));
    }

    /// @notice Pay an anchored invoice. The attached native USDC is forwarded to the payee.
    function payInvoice(bytes32 invoiceKey, address payable payee) external payable {
        Anchor storage a = anchors[invoiceKey];
        require(a.anchoredAt != 0, "invoice not anchored");
        require(!a.paid, "already paid");
        require(msg.value > 0, "no payment attached");
        require(payee != address(0), "bad payee");
        a.paid = true;
        a.paidAmount = msg.value;
        a.payer = msg.sender;
        a.payee = payee;
        (bool ok, ) = payee.call{value: msg.value}("");
        require(ok, "transfer failed");
        emit InvoicePaid(invoiceKey, msg.sender, payee, msg.value);
    }

    /// @notice Read back the public record for an invoice.
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
}
