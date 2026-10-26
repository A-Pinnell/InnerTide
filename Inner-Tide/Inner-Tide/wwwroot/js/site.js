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
const settingsButton = document.querySelector("#settingsButton");
const creditsButton = document.querySelector("#creditsButton");
const taskPanel = document.querySelector(".task-panel");
const optionsPanel = document.querySelector("#optionsPanel");
const optionsBackButton = document.querySelector("#optionsBackButton");
const creditsPanel = document.querySelector("#creditsPanel");
const creditsBackButton = document.querySelector("#creditsBackButton");
const graphicalPresentationOptions = document.querySelectorAll('input[name="graphicalPresentation"]');
const reduceMotionOptions = document.querySelectorAll('input[name="reduceMotion"]');
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
const graphicalPresentationKey = "innerTide.graphicalPresentation";
const reduceMotionKey = "innerTide.reduceMotion";
let aquariumMenuSounds;
let aquariumMusicPlayer = null;
const soundPathPrefix = document.body.classList.contains("aquarium-page") || document.body.classList.contains("question-page") || document.body.classList.contains("quiz-menu-page")
    ? "../sfx/"
    : "sfx/";
const sideNavigationSounds = {
    left: new Audio(`${soundPathPrefix}left.mp3`),
    right: new Audio(`${soundPathPrefix}right.mp3`)
};
const elementsBarSounds = {
    in: new Audio(`${soundPathPrefix}elements_in.mp3`),
    out: new Audio(`${soundPathPrefix}elements_out.mp3`)
};

async function getTaskData() {
    const response = await fetch('/Home/GetTasks');
    taskData = await response.json();

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    console.log(taskData);
    console.log(JSON.stringify(taskData, null, 2));

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

        if (document.documentElement.classList.contains("task-menu-auth-check")) {
            playTaskMenuStartupVideo();
        }

    } catch (error) {
        console.error(error);
        if (document.documentElement.classList.contains("task-menu-auth-check")) {
            finishTaskMenuAuthCheck();
        }
    }
}
let coinBalance = 0;

async function saveCoinBalance(coinAmount) {
    console.log("Adding coins:", coinAmount);

    try {
        const res = await fetch('/Users/AddCoins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: coinAmount })
        });

        console.log("Status:", res.status);

        if (!res.ok) {
            throw new Error('Failed to save coins.');
        }

        await loadCoinBalance();
    }
    catch (error) {
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
    if (typeof Element.prototype.animate !== "function" || isReducedMotionEnabled()) {
        return;
    }

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

    if (typeof Element.prototype.animate !== "function") {
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

        console.log(task);
        console.log(task.coinReward);

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
            value.textContent = task.coinReward;
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
            console.log(task);
            task.completed = true;
            animateCoinReward(row, task.coinReward);
            saveCoinBalance(task.coinReward);
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
    const updateTabs = () => {
        document.querySelectorAll(".tab").forEach(item => {
            const selected = item === tab;
            item.classList.toggle("active", selected);
        });
        positionTabCarousel(period);
    };

    updateTabs();
    renderTasks(period);
    taskScroll.scrollTop = 0;
}

function setProfileOpen(open) {
    playElementsTransitionSound(open ? "in" : "out");
    playerCard.classList.toggle("profile-open", open);
    playerCard.classList.toggle("profile-collapsed", !open);
}

if (playerCard && profileToggle) {
    profileToggle.addEventListener("click", () => {
        setProfileOpen(!playerCard.classList.contains("profile-open"));
    });
}

if (gameShell) {
    const reducedMotionEnabled = isReducedMotionEnabled();
    const selectedPresentation = !reducedMotionEnabled && localStorage.getItem(graphicalPresentationKey) === "advanced"
        ? "advanced"
        : "default";
    graphicalPresentationOptions.forEach(option => {
        option.checked = option.value === selectedPresentation;
        option.disabled = reducedMotionEnabled && option.value === "advanced";
    });
    document.documentElement.classList.toggle("graphical-advanced", selectedPresentation === "advanced");
    if (reducedMotionEnabled) {
        localStorage.setItem(graphicalPresentationKey, "default");
    }
    reduceMotionOptions.forEach(option => {
        option.checked = (option.value === "on") === reducedMotionEnabled;
    });

    let activeInfoPanel = null;
    let optionsTransitionTimeout;
    function setInfoPanel(panel, afterFade = false) {
        if (!afterFade && isReducedMotionEnabled()) {
            fadeThroughBlack(() => setInfoPanel(panel, true));
            return;
        }
        window.clearTimeout(optionsTransitionTimeout);
        const previousPanel = activeInfoPanel;
        activeInfoPanel = panel;

        if (panel) {
            const selectedPanel = panel === "options" ? optionsPanel : creditsPanel;
            const otherPanel = panel === "options" ? creditsPanel : optionsPanel;
            otherPanel.inert = true;
            selectedPanel.hidden = false;
            selectedPanel.inert = false;
            taskPanel.inert = true;
            window.requestAnimationFrame(() => {
                if (activeInfoPanel === panel) {
                    gameShell.classList.toggle("options-open", panel === "options");
                    gameShell.classList.toggle("credits-open", panel === "credits");
                    if (panel === "options") {
                        selectedPanel.querySelector('input[name="graphicalPresentation"]:checked').focus();
                    } else {
                        creditsBackButton.focus();
                    }
                }
            });
            if (previousPanel && previousPanel !== panel) {
                optionsTransitionTimeout = window.setTimeout(() => {
                    const previousElement = previousPanel === "options" ? optionsPanel : creditsPanel;
                    if (activeInfoPanel !== previousPanel) previousElement.hidden = true;
                }, isReducedMotionEnabled() ? 180 : 340);
            }
            return;
        }

        gameShell.classList.remove("options-open");
        gameShell.classList.remove("credits-open");
        optionsPanel.inert = true;
        creditsPanel.inert = true;
        taskPanel.inert = false;
        optionsTransitionTimeout = window.setTimeout(() => {
            if (!activeInfoPanel) {
                optionsPanel.hidden = true;
                creditsPanel.hidden = true;
            }
        }, isReducedMotionEnabled() ? 180 : 340);
        (previousPanel === "credits" ? creditsButton : settingsButton).focus();
    }

    settingsButton.addEventListener("click", () => setInfoPanel(activeInfoPanel === "options" ? null : "options"));
    creditsButton.addEventListener("click", () => setInfoPanel(activeInfoPanel === "credits" ? null : "credits"));
    optionsBackButton.addEventListener("click", () => setInfoPanel(null));
    creditsBackButton.addEventListener("click", () => setInfoPanel(null));
    window.addEventListener("keydown", event => {
        if (event.key === "Escape" && activeInfoPanel) {
            setInfoPanel(null);
        }
    });
    graphicalPresentationOptions.forEach(option => {
        option.addEventListener("change", () => {
            if (!option.checked) return;

            localStorage.setItem(graphicalPresentationKey, option.value);
            document.documentElement.classList.toggle("graphical-advanced", option.value === "advanced");
        });
    });
    reduceMotionOptions.forEach(option => {
        option.addEventListener("change", () => {
            if (option.checked) {
                setReducedMotion(option.value === "on");
            }
        });
    });

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

        if (clickedTab && !clickedTab.classList.contains("active")) {
            playSideNavigationSound(clickedTab.dataset.position);
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
        playElementsTransitionSound(open ? "in" : "out");
        if (open) {
            aquariumTank.style.setProperty("--water-level", "0%");
            void aquariumTank.offsetWidth;
        }
        gameShell.classList.toggle("elements-open", open);
        if (open) {
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    if (gameShell.classList.contains("elements-open")) {
                        aquariumTank.style.setProperty("--water-level", `${aquariumStatus.dataset.percent}%`);
                    }
                });
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
        if (navigateWithReducedMotion(aquariumLink.href)) return;
        gameShell.classList.add("aquarium-transition");
        const transitionDuration = 950;
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
        if (navigateWithReducedMotion(destination.href)) return;
        const transitionDuration = 950;
        window.setTimeout(() => window.location.assign(destination.href), transitionDuration);
    });
}

async function purchaseStoreFish(_id) {
    const formData = new FormData();
    formData.append("fishId", _id);

    const res = await fetch(`/Aquarium/PurchaseShopFish?fishId=${_id}`, {
        method: 'POST',
        body: formData
    });

    console.log("Fetched Data");

    if (!res.ok) {
        throw new Error("Failed to load fish");
    }

    const result = await res.json();
    document.querySelector('#coin-count').textContent = result.remainingCoins;
    console.log("Updated Coins Visually");

    console.log(result.remainingCoins);

    renderInventoryFish();
}

async function purchaseStoreItem(_id) {
    const formData = new FormData();
    formData.append("itemId", _id);

    const res = await fetch(`/Aquarium/PurchaseShopItem?itemId=${_id}`, {
        method: 'POST',
        body: formData
    });

    console.log("Fetched Data");

    if (!res.ok) {
        throw new Error("Failed to load items");
    }

    const result = await res.json();
    document.querySelector('#coin-count').textContent = result.remainingCoins;
    console.log("Updated Coins Visually");

    console.log(result.remainingCoins);

    renderInventoryItems();
}

async function renderStoreItems() {
    try {

        const res = await fetch('/Aquarium/GetAllItems');

        if (!res.ok) {
            throw new Error("Failed to load items");
        }

        const items = await res.json();

        const storeContainer =
            document.querySelector("#storeObjects .store-items");

        if (!storeContainer) return;

        storeContainer.innerHTML = "";

        items.forEach(i => {

            const item = document.createElement("div");
            item.setAttribute("value", i._id)
            item.addEventListener("click", () => purchaseStoreItem(i._id));
            item.className = "store-item";

            item.innerHTML = `
            <img class="item-preview"
                 src="${i.sprite}"
                 loading="lazy"
                 decoding="async"
                 alt="${i.name}">

            <div>
                <p class="store-product">${i.name} </p>
                <span class="store-price"> <img src="../img/coin.png" alt="${i.name} Image"> ${i.price} </span>
            </div>`;

            storeContainer.appendChild(item);
        });

    }
    catch (err) {
        console.error(err);
    }
}

async function renderStoreFish() {
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
            //console.log(f);
            const item = document.createElement("div");
            item.setAttribute("value", f._id)
            item.addEventListener("click", () => purchaseStoreFish(f._id));
            item.className = "store-item";

            item.innerHTML = `
            <img class="fish-preview"
                 src="${f.sprite}"
                 loading="lazy"
                 decoding="async"
                 alt="${f.species}">

            <div>
                <p class="store-product">${f.species} </p>
                <span class="store-price"> <img src="../img/coin.png" alt="${f.species} Image"> ${f.price} </span>
            </div>`;

            storeContainer.appendChild(item);
        });

    }
    catch (err) {
        console.error(err);
    }
}

async function renderInventoryItems() {

    try {

        const res = await fetch('/Aquarium/GetUserItems');

        if (!res.ok) {
            throw new Error("Failed to load item");
        }

        const items = await res.json();

        const inventoryContainer =
            document.querySelector("#inventoryObjects .store-items");

        if (!inventoryContainer) return;

        inventoryContainer.innerHTML = "";

        items.forEach(i => {

            const item = document.createElement("div");
            item.className = "store-item";

            item.innerHTML = `
            <img class="item-preview"
                 src="${i.sprite}"
                 loading="lazy"
                 decoding="async"
                 alt="${i.name}">

            <p class="store-product">
                ${i.name}
            </p>
        `;

            inventoryContainer.appendChild(item);
        });

    }
    catch (err) {
        console.error(err);
    }
}

async function renderInventoryFish() {

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
                 loading="lazy"
                 decoding="async"
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
    renderInventoryItems();
    renderStoreFish();
    renderStoreItems();
    const hideButton = document.querySelector("#aquariumHideButton");
    const hideExitButton = document.querySelector("#aquariumHideExit");

    if (hideButton && hideExitButton) {
        hideButton.addEventListener("click", () => {
            hideExitButton.hidden = false;
            window.requestAnimationFrame(() => {
                document.body.classList.add("aquarium-hide-mode");
                hideExitButton.focus();
            });
        });

        hideExitButton.addEventListener("click", () => {
            document.body.classList.remove("aquarium-hide-mode");
            hideButton.focus();
            window.setTimeout(() => {
                hideExitButton.hidden = true;
            }, 400);
        });
    }

    if (isReducedMotionEnabled()) {
        document.body.classList.remove("aquarium-enter");
        document.body.classList.add("aquarium-ready");
    }
    window.requestAnimationFrame(() => {
        if (isReducedMotionEnabled()) return;
        document.body.classList.remove("aquarium-enter");
        window.setTimeout(() => {
            document.body.classList.add("aquarium-ready");
            playSideTabEntranceSound();
        }, 1000);
    });
}

if (document.body.classList.contains("task-menu-page") && ["aquarium", "quiz"].includes(new URLSearchParams(window.location.search).get("from"))) {
    if (isReducedMotionEnabled()) {
        document.documentElement.classList.remove("task-menu-return");
    } else {
        document.body.classList.add("task-menu-enter", "task-menu-transitioning");
        void gameShell.offsetWidth;
        window.requestAnimationFrame(() => {
            document.body.classList.remove("task-menu-enter");
            document.body.classList.add("task-menu-fading");
            const transitionDuration = 1150;
            document.documentElement.classList.remove("task-menu-return");
            document.body.classList.add("task-menu-ready");
            playSideTabEntranceSound();
            window.setTimeout(() => document.body.classList.remove("task-menu-transitioning", "task-menu-fading"), transitionDuration);
        });
    }
}

let closeActiveAquariumMenu = null;

function initializeAquariumMenu(button, panel, backdrop, catalogPrefix, loadContent) {
    if (!button || !panel || !backdrop) return;

    const tabs = panel.querySelector(".store-tabs");
    let setOpen;
    let contentLoaded = false;

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
        if (open || restoreFocus) playAquariumMenuSound(open);

        if (open) {
            if (!contentLoaded && loadContent) {
                contentLoaded = true;
                loadContent();
            }
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
        }, isReducedMotionEnabled() ? 180 : 380);
        if (restoreFocus) button.focus();
    };

    setCategory("fish");
    button.addEventListener("click", () => {
        setOpen(!button.classList.contains("is-open"));
    });
    backdrop.addEventListener("click", () => setOpen(false));
    tabs.addEventListener("click", event => {
        const tab = event.target instanceof Element
            ? event.target.closest(".store-tab")
            : null;

        if (!tab || !tabs.contains(tab)) return;

        const category = tab.dataset.category;

        if (category !== "fish" && category !== "objects") return;

        if (!tab.classList.contains("active")) {
            playSideNavigationSound(tab.dataset.position);
        }

        setCategory(category);
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
        if (open || restoreFocus) playAquariumMenuSound(open);

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
        }, isReducedMotionEnabled() ? 180 : 380);
        if (restoreFocus && editorOpen) editorMoreItems.focus();
    }
    setEditorLayer(selectedEditorLayer);

    function setEditorOpen(open, restoreFocus = true, afterFade = false) {
        if (!afterFade && isReducedMotionEnabled()) {
            fadeThroughBlack(() => setEditorOpen(open, restoreFocus, true));
            return;
        }
        editorOpen = open;
        editorBtn.classList.toggle("is-open", open);
        if (open || restoreFocus) playAquariumMenuSound(open);

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
        }, isReducedMotionEnabled() ? 180 : 380);
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
    const quitLink = questionScreen.querySelector(".question-action[href]");

    if (!questionNumber || !questionPrompt || !answerTrack || !answerFish || answerButtons.length === 0 || !previousButton || !nextButton || !skipButton || !quitLink) {
        throw new Error("The question screen requires its prompt, answers, and navigation controls.");
    }

    quitLink.addEventListener("click", () => playElementsTransitionSound("out"));

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
        if (animate && !isReducedMotionEnabled()) {
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
            if (navigateWithReducedMotion("index.html")) return;
            window.location.assign("index.html");
            return;
        }
        fadeThroughBlack(() => {
        });
    }

    answerButtons.forEach(button => {
        button.addEventListener("click", () => {
            answers[currentQuestion] = String(answerIndex);
            renderQuestion();
        });
    });

    previousButton.addEventListener("click", () => {
        if (currentQuestion === 0) return;
        fadeThroughBlack(() => {
            currentQuestion -= 1;
            renderQuestion(true);
        });
    });

    nextButton.addEventListener("click", advanceQuestion);
    skipButton.addEventListener("click", advanceQuestion);
    renderQuestion();
}

if (document.body.classList.contains("users-page") || document.body.classList.contains("aquarium-page") || document.body.classList.contains("quiz-menu-page") || document.body.classList.contains("question-page") || document.body.classList.contains("task-menu-page")) {
    if (localStorage.getItem("innerTide.graphicalPresentation") === "advanced") {
        document.documentElement.classList.add("graphical-advanced");
    }
    const motionPreference = localStorage.getItem("innerTide.reduceMotion");
    if (motionPreference !== null) {
        document.documentElement.classList.add("motion-preference-set");
        if (motionPreference === "true") {
            document.documentElement.classList.add("reduced-motion", "reduced-motion-entering");
            document.documentElement.classList.remove("graphical-advanced");
            localStorage.setItem("innerTide.graphicalPresentation", "default");
        }
    } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.classList.add("reduced-motion", "reduced-motion-entering");
    }
}

if (document.body.classList.contains("task-menu-page")) {
    const loginNavigationKey = "innerTide.loginNavigation";
    const arrivedFromLogin = sessionStorage.getItem(loginNavigationKey) === "true";
    sessionStorage.removeItem(loginNavigationKey);
    const isInternalReturn = ["aquarium", "quiz"].includes(new URLSearchParams(window.location.search).get("from"));
    if (!arrivedFromLogin && !isInternalReturn) {
        document.documentElement.classList.add("task-menu-auth-check");
    }
    if (isInternalReturn) {
        document.documentElement.classList.add("task-menu-return");
    }
    if (localStorage.getItem("innerTide.graphicalPresentation") === "advanced") {
        document.documentElement.classList.add("graphical-advanced");
    }
}

function playTaskMenuStartupVideo() {
    const startupVideoOverlay = document.querySelector("#task-menu-startup-video");
    const startupVideoPlayer = document.querySelector("#task-menu-startup-video-player");
    let startupVideoFinished = false;

    const finishStartupVideo = () => {
        if (startupVideoFinished) return;
        startupVideoFinished = true;
        document.removeEventListener("pointerdown", startStartupVideo);
        document.removeEventListener("keydown", startStartupVideo);
        startupVideoOverlay.classList.add("is-finished");
        document.documentElement.classList.remove("task-menu-stallion-pending", "task-menu-auth-check");
        document.documentElement.classList.add("task-menu-stallion-revealing");
        window.setTimeout(() => {
            startupVideoOverlay.remove();
            document.documentElement.classList.remove("task-menu-stallion-revealing");
        }, 450);
    };

    const startStartupVideo = () => {
        document.removeEventListener("pointerdown", startStartupVideo);
        document.removeEventListener("keydown", startStartupVideo);
        startupVideoPlayer.play().catch(error => {
            if (error.name === "NotAllowedError") {
                document.addEventListener("pointerdown", startStartupVideo, { once: true });
                document.addEventListener("keydown", startStartupVideo, { once: true });
                return;
            }
            console.error("Unable to play the post-login startup video.", error);
            finishStartupVideo();
        });
    };

    startupVideoOverlay.hidden = false;
    document.documentElement.classList.remove("task-menu-auth-check");
    document.documentElement.classList.add("task-menu-stallion-pending");
    startupVideoPlayer.addEventListener("ended", finishStartupVideo, { once: true });
    startupVideoPlayer.addEventListener("error", () => {
        console.error("Unable to load the post-login startup video.", startupVideoPlayer.error);
        finishStartupVideo();
    }, { once: true });
    startupVideoPlayer.src = "vid/Stallion.mp4";
    startupVideoPlayer.load();
    startStartupVideo();
}

function finishTaskMenuAuthCheck() {
    document.documentElement.classList.remove("task-menu-auth-check");
}

function playSideNavigationSound(position) {
    if (position !== "left" && position !== "right") return;

    const sound = sideNavigationSounds[position];
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(error => {
        console.error(`Unable to play ${position} navigation sound.`, error);
    });
}

function playElementsTransitionSound(direction) {
    const sound = elementsBarSounds[direction];
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(error => {
        console.error(`Unable to play elements ${direction} sound.`, error);
    });
}

function fadeOutAquariumMusic(duration) {
    if (!aquariumMusicPlayer || aquariumMusicPlayer.paused) return Promise.resolve();

    const startingVolume = aquariumMusicPlayer.volume;
    const startTime = performance.now();

    return new Promise(resolve => {
        function updateVolume(now) {
            const progress = Math.min(1, (now - startTime) / duration);
            aquariumMusicPlayer.volume = startingVolume * (1 - progress);
            if (progress < 1) {
                window.requestAnimationFrame(updateVolume);
                return;
            }

            aquariumMusicPlayer.pause();
            aquariumMusicPlayer.volume = startingVolume;
            resolve();
        }

        window.requestAnimationFrame(updateVolume);
    });
}

function playAquariumMenuSound(opening) {
    const sound = aquariumMenuSounds?.[opening ? "open" : "close"];
    if (!sound) return;

    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(error => {
        console.error("Unable to play Aquarium menu sound.", error);
    });
}

function playSideTabEntranceSound() {
    if (isReducedMotionEnabled()) return;

    const sound = new Audio(document.body.classList.contains("aquarium-page") ? "../sfx/Slide.mp3" : "sfx/Slide.mp3");
    sound.play().catch(error => {
        console.error("Unable to play side tab entrance sound.", error);
    });
}

function isReducedMotionEnabled() {
    return document.documentElement.classList.contains("reduced-motion");
}

function syncRippleMotion() {
    const svg = document.querySelector("#background-water-ripple")?.ownerSVGElement;
    if (!svg) return;

    if (isReducedMotionEnabled()) {
        svg.pauseAnimations();
    } else {
        svg.unpauseAnimations();
    }
}

if (document.body.classList.contains("aquarium-page")) {
    aquariumMenuSounds = {
        open: new Audio("../sfx/Open.mp3"),
        close: new Audio("../sfx/Close.mp3")
    };
    const aquariumMusic = document.querySelector("#aquarium-music");
    aquariumMusicPlayer = aquariumMusic;
    const aquariumTracks = [
        "../music/Aquarium_1.mp3",
        "../music/Aquarium_2.mp3",
        "../music/Aquarium_3.mp3"
    ];
    function createAquariumPlaylist() {
        const shuffledTracks = [...aquariumTracks];
        for (let index = shuffledTracks.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [shuffledTracks[index], shuffledTracks[randomIndex]] = [shuffledTracks[randomIndex], shuffledTracks[index]];
        }
        return shuffledTracks.flatMap(track => [track, "../music/Aquatic.mp3"]);
    }

    let aquariumPlaylist = createAquariumPlaylist();
    let aquariumTrackIndex = 0;

    function playAquariumTrack() {
        aquariumMusic.src = aquariumPlaylist[aquariumTrackIndex];
        aquariumMusic.load();
        aquariumMusic.play().catch(error => {
            if (error.name === "NotAllowedError") {
                document.addEventListener("pointerdown", resumeAquariumMusic, { once: true });
                document.addEventListener("keydown", resumeAquariumMusic, { once: true });
                return;
            }
            console.error("Unable to play Aquarium music.", error);
        });
    }

    function resumeAquariumMusic() {
        document.removeEventListener("pointerdown", resumeAquariumMusic);
        document.removeEventListener("keydown", resumeAquariumMusic);
        aquariumMusic.play().catch(error => {
            if (error.name !== "NotAllowedError") {
                console.error("Unable to resume Aquarium music.", error);
            }
        });
    }

    aquariumMusic.addEventListener("ended", () => {
        aquariumTrackIndex += 1;
        if (aquariumTrackIndex >= aquariumPlaylist.length) {
            aquariumPlaylist = createAquariumPlaylist();
            aquariumTrackIndex = 0;
        }
        playAquariumTrack();
    });
    playAquariumTrack();
}

function setReducedMotion(enabled) {
    const root = document.documentElement;
    root.classList.add("motion-preference-set");
    root.classList.toggle("reduced-motion", enabled);
    localStorage.setItem(reduceMotionKey, String(enabled));

    if (enabled) {
        root.classList.remove("graphical-advanced");
        localStorage.setItem(graphicalPresentationKey, "default");
        graphicalPresentationOptions.forEach(option => {
            option.checked = option.value === "default";
            option.disabled = option.value === "advanced";
        });
    } else {
        graphicalPresentationOptions.forEach(option => {
            option.disabled = false;
        });
    }
}

let reducedMotionTransitionTimeout;

function fadeThroughBlack(update) {
    if (!isReducedMotionEnabled()) {
        update();
        return;
    }

    window.clearTimeout(reducedMotionTransitionTimeout);
    document.documentElement.classList.add("reduced-motion-transitioning");
    reducedMotionTransitionTimeout = window.setTimeout(() => {
        update();
        window.requestAnimationFrame(() => {
            document.documentElement.classList.remove("reduced-motion-transitioning");
        });
    }, 180);
}

function navigateWithReducedMotion(destination) {
    if (!isReducedMotionEnabled()) return false;

    document.documentElement.classList.add("reduced-motion-transitioning");
    window.setTimeout(() => window.location.assign(destination), 180);
    return true;
}

if (document.documentElement.classList.contains("reduced-motion-entering")) {
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            document.documentElement.classList.remove("reduced-motion-entering");
        });
    });
}

document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    if (link.getAttribute("href").startsWith("#")) return;

    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
    if (document.body.classList.contains("aquarium-page") && link.closest(".task-tab")) {
        event.preventDefault();
        destination.searchParams.set("from", "aquarium");
        const reducedMotion = isReducedMotionEnabled();
        const duration = reducedMotion ? 180 : 950;
        if (reducedMotion) {
            document.documentElement.classList.add("reduced-motion-transitioning");
        } else {
            document.body.classList.add("task-menu-transition");
        }

        Promise.all([
            fadeOutAquariumMusic(duration),
            new Promise(resolve => window.setTimeout(resolve, duration))
        ]).then(() => window.location.assign(destination.href));
        return;
    }
    if (!isReducedMotionEnabled()) return;

    if (document.body.classList.contains("question-page")) {
        playElementsTransitionSound("out");
    } else if (document.body.classList.contains("quiz-menu-page") && link.classList.contains("quiz-card")) {
        playElementsTransitionSound("in");
    }
    if (link.closest(".task-tab")) {
        destination.searchParams.set("from", "aquarium");
    } else if (link.classList.contains("nav-task")) {
        destination.searchParams.set("from", "quiz");
    }

    event.preventDefault();
    navigateWithReducedMotion(destination.href);
}, true);

if (document.body.classList.contains("quiz-menu-page")) {
    document.querySelectorAll(".quiz-card[href]").forEach(card => {
        card.addEventListener("click", event => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            playElementsTransitionSound("in");

            if (navigateWithReducedMotion(card.href)) return;

            const bounds = card.getBoundingClientRect();
            card.style.setProperty("--transition-top", `${bounds.top}px`);
            card.style.setProperty("--transition-left", `${bounds.left}px`);
            card.style.setProperty("--transition-width", `${bounds.width}px`);
            card.style.setProperty("--transition-height", `${bounds.height}px`);
            card.style.setProperty("--transition-radius", getComputedStyle(card).borderRadius);
            card.classList.add("is-transitioning");

            const destination = card.href;
            const transitionDuration = 900;

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

            const destination = new URL(link.href);
            if (link.classList.contains("nav-task")) {
                destination.searchParams.set("from", "quiz");

                const bounds = link.getBoundingClientRect();
                link.style.setProperty("--transition-top", `${bounds.top}px`);
                link.style.setProperty("--transition-left", `${bounds.left}px`);
                link.style.setProperty("--transition-width", `${bounds.width}px`);
                link.style.setProperty("--transition-height", `${bounds.height}px`);
                link.classList.add("is-transitioning");

                const transitionDuration = 950;
                window.requestAnimationFrame(() => {
                    link.classList.add("is-expanded");
                    window.setTimeout(() => window.location.assign(destination.href), transitionDuration);
                });
            }
        });
    });
}

// Login page startup video, music, and authentication transitions.
if (
    document.querySelector("#startup-video") &&
    document.querySelector("#startup-video-player") &&
    document.querySelector("#login-music") &&
    document.querySelector(".auth-panel") &&
    document.querySelector("#registerContainer") &&
    document.querySelector("#loginContainer")
) {
    const loginNavigationKey = "innerTide.loginNavigation";
    sessionStorage.removeItem(loginNavigationKey);
    const loginMusic = document.querySelector("#login-music");

    function startLoginMusic() {
        if (!startupSequenceFinished) return;
        document.removeEventListener("pointerdown", startLoginMusic);
        document.removeEventListener("keydown", startLoginMusic);
        loginMusic.play().catch(error => {
            if (error.name === "NotAllowedError") {
                document.addEventListener("pointerdown", startLoginMusic, { once: true });
                document.addEventListener("keydown", startLoginMusic, { once: true });
                return;
            }
            console.error("Unable to play login music.", error);
        });
    }

    const startupVideoOverlay = document.querySelector("#startup-video");
    const startupVideoPlayer = document.querySelector("#startup-video-player");

    // Keep the startup video non-interactive: hide native controls and immediately
    // resume playback if the browser or an input action pauses it.
    startupVideoPlayer.controls = false;
    startupVideoPlayer.removeAttribute("controls");
    startupVideoPlayer.setAttribute("disablepictureinpicture", "");
    startupVideoPlayer.setAttribute("playsinline", "");
    startupVideoPlayer.addEventListener("contextmenu", event => event.preventDefault());
    startupVideoPlayer.addEventListener("pause", () => {
        if (
            !startupSequenceFinished &&
            !startupVideoPlayer.ended &&
            startupVideoPlayer.currentSrc &&
            document.visibilityState === "visible"
        ) {
            startupVideoPlayer.play().catch(error => {
                console.error("Unable to keep startup video playing.", error);
            });
        }
    });

    startupVideoPlayer.muted = true;
    const firstBoot = sessionStorage.getItem("innerTide.booted") !== "true";
    const startupVideos = firstBoot
        ? ["../vid/Stallion.mp4", "../vid/Intro.mp4"]
        : ["../vid/Stallion.mp4"];
    let startupVideoIndex = 0;
    let startupSequenceFinished = false;

    sessionStorage.setItem("innerTide.booted", "true");

    function enableStartupVideoAudio() {
        startupVideoPlayer.muted = false;
        document.removeEventListener("pointerdown", enableStartupVideoAudio);
        document.removeEventListener("keydown", enableStartupVideoAudio);
    }

    document.addEventListener("pointerdown", enableStartupVideoAudio);
    document.addEventListener("keydown", enableStartupVideoAudio);

    function resumeStartupVideo() {
        if (
            !startupSequenceFinished &&
            startupVideoIndex < startupVideos.length &&
            document.visibilityState === "visible" &&
            startupVideoPlayer.paused &&
            !startupVideoPlayer.ended &&
            startupVideoPlayer.currentSrc
        ) {
            startupVideoPlayer.play().catch(error => {
                console.error("Unable to resume startup video.", error);
            });
        }
    }
    document.addEventListener("visibilitychange", resumeStartupVideo);

    function playStartupVideo() {
        if (startupVideoIndex >= startupVideos.length) {
            startupSequenceFinished = true;
            document.removeEventListener("visibilitychange", resumeStartupVideo);
            document.removeEventListener("pointerdown", enableStartupVideoAudio);
            document.removeEventListener("keydown", enableStartupVideoAudio);
            startupVideoOverlay.classList.add("is-finished");
            window.setTimeout(() => startupVideoOverlay.remove(), 450);
            startLoginMusic();
            return;
        }

        let hasAdvanced = false;
        const advance = () => {
            if (hasAdvanced) return;
            hasAdvanced = true;
            startupVideoPlayer.removeEventListener("ended", advance);
            startupVideoPlayer.removeEventListener("error", advance);
            startupVideoIndex += 1;
            playStartupVideo();
        };

        startupVideoPlayer.addEventListener("ended", advance);
        startupVideoPlayer.addEventListener("error", advance);
        startupVideoPlayer.src = startupVideos[startupVideoIndex];
        startupVideoPlayer.load();
        startupVideoPlayer.play().catch(error => {
            console.error("Unable to autoplay startup video.", error);
        });
    }

    playStartupVideo();

    const authPanel = document.querySelector(".auth-panel");
    const authViews = {
        register: document.querySelector("#registerContainer"),
        login: document.querySelector("#loginContainer")
    };
    authViews.login.querySelector("form").addEventListener("submit", () => {
        sessionStorage.setItem(loginNavigationKey, "true");
    });
    let authTransitionTimeout;
    let authEnterTimeout;

    if (document.documentElement.classList.contains("reduced-motion-entering")) {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                document.documentElement.classList.remove("reduced-motion-entering");
            });
        });
    }

    function setAuthPanelHeight(view) {
        authPanel.style.height = `${view.scrollHeight}px`;
    }

    document.body.classList.add("auth-transition-ready");
    const activeAuthView = Object.values(authViews).find(view => !view.hidden);
    if (activeAuthView) {
        activeAuthView.classList.add("is-active");
        setAuthPanelHeight(activeAuthView);
    }
    if ("ResizeObserver" in window) {
        const authResizeObserver = new ResizeObserver(() => {
            const activeView = Object.values(authViews).find(view => view.classList.contains("is-active"));
            if (activeView) setAuthPanelHeight(activeView);
        });
        Object.values(authViews).forEach(view => authResizeObserver.observe(view));
    }

    document.querySelectorAll("[data-auth-view]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            const nextView = authViews[link.dataset.authView];
            const currentView = Object.values(authViews).find(view => view.classList.contains("is-active"));

            if (!nextView || !currentView || nextView === currentView) return;

            window.clearTimeout(authTransitionTimeout);
            window.clearTimeout(authEnterTimeout);
            if (document.documentElement.classList.contains("reduced-motion")) {
                document.documentElement.classList.add("reduced-motion-transitioning");
                authTransitionTimeout = window.setTimeout(() => {
                    currentView.hidden = true;
                    currentView.inert = false;
                    currentView.classList.remove("is-active");
                    nextView.hidden = false;
                    nextView.inert = false;
                    nextView.classList.add("is-active");
                    setAuthPanelHeight(nextView);
                    window.requestAnimationFrame(() => {
                        document.documentElement.classList.remove("reduced-motion-transitioning");
                    });
                }, 180);
                return;
            }

            Object.values(authViews).forEach(view => {
                if (view !== currentView && view !== nextView) {
                    view.hidden = true;
                    view.classList.remove(
                        "is-active", "is-entering", "is-leaving",
                        "is-entering-from-left", "is-entering-from-right",
                        "is-leaving-to-left", "is-leaving-to-right"
                    );
                }
            });

            const direction = currentView === authViews.register ? "left" : "right";
            const enterDirection = direction === "left" ? "right" : "left";
            nextView.hidden = false;
            nextView.inert = false;
            nextView.classList.remove("is-leaving", "is-leaving-to-left", "is-leaving-to-right");
            nextView.classList.add("is-entering", `is-entering-from-${enterDirection}`);
            void nextView.offsetWidth;

            currentView.classList.remove("is-active", "is-entering", "is-entering-from-left", "is-entering-from-right");
            currentView.classList.add("is-leaving", `is-leaving-to-${direction}`);
            currentView.inert = true;
            nextView.classList.add("is-active");
            setAuthPanelHeight(nextView);

            authEnterTimeout = window.setTimeout(() => nextView.classList.remove(
                "is-entering", "is-entering-from-left", "is-entering-from-right"
            ), 20);

            authTransitionTimeout = window.setTimeout(() => {
                currentView.hidden = true;
                currentView.inert = false;
                currentView.classList.remove("is-leaving", "is-leaving-to-left", "is-leaving-to-right");
            }, 520);
        });
    });
}