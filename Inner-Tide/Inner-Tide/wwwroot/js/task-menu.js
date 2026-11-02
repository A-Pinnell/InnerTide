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

function renderTasks(period, fadeIn = false) {
    if (!taskList) return;// Safe Guard for When on Other Pages

    const tasks = taskData[period];
    taskList.replaceChildren();

    tasks.forEach((task, index) => {
        const row = document.createElement("article");
        row.className = `task-row completeable${task.completed ? " completed" : ""}${task.priority ? " priority-task" : ""}`;
        if (fadeIn) {
            row.classList.add("task-row-fade-in");
            row.style.setProperty("--task-row-fade-delay", `${index * 85}ms`);
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => row.classList.add("is-visible"));
            });
        }

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

                const result = await response.json();
                task.completed = true;
                const coinChange = beginCoinChangeAnimation(result.coins);
                const coinAnimation = animateCoinReward(row, result.reward);
                await updateDisplayedCoinBalance(result.coins, coinAnimation, coinChange);
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

function setAquariumOpen(open) {
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
        if (previousPanel !== panel) {
            playAquariumMenuSound(Boolean(panel));
        }
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
                        optionsCloseButton.focus();
                    } else {
                        creditsCloseButton.focus();
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
    optionsCloseButton.addEventListener("click", () => setInfoPanel(null));
    creditsCloseButton.addEventListener("click", () => setInfoPanel(null));
    optionsPanel.querySelectorAll("details").forEach(details => {
        details.addEventListener("toggle", () => playAquariumMenuSound(details.open));
    });
    graphicalPresentationOptions.forEach(option => {
        option.addEventListener("change", () => {
            if (option.checked) playSideNavigationSound("right");
        });
    });
    reduceMotionOptions.forEach(option => {
        option.addEventListener("change", () => {
            if (option.checked) playSideNavigationSound("right");
        });
    });
    optionsPanel.querySelector("form")?.addEventListener("submit", () => {
        playElementsTransitionSound("out");
    });
    document.querySelector("#deleteUserDataForm")?.addEventListener("submit", event => {
        if (!window.confirm("This permanently deletes your account and all its saved data. This cannot be undone. Continue?")) {
            event.preventDefault();
        }
    });
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

    elementsToggle.addEventListener("click", () => {
        setAquariumOpen(!gameShell.classList.contains("elements-open"));
    });
    aquariumBackdrop.addEventListener("click", () => setAquariumOpen(false));

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

            setAquariumOpen(false);
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

if (["aquarium", "quiz"].includes(new URLSearchParams(window.location.search).get("from"))) {
    document.documentElement.classList.add("task-menu-return");
}

if (taskList) {
    getTaskData().catch(error => {
        console.error("Could not load tasks.", error);
        taskList.textContent = "Could not load tasks.";
    });
}
document.documentElement.classList.add("page-assets-loading");
