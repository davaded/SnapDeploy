import { motion } from 'framer-motion';
import { ExternalLink, Trash2, Clock, Activity, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import axios from 'axios';

export function SiteCard({ site, onDelete, onManageAccess }) {
    const [status, setStatus] = useState('checking'); // checking, online, offline
    const [lastCheck, setLastCheck] = useState(null);

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [site.host]);

    const checkHealth = async () => {
        try {
            const res = await axios.get(`/api/sites/${site.host}/health`);
            setStatus(res.data.status);
            setLastCheck(res.data.lastCheck);
        } catch (err) {
            setStatus('offline');
        }
    };

    const StatusGlow = () => {
        if (status === 'online') {
            return <div className="absolute top-0 right-0 p-24 bg-green-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-all duration-1000 animate-pulse-slow" />;
        }
        if (status === 'offline') {
            return <div className="absolute top-0 right-0 p-24 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-all duration-1000" />;
        }
        return null; // checking
    };

    const StatusIndicator = () => {
        if (status === 'checking') return <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />;
        if (status === 'online') return <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />;
        return <div className="w-2 h-2 rounded-full bg-red-500/50" />;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            className="group relative bg-surface border border-border rounded-2xl p-6 shadow-soft hover:shadow-xl transition-all duration-300 overflow-hidden"
        >
            <StatusGlow />

            <div className="relative z-10 w-full overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2.5 min-w-0">
                        <StatusIndicator />
                        <h3 className="font-bold text-text-primary tracking-tight truncate max-w-[180px] text-lg" title={site.host}>
                            {site.host}
                        </h3>
                    </div>
                    {/* Hover Actions Menu */}
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={() => onManageAccess && onManageAccess(site.host)}
                            className="p-2 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                            title="Manage Access"
                        >
                            <Lock className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(site.host)}
                            className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Deployment"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center text-xs font-medium text-text-secondary">
                        <Clock className="w-3.5 h-3.5 mr-2" />
                        <span>Deployed {new Date(site.deployedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-xs font-medium text-text-secondary">
                        <Activity className="w-3.5 h-3.5 mr-2" />
                        <span className="capitalize">{status}</span>
                    </div>
                </div>

                <a
                    href={`http://${site.host}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center space-x-2 bg-gradient-to-r from-[#35bfab] to-[#1fc9e7] text-white font-medium py-2.5 rounded-xl transition-all duration-300 active:scale-95 shadow-[0_12px_30px_-12px_rgba(53,191,171,0.7)] hover:brightness-105"
                >
                    <span>Visit Site</span>
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </motion.div>
    );
}
