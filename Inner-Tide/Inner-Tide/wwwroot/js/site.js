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

let levelRewardFishCatalogPromise;

function getLevelRewardFishCatalog() {
    if (!levelRewardFishCatalogPromise) {
        levelRewardFishCatalogPromise = fetch("/Aquarium/GetAllFish")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Unable to load fish for the level reward (${response.status}).`);
                }
                return response.json();
            })
            .then(fish => {
                if (!Array.isArray(fish)) {
                    throw new Error("The fish catalog for the level reward is invalid.");
                }
                return new Map(fish
                    .filter(entry => typeof entry?.species === "string" && typeof entry?.sprite === "string")
                    .map(entry => [entry.species.toLowerCase(), entry.sprite]));
            })
            .catch(error => {
                levelRewardFishCatalogPromise = null;
                throw error;
            });
    }

    return levelRewardFishCatalogPromise;
}

window.showLevelRewardPopup = function (level, rewards) {
    if (!Number.isSafeInteger(level) || !Array.isArray(rewards) || rewards.length === 0) return;

    document.querySelector(".level-up-dialog")?.close();

    const dialog = document.createElement("dialog");
    dialog.className = "level-up-dialog";
    dialog.setAttribute("aria-labelledby", "levelUpHeading");

    const stars = document.createElement("div");
    stars.className = "level-up-star-burst";
    stars.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 18; index++) {
        const star = document.createElement("span");
        const side = index % 2 === 0 ? -1 : 1;
        const horizontalDistance = window.innerWidth / 2 + 40;
        const verticalDistance = (Math.random() - .5) * Math.min(window.innerHeight * .7, 420);
        star.className = "level-up-star";
        star.style.setProperty("--star-x", `${side * horizontalDistance}px`);
        star.style.setProperty("--star-y", `${verticalDistance}px`);
        star.style.setProperty("--star-delay", `${Math.random() * 160}ms`);
        stars.append(star);
    }

    const heading = document.createElement("h2");
    heading.id = "levelUpHeading";
    heading.textContent = "LEVEL UP!";

    const levelLabel = document.createElement("p");
    levelLabel.className = "level-up-number";
    levelLabel.textContent = `You reached level ${level}`;

    const rewardHeading = document.createElement("p");
    rewardHeading.className = "level-up-reward-heading";
    rewardHeading.textContent = "New unlock";

    const rewardList = document.createElement("ul");
    rewardList.className = "level-up-rewards";
    rewards.forEach(reward => {
        if (typeof reward?.title !== "string" || typeof reward?.description !== "string") return;
        const entry = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = reward.title;
        const description = document.createElement("span");
        description.textContent = reward.description;
        const copy = document.createElement("div");
        copy.className = "level-up-reward-copy";
        copy.append(title, description);
        entry.append(copy);
        if (typeof reward.fishSpecies === "string" && reward.fishSpecies.trim()) {
            const image = document.createElement("img");
            image.className = "level-up-reward-fish";
            image.alt = reward.fishSpecies;
            image.hidden = true;
            image.addEventListener("error", () => {
                image.hidden = true;
                console.error(`Could not load fish image for "${reward.fishSpecies}".`);
            }, { once: true });
            entry.prepend(image);
            getLevelRewardFishCatalog().then(fishCatalog => {
                const sprite = fishCatalog.get(reward.fishSpecies.toLowerCase());
                if (!sprite) {
                    console.error(`Could not find fish "${reward.fishSpecies}" for the level reward.`);
                    return;
                }
                image.src = sprite;
                image.hidden = false;
            }).catch(error => {
                console.error("Unable to load the fish image for a level reward.", error);
            });
        }
        rewardList.append(entry);
    });
    if (rewardList.childElementCount === 0) return;

    const closeButton = document.createElement("button");
    closeButton.className = "level-up-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close level reward");
    const closeIcon = document.createElement("img");
    closeIcon.src = "/img/close_icon.png";
    closeIcon.alt = "";
    closeButton.append(closeIcon);
    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => dialog.remove(), { once: true });

    dialog.append(stars, heading, levelLabel, rewardHeading, rewardList, closeButton);
    document.body.append(dialog);
    dialog.showModal();
    rewardUnlockSound.currentTime = 0;
    rewardUnlockSound.play().catch(error => {
        console.error("Unable to play the reward unlock sound.", error);
    });
    closeButton.focus();
};

const selectedAquariumStorageKey = `innerTide.selectedAquarium.${document.body.dataset.accountId}`;
const selectedAquariumNumberStorageKey = "innerTide.selectedAquariumNumber";

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
    localStorage.setItem(selectedAquariumNumberStorageKey, String(aquariumNumber));
    const backgroundNumber = Number(document.body.dataset.aquariumBackgroundNumber) || getAquariumBackgroundNumber(aquariumNumber);
    const backgroundUrl = new URL(`../backgrounds/Aquarium_${backgroundNumber}.png`, document.baseURI);
    aquariumScene.style.setProperty("--aquarium-background-image", `url("${backgroundUrl.href}")`);
    window.aquariumColors.apply(document.body, aquariumScene, aquariumNumber);
} else if (document.body.classList.contains("journal-menu-page")) {
    const storedAquariumNumber = Number(localStorage.getItem(selectedAquariumNumberStorageKey));
    const aquariumNumber = isValidAquariumNumber(storedAquariumNumber) ? storedAquariumNumber : 1;
    const colors = window.aquariumColors.get(aquariumNumber);
    document.body.style.setProperty("--journal-sand-back", colors.sandBack);
    document.body.style.setProperty("--journal-sand-middle", colors.sandMiddle);
    document.body.style.setProperty("--journal-sand-front", colors.sandFront);
    const aquariumLink = document.querySelector("#backArrow");
    if (aquariumLink) {
        const destination = new URL(aquariumLink.href, window.location.href);
        destination.searchParams.set("aquarium", String(aquariumNumber));
        aquariumLink.href = destination.href;
    }
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

    const imageLoads = Array.from(document.images, image => {
        if (image.complete) {
            if (image.naturalWidth === 0 && image.currentSrc) {
                console.error(`Unable to load page image: ${image.currentSrc}`);
            }
            return Promise.resolve();
        }

        return new Promise(resolve => {
            const finish = () => {
                if (image.naturalWidth === 0) {
                    console.error(`Unable to load page image: ${image.currentSrc || image.src}`);
                }
                resolve();
            };
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
        });
    });

    const fontsLoaded = Promise.all([
        document.fonts.load('16px "Neuropolx"'),
        document.fonts.load('16px "Aquino"'),
        document.fonts.load('16px "Ipanema"'),
        document.fonts.load('16px "Hydration"'),
        document.fonts.ready
    ]);

    const allAssetsLoaded = Promise.all([fontsLoaded, ...backgroundLoads, ...imageLoads]);
    const assetsSettled = allAssetsLoaded.then(
        () => {
            document.documentElement.classList.add("page-assets-loaded");
            window.dispatchEvent(new Event("page-assets-loaded"));
        },
        error => {
            console.error("Unable to prepare page assets.", error);
            document.documentElement.classList.add("page-assets-loaded");
            window.dispatchEvent(new Event("page-assets-loaded"));
        }
    );
    let loadingTimeoutId;
    const loadingTimeout = new Promise(resolve => {
        loadingTimeoutId = window.setTimeout(() => {
            console.warn("Page assets are taking too long to load; revealing the page.");
            resolve();
        }, 15000);
    });

    Promise.race([assetsSettled, loadingTimeout]).then(() => {
        window.clearTimeout(loadingTimeoutId);
        document.documentElement.classList.remove("page-assets-loading");
        document.documentElement.classList.add("page-assets-ready");
        window.setTimeout(() => {
            document.documentElement.classList.remove("page-assets-ready");
            window.dispatchEvent(new Event("page-assets-ready"));
        }, 400);
    }).catch(error => {
        console.error("Unable to reveal the page after asset loading.", error);
        document.documentElement.classList.remove("page-assets-loading");
        window.dispatchEvent(new Event("page-assets-ready"));
    });
}

revealPageAfterAssetsLoad();

if (document.body.classList.contains("journal-menu-page")) {
    window.addEventListener("page-assets-ready", () => {
        const journalTextBackground = document.querySelector("#journalTextBackground");
        if (!(journalTextBackground instanceof HTMLElement)) {
            throw new Error("The Journal menu requires its text background panel.");
        }

        if (isReducedMotionEnabled()) {
            document.body.classList.add("journal-menu-revealed", "journal-background-moving");
            return;
        }

        journalTextBackground.addEventListener("transitionend", event => {
            if (event.target === journalTextBackground && event.propertyName === "transform") {
                document.body.classList.add("journal-background-moving");
            }
        }, { once: true });
        document.body.classList.add("journal-menu-revealed");
    }, { once: true });
}

if (document.documentElement.classList.contains("aquarium-journal-transition-pending")) {
    const revealJournalAfterAssetsReady = () => {
        window.requestAnimationFrame(() => {
            document.documentElement.classList.remove("aquarium-journal-transition-pending");
        });
        window.removeEventListener("page-assets-ready", revealJournalAfterAssetsReady);
    };
    window.addEventListener("page-assets-ready", revealJournalAfterAssetsReady, { once: true });
}

if (document.documentElement.classList.contains("journal-aquarium-transition-pending")) {
    const aquariumMain = document.querySelector("body.aquarium-page > main");
    const finishJournalAquariumTransition = event => {
        if (event.target !== aquariumMain || event.propertyName !== "transform") return;
        document.body.classList.remove("journal-aquarium-returning");
    };

    if (isReducedMotionEnabled()) {
        document.body.classList.remove("journal-aquarium-returning");
    } else if (aquariumMain) {
        aquariumMain.addEventListener("transitionend", finishJournalAquariumTransition);
    }

    window.addEventListener("page-assets-ready", () => {
        window.requestAnimationFrame(() => {
            document.documentElement.classList.remove("journal-aquarium-transition-pending");
            document.body.classList.remove("journal-button-offset");
        });
    }, { once: true });
}

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
const rewardUnlockSound = registerAudioPlayer(new Audio(`${soundPathPrefix}rewardUnlock.mp3`), "sfx");
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
const journalMusicPlayer = registerAudioPlayer(document.querySelector("#journal-music"), "music");
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
    const regenerateTasksCoinLayer = document.querySelector("#regenerateTasksCoinLayer");
    const regenerateTasksBackdrop = document.querySelector("#regenerateTasksBackdrop");
    const regenerateTasksCancel = document.querySelector("#regenerateTasksCancel");
    const regenerationChoices = Array.from(document.querySelectorAll(".task-regeneration-choice"));
    let regenerationInProgress = false;
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
        !regenerateTasksStatus || !regenerateTasksDialog || !regenerateTasksCoinLayer || !regenerateTasksBackdrop ||
        !regenerateTasksCancel || regenerationChoices.length !== 3) {
        throw new Error("Task regeneration requires its URL, verification token, dialog, and status message.");
    }

    regenerateTasksDialog.addEventListener("close", () => {
        regenerateTasksBackdrop.hidden = true;
        regenerateTasksBackdrop.classList.remove("is-closing");
    });

    regenerateTasksDialog.addEventListener("cancel", event => {
        if (regenerationInProgress) {
            event.preventDefault();
        }
    });

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

    function closeRegenerationDialogWithAnimation() {
        if (!regenerateTasksDialog.open) {
            return Promise.resolve();
        }

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            regenerateTasksDialog.close();
            return Promise.resolve();
        }

        return new Promise(resolve => {
            const finishClose = event => {
                if (event.target !== regenerateTasksDialog ||
                    event.animationName !== "task-regeneration-exit") {
                    return;
                }

                regenerateTasksDialog.removeEventListener("animationend", finishClose);
                regenerateTasksDialog.classList.remove("is-closing");
                regenerateTasksDialog.close();
                resolve();
            };

            regenerateTasksDialog.addEventListener("animationend", finishClose);
            regenerateTasksBackdrop.classList.add("is-closing");
            regenerateTasksDialog.classList.add("is-closing");
        });
    }

    async function regenerateTasks(period, choice) {
        if (gameShell.classList.contains("elements-open")) {
            setAquariumOpen(false);
        }
        const startingCoinBalance = coinCount
            ? Number(coinCount.textContent.trim())
            : null;
        regenerationChoices.forEach(choice => {
            choice.disabled = true;
        });
        regenerateTasksCancel.disabled = true;
        regenerationInProgress = true;
        regenerateTasksStatus.hidden = true;
        regenerateTasksStatus.textContent = "";
        let spendAnimationPlayed = false;
        let regenerationSucceeded = false;
        try {
            if (startingCoinBalance !== null && !Number.isSafeInteger(startingCoinBalance)) {
                throw new TypeError("Displayed coin balance must be a safe integer.");
            }

            const selectedCost = Number(choice.querySelector("[data-regeneration-cost]").textContent.trim());
            if (!Number.isSafeInteger(selectedCost) || selectedCost < 0) {
                throw new TypeError("Task refresh cost must be a non-negative safe integer.");
            }

            if (coinCount && selectedCost <= startingCoinBalance) {
                await animateCoinSpend(
                    selectedCost,
                    choice,
                    startingCoinBalance - selectedCost,
                    regenerateTasksCoinLayer
                );
                spendAnimationPlayed = true;
                await closeRegenerationDialogWithAnimation();
                setTaskListLoading(true);
            }

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
            regenerationSucceeded = true;
            taskRegenerationCounts[period].count = result.regenerationCount;
            if (result.regenerationCost === 0) {
                taskRegenerationCounts[period].lastFreeRefreshAt = new Date().toISOString();
            }
            updateRegenerationCosts();
            if (coinCount) {
                if (spendAnimationPlayed) {
                    skipCoinChangeAnimation(result.coins);
                } else {
                    await animateCoinSpend(
                        result.regenerationCost,
                        choice,
                        result.coins,
                        regenerateTasksCoinLayer
                    );
                }
            }
            if (regenerateTasksDialog.open) {
                await closeRegenerationDialogWithAnimation();
            }
            setTaskListLoading(true);
            document.querySelector(`.tab[data-period="${period}"]`)?.click();
            await getTaskData();
        } catch (error) {
            console.error("Unable to regenerate tasks.", error);
            if (spendAnimationPlayed && !regenerationSucceeded) {
                skipCoinChangeAnimation(startingCoinBalance);
            }
            regenerateTasksStatus.textContent = error instanceof Error
                ? error.message
                : "Could not refresh your tasks. Please try again.";
            regenerateTasksStatus.hidden = false;
            regenerateTasksDialog.classList.remove("is-closing");
            if (!regenerateTasksDialog.open) {
                regenerateTasksBackdrop.hidden = false;
                regenerateTasksDialog.showModal();
            }
        } finally {
            setTaskListLoading(false);
            regenerationChoices.forEach(choice => {
                choice.disabled = false;
            });
            regenerateTasksCancel.disabled = false;
            regenerationInProgress = false;
        }
    }

    regenerateTasksButton.addEventListener("click", () => {
        updateRegenerationCosts();
        regenerateTasksStatus.hidden = true;
        regenerateTasksStatus.textContent = "";
        regenerateTasksBackdrop.hidden = false;
        regenerateTasksDialog.showModal();
        regenerationChoices[0].focus();
    });
    regenerationChoices.forEach(choice => {
        choice.addEventListener("click", () => {
            void regenerateTasks(choice.dataset.regenerationPeriod, choice);
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

function decrementDisplayedCoinCount(amount = 1, shouldPulse = true) {
    if (!coinCount) return;

    if (!Number.isSafeInteger(amount) || amount < 0) {
        throw new TypeError("Coin decrement must be a non-negative safe integer.");
    }

    const displayedBalance = Number(coinCount.textContent.trim());
    if (!Number.isSafeInteger(displayedBalance)) {
        throw new TypeError("Displayed coin balance must be a safe integer.");
    }

    coinCount.textContent = String(displayedBalance - amount);
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

function getCoinFlightTiming(index, amount, baseInterval, baseDuration) {
    const progress = amount > 1 ? index / (amount - 1) : 0;
    const easedProgress = progress * progress * progress;
    const firstInterval = baseInterval * .8;
    const intervalGrowth = baseInterval * 3.7;
    const squaredProgressSum = amount > 1
        ? (index * (index - 1) / 2) ** 2 / (amount - 1) ** 3
        : 0;
    const delay = firstInterval * index + intervalGrowth * squaredProgressSum;
    const duration = amount > 1
        ? baseDuration * (.35 + 3.15 * easedProgress)
        : baseDuration;

    return { delay, duration };
}

function getCoinFlightKeyframes(sourceX, sourceY, targetX, targetY, startScale, endScale, endOpacity) {
    const offsets = [0, .12, .35, .55, .7, 1];
    const distances = [0, 0, .7, .9, .97, 1];

    return offsets.map((offset, index) => {
        const progress = distances[index];
        const scale = startScale + (endScale - startScale) * progress;
        return {
            offset,
            transform: `translate(${(targetX - sourceX) * progress}px, ${(targetY - sourceY) * progress}px) scale(${scale})`,
            opacity: index === 0 ? 0 : index === offsets.length - 1 ? endOpacity : 1,
            ...(index === 0 ? { zIndex: "1" } : { zIndex: "20" })
        };
    });
}

function animateCoinSpend(amount, destination, nextBalance, flightContainer = document.body) {
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
    const container = flightContainer.getBoundingClientRect();
    const coinSize = 70;
    const sourceX = source.left + source.width / 2 - coinSize / 2 - container.left;
    const sourceY = source.top + source.height / 2 - coinSize / 2 - container.top;
    const targetX = target.left + target.width / 2 - coinSize / 2 - container.left;
    const targetY = target.top + target.height / 2 - coinSize / 2 - container.top;
    const flightCount = Math.min(amount, 12);
    const coinsPerFlight = Math.floor(amount / flightCount);
    const remainingCoins = amount % flightCount;
    const flights = Array.from({ length: flightCount }, (_, index) => {
        const { delay, duration } = getCoinFlightTiming(index, flightCount, 24, 260);
        const coin = document.createElement("img");
        coin.className = "coin-flight";
        coin.src = "img/coin.png";
        coin.alt = "";
        coin.style.left = `${sourceX}px`;
        coin.style.top = `${sourceY}px`;
        flightContainer.append(coin);

        const animation = coin.animate(
            getCoinFlightKeyframes(sourceX, sourceY, targetX, targetY, .8, .45, .2),
            {
                duration,
                delay,
                easing: "linear",
                fill: "both"
            }
        );

        const timeout = window.setTimeout(() => {
            coinSpendTimeouts.delete(timeout);
            decrementDisplayedCoinCount(coinsPerFlight + (index < remainingCoins ? 1 : 0), false);
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
const editorBtn = document.querySelector("#editorBtn");
const editorToolbar = document.querySelector("#editorToolbar");
const editorCloseButton = document.querySelector("#editorCloseButton");
const editorMoreItems = document.querySelector("#editorMoreItems");
const editorForegroundLabel = document.querySelector("#editorForegroundLabel");
const editorForegroundNumber = document.querySelector("#editorForegroundNumber");
const editorInventoryPanel = document.querySelector("#editorInventoryPanel");
const editorInventoryBackdrop = document.querySelector("#editorInventoryBackdrop");

//console.log("storePanel:", getComputedStyle(storePanel).zIndex);
//console.log("storeBackdrop:", getComputedStyle(storeBackdrop).zIndex);

//console.log("inventoryPanel:", getComputedStyle(inventoryPanel).zIndex);
//console.log("inventoryBackdrop:", getComputedStyle(inventoryBackdrop).zIndex);

//console.log("editorToolbar:", getComputedStyle(editorToolbar).zIndex);
//console.log("editorInventoryPanel:", getComputedStyle(editorInventoryPanel).zIndex);
//console.log("editorInventoryBackdrop:", getComputedStyle(editorInventoryBackdrop).zIndex);

//console.log("storeBtn:", getComputedStyle(storeBtn).zIndex);
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

function fadeOutAudioPlayer(player, duration) {
    if (!player || player.paused) return Promise.resolve();

    const startingVolume = player.volume;
    const startTime = performance.now();

    return new Promise(resolve => {
        function updateVolume(now) {
            const progress = Math.min(1, (now - startTime) / duration);
            player.volume = startingVolume * (1 - progress);
            if (progress < 1) {
                window.requestAnimationFrame(updateVolume);
                return;
            }

            player.pause();
            player.volume = startingVolume;
            resolve();
        }

        window.requestAnimationFrame(updateVolume);
    });
}

function fadeOutAquariumMusic(duration) {
    return fadeOutAudioPlayer(aquariumMusicPlayer, duration);
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
    if (link.closest(".aquarium-tab") || link.closest("#journalButton")) {
        playSideNavigationSound("right");
    } else if (link.closest(".task-tab")) {
        playSideNavigationSound("left");
    }

    if (document.body.classList.contains("journal-menu-page") && link.closest("#backArrow")) {
        event.preventDefault();
        destination.searchParams.set("from", "journal");
        if (document.body.classList.contains("journal-aquarium-exiting")) return;
        const reducedMotion = isReducedMotionEnabled();
        const duration = reducedMotion ? 180 : 850;
        if (reducedMotion) {
            document.documentElement.classList.add("reduced-motion-transitioning");
        } else {
            const journalBackgroundPosition = getComputedStyle(document.body).backgroundPosition;
            document.body.style.animation = "none";
            document.body.style.backgroundPosition = journalBackgroundPosition;
            document.body.offsetWidth;
            document.body.style.transition = "background-position .85s cubic-bezier(.76, 0, .24, 1)";
            document.body.classList.add("journal-aquarium-exiting");
            window.requestAnimationFrame(() => {
                const backgroundTileSize = Math.max(window.innerWidth, window.innerHeight);
                document.body.style.backgroundPosition = journalBackgroundPosition
                    .split(",")
                    .map(position => {
                        const [x, y] = position.trim().split(/\s+/).map(parseFloat);
                        return `${Math.round(x / backgroundTileSize) * backgroundTileSize}px ${Math.round(y / backgroundTileSize) * backgroundTileSize}px`;
                    })
                    .join(", ");
            });
        }
        Promise.all([
            fadeOutAudioPlayer(journalMusicPlayer, duration),
            new Promise(resolve => window.setTimeout(resolve, duration))
        ]).then(() => window.location.assign(destination.href));
        return;
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
    if (document.body.classList.contains("aquarium-page") && link.closest("#journalButton")) {
        event.preventDefault();
        if (document.body.classList.contains("aquarium-journal-exiting")) return;

        destination.searchParams.set("from", "aquarium-journal");
        const reducedMotion = isReducedMotionEnabled();
        const duration = reducedMotion ? 180 : 850;
        if (reducedMotion) {
            document.documentElement.classList.add("reduced-motion-transitioning");
        } else {
            document.body.classList.add("aquarium-journal-exiting");
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
