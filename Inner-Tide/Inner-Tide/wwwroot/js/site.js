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
const taskLoadingIndicator = document.querySelector("#taskLoadingIndicator");
const taskCompletionUrl = taskList?.dataset.completeUrl;
const taskRequestVerificationToken = document.querySelector('#regenerateTasksForm input[name="__RequestVerificationToken"]')?.value;
const tabsContainer = document.querySelector(".tabs");
const gameShell = document.querySelector(".game-shell");
const settingsButton = document.querySelector("#settingsButton");
const creditsButton = document.querySelector("#creditsButton");
const taskPanel = document.querySelector(".task-panel");
const optionsPanel = document.querySelector("#optionsPanel");
const optionsCloseButton = document.querySelector("#optionsCloseButton");
const creditsPanel = document.querySelector("#creditsPanel");
const creditsCloseButton = document.querySelector("#creditsCloseButton");
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
const videoPlayers = new Set();
const videoMusicVolumeMultiplier = 0.5;

function registerAudioPlayer(player, type) {
    if (!player) return;

    audioPlayers[type].add(player);
    player.volume = type === "music" ? musicVolume : sfxVolume;
    return player;
}

function registerVideoPlayer(player) {
    if (!player) return;

    videoPlayers.add(player);
    player.volume = musicVolume * videoMusicVolumeMultiplier;
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
    if (type === "music") {
        videoPlayers.forEach(player => {
            player.volume = boundedVolume * videoMusicVolumeMultiplier;
        });
    }
}

const soundPathPrefix = new URL("/sfx/", document.baseURI).pathname;
const musicPathPrefix = new URL("/music/", document.baseURI).pathname;
const coinGainSound = registerAudioPlayer(new Audio(`${soundPathPrefix}coin_gain.mp3`), "sfx");
const coinChangeSounds = new Set();
const musicVolumeTestSound = new Audio(`${musicPathPrefix}test_music.mp3`);
const sfxVolumeTestSound = new Audio(`${soundPathPrefix}Open.mp3`);
registerAudioPlayer(musicVolumeTestSound, "music");
registerAudioPlayer(sfxVolumeTestSound, "sfx");

function playCoinChangeSound() {
    const sound = registerAudioPlayer(coinGainSound.cloneNode(), "sfx");
    coinChangeSounds.add(sound);
    sound.addEventListener("ended", () => {
        audioPlayers.sfx.delete(sound);
        coinChangeSounds.delete(sound);
    }, { once: true });
    sound.play().catch(error => {
        audioPlayers.sfx.delete(sound);
        coinChangeSounds.delete(sound);
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
registerAudioPlayer(document.querySelector("#welcome-music"), "music");

async function getTaskData() {
    setTaskListLoading(true);
    try {
        const response = await fetch('/Home/GetTasks');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        taskData = await response.json();
        const activePeriod = document.querySelector(".tab.active")?.dataset.period ?? "daily";
        renderTasks(activePeriod, true);
    } catch (error) {
        taskList.textContent = "Could not load tasks.";
        throw error;
    } finally {
        setTaskListLoading(false);
    }
}

function setTaskListLoading(isLoading) {
    if (!taskList) return;

    if (!taskScroll || !taskLoadingIndicator) {
        throw new Error("The task list requires its loading indicator and scroll container.");
    }

    taskScroll.classList.toggle("is-loading", isLoading);
    taskLoadingIndicator.hidden = !isLoading;
}

const regenerateTasksButton = document.querySelector("#regenerateTasksButton");
if (regenerateTasksButton) {
    const regenerateTasksForm = document.querySelector("#regenerateTasksForm");
    const regenerateTasksStatus = document.querySelector("#regenerateTasksStatus");
    const regenerateUrl = regenerateTasksButton.dataset.regenerateUrl;
    const regenerateTasksDialog = document.querySelector("#regenerateTasksDialog");
    const regenerateTasksCancel = document.querySelector("#regenerateTasksCancel");
    const regenerationChoices = Array.from(document.querySelectorAll(".task-regeneration-choice"));
    const taskRegenerationCounts = {
        daily: {
            count: Number.parseInt(document.body.dataset.dailyRegenerationCount, 10) || 0,
            lastFreeRefreshAt: document.body.dataset.dailyLastFreeRefreshAt
        },
        weekly: {
            count: Number.parseInt(document.body.dataset.weeklyRegenerationCount, 10) || 0,
            lastFreeRefreshAt: document.body.dataset.weeklyLastFreeRefreshAt
        },
        monthly: {
            count: Number.parseInt(document.body.dataset.monthlyRegenerationCount, 10) || 0,
            lastFreeRefreshAt: document.body.dataset.monthlyLastFreeRefreshAt
        }
    };
    const getTaskRegenerationCost = count => count <= 0 ? 0 : count >= 31 ? 2147483647 : 2 ** count;

    if (!regenerateTasksForm || !taskRequestVerificationToken || !regenerateUrl ||
        !regenerateTasksStatus || !regenerateTasksDialog || !regenerateTasksCancel || regenerationChoices.length !== 3) {
        throw new Error("Task regeneration requires its URL, verification token, dialog, and status message.");
    }

    function hasFreeRefreshElapsed(lastFreeRefreshAt, period) {
        if (!lastFreeRefreshAt) {
            return true;
        }
        const lastRefresh = new Date(lastFreeRefreshAt);
        const now = new Date();
        if (!Number.isFinite(lastRefresh.getTime())) {
            return true;
        }
        if (period === "daily") {
            return now.getTime() >= lastRefresh.getTime() + 24 * 60 * 60 * 1000;
        }
        if (period === "weekly") {
            return now.getTime() >= lastRefresh.getTime() + 7 * 24 * 60 * 60 * 1000;
        }

        const nextRefresh = new Date(lastRefresh);
        const dayOfMonth = nextRefresh.getUTCDate();
        nextRefresh.setUTCDate(1);
        nextRefresh.setUTCMonth(nextRefresh.getUTCMonth() + 1);
        const lastDayOfNextMonth = new Date(Date.UTC(
            nextRefresh.getUTCFullYear(),
            nextRefresh.getUTCMonth() + 1,
            0
        )).getUTCDate();
        nextRefresh.setUTCDate(Math.min(dayOfMonth, lastDayOfNextMonth));
        return now >= nextRefresh;
    }

    function updateRegenerationCosts() {
        regenerationChoices.forEach(choice => {
            const period = choice.dataset.regenerationPeriod;
            const counter = taskRegenerationCounts[period];
            if (hasFreeRefreshElapsed(counter.lastFreeRefreshAt, period)) counter.count = 0;
            choice.querySelector("[data-regeneration-cost]").textContent =
                String(getTaskRegenerationCost(counter.count));
        });
    }

    async function regenerateTasks(period) {
        if (gameShell.classList.contains("elements-open")) {
            setAquariumOpen(false);
        }
        regenerationChoices.forEach(choice => {
            choice.disabled = true;
        });
        regenerateTasksCancel.disabled = true;
        regenerateTasksStatus.hidden = true;
        regenerateTasksStatus.textContent = "";
        setTaskListLoading(true);
        try {
            const response = await fetch(regenerateUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    "__RequestVerificationToken": taskRequestVerificationToken,
                    "period": period
                })
            });
            if (!response.ok || response.redirected) {
                const details = (await response.text()).trim();
                throw new Error(details || `Refreshing tasks failed with status ${response.status}.`);
            }
            const result = await response.json();
            taskRegenerationCounts[period].count = result.regenerationCount;
            if (result.regenerationCost === 0) {
                taskRegenerationCounts[period].lastFreeRefreshAt = new Date().toISOString();
            }
            updateRegenerationCosts();
            if (coinCount) {
                skipCoinChangeAnimation(result.coins);
            }
            document.querySelector(`.tab[data-period="${period}"]`)?.click();
            await getTaskData();
            regenerateTasksDialog.close();
        } catch (error) {
            console.error("Unable to regenerate tasks.", error);
            regenerateTasksStatus.textContent = error instanceof Error
                ? error.message
                : "Could not refresh your tasks. Please try again.";
            regenerateTasksStatus.hidden = false;
        } finally {
            setTaskListLoading(false);
            regenerationChoices.forEach(choice => {
                choice.disabled = false;
            });
            regenerateTasksCancel.disabled = false;
        }
    }

    regenerateTasksButton.addEventListener("click", () => {
        updateRegenerationCosts();
        regenerateTasksStatus.hidden = true;
        regenerateTasksStatus.textContent = "";
        regenerateTasksDialog.showModal();
        regenerationChoices[0].focus();
    });
    regenerationChoices.forEach(choice => {
        choice.addEventListener("click", () => {
            void regenerateTasks(choice.dataset.regenerationPeriod);
        });
    });
    regenerateTasksCancel.addEventListener("click", () => {
        regenerateTasksDialog.close();
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
let coinChangeSequence = 0;
let coinChangeAnimationRunning = false;
let coinChangeTargetBalance = null;
const coinSpendTimeouts = new Set();

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

function setCoinBalanceImmediately(nextBalance) {
    if (!Number.isSafeInteger(nextBalance)) {
        throw new TypeError("Coin balance must be a safe integer.");
    }

    coinBalance = nextBalance;
    if (coinCount) {
        coinCount.textContent = String(nextBalance);
    }
}

function skipCoinChangeAnimation(nextBalance) {
    coinChangeSequence++;
    coinChangeAnimationRunning = false;
    coinChangeTargetBalance = null;
    cancelCoinAnimations();
    setCoinBalanceImmediately(nextBalance);
}

function cancelCoinAnimations() {
    coinChangeSounds.forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
        audioPlayers.sfx.delete(sound);
    });
    coinChangeSounds.clear();
    if (typeof coinCount?.getAnimations === "function") {
        coinCount.getAnimations().forEach(animation => animation.cancel());
    }
    coinCounter?.classList.remove("coin-arrived");
    document.querySelectorAll(".coin-flight").forEach(coin => {
        if (typeof coin.getAnimations === "function") {
            coin.getAnimations().forEach(animation => animation.cancel());
        }
        coin.remove();
    });
    coinSpendTimeouts.forEach(timeout => clearTimeout(timeout));
    coinSpendTimeouts.clear();
}

function beginCoinChangeAnimation(nextBalance) {
    if (!Number.isSafeInteger(nextBalance)) {
        throw new TypeError("Coin balance must be a safe integer.");
    }

    const sequence = ++coinChangeSequence;
    const animationAlreadyRunning = coinChangeAnimationRunning
        || document.querySelector(".coin-flight") !== null;

    if (animationAlreadyRunning) {
        coinChangeAnimationRunning = false;
        cancelCoinAnimations();
        if (coinChangeTargetBalance !== null) {
            setCoinBalanceImmediately(coinChangeTargetBalance);
        }
    }

    coinChangeAnimationRunning = true;
    coinChangeTargetBalance = nextBalance;
    coinBalance = nextBalance;
    return { sequence };
}

function animateCoinSpend(amount, destination, nextBalance) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
        throw new TypeError("Coin spend must be a non-negative safe integer.");
    }

    const coinChange = beginCoinChangeAnimation(nextBalance);
    if (!destination || !coinCounter || !coinCount) {
        coinChangeAnimationRunning = false;
        coinChangeTargetBalance = null;
        setCoinBalanceImmediately(nextBalance);
        return Promise.resolve(false);
    }

    if (amount === 0) {
        coinChangeAnimationRunning = false;
        coinChangeTargetBalance = null;
        setCoinBalanceImmediately(nextBalance);
        return Promise.resolve(true);
    }

    if (typeof Element.prototype.animate !== "function" || isReducedMotionEnabled()) {
        coinChangeAnimationRunning = false;
        coinChangeTargetBalance = null;
        setCoinBalanceImmediately(nextBalance);
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

        const timeout = window.setTimeout(() => {
            coinSpendTimeouts.delete(timeout);
            decrementDisplayedCoinCount(false);
        }, delay);
        coinSpendTimeouts.add(timeout);

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
        if (coinChange.sequence !== coinChangeSequence) {
            return false;
        }
        coinChangeAnimationRunning = false;
        coinChangeTargetBalance = null;
        if (!allCoinsArrived || Number(coinCount.textContent.trim()) !== nextBalance) {
            setCoinBalanceImmediately(nextBalance);
        }
        return allCoinsArrived;
    });
}

async function updateDisplayedCoinBalance(nextBalance, coinAnimation, coinChange) {
    const allCoinsArrived = await coinAnimation;
    if (coinChange.sequence !== coinChangeSequence) {
        return;
    }
    coinChangeAnimationRunning = false;
    coinChangeTargetBalance = null;
    if (!allCoinsArrived || Number(coinCount?.textContent.trim()) !== nextBalance) {
        setCoinBalanceImmediately(nextBalance);
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
