const setupResultProgressBars = Array.from(document.querySelectorAll(".setup-results-progress[data-target-value]"));

if (setupResultProgressBars.length > 0) {
    const targets = setupResultProgressBars.map(progress => ({
        progress,
        value: Number(progress.dataset.targetValue)
    }));

    if (targets.some(({ value }) => !Number.isFinite(value) || value < 0 || value > 100)) {
        throw new RangeError("Setup result progress values must be between 0 and 100.");
    }

    if (isReducedMotionEnabled()) {
        targets.forEach(({ progress, value }) => {
            progress.value = value;
        });
    } else {
        const duration = 900;
        const startTime = performance.now();

        function animateProgressBars(now) {
            const elapsed = now - startTime;
            const linearProgress = Math.min(1, elapsed / duration);
            const easedProgress = 1 - Math.pow(1 - linearProgress, 3);
            targets.forEach(({ progress, value }) => {
                progress.value = value * easedProgress;
            });

            if (linearProgress < 1) {
                window.requestAnimationFrame(animateProgressBars);
            }
        }

        window.requestAnimationFrame(animateProgressBars);
    }
}
