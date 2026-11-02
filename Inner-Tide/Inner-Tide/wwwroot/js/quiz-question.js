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
    const setupQuizProgress = questionScreen.querySelector("#setupQuizProgress");
    const setupQuizProgressFill = questionScreen.querySelector("#setupQuizProgressFill");
    const setupQuizProgressFish = questionScreen.querySelector("#setupQuizProgressFish");
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
                updateSetupQuizProgress(questions.length);
                window.setTimeout(
                    () => setupQuizForm.requestSubmit(),
                    isReducedMotionEnabled() ? 0 : 1000
                );
                return;
            }

            const quizMenuUrl = new URL("/Quiz/Index", window.location.origin).href;
            sessionStorage.setItem("innerTide.quizExitTransition", "true");
            if (navigateWithReducedMotion(quizMenuUrl)) return;
            window.setTimeout(() => window.location.assign(quizMenuUrl), 350);
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

