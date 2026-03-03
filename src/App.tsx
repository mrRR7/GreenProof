import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  FileText, 
  Search, 
  BarChart3, 
  History, 
  AlertCircle,
  LayoutDashboard,
  Zap
} from 'lucide-react';
import { FileUpload } from '@/src/components/FileUpload';
import { ClaimCard } from '@/src/components/ClaimCard';
import { VerificationLog } from '@/src/components/VerificationLog';
import { IoTDashboard } from '@/src/components/IoTDashboard';
import { SimulationControls } from '@/src/components/SimulationControls';
import { SuggestionPanel } from '@/src/components/SuggestionPanel';
import { DiscrepancyAnalysis } from '@/src/components/DiscrepancyAnalysis';
import { IntegrityChecker } from '@/src/components/IntegrityChecker';
import { extractTextFromPDF } from '@/src/lib/pdfExtractor';
import { analyzeESGReport } from '@/src/services/geminiService';
import { ESGClaim, VerificationLog as LogType } from '@/src/types';
import { SimulationResults } from '@/src/services/pythonApiService';
import { cn } from '@/src/lib/utils';

export default function App() {
  const [isProcessing, setIsProcessing]         = useState(false);
  const [claims, setClaims]                     = useState<ESGClaim[]>([]);
  const [logs, setLogs]                         = useState<LogType[]>([]);
  const [activeTab, setActiveTab]               = useState<'dashboard' | 'simulation' | 'history'>('dashboard');
  const [error, setError]                       = useState<string | null>(null);
  const [currentFileName, setCurrentFileName]   = useState<string | null>(null);
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs');
      const data = await response.json();
      setLogs(data.map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp,
        reportName: log.report_name,
        claimCount: log.claim_count,
        hash: log.hash,
        previousHash: log.previous_hash
      })));
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setCurrentFileName(file.name);
    setClaims([]);

    try {
      const text = await extractTextFromPDF(file);
      const extractedClaims = await analyzeESGReport(text);

      if (!extractedClaims || extractedClaims.length === 0) {
        throw new Error('No ESG claims were identified in this report. Try a different document.');
      }

      const claimsWithIds = extractedClaims.map((c: any) => ({
        ...c,
        id: crypto.randomUUID()
      }));

      setClaims(claimsWithIds);

      const logResponse = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportName: file.name, claimCount: claimsWithIds.length })
      });

      if (!logResponse.ok) {
        console.warn('Failed to save log entry, but claims were processed.');
      }

      fetchLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to process the report. Please ensure it\'s a valid PDF and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract plain claim text strings for the DiscrepancyAnalysis component
  const claimTexts = claims.map(c => c.text);

  const stats = {
    total:        claims.length,
    consistent:   claims.filter(c => c.status === 'consistent').length,
    inconsistent: claims.filter(c => c.status === 'inconsistent').length,
    unsupported:  claims.filter(c => c.status === 'unsupported' || c.status === 'incomplete').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">GreenProof</h1>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Sustainability Auditor</p>
            </div>
          </div>

          <nav className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2',
                activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('simulation')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2',
                activeTab === 'simulation' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              <Zap className="w-4 h-4" />
              <span>Live Simulation</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2',
                activeTab === 'history' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              <History className="w-4 h-4" />
              <span>Verification Log</span>
            </button>
          </nav>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">

          {/* ── TAB 1: Dashboard ── */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload panel */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify ESG Claims</h2>
                    <p className="text-slate-500 mb-8 max-w-lg">
                      Upload a sustainability report to automatically extract, classify, and mathematically verify ESG claims using AI.
                    </p>
                    <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />

                    {error && (
                      <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center space-x-3 text-rose-700 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats + engine info */}
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-lg font-bold mb-6 flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2 text-emerald-400" />
                        Analysis Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                          <div className="text-3xl font-bold text-white">{stats.total}</div>
                          <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Total Claims</div>
                        </div>
                        <div className="bg-emerald-500/20 rounded-2xl p-4 backdrop-blur-sm border border-emerald-500/30">
                          <div className="text-3xl font-bold text-emerald-400">{stats.consistent}</div>
                          <div className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-widest mt-1">Consistent</div>
                        </div>
                        <div className="bg-rose-500/20 rounded-2xl p-4 backdrop-blur-sm border border-rose-500/30">
                          <div className="text-3xl font-bold text-rose-400">{stats.inconsistent}</div>
                          <div className="text-[10px] font-bold text-rose-400/70 uppercase tracking-widest mt-1">Inconsistent</div>
                        </div>
                        <div className="bg-amber-500/20 rounded-2xl p-4 backdrop-blur-sm border border-amber-500/30">
                          <div className="text-3xl font-bold text-amber-400">{stats.unsupported}</div>
                          <div className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest mt-1">Unsupported</div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Verification Engine</h4>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-medium text-slate-600">PDF Text Extraction</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                          <Search className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-medium text-slate-600">Gemini AI Claim Extraction</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-medium text-slate-600">Deterministic Math Check</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-medium text-slate-600">IoT Reality Verification</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Claims grid */}
              {claims.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center">
                      Extracted Claims
                      <span className="ml-3 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                        {currentFileName}
                      </span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('simulation')}
                      className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Verify against IoT data →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {claims.map((claim, index) => (
                      <ClaimCard key={claim.id} claim={claim} index={index} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB 2: Live Simulation ── */}
          {activeTab === 'simulation' && (
            <motion.div
              key="simulation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Live Simulation & Verification</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Real-time IoT sensor data, industry simulation, and AI-powered discrepancy detection.
                  </p>
                </div>
                {claims.length === 0 && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Upload a report on the Dashboard tab first to enable claim verification.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left column: IoT + Simulation */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <IoTDashboard />
                  </div>
                  <SimulationControls onResults={setSimulationResults} />
                </div>

                {/* Right column: ML Integrity + Discrepancy + Suggestions */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <IntegrityChecker
                      prefillFromSimulation={simulationResults ? {
                        co2_tonnes:        simulationResults.annual.co2_tonnes,
                        energy_mwh:        simulationResults.annual.energy_mwh,
                        water_megalitres:  simulationResults.annual.water_megalitres,
                        esg_environmental: simulationResults.scores.environmental,
                        esg_overall:       simulationResults.scores.esg_score,
                      } : null}
                    />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <DiscrepancyAnalysis claims={claimTexts} />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <SuggestionPanel simulationResults={simulationResults} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TAB 3: Verification Log ── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <VerificationLog logs={logs} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2 text-slate-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-widest">GreenProof &copy; 2026</span>
          </div>
          <div className="flex items-center space-x-6">
            <a href="#" className="text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest">Transparency Report</a>
            <a href="#" className="text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest">Methodology</a>
            <a href="#" className="text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
