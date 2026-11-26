const journalMusic = document.querySelector("#journal-music");
const journalTrack = `${musicPathPrefix}journal.mp3`;
const journalHistoryContainer = document.querySelector("#JournalHistoryContainer");
const deleteJournalBtn = document.querySelector("#deleteJournalBtn");
const viewFullBtn = document.querySelector("#viewFullBtn");
const journalButtonContainer = document.querySelector("#journalButtonContainer");
const journalEntryTitle = document.querySelector("#journalEntryTitle");
const journalEntryText = document.querySelector("#journalEntryText");
const journalEntryContent = document.querySelector("#journalEntryContent");
const journalEntryScrollbar = document.querySelector("#journalEntryScrollbar");
const journalEntryScrollbarHitArea = journalEntryScrollbar?.querySelector(".journal-entry-scrollbar-hit-area");
const journalEntryScrollbarThumb = journalEntryScrollbar?.querySelector("#journalEntryScrollbarThumb");
const journalDeleteDialog = document.querySelector("#journalDeleteDialog");
const journalDeleteCancel = document.querySelector("#journalDeleteCancel");
const journalDeleteConfirm = document.querySelector("#journalDeleteConfirm");
const journalBottleShardShapes = [
    "polygon(0 0, 50% 0, 50% 50%)",
    "polygon(0 0, 50% 50%, 0 50%)",
    "polygon(50% 0, 100% 0, 100% 50%)",
    "polygon(50% 0, 100% 50%, 50% 50%)",
    "polygon(0 50%, 50% 50%, 50% 100%)",
    "polygon(0 50%, 50% 100%, 0 100%)",
    "polygon(50% 50%, 100% 50%, 100% 100%)",
    "polygon(50% 50%, 100% 100%, 50% 100%)"
];
var currentlySelectedJournal = 0;

function updateJournalEntryScrollbar() {
    if (!(journalEntryText instanceof HTMLElement)
        || !(journalEntryScrollbar instanceof SVGSVGElement)
        || !(journalEntryScrollbarThumb instanceof SVGPathElement)) {
        return;
    }

    const maxScroll = Math.max(0, journalEntryText.scrollHeight - journalEntryText.clientHeight);
    const scrollRatio = maxScroll > 0 ? journalEntryText.scrollTop / maxScroll : 0;
    const thumbLength = maxScroll > 0
        ? Math.max(100, (journalEntryText.clientHeight / journalEntryText.scrollHeight) * 950)
        : 1000;

    journalEntryScrollbar.style.visibility = maxScroll > 0 ? "visible" : "hidden";
    journalEntryScrollbarThumb.setAttribute("stroke-dasharray", `${thumbLength} ${1000 - thumbLength}`);
    journalEntryScrollbarThumb.setAttribute("stroke-dashoffset", String(-scrollRatio * (1000 - thumbLength)));
}

if (journalEntryText instanceof HTMLElement
    && journalEntryScrollbar instanceof SVGSVGElement
    && journalEntryScrollbarHitArea instanceof SVGPathElement
    && journalEntryScrollbarThumb instanceof SVGPathElement) {
    let dragStartY = 0;
    let dragStartScrollTop = 0;

    journalEntryText.addEventListener("scroll", updateJournalEntryScrollbar, { passive: true });
    window.addEventListener("resize", updateJournalEntryScrollbar);
    journalEntryScrollbar.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;

        const maxScroll = Math.max(0, journalEntryText.scrollHeight - journalEntryText.clientHeight);
        const bounds = journalEntryScrollbar.getBoundingClientRect();
        if (maxScroll <= 0 || bounds.height <= 0) return;

        event.preventDefault();
        if (event.target !== journalEntryScrollbarThumb) {
            const clickRatio = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
            journalEntryText.scrollTop = clickRatio * maxScroll;
        }

        dragStartY = event.clientY;
        dragStartScrollTop = journalEntryText.scrollTop;
        journalEntryScrollbar.setPointerCapture(event.pointerId);
    });
    journalEntryScrollbar.addEventListener("pointermove", event => {
        if (!journalEntryScrollbar.hasPointerCapture(event.pointerId)) return;

        const maxScroll = Math.max(0, journalEntryText.scrollHeight - journalEntryText.clientHeight);
        const bounds = journalEntryScrollbar.getBoundingClientRect();
        if (maxScroll <= 0 || bounds.height <= 0) return;

        const scrollDelta = ((event.clientY - dragStartY) / bounds.height) * maxScroll;
        journalEntryText.scrollTop = Math.max(0, Math.min(maxScroll, dragStartScrollTop + scrollDelta));
    });
    updateJournalEntryScrollbar();
}

async function breakJournalBottle(bottle) {
    if (!(bottle instanceof HTMLElement)
        || isReducedMotionEnabled()
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const bottleBounds = bottle.getBoundingClientRect();
    const shards = journalBottleShardShapes.map((shape, index) => {
        const shard = document.createElement("span");
        const angle = (index / journalBottleShardShapes.length) * Math.PI * 2 - Math.PI / 2;
        const directionX = Math.cos(angle);
        const directionY = Math.sin(angle);
        const distanceToExitX = directionX > 0
            ? (window.innerWidth - bottleBounds.left + 80) / directionX
            : directionX < 0
                ? (bottleBounds.right + 80) / -directionX
                : Infinity;
        const distanceToExitY = directionY > 0
            ? (window.innerHeight - bottleBounds.top + 80) / directionY
            : directionY < 0
                ? (bottleBounds.bottom + 80) / -directionY
                : Infinity;
        const distance = Math.min(distanceToExitX, distanceToExitY);

        shard.className = "journal-bottle-shard";
        shard.style.clipPath = shape;
        shard.style.left = `${bottleBounds.left}px`;
        shard.style.top = `${bottleBounds.top}px`;
        shard.style.width = `${bottleBounds.width}px`;
        shard.style.height = `${bottleBounds.height}px`;
        shard.style.setProperty("--shard-x", `${directionX * distance}px`);
        shard.style.setProperty("--shard-y", `${directionY * distance}px`);
        shard.style.setProperty("--shard-rotation", `${Math.random() * 720 - 360}deg`);
        shard.style.setProperty("--shard-delay", `${Math.random() * 70}ms`);
        shard.style.setProperty("--shard-duration", `${Math.min(1800, Math.max(900, distance * 0.85))}ms`);
        return shard;
    });

    document.body.append(...shards);
    const animationFinished = Promise.all(shards.map(shard => new Promise(resolve => {
        shard.addEventListener("animationend", resolve, { once: true });
    })));
    bottle.classList.add("is-breaking");
    shards.forEach(shard => shard.classList.add("is-flying"));
    await animationFinished;
    shards.forEach(shard => shard.remove());
}

function confirmJournalDeletion() {
    if (!(journalDeleteDialog instanceof HTMLDialogElement)) {
        throw new Error("The Journal menu requires its delete confirmation dialog.");
    }

    return new Promise(resolve => {
        journalDeleteDialog.returnValue = "";
        journalDeleteDialog.addEventListener("close", () => {
            resolve(journalDeleteDialog.returnValue === "delete");
        }, { once: true });
        journalDeleteDialog.showModal();
        journalDeleteCancel.focus();
    });
}

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
            h3.textContent = new Date(journal.journalCreation).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
            });

            div.appendChild(h3);

            journalHistoryContainer.appendChild(div);
        });

        var childCount = journalHistoryContainer.childElementCount;

        if (childCount == 0) {
            var h3 = document.createElement("h3");
            h3.textContent = "No Journals Found";
            journalEntryTitle.textContent = "";
            journalEntryContent.textContent = "Write a Journal Entry to get Started";
            journalEntryText.scrollTop = 0;
            updateJournalEntryScrollbar();
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

        journalEntryTitle.textContent = journal.journalTitle;
        journalEntryContent.textContent = journal.journalContent;
        journalEntryText.scrollTop = 0;
        updateJournalEntryScrollbar();

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

    if (!await confirmJournalDeletion()) {
        return;
    }

    const selectedBottle = journalHistoryContainer.querySelector(".journalContainer.isSelected");

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

        await breakJournalBottle(selectedBottle);
        journalEntryTitle.textContent = "";
        journalEntryContent.textContent = "Click a Journal to Read its Contents";
        journalEntryText.scrollTop = 0;
        updateJournalEntryScrollbar();
        currentlySelectedJournal = 0;

        await RenderJournalEntries();

    } catch (err) {
        console.error(err);
    }
});

journalDeleteCancel.addEventListener("click", () => {
    journalDeleteDialog.close("cancel");
});

journalDeleteConfirm.addEventListener("click", () => {
    journalDeleteDialog.close("delete");
});
