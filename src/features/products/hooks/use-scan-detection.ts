import { useEffect, useState, useRef } from "react";

/**
 * Hook to detect barcode scanner input.
 * Scanners usually emulate a keyboard, typing characters rapidly and ending with Enter.
 */
export function useScanDetection({
    onScan,
    minLength = 3,
    timeLimit = 50, // ms between keystrokes
}: {
    onScan: (code: string) => void;
    minLength?: number;
    timeLimit?: number;
}) {
    const bufferRef = useRef("");
    const lastKeyTimeRef = useRef(0);
    const onScanRef = useRef(onScan);

    // Keep the ref updated with the latest callback
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input field
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            if (!e.key) return;

            const currentTime = Date.now();
            const timeSinceLastKey = currentTime - lastKeyTimeRef.current;

            // If too much time passed, reset buffer (it was probably manual typing)
            // Unless it's the very first character
            if (bufferRef.current.length > 0 && timeSinceLastKey > timeLimit) {
                bufferRef.current = "";
            }

            lastKeyTimeRef.current = currentTime;

            if (e.key === "Enter") {
                if (bufferRef.current.length >= minLength) {
                    onScanRef.current(bufferRef.current);
                    bufferRef.current = "";
                    // Prevent default enter behavior (like form submission) if it was a scan
                    e.preventDefault();
                }
            } else if (e.key.length === 1) {
                // Only add printable characters
                bufferRef.current += e.key;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [minLength, timeLimit]);
}
