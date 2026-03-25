import React, { useEffect, useState } from "react";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import api from "../../lib/api.js";
import { Users, Mail, Phone, Shield, Plus, Edit3, Trash2 } from "lucide-react";

export default function HrPage() {
  const [hrMembers, setHrMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/hr");
      setHrMembers(res.data || []);
    } catch (error) {
      console.error('Failed to load HR members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">HR Group</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage HR team members and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="primary">{hrMembers.length} Members</Badge>
          <button className="px-4 py-2 bg-[var(--clay)] text-white rounded-xl hover:bg-[var(--eucalyptus)] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--eucalyptus)] rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-[var(--text-main)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-main)]">{hrMembers.length}</p>
              <p className="text-[var(--text-muted)] text-sm">Total Members</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-main)]">{hrMembers.filter(m => m.role === 'HR').length}</p>
              <p className="text-[var(--text-muted)] text-sm">Active HR</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-main)]">100%</p>
              <p className="text-[var(--text-muted)] text-sm">Response Rate</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Members Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Team Members</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{hrMembers.length} active member{hrMembers.length !== 1 ? 's' : ''}</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 dark:border-slate-400"></div>
          </div>
        ) : hrMembers.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">No HR members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              
              {/* Table Body */}
              <tbody>
                {hrMembers.map((member, index) => (
                  <tr 
                    key={member._id} 
                    className={`border-b transition-colors ${
                      index % 2 === 0 
                        ? 'bg-white dark:bg-slate-900/30' 
                        : 'bg-slate-50/50 dark:bg-slate-800/20'
                    } hover:bg-blue-50 dark:hover:bg-blue-950/20 group`}
                  >
                    {/* Name Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {member.name?.charAt(0)?.toUpperCase() || 'H'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{member.name || 'HR Member'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{member._id?.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Email Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{member.email}</span>
                      </div>
                    </td>
                    
                    {/* Role Column */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {member.role || 'USER'}
                      </span>
                    </td>
                    
                    {/* Status Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Active</span>
                      </div>
                    </td>
                    
                    {/* Actions Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100" title="View Profile">
                          <Users className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all opacity-0 group-hover:opacity-100" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-all opacity-0 group-hover:opacity-100" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}