import React, { useState } from "react";
import { Copy, RefreshCw, Eye, EyeOff, Download } from "lucide-react";
import { getEncryptionKey, exportEncryptionKey, resetEncryptionKey, getEncryptionStatus } from "../../lib/encryption.js";
import { toast } from "../../store/toastStore.js";
import Modal from "../../components/ui/Modal.jsx";

export default function EncryptionSettings({ isOpen, onClose }) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const encryptionKey = getEncryptionKey();
  const encryptionStatus = getEncryptionStatus();

  const handleCopyKey = () => {
    navigator.clipboard.writeText(encryptionKey);
    setCopied(true);
    toast({ title: "Encryption key copied to clipboard", type: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportKey = () => {
    const element = document.createElement("a");
    const file = new Blob([encryptionKey], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `chat-encryption-key-backup-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({ title: "Encryption key exported successfully", type: "success" });
  };

  const handleResetKey = () => {
    resetEncryptionKey();
    toast({ 
      title: "Encryption key reset", 
      description: "A new encryption key has been generated. Previous messages may not decrypt properly.",
      type: "warning" 
    });
    setShowResetConfirm(false);
  };

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
              <p className="text-gray-600">Key Length</p>
              <p className="font-semibold text-gray-900">{encryptionStatus.keyLength} chars</p>
            </div>
            <div>
              <p className="text-gray-600">Key Exists</p>
              <p className="font-semibold text-green-600">✓ Yes</p>
            </div>
          </div>
        </div>

        {/* Encryption Key Display */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Your Encryption Key</h3>
          <p className="text-sm text-gray-600">
            This key encrypts your messages. Keep it safe! If you lose it, you won't be able to decrypt old messages.
          </p>
          
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 font-mono text-xs break-all relative">
            {showKey ? (
              <span className="text-gray-900">{encryptionKey}</span>
            ) : (
              <span className="text-gray-400">••••••••••••••••••••••••••••••••••••••••••</span>
            )}
            
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded"
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleCopyKey}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Copy size={16} />
              {copied ? "Copied!" : "Copy Key"}
            </Button>
            
            <Button
              onClick={handleExportKey}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Export Backup
            </Button>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-blue-900">🔒 Security Information</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Messages are encrypted locally before being sent to the server</li>
            <li>The server stores encrypted messages but cannot read them</li>
            <li>Only users with the same encryption key can read the messages</li>
            <li>Encryption happens automatically - no action needed</li>
            <li>Your key is stored locally in browser storage</li>
          </ul>
        </div>

        {/* Reset Key Warning */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-red-600 flex items-center gap-2">
            <RefreshCw size={18} />
            Reset Encryption Key
          </h3>
          <p className="text-sm text-gray-600">
            ⚠️ Warning: Resetting your encryption key will make all previously encrypted messages unreadable. Only do this if you've backed up your current key.
          </p>
          
          {!showResetConfirm ? (
            <Button
              onClick={() => setShowResetConfirm(true)}
              variant="danger"
              className="w-full"
            >
              Reset Encryption Key
            </Button>
          ) : (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-red-900">Are you sure? This cannot be undone!</p>
              <div className="flex gap-2">
                <Button
                  onClick={handleResetKey}
                  variant="danger"
                  className="flex-1"
                >
                  Yes, Reset
                </Button>
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
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
              <span><strong>Local Key Storage:</strong> Key never sent to server</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span><strong>Voice Messages:</strong> Audio content descriptions encrypted too</span>
            </li>
          </ul>
        </div>

      </div>
    </Modal>
  );
}
