import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import Card from '../../components/ui/Card.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Button from '../../components/ui/Button.jsx';
import api from '../../lib/api.js';
import { AlertTriangle, Users, TrendingUp } from 'lucide-react';

export default function WorkloadAnalysis() {
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWorkload();
  }, []);

  const loadWorkload = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/analytics/workload');
      setWorkload(response.data?.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading workload:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <p className="text-red-600">Error loading workload</p>;

  const workloadData = workload.map(emp => ({
    name: emp.employeeId?.name || 'Unknown',
    pending: emp.pendingTasks,
    completed: emp.completedTasks,
    overdue: emp.overdueTasks,
    productivity: emp.productivityScore,
    workload: emp.currentWorkload
  }));

  const workloadStatusColor = {
    light: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    heavy: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    overloaded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };

  const getWorkloadIcon = (status) => {
    switch (status) {
      case 'light':
        return '🟢';
      case 'normal':
        return '🔵';
      case 'heavy':
        return '🟠';
      case 'overloaded':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">Total Team Members</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{workload.length}</p>
            </div>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase">Heavy Workload</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                {workload.filter(e => e.currentWorkload === 'heavy').length}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase">Overloaded</p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-1">
                {workload.filter(e => e.currentWorkload === 'overloaded').length}
              </p>
            </div>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Workload Distribution Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Team Workload Distribution</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={workloadData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip 
              formatter={(value) => value}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151'
              }}
            />
            <Legend />
            <Bar dataKey="pending" fill="#f59e0b" name="Pending Tasks" />
            <Bar dataKey="completed" fill="#10b981" name="Completed Tasks" />
            <Bar dataKey="overdue" fill="#ef4444" name="Overdue Tasks" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Productivity vs Workload Scatter */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Productivity vs Workload</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="productivity" name="Productivity Score" type="number" />
            <YAxis dataKey="pending" name="Pending Tasks" type="number" />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151'
              }}
            />
            <Scatter name="Employees" data={workloadData} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Employee Workload Details */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Employee Workload Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900 dark:text-white">Employee</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white">Pending</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white">Overdue</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white">Productivity</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {workload.map((emp) => (
                <tr key={emp._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                    {emp.employeeId?.name}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${workloadStatusColor[emp.currentWorkload]}`}>
                      {getWorkloadIcon(emp.currentWorkload)} {emp.currentWorkload}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 font-semibold">
                    {emp.pendingTasks}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${emp.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {emp.overdueTasks}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-12 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${emp.productivityScore >= 80 ? 'bg-green-500' : emp.productivityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${emp.productivityScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {emp.currentWorkload === 'overloaded' && (
                      <Button size="sm" variant="outline" className="text-xs">
                        Reassign Tasks
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
