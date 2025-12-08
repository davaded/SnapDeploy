import { motion } from 'framer-motion';
import { LayoutGrid, Globe, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingNav({ activeTab, onTabChange, onOpenSettings }) {
    const tabs = [
        { id: 'dashboard', icon: LayoutGrid, label: 'Projects' },
        { id: 'domains', icon: Globe, label: 'Domains' },
    ];

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40">
            <div className="flex items-center p-1.5 bg-white/80 backdrop-blur-xl border border-border/70 rounded-full shadow-soft hover:shadow-lg transition-shadow duration-300 ring-1 ring-black/5">

                {/* Navigation Tabs */}
                <div className="flex space-x-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "relative px-4 py-2.5 rounded-full flex items-center justify-center transition-all duration-300",
                                    isActive ? "text-white" : "text-text-secondary hover:text-text-primary"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute inset-0 bg-gradient-to-r from-[#35bfab] to-[#1fc9e7] rounded-full shadow-[0_10px_30px_-12px_rgba(53,191,171,0.6)]"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center space-x-2 font-medium">
                                    <tab.icon className="w-4 h-4" />
                                    {isActive && (
                                        <motion.span
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: 'auto' }}
                                            exit={{ opacity: 0, width: 0 }}
                                            className="text-sm border-l border-white/20 pl-2 ml-1"
                                        >
                                            {tab.label}
                                        </motion.span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
