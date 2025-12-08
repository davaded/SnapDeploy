import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import axios from 'axios';

export function CommonUsersModal({ isOpen, onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newUser, setNewUser] = useState('');
    const [newPass, setNewPass] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        } else {
            setUsers([]);
            setError('');
            setNewUser('');
            setNewPass('');
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get('/api/site-auth/common-users');
            setUsers(res.data.users || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const addUser = async () => {
        if (!newUser || !newPass) {
            setError('Username and password are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await axios.post('/api/site-auth/common-users', { username: newUser, password: newPass });
            setNewUser('');
            setNewPass('');
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save user');
        } finally {
            setSaving(false);
        }
    };

    const deleteUser = async (username) => {
        if (!confirm(`Delete user ${username}?`)) return;
        setSaving(true);
        setError('');
        try {
            await axios.delete(`/api/site-auth/common-users/${encodeURIComponent(username)}`);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete user');
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
                            className="bg-white/90 backdrop-blur-xl w-full max-w-md p-6 rounded-2xl shadow-xl pointer-events-auto border border-border"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-text-primary">Common Users</h2>
                                        <p className="text-sm text-text-secondary">创建一次，站点复用</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="text-text-secondary hover:text-text-primary">Close</button>
                            </div>

                            <div className="space-y-3">
                                {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg p-2">{error}</p>}

                                <div className="flex gap-2 flex-col sm:flex-row sm:flex-wrap">
                                    <input
                                        type="text"
                                        value={newUser}
                                        onChange={(e) => setNewUser(e.target.value)}
                                        placeholder="username"
                                        className="flex-1 min-w-0 bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                                    />
                                    <input
                                        type="password"
                                        value={newPass}
                                        onChange={(e) => setNewPass(e.target.value)}
                                        placeholder="password"
                                        className="flex-1 min-w-0 bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                                    />
                                    <button
                                        onClick={addUser}
                                        disabled={saving}
                                        className="p-2 bg-gradient-to-r from-[#35bfab] to-[#1fc9e7] text-white rounded-lg hover:brightness-105 transition-colors shadow-[0_10px_24px_-14px_rgba(53,191,171,0.7)] disabled:opacity-60 w-full sm:w-auto"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-text-secondary">在这里创建的账号可以在各站点授权列表中勾选使用。</p>

                                <div className="border border-border rounded-lg bg-white/80 max-h-64 overflow-y-auto custom-scrollbar">
                                    {loading ? (
                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-text-secondary" /></div>
                                    ) : users.length === 0 ? (
                                        <div className="p-4 text-sm text-text-secondary">暂无用户，请添加。</div>
                                    ) : (
                                        users.map(u => (
                                            <div key={u.id || u.username} className="flex items-center justify-between px-4 py-3 border-b border-border/60 last:border-b-0">
                                                <span className="font-mono text-sm text-text-primary">{u.username}</span>
                                                <button
                                                    onClick={() => deleteUser(u.username)}
                                                    className="text-text-secondary hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
