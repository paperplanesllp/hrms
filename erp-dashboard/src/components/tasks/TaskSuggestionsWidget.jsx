import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronRight, Loader, TrendingUp } from 'lucide-react';
import { api } from '../../../lib/api';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { toast } from 'sonner';

const TaskSuggestionsWidget = ({ onTaskCreated }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingTaskId, setCreatingTaskId] = useState(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tasks/ai/suggestions?limit=3');
      setSuggestions(response.data || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion, index) => {
    setCreatingTaskId(index);
    try {
      const response = await api.post('/tasks/ai/suggestions/accept', {
        suggestion: JSON.stringify(suggestion)
      });

      toast.success('Task created from suggestion!');

      if (onTaskCreated) {
        onTaskCreated(response.data);
      }

      // Reload suggestions
      setSuggestions(suggestions.filter((_, i) => i !== index));
    } catch (error) {
      toast.error('Failed to create task from suggestion');
    } finally {
      setCreatingTaskId(null);
    }
  };

  const getSuggestionIcon = (type) => {
    const icons = {
      'recurring-pattern': '🔄',
      'department-common': '👥',
      'progress-based': '📈',
      'overdue-prevention': '⚠️',
      'task-continuation': '➡️'
    };
    return icons[type] || '💡';
  };

  if (suggestions.length === 0 && !loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI Suggestions
          </h3>
        </div>
        <p className="text-gray-500 text-sm">No suggestions available right now</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          AI Suggestions
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadSuggestions}
          disabled={loading}
          className="text-blue-600 hover:text-blue-700"
        >
          {loading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            '🔄 Refresh'
          )}
        </Button>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="text-lg flex-shrink-0">
                {getSuggestionIcon(suggestion.type)}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {suggestion.suggestedTask?.title}
                </h4>

                <p className="text-sm text-gray-600 mt-1">
                  {suggestion.reason}
                </p>

                {suggestion.suggestedTask?.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestion.suggestedTask.tags.slice(0, 2).map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {Math.round((suggestion.confidence || 0.5) * 100)}% match
                </div>

                <Button
                  size="sm"
                  onClick={() => handleAcceptSuggestion(suggestion, index)}
                  disabled={creatingTaskId === index}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {creatingTaskId === index ? (
                    <Loader className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      Create
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full mt-3 text-blue-600"
        onClick={loadSuggestions}
      >
        <TrendingUp className="w-4 h-4 mr-2" />
        View More Suggestions
      </Button>
    </Card>
  );
};

export default TaskSuggestionsWidget;
