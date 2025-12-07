import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import axios from 'axios';

export function SettingsModal({ isOpen, onClose }) {
    const [domains, setDomains] = useState([]);
    const [newDomain, setNewDomain] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/settings');
            setDomains(res.data.allowedDomains || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const addDomain = () => {
        if (newDomain && !domains.includes(newDomain)) {
            setDomains([...domains, newDomain]);
            setNewDomain('');
        }
    };

    const removeDomain = (domain) => {
        setDomains(domains.filter(d => d !== domain));
    };

    const save = async () => {
        setIsSaving(true);
        try {
            await axios.post('/api/settings', { allowedDomains: domains });
            onClose();
        } catch (err) {
            alert('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-surface w-full max-w-md p-6 rounded-2xl shadow-xl pointer-events-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-text-primary">Domain Settings</h2>
                                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-text-secondary" /></div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-2">Allowed Base Domains</label>
                                        <div className="flex space-x-2 mb-4">
                                            <input
                                                type="text"
                                                value={newDomain}
                                                onChange={(e) => setNewDomain(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                                                placeholder="e.g. sitepilot.io"
                                                className="flex-1 bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                                            />
                                            <button onClick={addDomain} className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                            {domains.map(domain => (
                                                <div key={domain} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-border/50 group hover:border-border transition-colors">
                                                    <span className="font-mono text-sm text-text-primary">.{domain}</span>
                                                    <button onClick={() => removeDomain(domain)} className="text-text-secondary hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {domains.length === 0 && (
                                                <p className="text-sm text-text-secondary text-center py-4 bg-gray-50 rounded-lg border border-dashed border-border">No domains configured. Users will enter full hostnames.</p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={save}
                                        disabled={isSaving}
                                        className="w-full bg-black text-white font-semibold py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex justify-center items-center space-x-2 shadow-lg shadow-black/20"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /><span>Save Changes</span></>}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
