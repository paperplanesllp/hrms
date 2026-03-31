import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Trash2, Edit2, Plus, Loader, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

const SubTaskList = ({ taskId, onSubtasksLoaded }) => {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    loadSubtasks();
  }, [taskId]);

  const loadSubtasks = async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const response = await api.get(`/tasks/${taskId}/ai/subtasks`);
      setSubtasks(response.data || []);

      if (onSubtasksLoaded) {
        onSubtasksLoaded(response.data);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error loading subtasks:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (subtaskId, currentStatus) => {
    setUpdatingId(subtaskId);
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const response = await api.patch(
        `/tasks/${taskId}/ai/subtasks/${subtaskId}/complete`,
        { status: newStatus }
      );

      setSubtasks(
        subtasks.map((s) =>
          s._id === subtaskId
            ? { ...s, status: response.data.status, progress: response.data.progress }
            : s
        )
      );

      toast.success(`Subtask marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update subtask');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartEdit = (subtask) => {
    setEditingId(subtask._id);
    setEditTitle(subtask.title);
  };

  const handleSaveEdit = async (subtaskId) => {
    if (!editTitle.trim()) {
      toast.error('Subtask title cannot be empty');
      return;
    }

    setUpdatingId(subtaskId);
    try {
      const response = await api.patch(
        `/tasks/${taskId}/ai/subtasks/${subtaskId}`,
        { title: editTitle }
      );

      setSubtasks(
        subtasks.map((s) =>
          s._id === subtaskId ? { ...s, title: response.data.title } : s
        )
      );

      setEditingId(null);
      toast.success('Subtask updated');
    } catch (error) {
      toast.error('Failed to update subtask');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (subtaskId) => {
    if (!window.confirm('Delete this subtask?')) return;

    setUpdatingId(subtaskId);
    try {
      await api.delete(`/tasks/${taskId}/ai/subtasks/${subtaskId}`);

      setSubtasks(subtasks.filter((s) => s._id !== subtaskId));
      toast.success('Subtask deleted');
    } catch (error) {
      toast.error('Failed to delete subtask');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  if (subtasks.length === 0) {
    return null;
  }

  // Calculate progress
  const completedCount = subtasks.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / subtasks.length) * 100);

  return (
    <Card className="p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            Subtasks ({completedCount}/{subtasks.length})
          </h3>
          <span className="text-sm font-medium text-gray-600">
            {progressPercent}% complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask._id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* Checkbox */}
            <button
              onClick={() => handleToggleComplete(subtask._id, subtask.status)}
              disabled={updatingId === subtask._id}
              className="flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
            >
              {subtask.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>

            {/* Title or Edit */}
            <div className="flex-1 min-w-0">
              {editingId === subtask._id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(subtask._id)}
                      disabled={updatingId === subtask._id}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p
                    className={`text-sm ${
                      subtask.status === 'completed'
                        ? 'text-gray-500 line-through'
                        : 'text-gray-900'
                    }`}
                  >
                    {subtask.title}
                  </p>

                  {/* Progress indicator */}
                  {subtask.progress !== undefined && subtask.progress > 0 && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full"
                        style={{ width: `${subtask.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {editingId !== subtask._id && (
                <>
                  <button
                    onClick={() => handleStartEdit(subtask)}
                    disabled={updatingId === subtask._id}
                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Edit subtask"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(subtask._id)}
                    disabled={updatingId === subtask._id}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete subtask"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI Generated Badge */}
      {subtasks.some((s) => s.isAIGenerated) && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-purple-600">
          <span className="text-lg">🤖</span>
          <span>AI-generated subtasks with {Math.round((subtasks[0]?.aiConfidence || 0.75) * 100)}% confidence</span>
        </div>
      )}
    </Card>
  );
};

export default SubTaskList;
