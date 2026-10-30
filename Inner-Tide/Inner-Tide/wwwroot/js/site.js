let taskData = {
    daily: [],
    monthly: [],
    weekly: []
};

let errorPageRedirectStarted = false;

function redirectToErrorPage(message) {
    if (errorPageRedirectStarted || window.location.pathname.toLowerCase().endsWith("/error.html")) return;

    errorPageRedirectStarted = true;
    document.documentElement.classList.add("error-page-transitioning");
    const errorMessage = String(message || "An unexpected error occurred.").slice(0, 4000);
    const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.setTimeout(() => {
        const query = new URLSearchParams({ error: errorMessage, returnUrl });
        window.location.assign(`/error.html?${query}`);
    }, 350);
}

const originalFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
    let response;
    try {
        response = await originalFetch(...args);
    } catch (error) {
        redirectToErrorPage(error instanceof Error ? error.message : String(error));
        throw error;
    }

    const request = args[0] instanceof Request ? args[0] : null;
    const method = args[1]?.method || request?.method || "GET";
    const url = new URL(request?.url || String(args[0]), window.location.href);
    const isDataLoadRequest = method.toUpperCase() === "GET" &&
        /\/(?:Home\/GetTasks|Users\/GetCoins|Aquarium\/(?:GetAquariums|GetAllFish|GetUserFish|GetAllItems|GetUserItems|GetAllAquariumFish))$/i.test(url.pathname);

    if (response.status >= 500 || (isDataLoadRequest && !response.ok)) {
        const details = (await response.clone().text().catch(() => "")).trim();
        redirectToErrorPage(details || `The request failed with status ${response.status}.`);
    }

    return response;
};

const selectedAquariumStorageKey = `innerTide.selectedAquarium.${document.body.dataset.accountId}`;

function getAquariumBackgroundNumber(aquariumNumber) {
    return aquariumNumber <= 5 ? aquariumNumber : ((aquariumNumber - 6) % 5) + 1;
}

function isValidAquariumNumber(aquariumNumber) {
    return Number.isSafeInteger(aquariumNumber) && aquariumNumber >= 1 && aquariumNumber <= 2147483647;
}

const aquariumScene = document.querySelector(".aquarium-scene");
if (aquariumScene) {
    const aquariumNumber = Number(document.body.dataset.aquariumNumber) || 1;
    localStorage.setItem(selectedAquariumStorageKey, String(aquariumNumber));
    const backgroundNumber = Number(document.body.dataset.aquariumBackgroundNumber) || getAquariumBackgroundNumber(aquariumNumber);
    const backgroundUrl = new URL(`../backgrounds/Aquarium_${backgroundNumber}.png`, document.baseURI);
    aquariumScene.style.setProperty("--aquarium-background-image", `url("${backgroundUrl.href}")`);
    window.aquariumColors.apply(document.body, aquariumScene, aquariumNumber);
}

function revealPageAfterAssetsLoad() {
    if (!document.documentElement.classList.contains("page-assets-loading")) return;

    const backgroundUrls = new Set();
    const backgroundUrlPattern = /url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/g;

    document.querySelectorAll("*").forEach(element => {
        [null, "::before", "::after"].forEach(pseudoElement => {
            const backgroundImage = getComputedStyle(element, pseudoElement).backgroundImage;
            for (const match of backgroundImage.matchAll(backgroundUrlPattern)) {
                const url = (match[1] || match[2] || match[3] || "").trim();
                if (url) backgroundUrls.add(new URL(url, document.baseURI).href);
            }
        });
    });

    const backgroundLoads = Array.from(backgroundUrls, url => new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => {
            console.error(`Unable to load page background: ${url}`);
            resolve();
        };
        image.src = url;
        if (image.complete) {
            if (image.naturalWidth > 0) {
                resolve();
            } else {
                image.onerror();
            }
        }
    }));

    const fontsLoaded = Promise.all([
        document.fonts.load('16px "Neuropolx"'),
        document.fonts.load('16px "Aquino"'),
        document.fonts.load('16px "Ipanema"'),
        document.fonts.load('16px "Hydration"'),
        document.fonts.ready
    ]);

    const allAssetsLoaded = Promise.all([fontsLoaded, ...backgroundLoads]);
    let loadingTimeoutId;
    const loadingTimeout = new Promise(resolve => {
        loadingTimeoutId = window.setTimeout(() => {
            console.warn("Page assets are taking too long to load; revealing the page.");
            resolve();
        }, 15000);
    });

    Promise.race([allAssetsLoaded, loadingTimeout]).then(() => {
        window.clearTimeout(loadingTimeoutId);
        document.documentElement.classList.remove("page-assets-loading");
        document.documentElement.classList.add("page-assets-ready");
        window.setTimeout(() => {
            document.documentElement.classList.remove("page-assets-ready");
            window.dispatchEvent(new Event("page-assets-ready"));
        }, 400);
    }).catch(error => {
        console.error("Unable to prepare page assets.", error);
        document.documentElement.classList.remove("page-assets-loading");
    });
}

revealPageAfterAssetsLoad();

// Task Menu Variables
const bedIcon = '<svg viewBox="0 0 64 48"><path d="M5 8h8v17h46v17h-6v-6H11v6H5V8Zm9 17v-9h15a8 8 0 0 1 8 9H14Z"/></svg>';
const taskList = document.querySelector("#task-list");
const taskScroll = document.querySelector("#task-scroll");
const taskCompletionUrl = taskList?.dataset.completeUrl;
const taskRequestVerificationToken = document.querySelector('#regenerateTasksForm input[name="__RequestVerificationToken"]')?.value;
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
const aquariumStatusMessage = document.querySelector("#aquariumStatusMessage");
const aquariumListButton = document.querySelector(".elements-list");
const aquariumSelector = document.querySelector("#aquariumSelector");
const coinStorageKey = "innerTide.coinBalance";
const graphicalPresentationKey = "innerTide.graphicalPresentation";
const reduceMotionKey = "innerTide.reduceMotion";
const musicVolumeStorageKey = "innerTide.musicVolume";
const sfxVolumeStorageKey = "innerTide.sfxVolume";

const readStoredVolume = key => {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) return 0.5;

    const volume = Number(storedValue);
    return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.5;
};
let musicVolume = readStoredVolume(musicVolumeStorageKey);
let sfxVolume = readStoredVolume(sfxVolumeStorageKey);
const audioPlayers = {
    music: new Set(),
    sfx: new Set()
};

function registerAudioPlayer(player, type) {
    if (!player) return;

    audioPlayers[type].add(player);
    player.volume = type === "music" ? musicVolume : sfxVolume;
    return player;
}

function setAudioVolume(type, volume) {
    const boundedVolume = Math.min(1, Math.max(0, volume));
    if (!Number.isFinite(boundedVolume)) {
        throw new RangeError("Audio volume must be a finite number between 0 and 1.");
    }

    if (type === "music") {
        musicVolume = boundedVolume;
        localStorage.setItem(musicVolumeStorageKey, String(boundedVolume));
    } else {
        sfxVolume = boundedVolume;
        localStorage.setItem(sfxVolumeStorageKey, String(boundedVolume));
    }

    audioPlayers[type].forEach(player => {
        player.volume = boundedVolume;
    });
}

const soundPathPrefix = new URL("/sfx/", document.baseURI).pathname;
const musicPathPrefix = new URL("/music/", document.baseURI).pathname;
const coinGainSound = registerAudioPlayer(new Audio(`${soundPathPrefix}coin_gain.mp3`), "sfx");
const musicVolumeTestSound = new Audio(`${musicPathPrefix}test_music.mp3`);
const sfxVolumeTestSound = new Audio(`${soundPathPrefix}Open.mp3`);
registerAudioPlayer(musicVolumeTestSound, "music");
registerAudioPlayer(sfxVolumeTestSound, "sfx");

function playCoinChangeSound() {
    const sound = registerAudioPlayer(coinGainSound.cloneNode(), "sfx");
    sound.addEventListener("ended", () => audioPlayers.sfx.delete(sound), { once: true });
    sound.play().catch(error => {
        audioPlayers.sfx.delete(sound);
        console.error("Unable to play coin change sound.", error);
    });
}

function playVolumeTestSound(sound) {
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(error => {
        console.error("Unable to play volume test sound.", error);
    });
}

const musicVolumeSlider = document.querySelector("#musicVolume");
const musicVolumeValue = document.querySelector("#musicVolumeValue");
const sfxVolumeSlider = document.querySelector("#sfxVolume");
const sfxVolumeValue = document.querySelector("#sfxVolumeValue");

function initializeVolumeSlider(slider, output, type, volume) {
    if (!slider || !output) return;

    slider.value = String(Math.round(volume * 100));
    output.value = `${slider.value}%`;
    slider.addEventListener("input", () => {
        const percentage = Number(slider.value);
        output.value = `${percentage}%`;
        setAudioVolume(type, percentage / 100);
    });
    slider.addEventListener("change", () => {
        playVolumeTestSound(type === "music" ? musicVolumeTestSound : sfxVolumeTestSound);
    });
}

initializeVolumeSlider(musicVolumeSlider, musicVolumeValue, "music", musicVolume);
initializeVolumeSlider(sfxVolumeSlider, sfxVolumeValue, "sfx", sfxVolume);

let aquariumMusicPlayer = null;
const aquariumMenuSounds = {
    open: new Audio(`${soundPathPrefix}Open.mp3`),
    close: new Audio(`${soundPathPrefix}Close.mp3`)
};
const sideNavigationSounds = {
    left: new Audio(`${soundPathPrefix}left.mp3`),
    right: new Audio(`${soundPathPrefix}right.mp3`)
};
const elementsBarSounds = {
    in: new Audio(`${soundPathPrefix}elements_in.mp3`),
    out: new Audio(`${soundPathPrefix}elements_out.mp3`)
};
const quizArrowSounds = {
    left: new Audio(`${soundPathPrefix}Close.mp3`),
    right: new Audio(`${soundPathPrefix}Open.mp3`)
};
Object.values(aquariumMenuSounds).forEach(sound => registerAudioPlayer(sound, "sfx"));
Object.values(sideNavigationSounds).forEach(sound => registerAudioPlayer(sound, "sfx"));
Object.values(elementsBarSounds).forEach(sound => registerAudioPlayer(sound, "sfx"));
Object.values(quizArrowSounds).forEach(sound => registerAudioPlayer(sound, "sfx"));
registerAudioPlayer(document.querySelector("#aquarium-music"), "music");
registerAudioPlayer(document.querySelector("#login-music"), "music");

async function getTaskData() {
    setTaskListLoading(true);
    try {
        const response = await fetch('/Home/GetTasks');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        taskData = await response.json();
        const activePeriod = document.querySelector(".tab.active")?.dataset.period ?? "daily";
        renderTasks(activePeriod);
    } catch (error) {
        taskList.textContent = "Could not load tasks.";
        throw error;
    } finally {
        setTaskListLoading(false);
    }
}

function setTaskListLoading(isLoading) {
    if (!taskList) return;

    taskList.classList.toggle("is-loading", isLoading);
    if (isLoading) {
        const loadingImage = document.createElement("img");
        loadingImage.className = "task-loading-indicator";
        loadingImage.src = "/img/loading.gif";
        loadingImage.alt = "Loading tasks";
        taskList.replaceChildren(loadingImage);
    }
}

if (taskList) {
    getTaskData().catch(error => {
        console.error("Could not load tasks.", error);
        taskList.textContent = "Could not load tasks.";
    });
}

const regenerateTasksButton = document.querySelector("#regenerateTasksButton");
if (regenerateTasksButton) {
    const regenerateTasksForm = document.querySelector("#regenerateTasksForm");
    const regenerateTasksStatus = document.querySelector("#regenerateTasksStatus");
    const regenerateUrl = regenerateTasksButton.dataset.regenerateUrl;
    const regenerationCost = document.querySelector("#regenerateTasksCost");
    let taskRegenerationCount = Number.parseInt(document.body.dataset.regenerationCount, 10) || 0;
    const getTaskRegenerationCost = count => count <= 0 ? 0 : count >= 31 ? 2147483647 : 2 ** count;
    if (regenerationCost) {
        regenerationCost.textContent = getTaskRegenerationCost(taskRegenerationCount);
    }

    if (!regenerateTasksForm || !taskRequestVerificationToken || !regenerateUrl || !regenerateTasksStatus) {
        throw new Error("Task regeneration requires its URL, verification token, and status message.");
    }

    regenerateTasksButton.addEventListener("click", async () => {
        regenerateTasksButton.disabled = true;
        regenerateTasksStatus.hidden = true;
        setTaskListLoading(true);
        try {
            const response = await fetch(regenerateUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    "__RequestVerificationToken": taskRequestVerificationToken
                })
            });
            if (!response.ok || response.redirected) {
                const details = (await response.text()).trim();
                throw new Error(details || `Regenerating tasks failed with status ${response.status}.`);
            }
            const result = await response.json();
            taskRegenerationCount = result.regenerationCount;
            document.body.dataset.regenerationCount = String(taskRegenerationCount);
            if (regenerationCost) {
                regenerationCost.textContent = getTaskRegenerationCost(taskRegenerationCount);
            }
            if (coinCount) {
                coinBalance = result.coins;
                coinCount.textContent = coinBalance;
            }
            await getTaskData();
        } catch (error) {
            console.error("Unable to regenerate tasks.", error);
            regenerateTasksStatus.textContent = "Could not regenerate your tasks. Please try again.";
            regenerateTasksStatus.hidden = false;
            if (taskList?.classList.contains("is-loading")) {
                const activePeriod = document.querySelector(".tab.active")?.dataset.period ?? "daily";
                renderTasks(activePeriod);
            }
        } finally {
            regenerateTasksButton.disabled = false;
        }
    });
}

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
let coinCountAnimationTimeout = null;

function pulseCoinCounter() {
    if (!coinCounter) return;

    coinCounter.classList.remove("coin-arrived");
    void coinCounter.offsetWidth;
    coinCounter.classList.add("coin-arrived");

    if (coinCount && typeof coinCount.animate === "function") {
        coinCount.animate([
            { transform: "scale(1)" },
            { transform: "scale(1.25)", offset: .45 },
            { transform: "scale(1)" }
        ], { duration: 180, easing: "ease-out" });
    }
}

function incrementDisplayedCoinCount() {
    if (!coinCount) return;

    const displayedBalance = Number(coinCount.textContent.trim());
    if (!Number.isSafeInteger(displayedBalance)) {
        throw new TypeError("Displayed coin balance must be a safe integer.");
    }

    coinCount.textContent = String(displayedBalance + 1);
    playCoinChangeSound();
    pulseCoinCounter();
}

function decrementDisplayedCoinCount(shouldPulse = true) {
    if (!coinCount) return;

    const displayedBalance = Number(coinCount.textContent.trim());
    if (!Number.isSafeInteger(displayedBalance)) {
        throw new TypeError("Displayed coin balance must be a safe integer.");
    }

    coinCount.textContent = String(displayedBalance - 1);
    playCoinChangeSound();
    if (shouldPulse) pulseCoinCounter();
}

function animateCoinSpend(amount, destination, nextBalance) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
        throw new TypeError("Coin spend must be a non-negative safe integer.");
    }

    if (!destination || !coinCounter || !coinCount) {
        animateCoinCount(nextBalance);
        return Promise.resolve(false);
    }

    if (amount === 0) {
        animateCoinCount(nextBalance);
        return Promise.resolve(true);
    }

    if (typeof Element.prototype.animate !== "function" || isReducedMotionEnabled()) {
        animateCoinCount(nextBalance);
        return Promise.resolve(false);
    }

    const sourceCoin = coinCounter.querySelector("img");
    const source = (sourceCoin || coinCounter).getBoundingClientRect();
    const target = destination.getBoundingClientRect();
    const coinSize = 70;
    const sourceX = source.left + source.width / 2 - coinSize / 2;
    const sourceY = source.top + source.height / 2 - coinSize / 2;
    const targetX = target.left + target.width / 2 - coinSize / 2;
    const targetY = target.top + target.height / 2 - coinSize / 2;
    const flights = Array.from({ length: amount }, (_, index) => {
        const delay = index * 75;
        const coin = document.createElement("img");
        coin.className = "coin-flight";
        coin.src = "img/coin.png";
        coin.alt = "";
        coin.style.left = `${sourceX}px`;
        coin.style.top = `${sourceY}px`;
        document.body.append(coin);

        const animation = coin.animate([
            { transform: "translate(0, 0) scale(.8)", opacity: 0, zIndex: "1", offset: 0 },
            { transform: "translate(0, 0) scale(.8)", opacity: 1, zIndex: "20", offset: .16 },
            { transform: `translate(${targetX - sourceX}px, ${targetY - sourceY}px) scale(.45)`, opacity: .2 }
        ], {
            duration: 550,
            delay,
            easing: "cubic-bezier(.22,.75,.35,1)",
            fill: "both"
        });

        window.setTimeout(() => decrementDisplayedCoinCount(false), delay);

        return animation.finished.then(() => {
            coin.remove();
            return true;
        }, () => {
            coin.remove();
            return false;
        });
    });

    return Promise.all(flights).then(results => {
        const allCoinsArrived = results.every(Boolean);
        if (!allCoinsArrived || Number(coinCount.textContent.trim()) !== nextBalance) {
            animateCoinCount(nextBalance);
        }
        return allCoinsArrived;
    });
}

function animateCoinCount(nextBalance) {
    if (!Number.isSafeInteger(nextBalance)) {
        throw new TypeError("Coin balance must be a safe integer.");
    }

    coinBalance = nextBalance;
    if (!coinCount) return;

    const currentBalance = Number(coinCount.textContent.trim());
    if (!Number.isSafeInteger(currentBalance) || isReducedMotionEnabled() || currentBalance === nextBalance) {
        if (coinCountAnimationTimeout !== null) {
            clearTimeout(coinCountAnimationTimeout);
            coinCountAnimationTimeout = null;
        }
        coinCount.textContent = String(nextBalance);
        if (Number.isSafeInteger(currentBalance) && currentBalance !== nextBalance) {
            playCoinChangeSound();
        }
        return;
    }

    if (coinCountAnimationTimeout !== null) {
        clearTimeout(coinCountAnimationTimeout);
    }

    const direction = Math.sign(nextBalance - currentBalance);
    const update = () => {
        const displayedBalance = Number(coinCount.textContent.trim());
        const nextStep = displayedBalance + direction;
        coinCount.textContent = String(nextStep);
        playCoinChangeSound();
        pulseCoinCounter();

        if (nextStep !== nextBalance) {
            coinCountAnimationTimeout = window.setTimeout(update, 200);
        } else {
            coinCountAnimationTimeout = null;
        }
    };

    coinCountAnimationTimeout = window.setTimeout(update, 35);
}

async function saveCoinBalance(coinAmount, coinAnimation) {
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

        const data = await res.json();
        coinBalance = data.coins;
        const allCoinsArrived = await coinAnimation;
        if (!allCoinsArrived || Number(coinCount?.textContent.trim()) !== data.coins) {
            animateCoinCount(data.coins);
        }
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
const removeFishBtn = document.querySelector("#removeFishBtn");

//console.log("storePanel:", getComputedStyle(storePanel).zIndex);
//console.log("storeBackdrop:", getComputedStyle(storeBackdrop).zIndex);

//console.log("inventoryPanel:", getComputedStyle(inventoryPanel).zIndex);
//console.log("inventoryBackdrop:", getComputedStyle(inventoryBackdrop).zIndex);

//console.log("editorToolbar:", getComputedStyle(editorToolbar).zIndex);
//console.log("editorInventoryPanel:", getComputedStyle(editorInventoryPanel).zIndex);
//console.log("editorInventoryBackdrop:", getComputedStyle(editorInventoryBackdrop).zIndex);

//console.log("storeBtn:", getComputedStyle(storeBtn).zIndex);
//console.log("inventoryBtn:", getComputedStyle(inventoryBtn).zIndex);
//console.log("editorBtn:", getComputedStyle(editorBtn).zIndex);
//console.log("aquarium:", getComputedStyle(aquarium).zIndex);


function setAquariumPercent(percent) {
    const numericPercent = Number(percent);
    if (!Number.isFinite(numericPercent)) {
        throw new TypeError("Aquarium percentage must be a finite number.");
    }

    const value = Math.min(100, Math.max(0, Math.round(numericPercent)));
    aquariumStatus.dataset.percent = String(value);
    aquariumTank.style.setProperty("--water-level", `${value}%`);
    aquariumPercentLabel.textContent = `${value}%`;
    aquariumStatusMessage.textContent = value === 100
        ? "Aquarium complete!"
        : value >= 75
        ? "Almost complete!"
        : value >= 50
        ? "Halfway there!"
        : value >= 25
        ? "Your aquarium is growing!"
        : "Make your start!";
}

function animateCoinReward(taskRow, amount) {
    if (typeof Element.prototype.animate !== "function" || isReducedMotionEnabled()) {
        return Promise.resolve(false);
    }

    const source = taskRow.querySelector(".task-reward").getBoundingClientRect();
    const target = coinCounter.getBoundingClientRect();
    const coinSize = 70;
    const sourceX = source.left + source.width / 2 - coinSize / 2;
    const sourceY = source.top + source.height / 2 - coinSize / 2;
    const targetX = target.left + target.width / 2 - coinSize / 2;
    const targetY = target.top + target.height / 2 - coinSize / 2;
    const spread = amount > 1 ? Math.min(18, 4 + amount) : 0;

    const arrivals = Array.from({ length: amount }, (_, index) => {
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

        return animation.finished.then(() => {
            coin.remove();
            incrementDisplayedCoinCount();
            return true;
        }, () => {
            coin.remove();
            return false;
        });
    });

    return Promise.all(arrivals).then(results => results.every(Boolean));
}

function renderTasks(period) {
    if (!taskList) return;// Safe Guard for When on Other Pages

    const tasks = taskData[period];
    taskList.replaceChildren();
    taskList.classList.remove("is-loading");

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

        const complete = async () => {
            if (task.completed || task.completing) return;

            task.completing = true;
            try {
                if (!taskCompletionUrl || !taskRequestVerificationToken) {
                    throw new Error("Task completion requires its URL and verification token.");
                }

                const response = await fetch(taskCompletionUrl, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({
                        "__RequestVerificationToken": taskRequestVerificationToken,
                        "userTaskId": task.userTaskId
                    })
                });
                if (!response.ok || response.redirected) {
                    const details = (await response.text()).trim();
                    throw new Error(details || `Completing the task failed with status ${response.status}.`);
                }

                task.completed = true;
                const coinAnimation = animateCoinReward(row, task.coinReward);
                await saveCoinBalance(task.coinReward, coinAnimation);
                renderTasks(period);
            } catch (error) {
                task.completing = false;
                console.error("Could not complete the task.", error);
            }
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
    if (document.body.dataset.accountSettingsMessage === "true") {
        setInfoPanel("options");
    }
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

    if (aquariumListButton && aquariumSelector) {
        const aquariumSelectorStage = document.querySelector("#aquariumSelectorStage");
        const aquariumSelectorTitle = document.querySelector("#aquariumSelectorTitle");
        const aquariumSelectorChoose = document.querySelector("#aquariumSelectorChoose");
        const aquariumSelectorPrevious = document.querySelector("#aquariumSelectorPrevious");
        const aquariumSelectorNext = document.querySelector("#aquariumSelectorNext");
        const aquariumSelectorClose = document.querySelector("#aquariumSelectorClose");
        const aquariumUnlockPopup = document.querySelector("#aquariumUnlockPopup");
        const aquariumUnlockMessage = document.querySelector("#aquariumUnlockMessage");
        const aquariumUnlockClose = document.querySelector("#aquariumUnlockClose");
        const aquariumLink = document.querySelector(".aquarium-tab a");
        let aquariumPreviews = [];
        let aquariumEntries = [];
        let createdAquariumCount = 1;
        let selectorIsAnimating = false;
        let aquariumSlideTimeout;
        let aquariumChoiceInProgress = false;
        let selectedAquariumNumber = Number(localStorage.getItem(selectedAquariumStorageKey));
        if (!isValidAquariumNumber(selectedAquariumNumber)) {
            selectedAquariumNumber = 1;
            localStorage.setItem(selectedAquariumStorageKey, String(selectedAquariumNumber));
        }

        async function loadAquariumEntries() {
            const response = await fetch("/Aquarium/GetAquariums");
            if (!response.ok) {
                throw new Error(`Unable to load aquariums (${response.status}).`);
            }

            const entries = await response.json();
            if (!Array.isArray(entries) || entries.length === 0) {
                throw new Error("No aquariums are available.");
            }

            aquariumEntries = entries;
            createdAquariumCount = entries.length;
            selectedAquariumNumber = Number(localStorage.getItem(selectedAquariumStorageKey));
            if (!isValidAquariumNumber(selectedAquariumNumber)) selectedAquariumNumber = 1;
            selectedAquariumNumber = Math.min(selectedAquariumNumber, createdAquariumCount + 1);
        }

        function updateAquariumStatusProgress() {
            const selectedAquarium = aquariumEntries[selectedAquariumNumber - 1];
            setAquariumPercent(selectedAquarium?.completionPercentage ?? 0);
        }

        function renderAquariumSelector() {
            if (aquariumPreviews.length === 0) {
                aquariumPreviews = Array.from({ length: 3 }, () => {
                    const preview = document.createElement("div");
                    preview.className = "aquarium-selector-preview";
                    const progress = document.createElement("span");
                    progress.className = "aquarium-selector-progress";
                    const createIcon = document.createElement("span");
                    createIcon.className = "aquarium-selector-create-icon";
                    createIcon.textContent = "+";
                    preview.append(progress, createIcon);
                    aquariumSelectorStage.append(preview);
                    return preview;
                });
            }

            aquariumSelector.classList.add("is-repositioning");
            aquariumPreviews.forEach((preview, index) => {
                const offset = index - 1;
                const aquariumNumber = Math.min(2147483647, Math.max(1, selectedAquariumNumber + offset));
                const entry = aquariumEntries[aquariumNumber - 1];
                const isCreatePlaceholder = !entry && aquariumNumber === createdAquariumCount + 1;
                const isVisible = Boolean(entry || isCreatePlaceholder);
                const backgroundNumber = getAquariumBackgroundNumber(aquariumNumber);
                const backgroundUrl = new URL(`../backgrounds/Aquarium_${backgroundNumber}.png`, document.baseURI);
                const colors = window.aquariumColors.get(aquariumNumber);
                const tintColor = colors.backgroundTint ?? colors.base;
                const progress = preview.querySelector(".aquarium-selector-progress");
                preview.classList.toggle("is-current", offset === 0);
                preview.classList.toggle("is-create-placeholder", isCreatePlaceholder);
                preview.hidden = !isVisible;
                preview.style.setProperty("--aquarium-preview-offset", `${offset * 100}vw`);
                preview.style.backgroundImage = isCreatePlaceholder
                    ? "none"
                    : tintColor
                    ? `linear-gradient(color-mix(in srgb, ${tintColor} 55%, transparent), color-mix(in srgb, ${tintColor} 55%, transparent)), url("${backgroundUrl.href}")`
                    : `url("${backgroundUrl.href}")`;
                preview.style.backgroundColor = isCreatePlaceholder ? "#777" : colors.base;
                preview.style.filter = "none";
                progress.textContent = entry ? `${entry.completionPercentage}%` : "";
            });
            updateAquariumStatusProgress();
            const isCreatePlaceholder = selectedAquariumNumber === createdAquariumCount + 1;
            aquariumSelectorTitle.textContent = isCreatePlaceholder
                ? `Create Aquarium ${selectedAquariumNumber}`
                : `Aquarium ${selectedAquariumNumber}`;
            aquariumSelectorChoose.textContent = isCreatePlaceholder ? "Create Aquarium" : "Choose";
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => aquariumSelector.classList.remove("is-repositioning"));
            });
        }

        function showAquariumUnlockMessage(requiredAquariumNumber) {
            aquariumUnlockMessage.textContent =
                `Another aquarium can not be made until Aquarium ${requiredAquariumNumber} reaches 100%.`;
            aquariumUnlockPopup.hidden = false;
            aquariumUnlockClose.focus();
        }

        function closeAquariumUnlockMessage() {
            aquariumUnlockPopup.hidden = true;
            aquariumSelectorChoose.focus();
        }

        function closeAquariumSelector(restoreFocus = true) {
            window.clearTimeout(aquariumSlideTimeout);
            selectorIsAnimating = false;
            playAquariumMenuSound(false);
            aquariumSelector.classList.remove("is-open");
            aquariumSelector.inert = true;
            gameShell.inert = false;
            gameShell.classList.remove("aquarium-selector-open");
            document.body.classList.remove("aquarium-selector-open");
            window.setTimeout(() => {
                if (!aquariumSelector.classList.contains("is-open")) {
                    aquariumSelector.hidden = true;
                }
            }, isReducedMotionEnabled() ? 0 : 560);
            if (restoreFocus) aquariumListButton.focus();
        }

        function moveAquariumSelection(direction) {
            if (selectorIsAnimating ||
                (direction < 0 && selectedAquariumNumber === 1) ||
                (direction > 0 && selectedAquariumNumber >= createdAquariumCount + 1)) return;
            selectorIsAnimating = true;
            playSideNavigationSound(direction < 0 ? "left" : "right");
            aquariumPreviews.forEach((preview, index) => {
                const offset = index - 1 + (direction > 0 ? -1 : 1);
                preview.style.setProperty("--aquarium-preview-offset", `${offset * 100}vw`);
            });
            aquariumSlideTimeout = window.setTimeout(() => {
                selectedAquariumNumber += direction;
                aquariumPreviews = direction > 0
                    ? [aquariumPreviews[1], aquariumPreviews[2], aquariumPreviews[0]]
                    : [aquariumPreviews[2], aquariumPreviews[0], aquariumPreviews[1]];
                renderAquariumSelector();
                selectorIsAnimating = false;
            }, isReducedMotionEnabled() ? 0 : 560);
        }

        aquariumListButton.addEventListener("click", async () => {
            try {
                await loadAquariumEntries();
            } catch (error) {
                console.error("Could not load aquarium list.", error);
                window.alert(error instanceof Error ? error.message : "Could not load aquariums.");
                return;
            }

            setaquariumOpen(false);
            playAquariumMenuSound(true);
            renderAquariumSelector();
            aquariumSelector.hidden = false;
            aquariumSelector.inert = false;
            aquariumSelector.classList.remove("is-open");
            gameShell.inert = true;
            gameShell.classList.add("aquarium-selector-open");
            document.body.classList.add("aquarium-selector-open");
            if (isReducedMotionEnabled()) {
                aquariumSelector.classList.add("is-open");
            } else {
                window.requestAnimationFrame(() => aquariumSelector.classList.add("is-open"));
            }
            aquariumSelectorChoose.focus();
        });

        aquariumSelectorPrevious.addEventListener("click", () => moveAquariumSelection(-1));
        aquariumSelectorNext.addEventListener("click", () => moveAquariumSelection(1));
        aquariumSelectorClose.addEventListener("click", () => closeAquariumSelector());
        aquariumUnlockClose.addEventListener("click", closeAquariumUnlockMessage);
        aquariumUnlockPopup.addEventListener("click", event => {
            if (event.target === aquariumUnlockPopup) closeAquariumUnlockMessage();
        });
        aquariumSelectorChoose.addEventListener("click", async () => {
            if (aquariumChoiceInProgress) return;
            aquariumChoiceInProgress = true;
            const isCreatingAquarium = selectedAquariumNumber === createdAquariumCount + 1;
            if (isCreatingAquarium) {
                try {
                    const response = await fetch(`/Aquarium/CreateNewAquarium?aquariumNumber=${selectedAquariumNumber}`, {
                        method: "POST"
                    });
                    if (!response.ok) {
                        const message = await response.text();
                        const unlockMessage = message.match(
                            /Another aquarium can not be made until aquarium (\d+) reaches 100%\./i
                        );
                        if (unlockMessage) {
                            aquariumChoiceInProgress = false;
                            showAquariumUnlockMessage(Number(unlockMessage[1]));
                            return;
                        }
                        throw new Error(message || `Could not create aquarium (${response.status}).`);
                    }
                    const createdAquarium = await response.json();
                    aquariumEntries.push(createdAquarium);
                    createdAquariumCount = aquariumEntries.length;
                    renderAquariumSelector();
                } catch (error) {
                    aquariumChoiceInProgress = false;
                    console.error("Could not create aquarium.", error);
                    window.alert(error instanceof Error ? error.message : "Could not create aquarium.");
                    return;
                }
            }
            localStorage.setItem(selectedAquariumStorageKey, String(selectedAquariumNumber));

            playAquariumMenuSound(false);
            const currentPreview = aquariumSelectorStage.querySelector(".aquarium-selector-preview.is-current");
            const previewBounds = currentPreview.getBoundingClientRect();
            currentPreview.style.setProperty("--aquarium-preview-zoom-scale", String(Math.max(
                window.innerWidth / previewBounds.width,
                window.innerHeight / previewBounds.height
            )));
            currentPreview.classList.add("is-zooming");
            aquariumSelector.classList.add("is-choosing");

            window.setTimeout(() => {
                const destination = new URL(aquariumLink.href);
                destination.searchParams.set("from", "selector");
                destination.searchParams.set("aquarium", String(selectedAquariumNumber));
                window.location.assign(destination.href);
            }, isReducedMotionEnabled() ? 0 : 760);
        });
        aquariumSelector.addEventListener("keydown", event => {
            if (aquariumChoiceInProgress) {
                event.preventDefault();
                return;
            }
            if (event.key === "Escape" && !aquariumUnlockPopup.hidden) {
                event.preventDefault();
                closeAquariumUnlockMessage();
                return;
            }
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveAquariumSelection(-1);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                moveAquariumSelection(1);
            } else if (event.key === "Escape") {
                event.preventDefault();
                closeAquariumSelector();
            }
        });
        aquariumSelector.addEventListener("click", event => {
            if (event.target === aquariumSelector) closeAquariumSelector();
        });

        loadAquariumEntries()
            .then(updateAquariumStatusProgress)
            .catch(error => console.error("Could not load aquarium status progress.", error));

        aquariumSelector.inert = true;
    }

    renderTasks("daily");
    positionTabCarousel("daily");
    setAquariumPercent(aquariumStatus.dataset.percent);
    loadCoinBalance();
    window.setAquariumPercent = setAquariumPercent;

    const aquariumLink = document.querySelector(".aquarium-tab a");
    aquariumLink.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const selectedAquariumNumber = Number(localStorage.getItem(selectedAquariumStorageKey));
        const destination = new URL(aquariumLink.href);
        destination.searchParams.set("aquarium", String(isValidAquariumNumber(selectedAquariumNumber) ? selectedAquariumNumber : 1));
        if (navigateWithReducedMotion(destination.href)) return;
        gameShell.classList.add("aquarium-transition");
        const transitionDuration = 950;
        window.setTimeout(() => window.location.assign(destination.href), transitionDuration);
    });
}

const taskMenuLink = document.querySelector(".task-tab a");
if (taskMenuLink) {
    taskMenuLink.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        document.body.classList.add("task-menu-transition");
        const destination = new URL(taskMenuLink.href);
        const aquariumNumber = Number(document.body.dataset.aquariumNumber);
        if (isValidAquariumNumber(aquariumNumber)) {
            localStorage.setItem(selectedAquariumStorageKey, String(aquariumNumber));
            destination.searchParams.set("aquarium", String(aquariumNumber));
        }
        destination.searchParams.set("from", "aquarium");
        if (navigateWithReducedMotion(destination.href)) return;
        const transitionDuration = 950;
        window.setTimeout(() => window.location.assign(destination.href), transitionDuration);
    });
}

async function purchaseStoreFish(_id, item) {
    try {
        const x = Math.round(window.innerWidth / 2);
        const y = Math.round(window.innerHeight / 2);
        const query = new URLSearchParams({ fishId: _id, xCord: String(x), yCord: String(y) });
        const res = await fetch(`/Aquarium/PurchaseShopFish?${query}`, { method: "POST" });

        if (!res.ok) {
            let message = `Fish purchase failed (${res.status}).`;
            const responseText = await res.text();
            try {
                const error = JSON.parse(responseText);
                message = error.detail || error.title || responseText || message;
            } catch (error) {
                if (!(error instanceof SyntaxError)) throw error;
                if (responseText) message = responseText;
            }
            throw new Error(message);
        }

        const result = await res.json();
        coinBalance = result.remainingCoins;
        await animateCoinSpend(result.coinsSpent, item || storePanel, result.remainingCoins);
        renderInventoryFish();
    } catch (error) {
        console.error("Could not purchase fish.", error);
        window.alert(error instanceof Error ? error.message : "Could not purchase fish. Please try again.");
    }
}

async function purchaseStoreItem(_id, item) {
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
    coinBalance = result.remainingCoins;
    await animateCoinSpend(result.coinsSpent, item || storePanel, result.remainingCoins);
    renderInventoryItems();
}

function showStoreImageLoading(item) {
    const image = item.querySelector(".store-item-image > img");
    if (!image) return;

    const imageFrame = image.parentElement;
    imageFrame.classList.add("is-loading");
    let revealStarted = false;

    const revealLoadedImage = () => {
        if (revealStarted) return;
        revealStarted = true;

        if (typeof image.decode !== "function") {
            imageFrame.classList.remove("is-loading");
            return;
        }

        image.decode().then(() => {
            imageFrame.classList.remove("is-loading");
        }).catch(error => {
            console.error(`Could not decode store image "${image.alt}".`, error);
        });
    };

    image.addEventListener("load", revealLoadedImage, { once: true });
    image.addEventListener("error", () => {
        console.error(`Could not load store image "${image.alt}".`);
    }, { once: true });

    if (image.complete && image.naturalWidth > 0) {
        revealLoadedImage();
    }
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
            item.addEventListener("click", () => purchaseStoreItem(i._id, item));
            item.className = "store-item";

            item.innerHTML = `
            <div class="store-item-image">
                <img class="item-preview"
                     src="${i.sprite}"
                     loading="lazy"
                     decoding="async"
                     alt="${i.name}">
            </div>

            <div class="store-item-details">
                <p class="store-product-name">${i.name} </p>
                <span class="store-price"><img src="../img/coin.png" alt=""><span class="store-price-value">${i.price}</span></span>
            </div>`;

            showStoreImageLoading(item);
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
            item.addEventListener("click", () => purchaseStoreFish(f._id, item));
            item.className = "store-item";

            item.innerHTML = `
            <div class="store-item-image">
                <img class="fish-preview"
                     src="${f.sprite}"
                     loading="lazy"
                     decoding="async"
                     alt="${f.species}">
            </div>

            <div class="store-item-details">
                <p class="store-product-name">${f.species} </p>
                <span class="store-price"><img src="../img/coin.png" alt=""><span class="store-price-value">${f.price}</span></span>
            </div>`;

            showStoreImageLoading(item);
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
            item.setAttribute("value", i.UserItemId)

            item.innerHTML = `
            <div class="store-item-image">
                <img class="item-preview"
                     src="${i.sprite}"
                     loading="lazy"
                     decoding="async"
                     alt="${i.name}">
            </div>

            <div class="store-item-details">
                <p class="store-product-name">${i.name}</p>
            </div>`;

            showStoreImageLoading(item);
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
            item.className = "store-item inventoryGrabbable";
            item.setAttribute("value", f.userFishId);
            item.setAttribute("value2", f.fishId);
            item.dataset.sprite = f.sprite;
            item.dataset.species = f.species;

            item.innerHTML = `
            <div class="store-item-image">
                <img class="fish-preview"
                     src="${f.sprite}"
                     draggable="false"
                     loading="lazy"
                     decoding="async"
                     alt="${f.species}">
            </div>

            <div class="store-item-details">
                <p class="store-product-name">${f.species}</p>
            </div>
            <span class="inventory-drag-indicator"><i></i><i></i><i></i></span>`;

            showStoreImageLoading(item);
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
    const hideModeTime = document.querySelector("#hideModeTime");
    const hideModeDate = document.querySelector("#hideModeDate");
    let hideModeClockInterval;

    const updateHideModeClock = () => {
        const now = new Date();
        hideModeTime.dateTime = now.toISOString();
        hideModeTime.textContent = new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit"
        }).format(now);
        hideModeDate.textContent = new Intl.DateTimeFormat(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }).format(now);
    };

    if (hideButton && hideExitButton && hideModeTime && hideModeDate) {
        hideButton.addEventListener("click", () => {
            updateHideModeClock();
            hideModeClockInterval = window.setInterval(updateHideModeClock, 1000);
            hideExitButton.hidden = false;
            window.requestAnimationFrame(() => {
                document.body.classList.add("aquarium-hide-mode");
                hideExitButton.focus();
            });
        });

        hideExitButton.addEventListener("click", () => {
            window.clearInterval(hideModeClockInterval);
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

        if (!open && panel === inventoryPanel) {
            hideInventoryFishLimitMessage();
        }

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

const questionScreen = document.querySelector(".question-screen");
if (questionScreen) {
    Promise.all([
        document.fonts.load('16px "Aquino"'),
        document.fonts.load('16px "Neuropolx"'),
        document.fonts.load('16px "Hydration"')
    ]).then(() => {
        window.requestAnimationFrame(() => questionScreen.classList.add("question-content-ready"));
    }).catch(error => {
        console.error("Unable to load quiz question fonts.", error);
    });

    const isSetupQuiz = questionScreen.dataset.setupQuiz === "true";
    const setupQuestionList = questionScreen.querySelector("#setupQuizQuestions");
    const questionItems = Array.from(setupQuestionList?.querySelectorAll("li") ?? []);
    const questions = questionItems.map(item => item.textContent.trim());
    const quizQuestionIds = questionItems.map(item => Number(item.dataset.quizQuestionId));
    const saveAnswerUrl = questionScreen.dataset.saveAnswerUrl;
    const questionNumber = questionScreen.querySelector("#questionNumber");
    const questionPrompt = questionScreen.querySelector("#questionPrompt");
    const answerTrack = questionScreen.querySelector("#answerTrack");
    const answerFish = questionScreen.querySelector("#answerFish");
    const answerButtons = Array.from(questionScreen.querySelectorAll(".answer-choice"));
    const nextButton = questionScreen.querySelector("#nextQuestion");
    const answerForm = questionScreen.querySelector("#quizAnswerForm");
    const setupQuizForm = questionScreen.querySelector("#setupQuizForm");
    const setupQuizCompleted = questionScreen.querySelector("#setupQuizCompleted");
    const antiforgeryToken = answerForm?.querySelector('input[name="__RequestVerificationToken"]')?.value;
    const questionSaveError = questionScreen.querySelector("#questionSaveError");
    const quitControl = questionScreen.querySelector(".question-action[href], .question-action-form .question-action");

    if (!questionNumber || !questionPrompt || !answerTrack || !answerFish || answerButtons.length === 0 || !nextButton || questions.length === 0 ||
        questions.some(question => !question) ||
        !saveAnswerUrl ||
        !antiforgeryToken ||
        !questionSaveError ||
        quizQuestionIds.length !== questions.length ||
        quizQuestionIds.some(questionId => !Number.isSafeInteger(questionId) || questionId < 1) ||
        (!isSetupQuiz && !quitControl) ||
        (isSetupQuiz && (!setupQuizForm || !setupQuizCompleted))) {
        throw new Error("The question screen requires its prompt, answers, and navigation controls.");
    }

    if (isSetupQuiz) {
        setupQuizForm.addEventListener("submit", () => {
            playElementsTransitionSound("out");
            questionScreen.classList.add("quiz-exiting");
        });
    } else {
        quitControl.addEventListener("click", () => playElementsTransitionSound("out"));
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
        nextButton.disabled = answers[currentQuestion] === null;
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
        } else {
            answerFish.hidden = true;
            fishAnswerIndex = null;
        }
    }

    function advanceQuestion() {
        if (currentQuestion === questions.length - 1) {
            if (isSetupQuiz && setupQuizForm && setupQuizCompleted) {
                setupQuizCompleted.value = "true";
                setupQuizForm.requestSubmit();
                return;
            }

            const quizMenuUrl = new URL("/Quiz/Index", window.location.origin).href;
            sessionStorage.setItem("innerTide.quizExitTransition", "true");
            if (navigateWithReducedMotion(quizMenuUrl)) return;
            window.setTimeout(() => window.location.assign(quizMenuUrl), 350);
            return;
        }
        fadeThroughBlack(() => {
            currentQuestion += 1;
            renderQuestion(true);
        });
    }

    answerButtons.forEach(button => {
        button.addEventListener("click", () => {
            const answerIndex = Number(button.dataset.answer);
            if (!Number.isInteger(answerIndex) || !answerButtons[answerIndex]) {
                throw new RangeError(`Unknown quiz answer index: ${button.dataset.answer}`);
            }

            const soundDirection = fishAnswerIndex === null
                ? (answerIndex < answerButtons.length / 2 ? "left" : "right")
                : (answerIndex < fishAnswerIndex ? "left" : "right");
            playSideNavigationSound(soundDirection);
            answers[currentQuestion] = String(answerIndex);
            renderQuestion();
        });
    });

    nextButton.addEventListener("click", async () => {
        if (answers[currentQuestion] === null) return;
        playQuizArrowSound("right");

        nextButton.disabled = true;
        questionSaveError.hidden = true;
        try {
            const response = await fetch(saveAnswerUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    "__RequestVerificationToken": antiforgeryToken,
                    "quizQuestionId": String(quizQuestionIds[currentQuestion]),
                    "answerValue": String(Number(answers[currentQuestion]) + 1)
                })
            });
            if (!response.ok || response.redirected) {
                throw new Error(`Saving quiz answer failed with status ${response.status}.`);
            }
        } catch (error) {
            console.error("Unable to save the quiz answer.", error);
            questionSaveError.hidden = false;
            nextButton.disabled = false;
            return;
        }

        advanceQuestion();
    });
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
    const isInternalReturn = ["aquarium", "quiz"].includes(new URLSearchParams(window.location.search).get("from"));
    if (isInternalReturn) {
        document.documentElement.classList.add("task-menu-return");
    }
    if (localStorage.getItem("innerTide.graphicalPresentation") === "advanced") {
        document.documentElement.classList.add("graphical-advanced");
    }
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

function playQuizArrowSound(direction) {
    if (direction !== "left" && direction !== "right") return;

    const sound = quizArrowSounds[direction];
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(error => {
        console.error(`Unable to play ${direction} quiz arrow sound.`, error);
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
    const sound = aquariumMenuSounds[opening ? "open" : "close"];
    sound.pause();
    sound.currentTime = 0;
    sound.play().catch(error => {
        console.error("Unable to play Aquarium menu sound.", error);
    });
}

function playSideTabEntranceSound() {
    if (isReducedMotionEnabled()) return;

    const sound = registerAudioPlayer(
        new Audio(`${soundPathPrefix}Slide.mp3`),
        "sfx"
    );
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
    const aquariumMusic = document.querySelector("#aquarium-music");
    aquariumMusicPlayer = registerAudioPlayer(aquariumMusic, "music");
    const aquariumNumber = Number(document.body.dataset.aquariumNumber) || 1;
    const trackNumber = ((aquariumNumber - 1) % 5) + 1;
    const aquariumTrack = `${musicPathPrefix}Aquarium_${trackNumber}.mp3`;
    const aquariumTracks = [aquariumTrack, `${musicPathPrefix}Aquatic.mp3`];
    let currentAquariumTrackIndex = 0;
    aquariumMusic.loop = false;

    function playAquariumTrack() {
        const track = aquariumTracks[currentAquariumTrackIndex];
        aquariumMusic.src = track;
        aquariumMusic.load();
        aquariumMusic.play().catch(error => {
            if (error.name === "NotAllowedError") {
                document.addEventListener("pointerdown", resumeAquariumMusic, { once: true });
                document.addEventListener("keydown", resumeAquariumMusic, { once: true });
                return;
            }
            console.error(`Unable to play Aquarium music track "${track}".`, error);
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
        currentAquariumTrackIndex = (currentAquariumTrackIndex + 1) % aquariumTracks.length;
        playAquariumTrack();
    });
    aquariumMusic.addEventListener("error", () => {
        console.error(`Unable to load Aquarium music track "${aquariumTracks[currentAquariumTrackIndex]}".`);
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
    if (link.closest(".aquarium-tab")) {
        playSideNavigationSound("right");
    } else if (link.closest(".task-tab")) {
        playSideNavigationSound("left");
    }

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
    if (document.body.classList.contains("question-page") && link.closest(".question-actions")) {
        event.preventDefault();
        sessionStorage.setItem("innerTide.quizExitTransition", "true");
        questionScreen?.classList.add("quiz-exiting");
        const reducedMotion = isReducedMotionEnabled();
        if (reducedMotion) {
            navigateWithReducedMotion(link.href);
            return;
        }

        window.setTimeout(() => window.location.assign(link.href), 350);
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
    function createQuizCardTransition(card, bounds) {
        const transitionCard = card.cloneNode(true);
        const cardStyle = getComputedStyle(card);
        const scaleX = bounds.width / window.innerWidth;
        const scaleY = bounds.height / window.innerHeight;
        const cornerRadius = Number.parseFloat(cardStyle.borderTopLeftRadius);
        transitionCard.style.setProperty("--transition-top", `${bounds.top}px`);
        transitionCard.style.setProperty("--transition-left", `${bounds.left}px`);
        transitionCard.style.setProperty("--transition-scale-x", String(scaleX));
        transitionCard.style.setProperty("--transition-scale-y", String(scaleY));
        transitionCard.style.setProperty("--transition-radius", cardStyle.borderRadius);
        transitionCard.style.setProperty("--transition-radius-x", `${cornerRadius / scaleX}px`);
        transitionCard.style.setProperty("--transition-radius-y", `${cornerRadius / scaleY}px`);
        transitionCard.style.setProperty("--transition-border-x", `${Number.parseFloat(cardStyle.borderLeftWidth) / scaleX}px`);
        transitionCard.style.setProperty("--transition-border-y", `${Number.parseFloat(cardStyle.borderTopWidth) / scaleY}px`);
        transitionCard.classList.add("is-transitioning");
        card.style.visibility = "hidden";
        document.body.appendChild(transitionCard);
        return transitionCard;
    }

    if (sessionStorage.getItem("innerTide.quizExitTransition") === "true") {
        sessionStorage.removeItem("innerTide.quizExitTransition");
        document.documentElement.classList.add("quiz-return-pending");
        const card = document.querySelector(".quiz-card[href]");
        if (card && !isReducedMotionEnabled()) {
            const bounds = card.getBoundingClientRect();
            const transitionCard = createQuizCardTransition(card, bounds);
            transitionCard.classList.add("is-zooming-out", "is-expanded");
            void transitionCard.offsetWidth;
            window.requestAnimationFrame(() => {
                transitionCard.addEventListener("transitionend", event => {
                    if (event.target !== transitionCard || event.propertyName !== "transform") return;
                    transitionCard.remove();
                    document.body.classList.add("quiz-return-content-hidden");
                    card.classList.add("is-content-fading");
                    card.style.visibility = "";
                    document.documentElement.classList.remove("quiz-return-pending");
                    void card.offsetWidth;
                    window.requestAnimationFrame(() => {
                        document.body.classList.add("quiz-return-content-visible");
                        card.classList.add("is-content-visible");
                        window.setTimeout(() => {
                            card.classList.remove("is-content-fading", "is-content-visible");
                            document.body.classList.remove("quiz-return-content-hidden", "quiz-return-content-visible");
                        }, 220);
                    });
                });
                transitionCard.classList.remove("is-expanded");
            });
        } else {
            document.documentElement.classList.remove("quiz-return-pending");
        }
    }

    document.querySelectorAll(".quiz-card[href]").forEach(card => {
        card.addEventListener("click", event => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            playElementsTransitionSound("in");

            if (navigateWithReducedMotion(card.href)) return;

            const bounds = card.getBoundingClientRect();
            const transitionCard = createQuizCardTransition(card, bounds);

            const destination = card.href;
            const transitionDuration = 500;

            void transitionCard.offsetWidth;
            window.requestAnimationFrame(() => {
                transitionCard.classList.add("is-expanded");
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
            } else {
                playSideNavigationSound("right");
            }

            if (navigateWithReducedMotion(destination.href)) return;

            const bounds = link.getBoundingClientRect();
            link.style.setProperty("--transition-top", `${bounds.top}px`);
            link.style.setProperty("--transition-left", `${bounds.left}px`);
            link.style.setProperty("--transition-scale-x", String(bounds.width / window.innerWidth));
            link.style.setProperty("--transition-scale-y", String(bounds.height / window.innerHeight));
            link.classList.add("is-transitioning");

            const transitionDuration = 700;
            void link.offsetWidth;
            window.requestAnimationFrame(() => {
                link.classList.add("is-expanded");
                window.setTimeout(() => window.location.assign(destination.href), transitionDuration);
            });
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
    const loginMusic = registerAudioPlayer(document.querySelector("#login-music"), "music");

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

    if (document.body.classList.contains("auth-error-page")) {
        startupSequenceFinished = true;
        document.removeEventListener("visibilitychange", resumeStartupVideo);
        document.removeEventListener("pointerdown", enableStartupVideoAudio);
        document.removeEventListener("keydown", enableStartupVideoAudio);
        startupVideoPlayer.pause();
        startupVideoPlayer.removeAttribute("src");
        startupVideoOverlay.remove();
        startLoginMusic();
    } else {
        playStartupVideo();
    }

    const authPanel = document.querySelector(".auth-panel");
    const authViews = {
        register: document.querySelector("#registerContainer"),
        login: document.querySelector("#loginContainer")
    };
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

    const loginForm = document.querySelector("#loginContainer form");
    const loginSubmitButton = loginForm?.querySelector(".auth-submit");
    const loginProcessingOverlay = document.querySelector("#loginProcessingOverlay");
    loginForm?.addEventListener("submit", event => {
        if (loginSubmitButton?.disabled) {
            event.preventDefault();
            return;
        }

        if (!loginSubmitButton || !loginProcessingOverlay) {
            throw new Error("The login form requires a submit button and processing overlay.");
        }

        loginSubmitButton.disabled = true;
        loginProcessingOverlay.hidden = false;
    });

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

if (document.body.classList.contains("onboarding-page")) {
    const welcomeScreen = document.querySelector("#welcomeScreen");
    const setupChoiceScreen = document.querySelector("#setupChoiceScreen");
    const onboardingNext = document.querySelector("#onboardingNext");
    const setupQuizCard = setupChoiceScreen?.querySelector(".onboarding-quiz-card");

    if (!welcomeScreen || !setupChoiceScreen || !onboardingNext || !setupQuizCard) {
        throw new Error("The first-time welcome flow requires both screens and their navigation controls.");
    }

    welcomeScreen.classList.add("is-active");

    onboardingNext.addEventListener("click", () => {
        onboardingNext.disabled = true;
        welcomeScreen.classList.add("is-leaving");

        const transitionDuration = isReducedMotionEnabled() ? 0 : 320;
        window.setTimeout(() => {
            welcomeScreen.hidden = true;
            welcomeScreen.classList.remove("is-active", "is-leaving");
            setupChoiceScreen.hidden = false;

            if (transitionDuration === 0) {
                setupChoiceScreen.classList.add("is-active");
                setupQuizCard.focus();
                return;
            }

            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    setupChoiceScreen.classList.add("is-active");
                    window.setTimeout(() => setupQuizCard.focus(), transitionDuration);
                });
            });
        }, transitionDuration);
    });
}

let fishList = [];
let aquariumAnimationRunning = false;
let aquariumFishReady = Promise.resolve();

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function startAquariumAnimation() {
    if (aquariumAnimationRunning || fishList.length === 0) return;

    aquariumAnimationRunning = true;
    requestAnimationFrame(animate);
}

function appendAquariumFish(f, x, y, startMoving = false) {
    const fishContainer = document.querySelector("#fishContainer");
    if (!fishContainer) {
        throw new Error("Cannot add a fish because the aquarium fish container is missing.");
    }

    const item = document.createElement("div");
    item.classList.add("aquariumFish", "aquariumGrabbable");
    item.setAttribute("value", f.userFishId);
    item.setAttribute("value2", f.fishId);

    const img = document.createElement("img");
    img.draggable = false;
    img.alt = f.species;

    let revealFish;
    const imageLoaded = new Promise(resolve => {
        let revealed = false;
        revealFish = () => {
            if (revealed) return;
            revealed = true;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    item.classList.add("is-loaded");
                    resolve();
                });
            });
        };
        img.addEventListener("load", revealFish, { once: true });
        img.addEventListener("error", () => {
            console.error(`Could not load fish image: ${f.sprite}`);
            revealFish();
        }, { once: true });
    });

    var speed = randomRange(60, 90);

    if (f.species === "Paddlefish") {
        img.style.width = "270px";
    }

    if (f.species === "Butterfly Ray") {
        img.style.width = "350px";
        speed = randomRange(30, 60);
    }


    item.style.position = "absolute";
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    item.style.zIndex = "1";
    item.appendChild(img);
    fishContainer.appendChild(item);
    img.src = f.sprite;
    if (img.complete) {
        if (img.naturalWidth > 0) {
            revealFish();
        } else {
            img.dispatchEvent(new Event("error"));
        }
    }

    const fish = {
        element: item,
        x,
        y,
        targetX: randomRange(0, Math.max(0, fishContainer.clientWidth - 125)),
        targetY: randomRange(0, Math.max(0, fishContainer.clientHeight - 80)),
        speed: speed,
        nextBubbleAt: 0,
        moving: startMoving
    };
    fishList.push(fish);
    if (startMoving) {
        startAquariumAnimation();
    }

    return { fish, imageLoaded };
}

async function renderAquariumFish() {
    console.log("Rendering Fish");
    const fishContainer = document.querySelector("#fishContainer");
    if (!fishContainer) return;

    const fishLoadingIndicator = document.querySelector("#fishLoadingIndicator");
    if (fishLoadingIndicator) {
        fishLoadingIndicator.hidden = false;
    }

    try {
        const aquariumId = Number(document.body.dataset.aquariumId) || 1;
        const res = await fetch(
            `/Aquarium/GetAllAquariumFish?aquariumId=${aquariumId}`
        );

        if (!res.ok) {
            throw new Error(`Failed to load fish: ${res.status}`);
        }

        const fish = await res.json();
        fishContainer.replaceChildren();
        fishList = [];
        const renderedFish = fish.map(f => appendAquariumFish(
            f,
            Number(f.xCord) || 0,
            Number(f.yCord) || 0
        ));

        await Promise.all(renderedFish.map(({ imageLoaded }) => imageLoaded));

        renderedFish.forEach(({ fish: rendered }) => {
            rendered.targetX = randomRange(0, Math.max(0, fishContainer.clientWidth - rendered.element.offsetWidth));
            rendered.targetY = randomRange(0, Math.max(0, fishContainer.clientHeight - rendered.element.offsetHeight));
            rendered.moving = true;
        });

        startAquariumAnimation();
    } catch (error) {
        console.warn("Could not render aquarium fish:", error);
    } finally {
        if (fishLoadingIndicator) {
            fishLoadingIndicator.hidden = true;
        }
    }
}

const sand2 = document.querySelector("#sand2");

aquariumFishReady = renderAquariumFish();

function emitFishBubble(fish, direction) {
    const bubble = document.createElement("span");
    const fishWidth = fish.element.offsetWidth;
    const fishHeight = fish.element.offsetHeight;
    const size = randomRange(5, 9);
    const tailX = fish.x + fishWidth / 2 - Math.cos(direction) * fishWidth * 0.4;
    const tailY = fish.y + fishHeight / 2 - Math.sin(direction) * fishWidth * 0.4;

    bubble.className = "fish-trail-bubble";
    bubble.style.left = `${tailX - size / 2}px`;
    bubble.style.top = `${tailY - size / 2}px`;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.setProperty("--bubble-drift", `${randomRange(-12, 12)}px`);
    fish.element.parentElement.appendChild(bubble);
    window.setTimeout(() => bubble.remove(), 2200);
}

function animate(now) {
    const fishContainer = document.querySelector("#fishContainer");
    if (!fishContainer) return;

    const width = fishContainer.clientWidth;
    const height = fishContainer.clientHeight;
    const aquariumRect = fishContainer.getBoundingClientRect();
    const sandRect = sand2.getBoundingClientRect();
    const elapsedSeconds = Math.min((now - (animate.lastFrameTime ?? now)) / 1000, 0.05);
    animate.lastFrameTime = now;


    fishList.forEach(fish => {
        if (!fish.moving || !fish.element.isConnected) return;

        const fishWidth = fish.element.offsetWidth;
        const fishHeight = fish.element.offsetHeight;
        const maxX = Math.max(0, width - fishWidth);
        const maxY = Math.max(0, Math.min(
            height - fishHeight,
            sandRect.top + 100 - aquariumRect.top - fishHeight
        ));
        fish.x = Math.max(0, Math.min(fish.x, maxX));
        fish.y = Math.max(0, Math.min(fish.y, maxY));
        fish.targetX = Math.max(0, Math.min(fish.targetX, maxX));
        fish.targetY = Math.max(0, Math.min(fish.targetY, maxY));

        let dx = fish.targetX - fish.x;
        let dy = fish.targetY - fish.y;

        const distance = Math.hypot(dx, dy);

        if (distance < 3) {
            fish.targetX = randomRange(0, maxX);
            fish.targetY = randomRange(0, maxY);
            return;
        }

        const step = Math.min(distance, fish.speed * elapsedSeconds);
        fish.x += (dx / distance) * step;
        fish.y += (dy / distance) * step;

        fish.element.style.left = `${fish.x}px`;
        fish.element.style.top = `${fish.y}px`;

        const direction = Math.atan2(dy, dx) * (180 / Math.PI);
        const rotation = dx > 0 ? direction : direction - 180;
        const flip = dx > 0 ? -1 : 1;
        fish.element.style.transform = `rotate(${rotation}deg) scaleX(${flip})`;

        if (now >= fish.nextBubbleAt) {
            emitFishBubble(fish, direction);
            fish.nextBubbleAt = now + randomRange(500, 900);
        }

    });
    if (fishList.length > 0) {
        requestAnimationFrame(animate);
    } else {
        aquariumAnimationRunning = false;
    }
}

// ----- Drag and Drop Logic
let offSetX = 0;
let offSetY = 0;

// Drag and Drop Logic
let selectedFish = null; // Dragged Ghost
let dragSource = null;   // Original Fish
let fishPlacementInProgress = false;
let inventorySelectionPending = false;
let inventoryFishLimitTimeout;
let inventoryFishLimitHideTimeout;

function hideInventoryFishLimitMessage() {
    const message = document.querySelector("#inventoryFishLimitMessage");
    if (!message || message.hidden) return;

    window.clearTimeout(inventoryFishLimitTimeout);
    message.classList.remove("is-visible");
    window.clearTimeout(inventoryFishLimitHideTimeout);
    inventoryFishLimitHideTimeout = window.setTimeout(() => {
        message.hidden = true;
    }, 250);
}

function showInventoryFishLimitMessage() {
    const aquarium = document.querySelector("#aquarium");
    const message = document.querySelector("#inventoryFishLimitMessage");
    const panel = document.querySelector("#tankInventoryPanel");
    if (!aquarium || !message || !panel) {
        throw new Error("Cannot show the fish limit message because aquarium inventory elements are missing.");
    }

    const aquariumRect = aquarium.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    message.style.left = `${panelRect.left - aquariumRect.left}px`;
    message.style.top = `${panelRect.bottom - aquariumRect.top + 8}px`;
    message.style.width = `${panelRect.width}px`;
    window.clearTimeout(inventoryFishLimitHideTimeout);
    message.hidden = false;
    void message.offsetWidth;
    message.classList.add("is-visible");

    window.clearTimeout(inventoryFishLimitTimeout);
    inventoryFishLimitTimeout = window.setTimeout(() => {
        hideInventoryFishLimitMessage();
    }, 5000);
}

async function placeSelectedInventoryFish(event) {
    if (!selectedFish || !dragSource?.classList.contains("inventoryGrabbable") || fishPlacementInProgress) {
        return;
    }

    const fishContainer = document.querySelector("#fishContainer");
    const fishContainerRect = fishContainer?.getBoundingClientRect();
    if (!fishContainer || !fishContainerRect) {
        throw new Error("An active fish placement requires an aquarium fish container.");
    }

    if (
        event.clientX < fishContainerRect.left ||
        event.clientX > fishContainerRect.right ||
        event.clientY < fishContainerRect.top ||
        event.clientY > fishContainerRect.bottom
    ) {
        return;
    }

    const source = dragSource;
    const preview = selectedFish;
    const userFishId = source.getAttribute("value");
    const fishId = source.getAttribute("value2");
    const species = source.dataset.species;
    const sprite = source.dataset.sprite;
    if (!species || !sprite) {
        throw new Error("The selected inventory fish is missing its display data.");
    }

    const inventoryImage = source.querySelector("img");
    const fishWidth = species === "Paddlefish" ? 200 : 125;
    const fishHeight = inventoryImage?.naturalWidth
        ? fishWidth * inventoryImage.naturalHeight / inventoryImage.naturalWidth
        : 80;
    const x = Math.max(0, Math.min(
        fishContainer.clientWidth - fishWidth,
        event.clientX - fishContainerRect.left - fishWidth / 2
    ));
    const y = Math.max(0, Math.min(
        fishContainer.clientHeight - fishHeight,
        event.clientY - fishContainerRect.top - fishHeight / 2
    ));
    const aquariumId = aquariumBody?.getAttribute("data-aquarium-id");
    if (!aquariumId) {
        throw new Error("Cannot place a fish because the aquarium ID is missing.");
    }

    fishPlacementInProgress = true;
    try {
        const res = await fetch(`/Aquarium/AddFishToAquarium`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userFishId: Number(userFishId),
                fishId,
                aquariumId: Number(aquariumId),
                x: Math.round(x),
                y: Math.round(y)
            })
        });
        if (!res.ok) {
            throw new Error(`Failed to place fish: ${res.status}`);
        }

        const placedFish = appendAquariumFish({
            userFishId: Number(userFishId),
            fishId,
            sprite,
            species
        }, x, y, true);
        void placedFish.imageLoaded.then(() => {
            const maxX = Math.max(0, fishContainer.clientWidth - placedFish.fish.element.offsetWidth);
            const maxY = Math.max(0, fishContainer.clientHeight - placedFish.fish.element.offsetHeight);
            placedFish.fish.x = Math.min(maxX, Math.max(0, placedFish.fish.x));
            placedFish.fish.y = Math.min(maxY, Math.max(0, placedFish.fish.y));
            placedFish.fish.element.style.left = `${placedFish.fish.x}px`;
            placedFish.fish.element.style.top = `${placedFish.fish.y}px`;
            placedFish.fish.targetX = randomRange(0, maxX);
            placedFish.fish.targetY = randomRange(0, maxY);
        });
        playElementsTransitionSound("out");
        preview.remove();
        selectedFish = null;
        dragSource = null;
        void renderInventoryFish();
    } catch (error) {
        console.error("Fish placement failed:", error);
    } finally {
        fishPlacementInProgress = false;
    }
}

document.addEventListener("pointerdown", async event => {
    const inventoryPanel = document.querySelector("#tankInventoryPanel");
    const target = event.target instanceof Element ? event.target : null;
    const inventoryFish = target?.closest(".inventoryGrabbable");

    if (selectedFish && dragSource?.classList.contains("inventoryGrabbable") && !inventoryFish) {
        void placeSelectedInventoryFish(event).catch(error => {
            console.error("Fish placement failed:", error);
        });
        return;
    }

    if (inventoryFish) {
        if (inventorySelectionPending) {
            return;
        }
        inventorySelectionPending = true;
        try {
            await aquariumFishReady;
            if (fishList.length >= 10) {
                showInventoryFishLimitMessage();
                return;
            }
        } catch (error) {
            console.error("Could not check the aquarium fish limit.", error);
            return;
        } finally {
            inventorySelectionPending = false;
        }

        const limitMessage = document.querySelector("#inventoryFishLimitMessage");
        if (limitMessage) {
            hideInventoryFishLimitMessage();
        }
        selectedFish?.remove();
        dragSource = inventoryFish;
        inventoryPanel?.classList.remove("is-open");

    } else if (target?.closest(".aquariumGrabbable")) {
        dragSource = target.closest(".aquariumGrabbable");
        inventoryBtn.hidden = true;
        removeFishBtn.hidden = false;
        removeFishBtn.classList.add("is-open");

    } else {
        return;
    }

    if (dragSource.classList.contains("aquariumGrabbable")) {
        const fish = fishList.find(
            f => f.element === dragSource
        );

        if (fish) {
            fish.moving = false;
        }
    }

    const fishImage = dragSource.querySelector("img");
    if (!fishImage) {
        dragSource = null;
        throw new Error("Cannot drag a fish because its image is missing.");
    }

    const fishWidthBeforePickup = fishImage.getBoundingClientRect().width;
    const fishTransform = dragSource.style.transform.match(/rotate\(([-\d.]+)deg\)(?:\s+scaleX\(([-\d.]+)\))?/);
    const pickupRotation = fishTransform ? Number(fishTransform[1]) : 0;
    const pickupFlip = fishTransform ? Number(fishTransform[2] ?? 1) : 1;

    selectedFish = document.createElement("div");
    selectedFish.className = "fish-drag-preview";
    if (fishImage.alt === "Paddlefish") {
        selectedFish.style.width = "300px";
    } else if (fishImage.alt === "Butterfly Ray") {
        selectedFish.style.width = "400px";
    }

    const previewImage = fishImage.cloneNode(true);
    previewImage.style.removeProperty("width");
    selectedFish.appendChild(previewImage);
    selectedFish.style.transform = `rotate(${pickupRotation}deg) scaleX(${pickupFlip})`;

    document.body.appendChild(selectedFish);

    selectedFish.style.position = "fixed";
    selectedFish.style.pointerEvents = "none";
    selectedFish.style.zIndex = "4";
    const pickupScale = fishWidthBeforePickup / selectedFish.offsetWidth;
    selectedFish.style.transform = `rotate(${pickupRotation}deg) scaleX(${pickupFlip}) scale(${pickupScale})`;
    selectedFish.style.left = `${event.clientX - selectedFish.offsetWidth / 2}px`;
    selectedFish.style.top = `${event.clientY - selectedFish.offsetHeight / 2}px`;

    const preview = selectedFish;
    requestAnimationFrame(() => {
        if (preview.isConnected) {
            preview.style.transform = `rotate(${pickupRotation}deg) scaleX(${pickupFlip}) scale(1)`;
        }
    });

    if (dragSource.classList.contains("aquariumGrabbable")) {
        dragSource.classList.add("is-dragging");
    }

    playElementsTransitionSound("in");
    console.log("Dragging:", dragSource);
});


document.addEventListener("pointermove", event => {
    if (!selectedFish) {
        return;
    }

    selectedFish.style.left = `${event.clientX - selectedFish.offsetWidth / 2}px`;
    selectedFish.style.top = `${event.clientY - selectedFish.offsetHeight / 2}px`;
});

const aquariumBody = document.querySelector("#aquariumBody");

document.addEventListener("pointerup", async event => {
    if (!selectedFish || !dragSource || fishPlacementInProgress) {
        return;
    }

    if (dragSource.classList.contains("inventoryGrabbable")) {
        return;
    }

    const fishContainer = document.querySelector("#fishContainer");
    const aquarium = document.querySelector("#aquarium");

    if (!aquarium) {
        throw new Error("An active fish drag requires an aquarium.");
    }

    const aquariumRect = aquarium.getBoundingClientRect();
    if (!fishContainer) {
        throw new Error("An active fish placement requires an aquarium fish container.");
    }

    const userFishId = dragSource.getAttribute("value");
    const fishId = dragSource.getAttribute("value2");
    const aquariumFish = fishList.find(fish => fish.element === dragSource);
    let aquariumFishRemoved = false;

    try {
        if (aquariumFish) {
            const removeRect = removeFishBtn.getBoundingClientRect();

            const aquariumId = aquariumBody?.getAttribute("data-aquarium-id");
            if (!aquariumId) {
                throw new Error("Cannot remove a fish because the aquarium ID is missing.");
            }

            const droppedInRemove =
                event.clientX >= removeRect.left &&
                event.clientX <= removeRect.right &&
                event.clientY >= removeRect.top &&
                event.clientY <= removeRect.bottom;

            const x = event.clientX - aquariumRect.left;
            const y = event.clientY - aquariumRect.top;

            if (droppedInRemove) {
                const res = await fetch(`/Aquarium/RemoveFishFromAquarium`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        userFishId: Number(userFishId),
                        fishId,
                        aquariumId: Number(aquariumId),
                        x: Math.round(x),
                        y: Math.round(y)
                    })
                });

                if (res.ok) {
                    await renderInventoryFish();
                    aquariumFishRemoved = true;

                }
            }
        }

        if (aquariumFish) {
            if (aquariumFishRemoved) {
                aquariumFish.element.remove();
                fishList = fishList.filter(fish => fish !== aquariumFish);
            } else {
                const maxX = Math.max(0, fishContainer.clientWidth - aquariumFish.element.offsetWidth);
                const maxY = Math.max(0, fishContainer.clientHeight - aquariumFish.element.offsetHeight);
                aquariumFish.x = Math.min(maxX, Math.max(0, event.clientX - aquariumRect.left - aquariumFish.element.offsetWidth / 2));
                aquariumFish.y = Math.min(maxY, Math.max(0, event.clientY - aquariumRect.top - aquariumFish.element.offsetHeight / 2));
                aquariumFish.element.style.left = `${aquariumFish.x}px`;
                aquariumFish.element.style.top = `${aquariumFish.y}px`;
                aquariumFish.targetX = randomRange(0, maxX);
                aquariumFish.targetY = randomRange(0, maxY);
                aquariumFish.moving = true;
            }
        }

        if (aquariumFishRemoved) {
            dragSource.remove();
        }
        playElementsTransitionSound("out");
        dragSource.classList.remove("is-dragging");
        selectedFish.remove();
        selectedFish = null;
        dragSource = null;
        removeFishBtn.hidden = true;
        inventoryBtn.hidden = false;
        return;

    } catch (error) {
        fishPlacementInProgress = false;
        console.error("Drop failed:", error);
        if (dragSource?.classList.contains("aquariumGrabbable")) {
            removeFishBtn.hidden = true;
            inventoryBtn.hidden = false;
        }
    }     
});

if (["aquarium", "quiz"].includes(new URLSearchParams(window.location.search).get("from"))) {
    document.documentElement.classList.add("task-menu-return");
}
document.documentElement.classList.add("page-assets-loading");
