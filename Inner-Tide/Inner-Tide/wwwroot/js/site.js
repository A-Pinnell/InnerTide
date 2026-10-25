let taskData = {
    daily: [],
    monthly: [],
    weekly: []
};

// Task Menu Variables
const bedIcon = '<svg viewBox="0 0 64 48"><path d="M5 8h8v17h46v17h-6v-6H11v6H5V8Zm9 17v-9h15a8 8 0 0 1 8 9H14Z"/></svg>';
const taskList = document.querySelector("#task-list");
const taskScroll = document.querySelector("#task-scroll");
const tabsContainer = document.querySelector(".tabs");
const gameShell = document.querySelector(".game-shell");
const elementsToggle = document.querySelector(".elements-toggle");
const aquariumPanel = document.querySelector("#elements-panel");
const aquariumBackdrop = document.querySelector("#elements-backdrop");
const playerCard = document.querySelector(".player-card");
const profileToggle = document.querySelector(".avatar");
const coinCounter = document.querySelector(".coin-counter");
const coinCount = document.querySelector("#coin-count");
const aquariumStatus = document.querySelector(".elements-status");
const aquariumTank = document.querySelector(".status-tank");
const aquariumPercentLabel = document.querySelector(".status-percent");
const coinStorageKey = "innerTide.coinBalance";

async function getTaskData() {
    const response = await fetch('/Home/GetTasks'); 
    taskData = await response.json();

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    console.log(taskData);
    renderTasks("daily");
}

getTaskData();

async function loadCoinBalance() {
    try {
        const res = await fetch('/Users/GetCoins');

        if (!res.ok) {
            throw new Error('Failed to load coin balance.');
        }

        const data = await res.json();

        coinBalance = data.coins;

        if (coinCount) {
            coinCount.textContent = coinBalance;
        }

    } catch (error) {
        console.error(error);
    }
}
let coinBalance = 0;

async function saveCoinBalance(coinAmount) {
    try {
        const res = await fetch('/Users/AddCoins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: coinAmount })
        });

        if (!res.ok) {
            throw new Error('Failed to save coins.');
        }

        await loadCoinBalance();

    } catch (error) {
        console.error(error);
    }
}

// Aquarium Menu Variables
const storeBtn = document.querySelector("#storeBtn");
const storePanel = document.querySelector("#tankStorePanel");
const storeBackdrop = document.querySelector("#tankStoreBackdrop");
const inventoryBtn = document.querySelector("#inventoryBtn");
const inventoryPanel = document.querySelector("#tankInventoryPanel");
const inventoryBackdrop = document.querySelector("#tankInventoryBackdrop");
const inventoryFish = document.querySelector("inventoryFish");
const editorBtn = document.querySelector("#editorBtn");
const editorToolbar = document.querySelector("#editorToolbar");
const editorCloseButton = document.querySelector("#editorCloseButton");
const editorSwitchLayer = document.querySelector("#editorSwitchLayer");
const editorMoreItems = document.querySelector("#editorMoreItems");
const editorLayerNumber = document.querySelector("#editorLayerNumber");
const editorForegroundLabel = document.querySelector("#editorForegroundLabel");
const editorForegroundNumber = document.querySelector("#editorForegroundNumber");
const editorInventoryPanel = document.querySelector("#editorInventoryPanel");
const editorInventoryBackdrop = document.querySelector("#editorInventoryBackdrop");

function setAquariumPercent(percent) {
    const numericPercent = Number(percent);
    if (!Number.isFinite(numericPercent)) {
        throw new TypeError("Aquarium percentage must be a finite number.");
    }

    const value = Math.min(100, Math.max(0, Math.round(numericPercent)));
    aquariumStatus.dataset.percent = String(value);
    aquariumTank.style.setProperty("--water-level", `${value}%`);
    aquariumPercentLabel.textContent = `${value}%`;
}

function animateCoinReward(taskRow, amount) {
    const source = taskRow.querySelector(".task-reward").getBoundingClientRect();
    const target = coinCounter.getBoundingClientRect();
    const animateCoinArrival = () => {
        coinCounter.classList.remove("coin-arrived");
        void coinCounter.offsetWidth;
        coinCounter.classList.add("coin-arrived");
        if (typeof coinCount.animate === "function") {
            coinCount.animate([
                { transform: "scale(1)" },
                { transform: "scale(1.25)", offset: .45 },
                { transform: "scale(1)" }
            ], { duration: 260, easing: "ease-out" });
        }
    };

    saveCoinBalance(amount);

    if (typeof Element.prototype.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const coinSize = 34;
    const sourceX = source.left + source.width / 2 - coinSize / 2;
    const sourceY = source.top + source.height / 2 - coinSize / 2;
    const targetX = target.left + target.width / 2 - coinSize / 2;
    const targetY = target.top + target.height / 2 - coinSize / 2;
    const spread = amount > 1 ? Math.min(18, 4 + amount) : 0;

    Array.from({ length: amount }, (_, index) => {
        const angle = (index / amount) * Math.PI * 2;
        const startX = sourceX + Math.cos(angle) * spread;
        const startY = sourceY + Math.sin(angle) * spread;
        const coin = document.createElement("img");

        coin.className = "coin-flight";
        coin.src = "img/coin.png";
        coin.alt = "";
        coin.style.left = `${startX}px`;
        coin.style.top = `${startY}px`;
        document.body.append(coin);

        const animation = coin.animate([
            { transform: "translate(0, 0) scale(.7)", opacity: 0 },
            { transform: "translate(0, 0) scale(1)", opacity: 1, offset: .16 },
            { transform: `translate(${targetX - startX}px, ${targetY - startY}px) scale(.45)`, opacity: .15 }
        ], {
            duration: 650,
            delay: index * 90,
            easing: "cubic-bezier(.22,.75,.35,1)",
            fill: "both"
        });

        animation.finished.then(() => {
            coin.remove();
            animateCoinArrival();
        }, () => coin.remove());
    });
}

function renderTasks(period) {
    if (!taskList) return;// Safe Guard for When on Other Pages

    const tasks = taskData[period];
    taskList.replaceChildren();

    tasks.forEach((task, index) => {
        const row = document.createElement("article");
        row.className = `task-row completeable${task.completed ? " completed" : ""}${task.priority ? " priority-task" : ""}`;

        if (task.priority) {
            const priorityIcon = document.createElement("img");
            priorityIcon.className = "priority-icon";
            priorityIcon.src = "img/priority-task.png";
            priorityIcon.alt = "Priority";
            row.append(priorityIcon);
        }

        const icon = document.createElement("span");
        icon.className = "task-icon";
        icon.innerHTML = bedIcon;

        const title = document.createElement("span");
        title.className = "task-text";
        title.textContent = task.title;

        const reward = document.createElement("span");
        reward.className = "task-reward";
        const chestWrap = document.createElement("span");
        chestWrap.className = "chest-wrap";
        const chest = document.createElement("img");
        chest.className = "chest";
        chest.src = "img/menu_chest.png";
        chest.alt = "";
        chestWrap.append(chest);
        reward.append(chestWrap);

        if (!task.completed) {
            const coin = document.createElement("span");
            coin.className = "coin";
            const value = document.createElement("span");
            value.className = "reward-value";
            value.textContent = task.reward;
            reward.append(coin, value);
            if (task.priority) {
                const multiplier = document.createElement("span");
                multiplier.className = "priority-multiplier";
                multiplier.textContent = "x2";
                reward.append(multiplier);
            }
        }

        row.append(icon, title, reward);
        if (task.completed) {
            const check = document.createElement("span");
            check.className = "task-check";
            check.textContent = "✓";
            chestWrap.append(check);
        }

        const complete = () => {
            if (task.completed) return;
            task.completed = true;
            renderTasks(period);
        };
        row.addEventListener("click", complete);

        if (index === tasks.length - 1) row.classList.add("last-task");
        taskList.append(row);
    });
}

function selectPeriod(tab) {
    if (!tab || tab.classList.contains("active")) return;

    const period = tab.dataset.period;
    document.querySelectorAll(".tab").forEach(item => {
        const selected = item === tab;
        item.classList.toggle("active", selected);
    });
    positionTabCarousel(period);
    renderTasks(period);
    taskScroll.scrollTop = 0;
}

function setProfileOpen(open) {
    playerCard.classList.toggle("profile-open", open);
    playerCard.classList.toggle("profile-collapsed", !open);
}

if (playerCard && profileToggle) {
    profileToggle.addEventListener("click", () => {
        setProfileOpen(!playerCard.classList.contains("profile-open"));
    });
}

if (gameShell) {
    tabsContainer.addEventListener("click", event => {
        const tabs = [...tabsContainer.querySelectorAll(".tab")];
        const target = event.target instanceof Element ? event.target.closest(".tab") : null;
        let clickedTab = target;

        if (event.detail > 0 && Number.isFinite(event.clientX)) {
            clickedTab = tabs.reduce((nearest, tab) => {
                const rect = tab.getBoundingClientRect();
                const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
                if (!nearest || distance < nearest.distance) return { tab, distance };
                return nearest;
            }, null)?.tab || target;
        }

        selectPeriod(clickedTab);
    });

    function positionTabCarousel(selectedPeriod) {
        const periods = ["monthly", "daily", "weekly"];
        const selectedIndex = periods.indexOf(selectedPeriod);
        if (selectedIndex === -1) {
            throw new RangeError(`Unknown task period: ${selectedPeriod}`);
        }

        document.querySelectorAll(".tab").forEach(tab => {
            const offset = (periods.indexOf(tab.dataset.period) - selectedIndex + periods.length) % periods.length;
            tab.dataset.position = offset === 0 ? "center" : offset === 1 ? "right" : "left";
        });
    }

    function setaquariumOpen(open) {
        if (open) {
            aquariumTank.style.setProperty("--water-level", "0%");
            void aquariumTank.offsetWidth;
        }
        gameShell.classList.toggle("elements-open", open);
        if (open) {
            window.requestAnimationFrame(() => {
                if (gameShell.classList.contains("elements-open")) {
                    aquariumTank.style.setProperty("--water-level", `${aquariumStatus.dataset.percent}%`);
                }
            });
        } else {
            aquariumTank.style.setProperty("--water-level", "0%");
        }
        elementsToggle.querySelector("b").textContent = open ? "‹" : "›";
    }

    elementsToggle.addEventListener("click", () => {
        setaquariumOpen(!gameShell.classList.contains("elements-open"));
    });
    aquariumBackdrop.addEventListener("click", () => setaquariumOpen(false));

    taskScroll.addEventListener("scroll", () => {
        const rail = document.querySelector(".scroll-rail span");
        const maxScroll = taskScroll.scrollHeight - taskScroll.clientHeight;
        const progress = maxScroll > 0 ? taskScroll.scrollTop / maxScroll : 0;
        const trackHeight = document.querySelector(".scroll-rail").clientHeight;
        const thumbHeight = rail.clientHeight;
        rail.style.transform = `translateY(${progress * Math.max(0, trackHeight - thumbHeight)}px)`;
    });

    renderTasks("daily");
    positionTabCarousel("daily");
    setAquariumPercent(aquariumStatus.dataset.percent);
    loadCoinBalance();
    window.setAquariumPercent = setAquariumPercent;

    const aquariumLink = document.querySelector(".aquarium-tab a");
    aquariumLink.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        gameShell.classList.add("aquarium-transition");
        const transitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 950;
        window.setTimeout(() => window.location.assign(aquariumLink.href), transitionDuration);
    });
}

const taskMenuLink = document.querySelector(".task-tab a");
if (taskMenuLink) {
    taskMenuLink.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        document.body.classList.add("task-menu-transition");
        const destination = new URL(taskMenuLink.href);
        destination.searchParams.set("from", "aquarium");
        const transitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 950;
        window.setTimeout(() => window.location.assign(destination.href), transitionDuration);
    });
}

if (document.body.classList.contains("quiz-menu-page")) {
    document.querySelectorAll(".quiz-card[href]").forEach(card => {
        card.addEventListener("click", event => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();

            const bounds = card.getBoundingClientRect();
            card.style.setProperty("--transition-top", `${bounds.top}px`);
            card.style.setProperty("--transition-left", `${bounds.left}px`);
            card.style.setProperty("--transition-width", `${bounds.width}px`);
            card.style.setProperty("--transition-height", `${bounds.height}px`);
            card.style.setProperty("--transition-radius", getComputedStyle(card).borderRadius);
            card.classList.add("is-transitioning");

            const destination = card.href;
            const transitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
            if (transitionDuration === 0) {
                window.location.assign(destination);
                return;
            }

            void card.offsetWidth;
            window.requestAnimationFrame(() => {
                card.classList.add("is-expanded");
                window.setTimeout(() => window.location.assign(destination), transitionDuration);
            });
        });
    });

    document.querySelectorAll(".main-nav .nav-link").forEach(link => {
        link.addEventListener("click", event => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();

            const bounds = link.getBoundingClientRect();
            link.style.setProperty("--transition-top", `${bounds.top}px`);
            link.style.setProperty("--transition-left", `${bounds.left}px`);
            link.style.setProperty("--transition-width", `${bounds.width}px`);
            link.style.setProperty("--transition-height", `${bounds.height}px`);
            link.classList.add("is-transitioning");

            const destination = new URL(link.href);
            const transitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 950;
            if (link.classList.contains("nav-task")) {
                destination.searchParams.set("from", "quiz");
            }

            window.requestAnimationFrame(() => {
                link.classList.add("is-expanded");
                window.setTimeout(() => window.location.assign(destination.href), transitionDuration);
            });
        });
    });
}

async function renderStoreFish () {
    try {

        const res = await fetch('/Aquarium/GetAllFish');

        if (!res.ok) {
            throw new Error("Failed to load fish");
        }

        const fish = await res.json();

        const storeContainer =
            document.querySelector("#storeFish .store-items");

        if (!storeContainer) return;

        storeContainer.innerHTML = "";

        fish.forEach(f => {

            const item = document.createElement("div");
            item.className = "store-item";

            item.innerHTML = `
            <img class="fish-preview"
                 src="${f.sprite}"
                 alt="${f.species}">

            <p class="store-product">
                ${f.species}
            </p>
        `;

            storeContainer.appendChild(item);
        });

    }
    catch (err) {
        console.error(err);
    }
}

async function renderInventoryFish () {

    try {

        const res = await fetch('/Aquarium/GetUserFish');

        if (!res.ok) {
            throw new Error("Failed to load fish");
        }

        const fish = await res.json();

        const inventoryContainer =
            document.querySelector("#inventoryFish .store-items");

        if (!inventoryContainer) return;

        inventoryContainer.innerHTML = "";

        fish.forEach(f => {

            const item = document.createElement("div");
            item.className = "store-item";

                item.innerHTML = `
            <img class="fish-preview"
                 src="${f.sprite}"
                 alt="${f.species}">

            <p class="store-product">
                ${f.species}
            </p>
        `;

            inventoryContainer.appendChild(item);
        });

    }
    catch (err) {
        console.error(err);
    }
}

if (document.body.classList.contains("aquarium-page")) {
    renderInventoryFish();
    renderStoreFish();

    window.requestAnimationFrame(() => {
        document.body.classList.remove("aquarium-enter");
        const transitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000;
        window.setTimeout(() => document.body.classList.add("aquarium-ready"), transitionDuration);
    });
}

if (document.body.classList.contains("task-menu-page") && ["aquarium", "quiz"].includes(new URLSearchParams(window.location.search).get("from"))) {
    document.body.classList.add("task-menu-enter", "task-menu-transitioning");
    void gameShell.offsetWidth;
    window.requestAnimationFrame(() => {
        document.body.classList.remove("task-menu-enter");
        document.body.classList.add("task-menu-fading");
        const transitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1150;
        document.documentElement.classList.remove("task-menu-return");
        document.body.classList.add("task-menu-ready");
        window.setTimeout(() => document.body.classList.remove("task-menu-transitioning", "task-menu-fading"), transitionDuration);
    });
}

let closeActiveAquariumMenu = null;

function initializeAquariumMenu(button, panel, backdrop, catalogPrefix) {
    if (!button || !panel || !backdrop) return;

    const tabs = panel.querySelector(".store-tabs");
    let setOpen;

    function setCategory(category) {
        const tabsInPanel = [...tabs.querySelectorAll(".store-tab")];
        tabsInPanel.forEach(tab => {
            const selected = tab.dataset.category === category;
            tab.classList.toggle("active", selected);
            tab.dataset.position = selected ? "center" : category === "fish" ? "right" : "left";
        });

        panel.querySelectorAll(".store-catalog").forEach(catalog => {
            catalog.hidden = catalog.id !== `${catalogPrefix}${category[0].toUpperCase()}${category.slice(1)}`;
        });
    }

    setOpen = (open, restoreFocus = true) => {
        button.classList.toggle("is-open", open);

        if (open) {
            if (closeActiveAquariumMenu) {
                closeActiveAquariumMenu();
            }
            closeActiveAquariumMenu = () => setOpen(false, false);
            panel.hidden = false;
            backdrop.hidden = false;
            void panel.offsetWidth;
            panel.classList.add("is-open");
            backdrop.classList.add("is-open");
            tabs.querySelector(".store-tab.active")?.focus();
            return;
        }

        panel.classList.remove("is-open");
        backdrop.classList.remove("is-open");
        closeActiveAquariumMenu = null;
        window.setTimeout(() => {
            if (!panel.classList.contains("is-open")) {
                panel.hidden = true;
                backdrop.hidden = true;
            }
        }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380);
        if (restoreFocus) button.focus();
    };

    setCategory("fish");
    button.addEventListener("click", () => {
        setOpen(!button.classList.contains("is-open"));
    });
    backdrop.addEventListener("click", () => setOpen(false));
    tabs.addEventListener("click", event => {
        const tab = event.target instanceof Element ? event.target.closest(".store-tab") : null;
        if (tab && tabs.contains(tab)) setCategory(tab.dataset.category);
    });
    window.addEventListener("keydown", event => {
        if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
}

initializeAquariumMenu(storeBtn, storePanel, storeBackdrop, "store");
initializeAquariumMenu(inventoryBtn, inventoryPanel, inventoryBackdrop, "inventory");

if (editorBtn && editorToolbar && editorCloseButton && editorSwitchLayer && editorMoreItems && editorLayerNumber && editorForegroundLabel && editorForegroundNumber && editorInventoryPanel && editorInventoryBackdrop) {
    let editorOpen = false;
    let editorInventoryOpen = false;
    let selectedEditorLayer = 1;

    function setEditorLayer(layer) {
        selectedEditorLayer = layer;
        editorLayerNumber.textContent = String(layer);
        editorForegroundNumber.textContent = String(layer);
    }

    function setEditorInventoryOpen(open, restoreFocus = true) {
        editorInventoryOpen = open;
        editorMoreItems.classList.toggle("is-open", open);

        if (open) {
            if (closeActiveAquariumMenu) closeActiveAquariumMenu();
            editorInventoryPanel.hidden = false;
            editorInventoryBackdrop.hidden = false;
            void editorInventoryPanel.offsetWidth;
            editorInventoryPanel.classList.add("is-open");
            editorInventoryBackdrop.classList.add("is-open");
            editorInventoryPanel.querySelector(".store-tab.active")?.focus();
            return;
        }

        editorInventoryPanel.classList.remove("is-open");
        editorInventoryBackdrop.classList.remove("is-open");
        window.setTimeout(() => {
            if (!editorInventoryOpen) {
                editorInventoryPanel.hidden = true;
                editorInventoryBackdrop.hidden = true;
            }
        }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380);
        if (restoreFocus && editorOpen) editorMoreItems.focus();
    }
    setEditorLayer(selectedEditorLayer);

    function setEditorOpen(open, restoreFocus = true) {
        editorOpen = open;
        editorBtn.classList.toggle("is-open", open);

        if (open) {
            if (closeActiveAquariumMenu) closeActiveAquariumMenu();
            editorToolbar.hidden = false;
            editorToolbar.removeAttribute("inert");
            void editorToolbar.offsetWidth;
            editorToolbar.classList.add("is-visible");
            document.body.classList.add("editor-mode");
            editorCloseButton.focus();
            return;
        }

        if (editorInventoryOpen) setEditorInventoryOpen(false, false);
        editorToolbar.classList.remove("is-visible");
        editorToolbar.setAttribute("inert", "");
        document.body.classList.remove("editor-mode");
        window.setTimeout(() => {
            if (!editorOpen) editorToolbar.hidden = true;
        }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
        if (restoreFocus) editorBtn.focus();
    }

    editorBtn.addEventListener("click", () => setEditorOpen(!editorOpen));
    editorCloseButton.addEventListener("click", () => setEditorOpen(false));
    editorSwitchLayer.addEventListener("click", () => {
        setEditorLayer(selectedEditorLayer % 3 + 1);
    });
    editorMoreItems.addEventListener("click", () => setEditorInventoryOpen(!editorInventoryOpen));
    editorInventoryBackdrop.addEventListener("click", () => setEditorInventoryOpen(false));
    window.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (editorInventoryOpen) {
            setEditorInventoryOpen(false);
            return;
        }
        if (editorOpen) setEditorOpen(false);
    });
}

const quizHelpButton = document.querySelector("#helpButton");
const quizHelpTip = document.querySelector("#helpTip");

document.querySelectorAll(".quiz-progress[data-progress]").forEach(progress => {
    const value = Number(progress.dataset.progress);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new RangeError("Quiz progress must be a number between 0 and 100.");
    }

    const percent = Math.round(value);
    const fill = progress.querySelector("span");
    const label = progress.querySelector("strong");
    if (!fill || !label) {
        throw new Error("Quiz progress requires a fill and percentage label.");
    }

    fill.style.width = `${percent}%`;
    label.textContent = `${percent}%`;
});

if (quizHelpButton && quizHelpTip) {
    quizHelpButton.addEventListener("click", () => {
        const isOpen = !quizHelpTip.hidden;
        quizHelpTip.hidden = isOpen;
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !quizHelpTip.hidden) {
            quizHelpTip.hidden = true;
            quizHelpButton.focus();
        }
    });
}

const questionScreen = document.querySelector(".question-screen");
if (questionScreen) {
    const questions = [
        "How often do you feel rested when you wake up?",
        "How often have you made time to relax this week?",
        "How often have you felt energized during the day?"
    ];
    const questionNumber = questionScreen.querySelector("#questionNumber");
    const questionPrompt = questionScreen.querySelector("#questionPrompt");
    const answerTrack = questionScreen.querySelector("#answerTrack");
    const answerFish = questionScreen.querySelector("#answerFish");
    const answerButtons = Array.from(questionScreen.querySelectorAll(".answer-choice"));
    const previousButton = questionScreen.querySelector("#previousQuestion");
    const nextButton = questionScreen.querySelector("#nextQuestion");
    const skipButton = questionScreen.querySelector("#skipQuestion");

    if (!questionNumber || !questionPrompt || !answerTrack || !answerFish || answerButtons.length === 0 || !previousButton || !nextButton || !skipButton) {
        throw new Error("The question screen requires its prompt, answers, and navigation controls.");
    }

    const answers = Array(questions.length).fill(null);
    let currentQuestion = 0;
    let questionAnimations = [];
    let fishAnswerIndex = null;

    function moveFishTo(answerIndex) {
        if (fishAnswerIndex !== null && answerIndex !== fishAnswerIndex) {
            questionScreen.dataset.direction = answerIndex < fishAnswerIndex ? "left" : "right";
        }

        const answerCircle = answerButtons[answerIndex]?.querySelector(".answer-circle");
        if (!answerCircle) {
            throw new RangeError(`Unknown quiz answer index: ${answerIndex}`);
        }

        const trackBounds = answerTrack.getBoundingClientRect();
        const circleBounds = answerCircle.getBoundingClientRect();
        answerFish.style.left = `${circleBounds.left - trackBounds.left + circleBounds.width / 2}px`;
        answerFish.style.top = `${circleBounds.top - trackBounds.top + circleBounds.height / 2}px`;
        answerFish.hidden = false;
        fishAnswerIndex = answerIndex;
    }

    function renderQuestion(animate = false) {
        questionNumber.textContent = String(currentQuestion + 1);
        questionPrompt.textContent = questions[currentQuestion];
        previousButton.disabled = currentQuestion === 0;
        questionAnimations.forEach(animation => animation.cancel());
        questionAnimations = [];
        if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            questionAnimations = [questionNumber, questionPrompt].map(element => element.animate([
                { opacity: 0, transform: "translateY(16px)", filter: "blur(3px)" },
                { opacity: 1, transform: "translateY(0)", filter: "blur(0)" }
            ], {
                duration: 520,
                easing: "cubic-bezier(.22, 1, .36, 1)"
            }));
        }

        answerButtons.forEach(button => {
            const selected = button.dataset.answer === answers[currentQuestion];
            button.classList.toggle("is-selected", selected);
        });

        if (answers[currentQuestion] !== null) {
            moveFishTo(Number(answers[currentQuestion]));
        }
    }

    function advanceQuestion() {
        if (currentQuestion === questions.length - 1) {
            window.location.assign("index.html");
            return;
        }
        currentQuestion += 1;
        renderQuestion(true);
    }

    answerButtons.forEach(button => {
        button.addEventListener("click", () => {
            answers[currentQuestion] = button.dataset.answer;
            renderQuestion();
        });
    });

    previousButton.addEventListener("click", () => {
        if (currentQuestion === 0) return;
        currentQuestion -= 1;
        renderQuestion(true);
    });

    nextButton.addEventListener("click", advanceQuestion);
    skipButton.addEventListener("click", advanceQuestion);
    renderQuestion();
}
