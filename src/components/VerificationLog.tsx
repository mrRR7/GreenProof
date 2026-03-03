import React from 'react';
import { Shield, Clock, Hash, FileCheck } from 'lucide-react';
import { VerificationLog as LogType } from '@/src/types';
import { motion } from 'motion/react';

interface VerificationLogProps {
  logs: LogType[];
}

export const VerificationLog: React.FC<VerificationLogProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-bottom border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800">Tamper-Evident Verification Log</h3>
        </div>
        <div className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          Cryptographically Secured
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/30 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Report Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Claims</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Verification Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                  No verification records found.
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm font-medium text-slate-800">
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                      <span>{log.reportName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {log.claimCount} claims
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Hash className="w-3.5 h-3.5 text-slate-300" />
                      <code className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 group-hover:text-emerald-600 transition-colors">
                        {log.hash.slice(0, 16)}...{log.hash.slice(-8)}
                      </code>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
