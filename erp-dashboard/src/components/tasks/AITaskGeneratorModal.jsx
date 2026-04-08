import React, { useState } from 'react';
import { ChevronDown, Loader, AlertCircle, CheckCircle2, SparklesIcon } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

const AITaskGeneratorModal = ({ isOpen, onClose, onTasksGenerated, departmentId }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState('input'); // input, preview, success

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Please enter text or meeting notes');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/tasks/ai/generate-from-text', {
        text: text.trim(),
        departmentId
      });

      setPreview(response.data);
      setStep('preview');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setStep('success');
    if (onTasksGenerated) {
      onTasksGenerated(preview);
    }
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleReset = () => {
    setText('');
    setPreview(null);
    setStep('input');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">AI Task Generator</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Notes, Email, or Task Description
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste meeting notes, email content, or describe tasks you want to create...&#10;&#10;Example: 'John needs to review the Q4 report by Friday. Sarah should prepare the presentation for Monday. Mark needs to update the database schema.'&#10;&#10;The AI will extract action items, detect assignees, and predict deadlines."
                  className="w-full h-48 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <div className="font-medium mb-2">💡 AI Tips:</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Mention names for automatic assignee detection</li>
                  <li>Include dates like "by Friday" or "in 3 days"</li>
                  <li>Use priority keywords: urgent, high, low, etc.</li>
                  <li>One action item per line for best results</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !text.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4 mr-2" />
                      Generate Tasks
                    </>
                  )}
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Preview: {preview.length || 0} tasks will be created
                </h3>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {preview.map((task, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm">
                        {task.assignedTo && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            👤 Assigned
                          </span>
                        )}

                        {task.dueDate && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                            📅 {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                          </span>
                        )}

                        <span
                          className={`px-2 py-1 rounded ${
                            task.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : task.priority === 'low'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                        </span>

                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          🤖 AI: {Math.round(task.aiConfidence * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Create All Tasks
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tasks Created Successfully! ✨
              </h3>
              <p className="text-gray-600 mb-4">
                {preview?.length || 0} tasks have been added to your dashboard
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AITaskGeneratorModal;
