const taskMenuLink = document.querySelector(".task-tab a");
let fishList = [];
let aquariumAnimationRunning = false;
let aquariumFishReady = Promise.resolve();
let closeActiveAquariumMenu = null;

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
        cruiseSpeed: speed,
        tapSpeedBoosted: false,
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
            if (fish.tapSpeedBoosted) {
                fish.speed = fish.cruiseSpeed;
                fish.tapSpeedBoosted = false;
            }
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

const aquariumTapTimes = [];
let fishStartledUntil = 0;
let fishStartleMessageTimeout;
let fishStartleHideTimeout;
const aquariumGlassTapSound = registerAudioPlayer(new Audio(`${soundPathPrefix}taptheglass.mp3`), "sfx");

function showGlassTapRipple(event, fishContainer) {
    const fishContainerRect = fishContainer.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "glass-tap-ripple";
    ripple.style.left = `${event.clientX - fishContainerRect.left}px`;
    ripple.style.top = `${event.clientY - fishContainerRect.top}px`;
    fishContainer.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    window.setTimeout(() => ripple.remove(), 700);
}

function playAquariumGlassTapSound() {
    const sound = registerAudioPlayer(aquariumGlassTapSound.cloneNode(), "sfx");
    sound.addEventListener("ended", () => audioPlayers.sfx.delete(sound), { once: true });
    sound.play().catch(error => {
        audioPlayers.sfx.delete(sound);
        console.error("Unable to play the aquarium glass tap sound.", error);
    });
}

function moveFishFromGlassTap(event, startled) {
    const fishContainer = document.querySelector("#fishContainer");
    if (!fishContainer) {
        throw new Error("Cannot react to an aquarium tap because the fish container is missing.");
    }

    const fishContainerRect = fishContainer.getBoundingClientRect();
    const sandRect = sand2?.getBoundingClientRect();
    const tapX = event.clientX - fishContainerRect.left;
    const tapY = event.clientY - fishContainerRect.top;

    fishList.forEach(fish => {
        const fishWidth = fish.element.offsetWidth;
        const fishHeight = fish.element.offsetHeight;
        const maxX = Math.max(0, fishContainer.clientWidth - fishWidth);
        const maxY = Math.max(0, Math.min(
            fishContainer.clientHeight - fishHeight,
            sandRect ? sandRect.top + 100 - fishContainerRect.top - fishHeight : fishContainer.clientHeight - fishHeight
        ));

        fish.speed = fish.cruiseSpeed * (startled ? 2.5 : 2);
        fish.tapSpeedBoosted = true;

        if (!startled) {
            fish.targetX = Math.max(0, Math.min(maxX, tapX - fishWidth / 2));
            fish.targetY = Math.max(0, Math.min(maxY, tapY - fishHeight / 2));
        } else {
            let dx = fish.x + fishWidth / 2 - tapX;
            let dy = fish.y + fishHeight / 2 - tapY;
            let distance = Math.hypot(dx, dy);

            if (distance < 1) {
                const angle = randomRange(0, Math.PI * 2);
                dx = Math.cos(angle);
                dy = Math.sin(angle);
                distance = 1;
            }

            const fleeDistance = randomRange(240, 340);
            fish.targetX = Math.max(0, Math.min(maxX, fish.x + dx / distance * fleeDistance));
            fish.targetY = Math.max(0, Math.min(maxY, fish.y + dy / distance * fleeDistance));
        }

        fish.moving = true;
    });

    startAquariumAnimation();
}

function showFishStartleMessage() {
    const message = document.querySelector("#fishStartleMessage");
    if (!message) {
        throw new Error("Cannot show the fish startle message because its aquarium element is missing.");
    }

    window.clearTimeout(fishStartleMessageTimeout);
    window.clearTimeout(fishStartleHideTimeout);
    message.hidden = false;
    message.classList.remove("is-visible");
    void message.offsetWidth;
    message.classList.add("is-visible");

    fishStartleMessageTimeout = window.setTimeout(() => {
        message.classList.remove("is-visible");
        fishStartleHideTimeout = window.setTimeout(() => {
            message.hidden = true;
        }, 300);
    }, 4500);
}

const aquariumFishContainer = document.querySelector("#fishContainer");
if (aquariumFishContainer) {
    aquariumFishContainer.addEventListener("click", event => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.detail === 0 ||
            event.target !== aquariumFishContainer
        ) {
            return;
        }

        showGlassTapRipple(event, aquariumFishContainer);
        playAquariumGlassTapSound();
        if (fishList.length === 0) return;

        const now = performance.now();
        if (now < fishStartledUntil) return;

        const tapWindow = 1000;
        while (aquariumTapTimes.length > 0 && now - aquariumTapTimes[0] > tapWindow) {
            aquariumTapTimes.shift();
        }
        aquariumTapTimes.push(now);

        if (aquariumTapTimes.length > 3) {
            aquariumTapTimes.length = 0;
            fishStartledUntil = now + 30000;
            moveFishFromGlassTap(event, true);
            showFishStartleMessage();
            return;
        }

        if (aquariumTapTimes.length >= 2) {
            moveFishFromGlassTap(event, false);
        }
    });
}

// ----- Drag and Drop Logic
let offSetX = 0;
let offSetY = 0;

// Drag and Drop Logic
let selectedFish = null; // Dragged Ghost
let dragSource = null;   // Original Fish
let fishPlacementInProgress = false;
let aquariumFishDropInProgress = false;
let inventorySelectionPending = false;
let inventoryFishLimitTimeout;
let inventoryFishLimitHideTimeout;

function finishAquariumFishDrag() {
    if (dragSource?.classList.contains("aquariumGrabbable")) {
        dragSource.classList.remove("is-dragging");
        const fish = fishList.find(item => item.element === dragSource);
        if (fish) fish.moving = true;
    }

    selectedFish?.remove();
    selectedFish = null;
    dragSource = null;
    removeFishBtn.hidden = true;
    removeFishBtn.classList.remove("is-open");
    inventoryBtn.hidden = false;
}

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
    if (event.button !== 0) return;

    const inventoryPanel = document.querySelector("#tankInventoryPanel");
    const target = event.target instanceof Element ? event.target : null;
    const inventoryFish = target?.closest(".inventoryGrabbable");

    if (selectedFish && dragSource?.classList.contains("aquariumGrabbable")) {
        return;
    }

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
    if (
        event.button !== 0 ||
        !selectedFish ||
        !dragSource ||
        fishPlacementInProgress ||
        aquariumFishDropInProgress
    ) {
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

    aquariumFishDropInProgress = true;
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
        finishAquariumFishDrag();
        return;

    } catch (error) {
        console.error("Drop failed:", error);
        finishAquariumFishDrag();
    } finally {
        aquariumFishDropInProgress = false;
    }
});

document.addEventListener("pointercancel", () => {
    if (!aquariumFishDropInProgress && dragSource?.classList.contains("aquariumGrabbable")) {
        finishAquariumFishDrag();
    }
});

window.addEventListener("blur", () => {
    if (!aquariumFishDropInProgress && dragSource?.classList.contains("aquariumGrabbable")) {
        finishAquariumFishDrag();
    }
});
