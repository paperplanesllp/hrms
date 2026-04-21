import { useEffect } from 'react';
import { getSocket, isSocketConnected } from '../../../lib/socket.js';
import { useTaskRefresh } from '../context/TaskRefreshContext.jsx';

/**
 * Hook to listen for real-time task updates via Socket.io
 * Automatically refreshes task lists when:
 * - A new task is created (task:created)
 * - A task is updated (task:updated)
 * - A task status changes (task:status-changed)
 * - A task is deleted (task:deleted)
 */
export function useTaskSocketListener() {
  const { triggerRefreshImmediate } = useTaskRefresh();

  useEffect(() => {
    // Get socket instance
    const socket = getSocket();

    // Skip if socket not available or not connected
    if (!socket || !isSocketConnected()) {
      console.log('⚠️ Socket not available or not connected. Task socket listeners will not be set up.');
      return;
    }

    console.log('🔗 Setting up task socket listeners');

    // Listen for new task creation
    const handleTaskCreated = (payload) => {
      console.log('📨 Socket: task:created received', {
        taskId: payload.task?._id,
        taskTitle: payload.task?.title,
        message: payload.message
      });
      
      // Trigger immediate refresh for all task lists
      triggerRefreshImmediate();
    };

    // Listen for task updates
    const handleTaskUpdated = (payload) => {
      console.log('📨 Socket: task:updated received', {
        taskId: payload.task?._id,
        taskTitle: payload.task?.title,
        message: payload.message
      });
      
      // Trigger immediate refresh
      triggerRefreshImmediate();
    };

    // Listen for task status changes
    const handleTaskStatusChanged = (payload) => {
      console.log('📨 Socket: task:status-changed received', {
        taskId: payload.task?._id,
        taskTitle: payload.task?.title,
        newStatus: payload.task?.status,
        message: payload.message
      });
      
      // Trigger immediate refresh
      triggerRefreshImmediate();
    };

    // Listen for task deletion
    const handleTaskDeleted = (payload) => {
      console.log('📨 Socket: task:deleted received', {
        taskId: payload.taskId,
        taskTitle: payload.message,
        message: payload.message
      });
      
      // Trigger immediate refresh to remove the deleted task
      triggerRefreshImmediate();
    };

    // Register all listeners
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:status-changed', handleTaskStatusChanged);
    socket.on('task:deleted', handleTaskDeleted);

    console.log('✅ Task socket listeners registered');

    // Cleanup: unsubscribe from socket events when component unmounts
    return () => {
      console.log('🧹 Cleaning up task socket listeners');
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:status-changed', handleTaskStatusChanged);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [triggerRefreshImmediate]);
}
