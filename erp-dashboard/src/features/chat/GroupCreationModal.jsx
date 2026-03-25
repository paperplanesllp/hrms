import React, { useState, useEffect } from "react";
import { X, Plus, Users, Search, Check } from "lucide-react";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";

export default function GroupCreationModal({ isOpen, onClose, onGroupCreated }) {
  const [step, setStep] = useState(1); // 1: select members, 2: group name
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setAvailableUsers([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchUsers = async (query) => {
    try {
      setIsSearching(true);
      const res = await api.get(`/chat/search?q=${query}`);
      // Filter out already selected members
      const filtered = (res.data || []).filter(
        user => !selectedMembers.find(m => m._id === user._id)
      );
      setAvailableUsers(filtered);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMember = (user) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m._id === user._id);
      if (exists) {
        return prev.filter(m => m._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleNextStep = () => {
    if (selectedMembers.length === 0) {
      toast({ title: "Select at least one member", type: "error" });
      return;
    }
    setStep(2);
    setSearchQuery("");
    setAvailableUsers([]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({ title: "Enter a group name", type: "error" });
      return;
    }

    try {
      setIsCreating(true);
      const participantIds = selectedMembers.map(m => m._id);
      const res = await api.post("/chat", {
        isGroup: true,
        name: groupName.trim(),
        participants: participantIds
      });

      toast({ title: "Group created successfully", type: "success" });
      onGroupCreated(res.data);
      
      // Reset form
      setStep(1);
      setGroupName("");
      setSelectedMembers([]);
      setSearchQuery("");
      onClose();
    } catch (err) {
      toast({ title: "Failed to create group: " + (err.response?.data?.message || err.message), type: "error" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setGroupName("");
    setSelectedMembers([]);
    setSearchQuery("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            {step === 1 ? "Select Members" : "Name Your Group"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-4">
              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search colleagues by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search results */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500">Searching...</div>
                ) : availableUsers.length > 0 ? (
                  availableUsers.map(user => (
                    <div
                      key={user._id}
                      onClick={() => toggleMember(user)}
                      className="p-3 border-b hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                        {user.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      {selectedMembers.find(m => m._id === user._id) && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))
                ) : searchQuery ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No colleagues found</div>
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">Search for colleagues to add</div>
                )}
              </div>

              {/* Selected members */}
              {selectedMembers.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-2">
                    {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""} selected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map(member => (
                      <div
                        key={member._id}
                        className="bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-700 flex items-center gap-1"
                      >
                        {member.name}
                        <button
                          onClick={() => toggleMember(member)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group preview */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-2">GROUP MEMBERS</p>
                <div className="space-y-2">
                  {selectedMembers.map(member => (
                    <div key={member._id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs">
                        {member.name[0]}
                      </div>
                      <span className="text-sm text-gray-700">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group name input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">GROUP NAME *</label>
                <Input
                  placeholder="e.g., Project Alpha Team, Marketing Discussion..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateGroup()}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">{groupName.length}/100</p>
              </div>

              {/* Go back link */}
              <button
                onClick={() => {
                  setStep(1);
                  setGroupName("");
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Change members
              </button>
            </div>
          )}
        </div>

        {/* Footers */}
        <div className="bg-gray-50 px-6 py-4 flex gap-2 justify-end border-t">
          <Button
            onClick={handleClose}
            variant="ghost"
            className="text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>
          {step === 1 ? (
            <Button
              onClick={handleNextStep}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              Next
              <Plus className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateGroup}
              disabled={isCreating || !groupName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Group"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
