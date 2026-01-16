export const triggerHaptic = (pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

export const hapticSuccess = () => triggerHaptic([10, 30, 10]);
export const hapticError = () => triggerHaptic([50, 100, 50]);
export const hapticTap = () => triggerHaptic(10);

