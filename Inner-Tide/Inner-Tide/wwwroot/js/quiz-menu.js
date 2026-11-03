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

if (document.body.classList.contains("quiz-menu-page")) {
    if (sessionStorage.getItem("innerTide.taskToQuizTransition") === "true") {
        sessionStorage.removeItem("innerTide.taskToQuizTransition");
        const revealQuizMenu = () => {
            document.documentElement.classList.remove("task-quiz-transition-pending");
            document.documentElement.classList.add("task-quiz-transition-revealing");
            window.setTimeout(
                () => document.documentElement.classList.remove("task-quiz-transition-revealing"),
                1100
            );
        };

        if (document.documentElement.classList.contains("page-assets-loaded")) {
            revealQuizMenu();
        } else {
            window.addEventListener("page-assets-loaded", revealQuizMenu, { once: true });
        }
    }

    const categoryViewport = document.querySelector(".quiz-card-viewport");
    const multiCategoryMessage = document.querySelector("#multiCategoryEmpty");
    const availableQuizCount = document.querySelector("#quizAvailableCount");
    const categoryButtons = Array.from(document.querySelectorAll("[data-quiz-category]"));
    if (!categoryViewport || !multiCategoryMessage || !availableQuizCount || categoryButtons.length !== 2) {
        throw new Error("The quiz menu requires its category controls and quiz viewport.");
    }

    categoryButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const isMultiCategory = button.dataset.quizCategory === "multi";
            if (categoryViewport.classList.contains("is-multi-category") === isMultiCategory ||
                categoryViewport.classList.contains("is-switching-category")) return;

            categoryButtons.forEach(categoryButton => { categoryButton.disabled = true; });
            categoryViewport.classList.add("is-switching-category");
            await new Promise(resolve => window.setTimeout(resolve, 180));
            categoryViewport.classList.toggle("is-multi-category", isMultiCategory);
            multiCategoryMessage.hidden = !isMultiCategory;
            availableQuizCount.textContent = isMultiCategory
                ? "0"
                : String(document.querySelectorAll('.quiz-card[data-completed="false"]').length);
            categoryButtons.forEach(categoryButton => {
                const isSelected = categoryButton === button;
                categoryButton.classList.toggle("is-selected", isSelected);
            });
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    categoryViewport.classList.remove("is-switching-category");
                    categoryButtons.forEach(categoryButton => { categoryButton.disabled = false; });
                });
            });
        });
    });

    const playerCard = document.querySelector(".quiz-menu-page .player-card");
    const profileToggle = playerCard?.querySelector(".avatar");
    profileToggle?.addEventListener("click", () => {
        const isOpen = playerCard.classList.toggle("profile-open");
        playerCard.classList.toggle("profile-collapsed", !isOpen);
        playElementsTransitionSound(isOpen ? "in" : "out");
    });

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
            if (card.dataset.completed === "true") {
                event.preventDefault();
                return;
            }
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
