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
    const startupVideoPlayer = registerVideoPlayer(document.querySelector("#startup-video-player"));

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

    function clearAuthErrors() {
        authPanel.querySelectorAll(".auth-error").forEach(error => error.replaceChildren());
        authPanel.querySelectorAll(".field-validation-error").forEach(error => {
            error.classList.remove("field-validation-error");
            error.classList.add("field-validation-valid");
        });
        authPanel.querySelectorAll(".input-validation-error").forEach(input => {
            input.classList.remove("input-validation-error");
        });
        document.body.classList.remove("auth-error-page");
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
    const registerForm = document.querySelector("#registerContainer form");
    registerForm?.addEventListener("submit", () => playElementsTransitionSound("out"));
    loginForm?.addEventListener("submit", event => {
        if (loginSubmitButton?.disabled) {
            event.preventDefault();
            return;
        }

        if (!loginSubmitButton || !loginProcessingOverlay) {
            throw new Error("The login form requires a submit button and processing overlay.");
        }

        playElementsTransitionSound("out");
        loginSubmitButton.disabled = true;
        loginProcessingOverlay.hidden = false;
    });

    document.querySelectorAll("[data-auth-view]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            const nextView = authViews[link.dataset.authView];
            const currentView = Object.values(authViews).find(view => view.classList.contains("is-active"));

            if (!nextView || !currentView || nextView === currentView) return;

            playSideNavigationSound(currentView === authViews.register ? "left" : "right");
            clearAuthErrors();
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
    const welcomeMusic = document.querySelector("#welcome-music");
    const welcomeScreen = document.querySelector("#welcomeScreen");
    const setupChoiceScreen = document.querySelector("#setupChoiceScreen");
    const onboardingNext = document.querySelector("#onboardingNext");
    const setupQuizCard = setupChoiceScreen?.querySelector(".onboarding-quiz-card");

    if (!welcomeMusic || !welcomeScreen || !setupChoiceScreen || !onboardingNext || !setupQuizCard) {
        throw new Error("The first-time welcome flow requires both screens and their navigation controls.");
    }

    welcomeScreen.classList.add("is-active");

    const startWelcomeMusic = () => {
        welcomeMusic.play().then(() => {
            document.removeEventListener("pointerdown", startWelcomeMusic);
            document.removeEventListener("keydown", startWelcomeMusic);
        }).catch(error => {
            if (error.name !== "NotAllowedError") {
                console.error("Unable to play welcome music.", error);
            }
        });
    };
    startWelcomeMusic();
    document.addEventListener("pointerdown", startWelcomeMusic);
    document.addEventListener("keydown", startWelcomeMusic);

    onboardingNext.addEventListener("click", () => {
        playCoinChangeSound();
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
