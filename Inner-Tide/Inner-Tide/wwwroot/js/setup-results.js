const setupResultProgressBars = Array.from(document.querySelectorAll(".setup-results-progress[data-target-value]"));

if (setupResultProgressBars.length > 0) {
    const targets = setupResultProgressBars.map(progress => ({
        progress,
        value: Number(progress.dataset.targetValue),
        previous: progress.dataset.hasChange === "true"
            ? Number(progress.dataset.previousValue)
            : null,
        fill: progress.querySelector(".setup-results-progress-fill"),
        change: progress.querySelector(".setup-results-progress-change")
    }));

    if (targets.some(({ value, previous, fill }) =>
        !Number.isFinite(value) || value < 0 || value > 100 ||
        (previous !== null && (!Number.isFinite(previous) || previous < 0 || previous > 100)) ||
        !fill)) {
        throw new RangeError("Setup result progress values must be between 0 and 100.");
    }

    function renderProgressBars(progress) {
        targets.forEach(({ progress: bar, value, previous, fill, change }) => {
            const start = previous === null ? 0 : previous;
            const end = previous === null ? value : Math.min(previous, value);
            const fillValue = start + (end - start) * progress;
            fill.style.width = `${fillValue}%`;
            if (change) {
                change.style.left = `${Math.min(previous, value)}%`;
                change.style.width = `${Math.abs(value - previous) * progress}%`;
            }
        });
    }

    if (isReducedMotionEnabled()) {
        renderProgressBars(1);
    } else {
        const duration = 900;
        const startTime = performance.now();

        function animateProgressBars(now) {
            const linearProgress = Math.min(1, (now - startTime) / duration);
            renderProgressBars(1 - Math.pow(1 - linearProgress, 3));
            if (linearProgress < 1) window.requestAnimationFrame(animateProgressBars);
        }

        window.requestAnimationFrame(animateProgressBars);
    }
}
