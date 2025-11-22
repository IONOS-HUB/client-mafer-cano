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
    const [buffer, setBuffer] = useState("");
    const [lastKeyTime, setLastKeyTime] = useState(0);
    const onScanRef = useRef(onScan);

    // Keep the ref updated with the latest callback
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            const timeSinceLastKey = currentTime - lastKeyTime;

            // If too much time passed, reset buffer (it was probably manual typing)
            // Unless it's the very first character
            if (buffer.length > 0 && timeSinceLastKey > timeLimit) {
                setBuffer("");
            }

            setLastKeyTime(currentTime);

            if (e.key === "Enter") {
                if (buffer.length >= minLength) {
                    onScanRef.current(buffer);
                    setBuffer("");
                    // Prevent default enter behavior (like form submission) if it was a scan
                    e.preventDefault();
                }
            } else if (e.key.length === 1) {
                // Only add printable characters
                setBuffer((prev) => prev + e.key);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [buffer, lastKeyTime, minLength, timeLimit]);
}
