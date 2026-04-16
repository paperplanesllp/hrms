import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { Download, Calendar, RefreshCw, Search } from 'lucide-react';
import api from '../../../lib/api.js';
import { formatSecondsHuman, calcActiveSeconds } from '../utils/taskTimerUtils.js';

const toDayRange = (d) => {
  const date = new Date(d);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

const groupByAssignee = (tasks) => {
  const map = {};
  tasks.forEach((t) => {
    // assignedTo is now an array of user objects or IDs
    const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
    
    if (assignees.length === 0) {
      // Task not assigned to anyone
      const key = 'unassigned';
      const name = 'Unassigned';
      if (!map[key]) map[key] = { name, tasks: [] };
      map[key].tasks.push(t);
    } else {
      // Add task to each assignee's group
      assignees.forEach((assignee) => {
        let key, name;
        if (typeof assignee === 'string') {
          key = assignee;
          name = 'Unknown User';
        } else if (typeof assignee === 'object' && assignee._id) {
          key = assignee._id;
          name = assignee.name || assignee.userName || 'Unknown User';
        } else {
          return; // skip invalid entry
        }
        if (!map[key]) map[key] = { name, tasks: [] };
        map[key].tasks.push(t);
      });
    }
  });
  return Object.values(map);
};

export default function DailyEmployeeTasks() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remarks, setRemarks] = useState({}); // Store remarks by taskId
  const [approvedTasks, setApprovedTasks] = useState({}); // Store approval status by taskId

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { start, end } = toDayRange(date);
      const [tasksRes, usersRes] = await Promise.all([
        api.get('/tasks', { params: { from: start, to: end, limit: 1000, populate: 'assignedTo' } }),
        api.get('/users?limit=1000')
      ]);

      const tasks = tasksRes?.data?.data || tasksRes?.data || [];
      const userList = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);
      
      console.log('📋 [DailyEmployeeTasks] Raw tasks count:', tasks.length);
      if (tasks.length > 0) {
        console.log('📋 Sample task assignedTo (raw):', tasks[0].assignedTo);
        console.log('📋 Full sample task:', tasks[0]);
      }
      console.log('👥 [DailyEmployeeTasks] Users fetched:', userList.length);
      
      // Normalize assignedTo on tasks: convert ID strings to user objects
      const userMap = {};
      userList.forEach(u => { if (u && u._id) userMap[String(u._id)] = u; });

      const normalizedTasks = tasks.map(t => {
        const copy = { ...t };
        const at = t.assignedTo || [];
        
        // Normalize assignedTo array: convert IDs to user objects
        if (Array.isArray(at)) {
          copy.assignedTo = at.map(assignee => {
            if (typeof assignee === 'string') {
              return userMap[assignee] || { _id: assignee, name: 'Unknown User' };
            } else if (assignee && (assignee._id || assignee.id)) {
              const id = assignee._id || assignee.id;
              if (assignee.name) return assignee; // already has name
              return userMap[id] || { _id: id, name: 'Unknown User' };
            }
            return assignee;
          }).filter(Boolean); // remove nulls
        } else if (typeof at === 'string') {
          copy.assignedTo = [userMap[at] || { _id: at, name: 'Unknown User' }];
        } else if (at && typeof at === 'object') {
          copy.assignedTo = [at];
        } else {
          copy.assignedTo = [];
        }
        return copy;
      });

      console.log('✅ [DailyEmployeeTasks] After normalization, sample assignedTo:', normalizedTasks[0]?.assignedTo);
      console.log('✅ [DailyEmployeeTasks] Tasks with assignees:', normalizedTasks.filter(t => t.assignedTo?.length > 0).length);
      
      const grouped = groupByAssignee(normalizedTasks);
      console.log('🧩 [DailyEmployeeTasks] Grouped by assignee:');
      grouped.forEach(g => console.log(`  - ${g.name}: ${g.tasks.length} task(s)`));
      
      setGroups(grouped);
      setUsers(userList);
    } catch (err) {
      console.error('Daily tasks load error', err);
      setError('Failed to load daily tasks');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Approve task with remarks
  const approveTask = (taskId, remark) => {
    if (!remark.trim()) {
      alert('Please add remarks before approving');
      return;
    }
    setApprovedTasks(prev => ({ ...prev, [taskId]: true }));
    console.log(`✅ Task ${taskId} approved with remark: ${remark}`);
    // Optional: Send to backend API
    // api.patch(`/tasks/${taskId}`, { hoExceededApproved: true, exceedRemarks: remark });
  };

  const members = useMemo(() => {
    const map = {};
    
    // Add all users from user list
    users.forEach(u => { 
      map[u._id] = { _id: u._id, name: u.name, avatar: u.avatar, count: 0 }; 
    });
    
    // Add unassigned group if it exists
    const unassignedGroup = groups.find(g => g.name === 'Unassigned');
    if (unassignedGroup && unassignedGroup.tasks.length > 0) {
      map['unassigned'] = { _id: 'unassigned', name: 'Unassigned', count: unassignedGroup.tasks.length };
    }
    
    // Count tasks for each member
    // Each group represents an assignee and contains their tasks
    groups.forEach(g => {
      if (g.name === 'Unassigned') return; // Already handled above
      if (g.tasks.length === 0) return;
      
      // Get the first task to find the assignee
      const firstTask = g.tasks[0];
      if (Array.isArray(firstTask.assignedTo) && firstTask.assignedTo.length > 0) {
        const assignee = firstTask.assignedTo[0];
        const key = assignee._id || assignee;
        if (map[key]) {
          map[key].count = g.tasks.length;
        } else {
          map[key] = { _id: key, name: assignee.name || 'Unknown', count: g.tasks.length };
        }
      }
    });
    
    const arr = Object.values(map)
      .filter(m => m.count > 0); // Only show members with tasks
    
    arr.sort((a, b) => {
      if (a._id === 'unassigned') return 1; // unassigned goes to end
      if (b._id === 'unassigned') return -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.count - a.count;
    });
    return arr;
  }, [users, groups, sortBy]);

  // Auto-select employee when searching by their name
  useEffect(() => {
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchedMember = members.find(m => 
        m.name.toLowerCase().includes(q) && m._id !== 'unassigned'
      );
      if (matchedMember) {
        setSelectedMember(matchedMember._id);
      }
    }
  }, [search, members]);

  const filteredGroups = useMemo(() => {
    let g = groups;
    
    // Filter by selected member
    if (selectedMember !== 'all') {
      if (selectedMember === 'unassigned') {
        g = groups.filter(x => x.name === 'Unassigned');
      } else {
        g = groups.filter(x => {
          if (x.name === 'Unassigned') return false;
          if (x.tasks.length === 0) return false;
          // Check if any task has this member assigned
          return x.tasks.some(task => 
            Array.isArray(task.assignedTo) && 
            task.assignedTo.some(a => (a._id || a) === selectedMember)
          );
        });
      }
    }
    
    // Filter by search text (only if not already filtered by employee selection from search)
    if (search && search.trim() && selectedMember === 'all') {
      const q = search.toLowerCase();
      g = g.map(group => ({ 
        ...group, 
        tasks: group.tasks.filter(t => {
          const titleMatch = (t.title||'').toLowerCase().includes(q);
          const descMatch = (t.description||'').toLowerCase().includes(q);
          const taskMatch = titleMatch || descMatch;
          return taskMatch;
        })
      })).filter(gr => gr.tasks.length > 0);
    }
    
    return g;
  }, [groups, selectedMember, search]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Employee Tasks</h3>
          <p className="text-sm text-slate-500">Select a member to view their tasks, search and sort as needed.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-sm"
          />
          <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="w-3 h-3" />} onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Members list */}
        <div className="col-span-1">
          {/* Large Search Bar */}
          <div className="relative mb-4">
            <div className="absolute left-4 top-3.5 text-slate-400"><Search className="w-5 h-5" /></div>
            <input 
              value={search} 
              onChange={(e)=>setSearch(e.target.value)} 
              placeholder="Search employee name, task, title..." 
              className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-medium focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition" 
            />
          </div>

          {/* Small Sort Dropdown */}
          <div className="flex gap-2 mb-4">
            <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold whitespace-nowrap">
              <option value="name">👤 Employee</option>
              <option value="count">📊 Count</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            <button 
              onClick={()=>setSelectedMember('all')} 
              className={`w-full text-left p-3 rounded-lg transition ${selectedMember==='all' ? 'bg-slate-100 dark:bg-slate-900' : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
            >
              <div className="font-semibold text-slate-900 dark:text-white">All Members</div>
              <div className="text-xs text-slate-500">{groups.reduce((a,b)=>a+b.tasks.length,0)} tasks</div>
            </button>

            {members.map(m => (
              <button 
                key={m._id} 
                onClick={()=>setSelectedMember(m._id)} 
                className={`w-full text-left p-3 rounded-lg transition ${selectedMember===m._id ? 'bg-slate-100 dark:bg-slate-900' : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-semibold text-slate-800 dark:text-white text-sm">
                    {(m.name||'U').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.count} task(s)</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tasks view */}
        <div className="col-span-1 lg:col-span-3">
          {loading && <div className="text-center py-8 text-slate-500">Loading daily tasks...</div>}
          {error && <div className="text-center py-6 text-red-600">{error}</div>}

          {!loading && !error && (
            <div className="space-y-4">
              {/* Show header when viewing specific employee */}
              {selectedMember !== 'all' && members.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        Viewing: {members.find(m => m._id === selectedMember)?.name || 'Employee'}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {filteredGroups.reduce((sum, g) => sum + g.tasks.length, 0)} task(s) assigned
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {filteredGroups.length === 0 && <div className="text-center py-8 text-slate-500">No tasks found for this filter.</div>}

              {filteredGroups.map((g, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-semibold text-slate-700 dark:text-white text-sm">
                        {g.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{g.name}</div>
                        <div className="text-xs text-slate-500">{g.tasks.length} task(s)</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {g.tasks.map((t) => {
                      const activeSeconds = calcActiveSeconds(t);
                      
                      // Calculate estimated time in seconds
                      const estimatedSeconds = (t.estimatedHours || 0) * 3600 + (t.estimatedMinutes || 0) * 60;
                      
                      // Check if time exceeded
                      const isTimeExceeded = estimatedSeconds > 0 && activeSeconds > estimatedSeconds;
                      const timeRemaining = estimatedSeconds - activeSeconds;
                      const percentageUsed = estimatedSeconds > 0 ? Math.round((activeSeconds / estimatedSeconds) * 100) : 0;
                      
                      // Determine time status color
                      const getTimeStatusColor = () => {
                        if (estimatedSeconds === 0) return 'gray'; // No estimate
                        if (isTimeExceeded) return 'red'; // Exceeded - RED
                        if (percentageUsed >= 80) return 'orange'; // Close to limit
                        return 'green'; // On track
                      };
                      
                      const timeStatus = getTimeStatusColor();
                      const timeStatusClasses = {
                        'red': 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700',
                        'orange': 'bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700',
                        'green': 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700',
                        'gray': 'bg-slate-100 dark:bg-slate-700/30 border border-slate-300 dark:border-slate-700',
                      };
                      
                      const statusColors = {
                        'completed': 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                        'in-progress': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                        'pending': 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
                        'overdue': 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                      };
                      
                      // Extract assignedTo names
                      const assignedToNames = t.assignedTo && Array.isArray(t.assignedTo) 
                        ? t.assignedTo.map(a => a.name || a.userName || 'Unknown').join(', ')
                        : 'Unassigned';
                      
                      // Extract assignedBy name
                      const assignedByName = t.assignedBy 
                        ? (typeof t.assignedBy === 'string' ? t.assignedBy : (t.assignedBy.name || t.assignedBy.userName || 'Unknown'))
                        : 'System';
                      
                      return (
                        <div key={t._id} className={`p-4 rounded-lg border-2 ${statusColors[t.status] || 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="font-bold text-slate-900 dark:text-white text-sm">{t.title}</div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{t.description || '—'}</div>
                            </div>
                            <div className="text-right text-xs flex-shrink-0">
                              <div className="font-bold px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600">{t.status || 'new'}</div>
                              {t.startedAt && <div className="text-slate-500 text-xs mt-1">{new Date(t.startedAt).toLocaleTimeString().slice(0, 5)}</div>}
                            </div>
                          </div>

                          {/* Assignment Info */}
                          <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                            <div className="bg-white/50 dark:bg-slate-700/50 p-2 rounded">
                              <div className="text-slate-500 dark:text-slate-400 font-semibold">👤 Assigned By:</div>
                              <div className="text-slate-900 dark:text-white font-medium text-sm">{assignedByName}</div>
                            </div>
                            <div className="bg-white/50 dark:bg-slate-700/50 p-2 rounded">
                              <div className="text-slate-500 dark:text-slate-400 font-semibold">→ Assigned To:</div>
                              <div className="text-slate-900 dark:text-white font-medium text-sm">{assignedToNames}</div>
                            </div>
                          </div>

                          {/* Time Comparison Section */}
                          <div className={`p-3 rounded-lg mb-3 ${timeStatusClasses[timeStatus]}`}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {isTimeExceeded ? (
                                  <span className="text-lg">⚠️</span>
                                ) : percentageUsed >= 80 ? (
                                  <span className="text-lg">⏳</span>
                                ) : (
                                  <span className="text-lg">✓</span>
                                )}
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {isTimeExceeded ? 'TIME EXCEEDED' : percentageUsed >= 80 ? 'APPROACHING LIMIT' : 'ON TRACK'}
                                </span>
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white">{percentageUsed}%</span>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full h-2 rounded-full bg-white/50 dark:bg-slate-600/50 overflow-hidden">
                              <div 
                                className={`h-full ${timeStatus === 'red' ? 'bg-red-600' : timeStatus === 'orange' ? 'bg-orange-600' : 'bg-green-600'}`}
                                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                              <div>
                                <span className="text-slate-700 dark:text-slate-300">Est:</span>
                                <span className="font-bold text-slate-900 dark:text-white ml-1">{formatSecondsHuman(estimatedSeconds)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-700 dark:text-slate-300">Worked:</span>
                                <span className="font-bold text-slate-900 dark:text-white ml-1">{formatSecondsHuman(activeSeconds)}</span>
                              </div>
                            </div>
                            
                            {isTimeExceeded && (
                              <div className="text-xs font-bold text-red-700 dark:text-red-400 mt-2">
                                ⚠️ Over by {formatSecondsHuman(activeSeconds - estimatedSeconds)}
                              </div>
                            )}
                            {!isTimeExceeded && timeRemaining > 0 && percentageUsed < 80 && (
                              <div className="text-xs font-semibold text-green-700 dark:text-green-400 mt-2">
                                ✓ {formatSecondsHuman(timeRemaining)} remaining
                              </div>
                            )}
                          </div>

                          {/* Exceed Approval Section */}
                          {isTimeExceeded && (
                            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
                              <div className="font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                                <span>⚠️ HR Approval Required</span>
                                {approvedTasks[t._id] && (
                                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                    ✓ Approved
                                  </span>
                                )}
                              </div>
                              
                              <textarea 
                                value={remarks[t._id] || ''}
                                onChange={(e) => setRemarks(prev => ({ ...prev, [t._id]: e.target.value }))}
                                placeholder="Add remarks about why time was exceeded (employee reason, blockers, etc.)..."
                                disabled={approvedTasks[t._id]}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 resize-none disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                                rows="2"
                              />
                              
                              <div className="flex gap-2 mt-2">
                                <button 
                                  onClick={() => approveTask(t._id, remarks[t._id] || '')}
                                  disabled={approvedTasks[t._id]}
                                  className="flex-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                  {approvedTasks[t._id] ? '✓ Approved' : 'Approve & Submit'}
                                </button>
                              </div>
                              
                              {approvedTasks[t._id] && remarks[t._id] && (
                                <div className="mt-2 p-2 rounded-lg bg-white dark:bg-slate-700/50 border border-green-200 dark:border-green-800">
                                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">📝 Remarks:</div>
                                  <div className="text-xs text-slate-700 dark:text-slate-300">{remarks[t._id]}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
