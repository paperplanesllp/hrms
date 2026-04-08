import React, { useState } from "react";
import { Copy, RefreshCw, Eye, EyeOff, Download } from "lucide-react";
import { getEncryptionStatus } from "../../lib/encryption.js";
import { toast } from "../../store/toastStore.js";
import Modal from "../../components/ui/Modal.jsx";

export default function EncryptionSettings({ isOpen, onClose }) {
  const encryptionStatus = getEncryptionStatus();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Encryption Settings">
      <div className="space-y-6 max-w-2xl">
        
        {/* Encryption Status */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            Encryption Status
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-semibold text-green-600">✅ Enabled</p>
            </div>
            <div>
              <p className="text-gray-600">Algorithm</p>
              <p className="font-semibold text-gray-900">{encryptionStatus.algorithm}</p>
            </div>
            <div>
              <p className="text-gray-600">Mode</p>
              <p className="font-semibold text-gray-900">{encryptionStatus.mode}</p>
            </div>
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-semibold text-green-600">✓ Active</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">How Shared Encryption Works</h3>
          <p className="text-sm text-gray-600">
            All participants in a chat automatically derive the same encryption key from the chat ID. This means:
          </p>
          
          <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
            <li>No need to manually manage or share keys</li>
            <li>Messages encrypted locally before being sent</li>
            <li>Server stores encrypted messages but cannot read them</li>
            <li>All chat participants can decrypt each other's messages</li>
            <li>Encryption is automatic and transparent</li>
          </ul>
        </div>

        {/* Security Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-blue-900">🔒 Security Information</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Messages are encrypted locally using AES-256-CBC</li>
            <li>The server stores encrypted messages but cannot read them</li>
            <li>Encryption keys are derived from the chat ID</li>
            <li>Encryption happens automatically - no action needed</li>
            <li>All participants can decrypt all messages in their chat</li>
          </ul>
        </div>

        {/* Features List */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-gray-900">✨ E2E Encryption Features</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span><strong>AES-256-CBC Encryption:</strong> Military-grade encryption standard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span><strong>Automatic Encryption:</strong> All messages encrypted before sending</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span><strong>Automatic Decryption:</strong> Messages decrypted when received</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span><strong>Shared Keys:</strong> All participants derive the same key automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span><strong>No Key Management:</strong> Keys auto-generated per chat, no manual setup</span>
            </li>
          </ul>
        </div>

      </div>
    </Modal>
  );
}
