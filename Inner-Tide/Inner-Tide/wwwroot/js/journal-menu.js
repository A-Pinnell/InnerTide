const journalMusic = document.querySelector("#journal-music");
const journalTrack = `${musicPathPrefix}journal.mp3`;

function resumeJournalMusic() {
    document.removeEventListener("pointerdown", resumeJournalMusic);
    document.removeEventListener("keydown", resumeJournalMusic);
    journalMusic.play().catch(error => {
        if (error.name !== "NotAllowedError") {
            console.error("Unable to resume Journal music.", error);
        }
    });
}

if (journalMusic) {
    journalMusic.src = journalTrack;
    journalMusic.addEventListener("error", () => {
        console.error(`Unable to load Journal music track "${journalTrack}".`);
    });
    journalMusic.play().catch(error => {
        if (error.name === "NotAllowedError") {
            document.addEventListener("pointerdown", resumeJournalMusic, { once: true });
            document.addEventListener("keydown", resumeJournalMusic, { once: true });
            return;
        }
        console.error(`Unable to play Journal music track "${journalTrack}".`, error);
    });
}

const journalSelectSound = registerAudioPlayer(new Audio(`${soundPathPrefix}journalSelect.mp3`), "sfx");

document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest(".journalContainer");
    if (!target) return;

    const historyContainer = document.querySelector("#JournalHistoryContainer");
    if (!(historyContainer instanceof HTMLElement)) {
        throw new Error("The Journal menu requires its history container.");
    }

    if (!target.classList.contains("isSelected")) {
        document.querySelector(".journalContainer.isSelected")?.classList.remove("isSelected");
        target.classList.add("isSelected");
        journalSelectSound.pause();
        journalSelectSound.currentTime = 0;
        journalSelectSound.play().catch(error => {
            console.error("Unable to play Journal selection sound.", error);
        });
    }

    const targetBounds = target.getBoundingClientRect();
    const containerBounds = historyContainer.getBoundingClientRect();
    const scrollTop = historyContainer.scrollTop + targetBounds.top - containerBounds.top
        - (historyContainer.clientHeight - targetBounds.height) / 2;
    historyContainer.scrollTo({
        top: scrollTop,
        behavior: isReducedMotionEnabled() ? "auto" : "smooth"
    });
});
