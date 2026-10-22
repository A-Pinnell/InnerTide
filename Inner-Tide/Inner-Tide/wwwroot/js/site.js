const taskData = {
    daily: [
        { title: "Get 8 Hours of Sleep", reward: 5, priority: true },
        { title: "Get 8 Hours of Sleep", reward: 5, completed: true },
        { title: "Get 8 Hours of Sleep", reward: 5 },
        { title: "Get 8 Hours of Sleep", reward: 5 },
        { title: "Get 8 Hours of Sleep", reward: 5 },
        { title: "Get 8 Hours of Sleep", reward: 5 },
        { title: "Get 8 Hours of Sleep", reward: 5 },
        { title: "Get 8 Hours of Sleep", reward: 5 }
    ],
    monthly: [
        { title: "Make time for a little adventure", reward: 25, priority: true },
        { title: "Take a mindful day for yourself", reward: 20 },
        { title: "Connect with someone you love", reward: 15 },
        { title: "Get 8 Hours of Sleep", reward: 5, completed: true },
        { title: "Make a little progress every day", reward: 10 }
    ],
    weekly: [
        { title: "Get 8 Hours of Sleep", reward: 10, completed: true },
        { title: "Go outside and get some fresh air", reward: 15, priority: true },
        { title: "Make something just for fun", reward: 10 },
        { title: "Check in with how you are feeling", reward: 10 },
        { title: "Get 8 Hours of Sleep", reward: 5 }
    ]
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

function loadCoinBalance() {
    const storedBalance = window.localStorage.getItem(coinStorageKey);
    if (storedBalance === null) return 0;

    const balance = Number(storedBalance);
    if (storedBalance === "" || !Number.isSafeInteger(balance) || balance < 0) {
        throw new TypeError("Stored coin balance must be a non-negative safe integer.");
    }
    return balance;
}

let coinBalance = loadCoinBalance();
if (coinCount) coinCount.textContent = String(coinBalance);

function saveCoinBalance() {
    window.localStorage.setItem(coinStorageKey, String(coinBalance));
    if (coinCount) coinCount.textContent = String(coinBalance);
}

// Aquarium Menu Variables
const storeBtn = document.querySelector("#storeBtn");
const storePanel = document.querySelector("#tankStorePanel");
const storeBackdrop = document.querySelector("#tankStoreBackdrop");
const inventoryBtn = document.querySelector("#inventoryBtn");
const inventoryPanel = document.querySelector("#tankInventoryPanel");
const inventoryBackdrop = document.querySelector("#tankInventoryBackdrop");
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

    coinBalance += amount;
    saveCoinBalance();

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
            const rewardAmount = task.reward * (task.priority ? 2 : 1);
            task.completed = true;
            animateCoinReward(row, rewardAmount);
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

    function setProfileOpen(open) {
        playerCard.classList.toggle("profile-open", open);
        playerCard.classList.toggle("profile-collapsed", !open);
    }

    profileToggle.addEventListener("click", () => {
        setProfileOpen(!playerCard.classList.contains("profile-open"));
    });
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

if (document.body.classList.contains("aquarium-page")) {
    window.requestAnimationFrame(() => {
        document.body.classList.remove("aquarium-enter");
        const transitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000;
        window.setTimeout(() => document.body.classList.add("aquarium-ready"), transitionDuration);
    });
}

if (document.body.classList.contains("task-menu-page") && new URLSearchParams(window.location.search).get("from") === "aquarium") {
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
            tab.setAttribute("aria-selected", String(selected));
            tab.dataset.position = selected ? "center" : category === "fish" ? "right" : "left";
        });

        panel.querySelectorAll(".store-catalog").forEach(catalog => {
            catalog.hidden = catalog.id !== `${catalogPrefix}${category[0].toUpperCase()}${category.slice(1)}`;
        });
    }

    setOpen = (open, restoreFocus = true) => {
        button.setAttribute("aria-expanded", String(open));

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

    button.setAttribute("aria-expanded", "false");
    setCategory("fish");
    button.addEventListener("click", () => {
        setOpen(button.getAttribute("aria-expanded") !== "true");
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
        editorSwitchLayer.setAttribute("aria-label", `Switch to foreground ${layer % 3 + 1}`);
    }

    function setEditorInventoryOpen(open, restoreFocus = true) {
        editorInventoryOpen = open;
        editorMoreItems.setAttribute("aria-expanded", String(open));

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
        editorBtn.setAttribute("aria-expanded", String(open));

        if (open) {
            if (closeActiveAquariumMenu) closeActiveAquariumMenu();
            editorToolbar.hidden = false;
            editorToolbar.removeAttribute("inert");
            editorToolbar.setAttribute("aria-hidden", "false");
            void editorToolbar.offsetWidth;
            editorToolbar.classList.add("is-visible");
            document.body.classList.add("editor-mode");
            editorCloseButton.focus();
            return;
        }

        if (editorInventoryOpen) setEditorInventoryOpen(false, false);
        editorToolbar.classList.remove("is-visible");
        editorToolbar.setAttribute("inert", "");
        editorToolbar.setAttribute("aria-hidden", "true");
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
