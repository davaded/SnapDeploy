import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Shield } from 'lucide-react';
import axios from 'axios';

export function AccessModal({ isOpen, host, onClose }) {
    const [commonUsers, setCommonUsers] = useState([]);
    const [grantedUsers, setGrantedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && host) {
            loadData();
        } else {
            setCommonUsers([]);
            setGrantedUsers([]);
            setError('');
        }
    }, [isOpen, host]);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [commonRes, grantRes] = await Promise.all([
                axios.get('/api/site-auth/common-users'),
                axios.get(`/api/sites/${encodeURIComponent(host)}/auth/users`)
            ]);
            setCommonUsers(commonRes.data.users || []);
            setGrantedUsers((grantRes.data.users || []).map(u => u.username));
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const toggleUser = (username) => {
        if (grantedUsers.includes(username)) {
            setGrantedUsers(grantedUsers.filter(u => u !== username));
        } else {
            setGrantedUsers([...grantedUsers, username]);
        }
    };

    const saveGrants = async () => {
        if (!host) return;
        setSaving(true);
        setError('');
        try {
            await axios.post(`/api/sites/${encodeURIComponent(host)}/auth/grants`, {
                usernames: grantedUsers
            });
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save grants');
        } finally {
            setSaving(false);
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white/90 backdrop-blur-xl w-full max-w-lg p-6 rounded-2xl shadow-xl pointer-events-auto border border-border"
                        >
                            <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
                                <div className="flex items-center space-x-3 min-w-0">
                                    <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-text-primary">Access Control</h2>
                                        <p className="text-sm text-text-secondary break-all max-w-xs">Host: {host}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="text-text-secondary hover:text-text-primary">Close</button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-xs text-text-secondary">
                                    请选择哪些“常用账号”可以访问此站点。密码在创建常用账号时已设定。
                                </p>
                                {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg p-2">{error}</p>}

                                <div className="border border-border rounded-lg bg-white/80 max-h-72 overflow-y-auto custom-scrollbar">
                                    {loading ? (
                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-text-secondary" /></div>
                                    ) : commonUsers.length === 0 ? (
                                        <div className="p-4 text-sm text-text-secondary">暂无常用账号，请先在后台添加。</div>
                                    ) : (
                                        commonUsers.map((u) => (
                                            <label
                                                key={u.username}
                                                className="flex items-center justify-between px-4 py-3 border-b border-border/60 last:border-b-0 cursor-pointer hover:bg-gray-50 gap-3"
                                            >
                                                <div className="flex items-center space-x-3 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={grantedUsers.includes(u.username)}
                                                        onChange={() => toggleUser(u.username)}
                                                    />
                                                    <span className="font-mono text-sm text-text-primary break-all">{u.username}</span>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>

                                <div className="flex justify-end space-x-2 pt-2 flex-wrap">
                                    <button
                                        onClick={loadData}
                                        className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg"
                                    >
                                        Refresh
                                    </button>
                                    <button
                                        onClick={saveGrants}
                                        disabled={saving}
                                        className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[#35bfab] to-[#1fc9e7] hover:brightness-105 disabled:opacity-60"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
