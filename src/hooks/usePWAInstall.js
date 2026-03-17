import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        console.log('PWA: Initializing install listener...');
        
        // 1. Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone) {
            console.log('PWA: Already installed in standalone mode');
            setIsInstallable(false);
            return;
        }

        const handler = (e) => {
            console.log('PWA: beforeinstallprompt event fired!');
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        
        // 2. Continuous check for the global prompt
        const checkInterval = setInterval(() => {
            if (window.deferredPrompt && !deferredPrompt) {
                console.log('PWA: Capturing deferred prompt from window');
                setDeferredPrompt(window.deferredPrompt);
                setIsInstallable(true);
            }
        }, 1000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            clearInterval(checkInterval);
        };
    }, [deferredPrompt]);

    const installPWA = async () => {
        console.log('PWA: Internal install trigger...', { deferredPrompt: !!deferredPrompt });
        if (!deferredPrompt) {
            toast.error('Installation not ready yet. Please use the browser install icon.');
            return;
        }

        // Show the prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the PWA install');
        } else {
            console.log('User dismissed the PWA install');
        }
        
        // We've used the prompt, and can't use it again
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    return { isInstallable, installPWA };
}
