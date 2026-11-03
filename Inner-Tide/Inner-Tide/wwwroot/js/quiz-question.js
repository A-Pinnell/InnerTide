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
    const quizCompletedUrl = questionScreen.dataset.quizCompletedUrl;
    const quizReward = Number(questionScreen.dataset.quizReward);
    const questionNumber = questionScreen.querySelector("#questionNumber");
    const questionPrompt = questionScreen.querySelector("#questionPrompt");
    const answerTrack = questionScreen.querySelector("#answerTrack");
    const answerFish = questionScreen.querySelector("#answerFish");
    const setupQuizProgress = questionScreen.querySelector("#setupQuizProgress");
    const setupQuizProgressFill = questionScreen.querySelector("#setupQuizProgressFill");
    const setupQuizProgressFish = questionScreen.querySelector("#setupQuizProgressFish");
    const answerButtons = Array.from(questionScreen.querySelectorAll(".answer-choice"));
    const nextButton = questionScreen.querySelector("#nextQuestion");
    const previousButton = questionScreen.querySelector("#previousQuestion");
    const rewardOverlay = questionScreen.querySelector("#questionRewardOverlay");
    const rewardAmount = questionScreen.querySelector("#questionRewardAmount");
    const answerForm = questionScreen.querySelector("#quizAnswerForm");
    const setupQuizForm = questionScreen.querySelector("#setupQuizForm");
    const setupQuizCompleted = questionScreen.querySelector("#setupQuizCompleted");
    const antiforgeryToken = answerForm?.querySelector('input[name="__RequestVerificationToken"]')?.value;
    const questionSaveError = questionScreen.querySelector("#questionSaveError");
    const quitControl = questionScreen.querySelector(".question-action[href], .question-action-form .question-action");

    if (!questionNumber || !questionPrompt || !answerTrack || !answerFish || answerButtons.length === 0 || !nextButton || questions.length === 0 ||
        questions.some(question => !question) ||
        !saveAnswerUrl ||
        (!isSetupQuiz && (!quizCompletedUrl || !Number.isSafeInteger(quizReward) || quizReward < 0 ||
            !previousButton || !rewardOverlay || !rewardAmount)) ||
        !antiforgeryToken ||
        !questionSaveError ||
        quizQuestionIds.length !== questions.length ||
        quizQuestionIds.some(questionId => !Number.isSafeInteger(questionId) || questionId < 1) ||
        (isSetupQuiz && (!setupQuizProgress || !setupQuizProgressFill || !setupQuizProgressFish)) ||
        (!isSetupQuiz && !quitControl) ||
        (isSetupQuiz && (!setupQuizForm || !setupQuizCompleted))) {
        throw new Error("The question screen requires its prompt, answers, and navigation controls.");
    }

    function updateSetupQuizProgress(completedCount) {
        if (!isSetupQuiz || !setupQuizProgress || !setupQuizProgressFill || !setupQuizProgressFish) return;

        const progress = Math.min(1, Math.max(0, completedCount / questions.length));
        const percentage = `${progress * 100}%`;
        setupQuizProgressFill.style.width = percentage;
        setupQuizProgressFish.style.left = percentage;
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
        if (previousButton) previousButton.disabled = currentQuestion === 0;

        if (answers[currentQuestion] !== null) {
            moveFishTo(Number(answers[currentQuestion]));
        } else {
            answerFish.hidden = true;
            fishAnswerIndex = null;
        }
    }

    function showQuizReward(reward) {
        if (!Number.isSafeInteger(reward) || reward < 0 ||
            (reward !== quizReward && reward !== quizReward * 2)) {
            throw new RangeError("The completed quiz reward is invalid.");
        }

        answerButtons.forEach(button => { button.disabled = true; });
        nextButton.disabled = true;
        if (previousButton) previousButton.disabled = true;
        rewardOverlay.hidden = false;
        playCoinChangeSound();

        const duration = isReducedMotionEnabled() ? 0 : 1400;
        const startTime = performance.now();
        function animateReward(now) {
            const progress = duration === 0 ? 1 : Math.min(1, (now - startTime) / duration);
            rewardAmount.textContent = `+${Math.floor(reward * (1 - Math.pow(1 - progress, 3)))}`;
            if (progress < 1) {
                window.requestAnimationFrame(animateReward);
                return;
            }

            questionScreen.classList.add("quiz-exiting");
            window.setTimeout(
                () => window.location.assign(quizCompletedUrl),
                isReducedMotionEnabled() ? 0 : 450
            );
        }

        window.requestAnimationFrame(animateReward);
    }

    function advanceQuestion(saveResult) {
        if (currentQuestion === questions.length - 1) {
            if (isSetupQuiz && setupQuizForm && setupQuizCompleted) {
                setupQuizCompleted.value = "true";
                updateSetupQuizProgress(questions.length);
                window.setTimeout(
                    () => setupQuizForm.requestSubmit(),
                    isReducedMotionEnabled() ? 0 : 1000
                );
                return;
            }

            if (!saveResult?.completed) {
                throw new Error("The quiz did not report completion after its final answer.");
            }

            showQuizReward(saveResult.reward);
            return;
        }
        updateSetupQuizProgress(currentQuestion + 1);
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

    previousButton?.addEventListener("click", () => {
        if (currentQuestion === 0) return;
        playQuizArrowSound("left");
        fadeThroughBlack(() => {
            currentQuestion -= 1;
            renderQuestion(true);
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
                const details = await response.text();
                throw new Error(details || `Saving quiz answer failed with status ${response.status}.`);
            }
            const saveResult = await response.json();
            if (typeof saveResult.completed !== "boolean" ||
                !Number.isSafeInteger(saveResult.reward) ||
                !Number.isSafeInteger(saveResult.coins)) {
                throw new Error("The quiz answer response is invalid.");
            }

            advanceQuestion(saveResult);
        } catch (error) {
            console.error("Unable to save the quiz answer.", error);
            questionSaveError.hidden = false;
            nextButton.disabled = false;
            return;
        }
    });
    renderQuestion();
}
