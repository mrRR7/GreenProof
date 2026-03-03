import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Calculator, Hash } from 'lucide-react';
import { motion } from 'motion/react';
import { ESGClaim } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface ClaimCardProps {
  claim: ESGClaim;
  index: number;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim, index }) => {
  const statusConfig = {
    consistent: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Consistent" },
    inconsistent: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", label: "Inconsistent" },
    unsupported: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Unsupported" },
    incomplete: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", label: "Incomplete" },
  };

  const { icon: StatusIcon, color, bg, border, label } = statusConfig[claim.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn("p-6 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md", border)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", bg, color)}>
            {claim.category.replace('_', ' ')}
          </div>
          <div className={cn("flex items-center space-x-1 text-xs font-semibold", color)}>
            <StatusIcon className="w-4 h-4" />
            <span>{label}</span>
          </div>
        </div>
        <div className="text-slate-300 font-mono text-xs">#{claim.id.slice(0, 8)}</div>
      </div>

      <p className="text-slate-800 font-medium leading-relaxed mb-4 italic">
        "{claim.text}"
      </p>

      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
            <Info className="w-3 h-3 mr-1" /> Analysis
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            {claim.explanation}
          </p>
        </div>

        {claim.mathematicalCheck && (
          <div className={cn(
            "p-4 rounded-xl border flex items-start space-x-3",
            claim.mathematicalCheck.isCorrect ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
          )}>
            <Calculator className={cn("w-5 h-5 mt-0.5", claim.mathematicalCheck.isCorrect ? "text-emerald-500" : "text-rose-500")} />
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Mathematical Verification</h4>
              <div className="font-mono text-sm text-slate-700">
                {claim.mathematicalCheck.formula} = {claim.mathematicalCheck.result}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Expected: {claim.mathematicalCheck.expected}
              </div>
            </div>
          </div>
        )}

        {claim.supportingData && (
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Hash className="w-3 h-3" />
            <span>Supporting Data: {claim.supportingData}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
