const journalMusic = document.querySelector("#journal-music");
const journalTrack = `${musicPathPrefix}journal.mp3`;
const journalHistoryContainer = document.querySelector("#JournalHistoryContainer");
const deleteJournalBtn = document.querySelector("#deleteJournalBtn");
const viewFullBtn = document.querySelector("#viewFullBtn");
const journalButtonContainer = document.querySelector("#journalButtonContainer");
var journalEntryText = document.querySelector("#journalEntryText");
var currentlySelectedJournal = 0;

async function RenderJournalEntries() {
    try {

        const res = await fetch('/Journals/GetAllJournalEntries');

        if (!res.ok) {
            throw new Error("Failed to Load Journal Entries");
        }

        journalHistoryContainer.innerHTML = "";

        const journals = await res.json();
        console.log(journals);

        journals.forEach(journal => {
            var div = document.createElement("div");
            div.classList.add("journalContainer");
            div.setAttribute("value", journal.journalId);

            var h3 = document.createElement("h3");
            h3.textContent = journal.journalTitle;

            div.appendChild(h3);

            journalHistoryContainer.appendChild(div);
        });

        var childCount = journalHistoryContainer.childElementCount;

        if (childCount == 0) {
            var h3 = document.createElement("h3");
            h3.textContent = "No Journals Found";
            journalEntryText.textContent = "Write a Journal Entry to get Started";
            journalHistoryContainer.appendChild(h3);

            journalButtonContainer.classList.remove("showViewAndDelete");

            journalHistoryContainer.style.display = "flex";
            journalHistoryContainer.style.flexDirection = "column";
            journalHistoryContainer.style.alignItems = "center";
            journalHistoryContainer.style.justifyContent = "center";
        }

    } catch (err) {
        console.error(err);
    }
}

async function GetJournalEntry(journalId) {
    const url = `/Journals/GetJournalEntry?journalId=${journalId}`;

    try {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Failed to Load Journal Entry (${res.status})`);
        }

        const journal = await res.json();

        return journal;

    } catch (err) {
        console.error(err);
    }
}

RenderJournalEntries();

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

document.addEventListener("click", async event => {
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

        const journalId = Number(target.getAttribute("value"));
        currentlySelectedJournal = journalId;

        const journal = await GetJournalEntry(journalId);

        if (currentlySelectedJournal !== journalId) {
            return;
        }

        if (!journal) {
            return;
        }

        journalEntryText.textContent = journal.journalContent;

        journalButtonContainer.classList.add("showViewAndDelete");
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

deleteJournalBtn.addEventListener("click", async event => {
    const url = `/Journals/Delete`;

    if (currentlySelectedJournal === 0) {
        return;
    }

    try {
        const res = await fetch('/Journals/Delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                journalId: currentlySelectedJournal
            })
        });

        if (!res.ok) {
            throw new Error(`Failed to Load Journal Entry (${res.status})`);
        }

        journalEntryText.textContent = "Click a Journal to Read its Contents";
        currentlySelectedJournal = 0;

        await RenderJournalEntries();

    } catch (err) {
        console.error(err);
    }
});
