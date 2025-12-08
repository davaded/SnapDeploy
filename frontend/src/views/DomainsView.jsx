import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, Globe, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsModal } from '../components/SettingsModal';

export function DomainsView({ baseDomain }) {
    const [domains, setDomains] = useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/settings');
            // Assuming response is { allowedDomains: [] }
            setDomains(res.data.allowedDomains || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-100px)] p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#35bfab] to-[#1fc9e7]">
                            Domains
                        </h1>
                        <p className="text-lg text-text-secondary mt-2 max-w-lg">
                            Manage your root domains. Deployments can be attached to these as subdomains.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center space-x-2 bg-gradient-to-r from-[#35bfab] to-[#1fc9e7] text-white px-5 py-2.5 rounded-full font-medium hover:brightness-105 transition-all hover:scale-105 active:scale-95 shadow-[0_12px_30px_-12px_rgba(53,191,171,0.7)]"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Manage List</span>
                    </button>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Base Domain Card */}
                        {baseDomain && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative overflow-hidden bg-white/85 border border-border/60 rounded-3xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all backdrop-blur-md shadow-soft"
                            >
                                <div className="absolute top-0 right-0 p-32 bg-[#35bfab]/12 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-[#1fc9e7]/18 transition-all duration-700" />

                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-[#35bfab]/15 flex items-center justify-center mb-6 text-[#1fc9e7]">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-3xl font-bold tracking-tight mb-1 text-text-primary">.{baseDomain}</h3>
                                    <p className="text-sm text-[#1fc9e7] font-medium tracking-wide uppercase opacity-80">System Default</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Custom Domains List */}
                        {domains.map((domain, index) => (
                            <motion.div
                                key={domain}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group relative overflow-hidden bg-white/85 border border-border/60 rounded-3xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all backdrop-blur-md shadow-soft"
                            >
                                <div className="absolute top-0 right-0 p-32 bg-[#fcc841]/18 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-[#fcc841]/28 transition-all duration-700" />

                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-[#fcc841]/20 flex items-center justify-center mb-6 text-[#d98200]">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-3xl font-bold tracking-tight mb-1 text-text-primary">.{domain}</h3>
                                    <p className="text-sm text-[#d98200] font-medium tracking-wide uppercase opacity-80">Custom Domain</p>
                                </div>
                            </motion.div>
                        ))}

                        {/* Empty State / Add CTA */}
                        {domains.length === 0 && !baseDomain && (
                            <div className="col-span-full border border-dashed border-border rounded-3xl p-12 text-center text-text-secondary bg-white/70 backdrop-blur">
                                <p>No domains configured. Use the settings to add one.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => {
                    setIsSettingsOpen(false);
                    fetchSettings();
                }}
            />
        </div>
    );
}
