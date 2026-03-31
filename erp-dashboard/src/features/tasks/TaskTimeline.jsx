import React, { useEffect, useState } from 'react';
import { Calendar, User, MessageSquare, GitBranch, RefreshCcw, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import api from '../../lib/api.js';

const actionIcons = {
  created: <CheckCircle2 size={16} className="text-green-500" />,
  assigned: <User size={16} className="text-blue-500" />,
  forwarded: <GitBranch size={16} className="text-purple-500" />,
  reassigned: <RefreshCcw size={16} className="text-orange-500" />,
  status_changed: <Settings size={16} className="text-slate-500" />,
  commented: <MessageSquare size={16} className="text-cyan-500" />,
  completed: <CheckCircle2 size={16} className="text-green-600" />,
  on_hold: <AlertCircle size={16} className="text-yellow-500" />
};

const actionLabels = {
  created: 'Task Created',
  assigned: 'Assigned',
  forwarded: 'Forwarded',
  reassigned: 'Reassigned',
  status_changed: 'Status Changed',
  progress_updated: 'Progress Updated',
  commented: 'Comment Added',
  completed: 'Completed',
  on_hold: 'Put On Hold',
  attachment_added: 'Attachment Added'
};

export default function TaskTimeline({ taskId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [taskId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tasks/${taskId}/history`);
      setHistory(response.data?.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <p className="text-red-600">Error loading history</p>;

  const renderDetails = (item) => {
    if (item.action === 'status_changed') {
      return `Status changed from ${item.oldValue} to ${item.newValue}`;
    }
    if (item.action === 'progress_updated') {
      return `Progress updated from ${item.oldValue}% to ${item.newValue}%`;
    }
    if (item.action === 'forwarded' || item.action === 'reassigned') {
      return `${item.fromUser?.name || 'Unknown'} → ${item.toUser?.name || 'Unknown'}`;
    }
    return item.details;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Task History</h3>
      
      {history.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400">No history available</p>
      ) : (
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={item._id} className="flex gap-4">
              {/* Timeline line and icon */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
                  {actionIcons[item.action] || <Calendar size={16} />}
                </div>
                {index < history.length - 1 && (
                  <div className="w-0.5 h-10 bg-slate-200 dark:bg-slate-700 mt-2"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {actionLabels[item.action] || item.action}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      by {item.performedBy?.name || 'System'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                
                {renderDetails(item) && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-900/30 p-2 rounded">
                    {renderDetails(item)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
