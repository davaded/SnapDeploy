import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, Code, FileText, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

export function DeployModal({ isOpen, onClose, onDeploySuccess }) {
    const [domain, setDomain] = useState('');
    const [selectedSuffix, setSelectedSuffix] = useState('');
    const [allowedDomains, setAllowedDomains] = useState([]);

    // Deployment Mode: 'upload' | 'code'
    const [mode, setMode] = useState('upload');

    // Upload State
    const [file, setFile] = useState(null);

    // Code State
    const [code, setCode] = useState('');

    const [isDeploying, setIsDeploying] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
            // Reset states
            setDomain('');
            setFile(null);
            setCode('');
            setMode('upload');
            setError('');
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        try {
            const res = await axios.get('/api/config');
            const domains = res.data.allowedDomains || [];
            setAllowedDomains(domains);
            if (domains.length > 0) {
                setSelectedSuffix(domains[0]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const deploy = async () => {
        // Validation
        if (!domain) {
            setError('Project domain is required');
            return;
        }

        if (mode === 'upload' && !file) {
            setError('Please upload a file');
            return;
        }

        if (mode === 'code' && !code.trim()) {
            setError('Please enter some HTML code');
            return;
        }

        setIsDeploying(true);
        setError('');

        const formData = new FormData();

        const fullHost = allowedDomains.length > 0
            ? `${domain}.${selectedSuffix}`
            : domain;

        formData.append('host', fullHost);

        if (mode === 'upload') {
            formData.append('file', file);
        } else {
            formData.append('code', code);
        }

        try {
            await axios.post('/api/deploy', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                }
            });
            onDeploySuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Deployment failed');
        } finally {
            setIsDeploying(false);
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
                            className="bg-surface w-full max-w-md p-6 rounded-2xl shadow-xl pointer-events-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-text-primary">New Deployment</h2>
                                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-text-secondary" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                        {allowedDomains.length > 0 ? 'Project Subdomain' : 'Project Domain'}
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={domain}
                                            onChange={(e) => setDomain(e.target.value)}
                                            placeholder="my-project"
                                            className="flex-1 bg-white border border-border rounded-lg px-3 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-mono"
                                        />
                                        {allowedDomains.length > 0 && (
                                            <div className="relative">
                                                {allowedDomains.length > 1 ? (
                                                    <>
                                                        <select
                                                            value={selectedSuffix}
                                                            onChange={(e) => setSelectedSuffix(e.target.value)}
                                                            className="h-full bg-white border border-border rounded-lg pl-3 pr-8 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 appearance-none cursor-pointer"
                                                        >
                                                            {allowedDomains.map(d => (
                                                                <option key={d} value={d} className="bg-white text-black">.{d}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                                                    </>
                                                ) : (
                                                    <div className="h-full flex items-center bg-gray-50 border border-border rounded-lg px-3 text-text-secondary select-none">
                                                        .{allowedDomains[0]}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex p-1 bg-gray-100/80 rounded-lg">
                                    <button
                                        onClick={() => setMode('upload')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all duration-200",
                                            mode === 'upload' ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                                        )}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload File
                                    </button>
                                    <button
                                        onClick={() => setMode('code')}
                                        className={cn(
                                            "flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all duration-200",
                                            mode === 'code' ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                                        )}
                                    >
                                        <Code className="w-4 h-4 mr-2" />
                                        Paste Code
                                    </button>
                                </div>

                                {/* Content Area */}
                                <div className="min-h-[200px]">
                                    {mode === 'upload' ? (
                                        <div
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={cn(
                                                "h-[200px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all text-center group",
                                                file && "border-green-500/50 bg-green-500/5"
                                            )}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileChange}
                                                accept=".zip,.html,.htm"
                                            />
                                            {file ? (
                                                <div className="text-green-600 font-medium flex flex-col items-center">
                                                    <FileText className="w-8 h-8 mb-2" />
                                                    <span className="text-sm">Ready to deploy</span>
                                                    <span className="text-text-primary text-base mt-1 max-w-[200px] truncate">{file.name}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-3 bg-gray-100 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                                        <Upload className="w-6 h-6 text-text-secondary" />
                                                    </div>
                                                    <p className="text-sm text-text-secondary">Click to upload or drag & drop</p>
                                                    <p className="text-xs text-text-secondary/60 mt-1">.zip or .html file</p>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-[200px] relative">
                                            <textarea
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                placeholder="<html>&#10;  <body>&#10;    <h1>Hello World</h1>&#10;  </body>&#10;</html>"
                                                className="w-full h-full bg-white border border-border rounded-xl p-4 text-sm font-mono text-text-primary placeholder-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none transition-all"
                                            />
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={deploy}
                                    disabled={isDeploying}
                                    className="w-full bg-black text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg shadow-black/20"
                                >
                                    {isDeploying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Deploy Project'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
