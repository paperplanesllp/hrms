import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Users, Search, Check } from "lucide-react";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";

export default function GroupManagementModal({ isOpen, onClose, group, isAdmin, onGroupUpdated, currentUserId }) {
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(group?.name || "");
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setNewGroupName(group?.name || "");
  }, [group]);

  // Debounce search
  useEffect(() => {
    if (!showAddMember) return;

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, showAddMember]);

  const searchUsers = async (query) => {
    try {
      setIsSearching(true);
      const res = await api.get(`/chat/search?q=${query}`);
      // Filter out members already in the group
      const filtered = (res.data || []).filter(
        user => !group?.participants?.find(p => p._id === user._id)
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim() || newGroupName === group?.name) {
      setEditingName(false);
      return;
    }

    try {
      setIsUpdating(true);
      const res = await api.put(`/chat/${group._id}/group`, {
        name: newGroupName.trim(),
        action: "rename"
      });
      toast({ title: "Group renamed", type: "success" });
      onGroupUpdated(res.data);
      setEditingName(false);
    } catch (err) {
      toast({ title: "Failed to rename group", type: "error" });
      setNewGroupName(group?.name);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      setIsUpdating(true);
      const res = await api.put(`/chat/${group._id}/group`, {
        action: "add",
        userId
      });
      toast({ title: "Member added", type: "success" });
      onGroupUpdated(res.data);
      setSearchQuery("");
      setSearchResults([]);
      setShowAddMember(false);
    } catch (err) {
      toast({ title: "Failed to add member", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove this member from the group?")) return;

    try {
      setIsUpdating(true);
      const res = await api.put(`/chat/${group._id}/group`, {
        action: "remove",
        userId: memberId
      });
      toast({ title: "Member removed", type: "success" });
      onGroupUpdated(res.data);
    } catch (err) {
      toast({ title: "Failed to remove member", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !group || !group.participants) return null;

  const isGroupAdmin = group?.groupAdmin?._id === currentUserId || group?.createdBy === currentUserId;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md mx-auto overflow-hidden bg-white shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Users className="w-5 h-5" />
            Group Info
          </h2>
          <button
            onClick={onClose}
            className="p-1 transition-colors rounded-lg hover:bg-purple-700"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Group Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">GROUP NAME</label>
              {isGroupAdmin && (
                <button
                  onClick={() => setEditingName(!editingName)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={handleRenameGroup}
                  disabled={isUpdating}
                  className="px-3 text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </Button>
              </div>
            ) : (
              <p className="text-lg font-bold text-gray-800">{group.name}</p>
            )}
          </div>

          {/* Admin Info */}
          {group?.groupAdmin && (
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p className="mb-2 text-xs font-semibold text-gray-500">GROUP ADMIN</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 text-xs font-semibold text-white rounded-full bg-gradient-to-br from-purple-500 to-purple-600">
                  {group.groupAdmin?.name?.[0] || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{group.groupAdmin?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{group.groupAdmin?.email || ''}</p>
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                MEMBERS ({group?.participants?.length || 0})
              </label>
              {isGroupAdmin && (
                <Button
                  onClick={() => {
                    setShowAddMember(!showAddMember);
                    setSearchQuery("");
                  }}
                  size="sm"
                  className="flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              )}
            </div>

            {/* Add member search (if admin) */}
            {showAddMember && isGroupAdmin && (
              <div className="pb-4 mb-4 border-b">
                <div className="relative mb-3">
                  <Search className="absolute w-4 h-4 text-gray-400 left-3 top-3" />
                  <Input
                    placeholder="Search to add members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto border border-gray-200 rounded-lg max-h-40">
                  {isSearching ? (
                    <div className="p-3 text-sm text-center text-gray-500">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(user => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-3 border-b hover:bg-blue-50 group"
                      >
                        <div className="flex items-center flex-1 min-w-0 gap-2">
                          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-xs font-semibold text-white rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                            {user.name?.[0] || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddMember(user._id)}
                          disabled={isUpdating}
                          className="ml-2 p-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : searchQuery ? (
                    <div className="p-3 text-sm text-center text-gray-500">No users found</div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Member list */}
            <div className="space-y-2">
              {group?.participants?.map(member => {
                if (!member || !member.name) return null;
                return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center flex-1 min-w-0 gap-2">
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-xs font-semibold text-white rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                      {member.name?.[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {member.name}
                        {group?.groupAdmin?._id === member._id && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Admin</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{member.email || ''}</p>
                    </div>
                  </div>
                  {isGroupAdmin && member._id !== group?.groupAdmin?._id && (
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      disabled={isUpdating}
                      className="ml-2 p-1.5 text-red-600 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t bg-gray-50">
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-gray-700 hover:bg-gray-100"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
