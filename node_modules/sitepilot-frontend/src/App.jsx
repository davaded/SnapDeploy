import { useState, useEffect } from 'react';
import axios from 'axios';
import { SiteCard } from './components/SiteCard';
import { DeployModal } from './components/DeployModal';
import { Plus, Command, LayoutGrid, LogOut, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingNav } from './components/FloatingNav';
import { DomainsView } from './views/DomainsView';
import { SettingsModal } from './components/SettingsModal';

function App() {
    const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
    const [inputToken, setInputToken] = useState('');
    const [sites, setSites] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [baseDomain, setBaseDomain] = useState(null);

    // Auth interceptor
    useEffect(() => {
        const interceptor = axios.interceptors.request.use(config => {
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
        return () => axios.interceptors.request.eject(interceptor);
    }, [token]);

    useEffect(() => {
        fetchConfig();
        if (token) {
            fetchSites();
        }
    }, [token]);

    const login = () => {
        if (inputToken) {
            setToken(inputToken);
            localStorage.setItem('admin_token', inputToken);
        }
    };

    const logout = () => {
        setToken('');
        localStorage.removeItem('admin_token');
    };

    const fetchSites = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/sites');
            setSites(res.data);
        } catch (err) {
            if (err.response?.status === 401) logout();
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await axios.get('/api/config');
            setBaseDomain(res.data.baseDomain);
        } catch (err) {
            console.error("Failed to fetch config", err);
        }
    };

    const deleteSite = async (host) => {
        if (!confirm(`Permanently delete ${host}?`)) return;
        try {
            await axios.delete(`/api/sites/${host}`);
            fetchSites();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="w-full max-w-sm p-8">
                    <div className="text-center mb-8">
                        <div className="h-12 w-12 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
                            <Command className="h-6 w-6 text-black" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
                        <p className="text-gray-400">Enter your admin token to continue</p>
                    </div>
                    <input
                        type="password"
                        placeholder="Enter Access Token"
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && login()}
                        className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all mb-4"
                    />
                    <button
                        onClick={login}
                        className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Continue
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header - Minimal / Transparent */}
            <header className="fixed top-0 left-0 right-0 p-6 z-50 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <h1 className="text-xl font-bold tracking-tight text-white/90">SitePilot</h1>
                </div>
                <div className="pointer-events-auto">
                    <button
                        onClick={logout}
                        className="text-xs font-medium text-white/40 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-full border border-white/5 hover:bg-white/10"
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Main Content Area with Transitions */}
            <main className="pt-24 pb-32 min-h-screen">
                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' ? (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-6xl mx-auto px-6"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Overview</h2>
                                    <p className="text-lg text-text-secondary mt-2">Active Deployments</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="bg-white text-black px-5 py-2.5 rounded-full font-medium text-sm hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 flex items-center shadow-lg shadow-white/10"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Project
                                </button>
                            </div>

                            {loading && sites.length === 0 ? (
                                <div className="text-center py-20 text-gray-500">Loading projects...</div>
                            ) : sites.length === 0 ? (
                                <div className="border border-dashed border-border rounded-xl p-12 text-center" onClick={() => setIsModalOpen(true)}>
                                    <div className="bg-surface inline-flex p-4 rounded-full mb-4">
                                        <LayoutGrid className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
                                    <p className="text-gray-400 mb-6">Deploy your first static site to get started.</p>
                                    <button className="text-white underline hover:text-gray-300">Deploy now</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {sites.map(site => (
                                        <SiteCard key={site.host} site={site} onDelete={deleteSite} />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="domains"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                        >
                            <DomainsView baseDomain={baseDomain} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Floating Navigation */}
            <FloatingNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onOpenSettings={() => setIsSettingsOpen(true)}
            />

            <DeployModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onDeploySuccess={fetchSites}
                baseDomain={baseDomain}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => {
                    setIsSettingsOpen(false);
                    fetchConfig(); // Refresh config after settings close
                }}
            />
        </div>
    )
}

export default App
