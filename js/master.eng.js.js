        async function initializeCoins() {
            try {
                const token = document.cookie
                    .split(';')
                    .find(c => c.trim().startsWith('frontend_token='))
                    ?.split('=')[1];

                if (!token) return;

                const [isUserLoggedIn, currentUserId] = await Auth.isLoggedIn();
                if (!isUserLoggedIn || !currentUserId) return;

                const response = await fetch(`/api/user-coins-balance?user_id=${currentUserId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch coins balance');
                const data = await response.json();

                window.user_current_coins = data.current_coins_balance;
                NavCoin.init();  // Initialize NavCoin with the fetched balance

            } catch (err) {
                console.error('Failed to fetch coins:', err);
            }
        }

        function initializeGaugeChart() {

          const options = {
              chart: {
                  height: 280,
                  type: 'radialBar',
                  background: 'transparent'
              },
              series: [0],
              colors: ["#ff7f50"],
              plotOptions: {
                  radialBar: {
                      hollow: {
                          margin: 0,
                          size: "70%",
                          background: "#293450"
                      },
                      track: {
                          dropShadow: {
                              enabled: true,
                              top: 2,
                              left: 0,
                              blur: 4,
                              opacity: 0.15
                          }
                      },
                      dataLabels: {
                          name: {
                              offsetY: -10,
                              color: "#fff",
                              fontSize: "13px"
                          },
                          value: {
                              color: "#fff",
                              fontSize: "30px",
                              show: true,
                              formatter: function (val) {
                                  return Math.round(val) + '%';
                              }
                          }
                      }
                  }
              },
              fill: {
                  type: "solid",
              },
              stroke: {
                  lineCap: "round"
              },
              labels: ["Progress"]
          };

          // Clear existing chart if any
          const gaugeElement = document.querySelector("#gaugeChart");
          if (gaugeElement) {
              gaugeElement.innerHTML = '';
          }

          progressGauge = new ApexCharts(gaugeElement, options);
          progressGauge.render();
          updateGaugeProgress(0); // Initialize at 0%
      }


        function updateGaugeProgress(stageNumber) {
          const progress = (stageNumber / stageCount) * 100;
          progressGauge.updateSeries([progress]);

          // Update spinner using the progress value
          const spinner = document.querySelector('.spinner');
          if (spinner) {
              const currentStageSpinner = getStageByPercentage(progress);
              setSpinner(spinner, currentStageSpinner.percentage);
          }

      }


      function adjustLayout() {
          const wrapper = document.querySelector('.content-wrapper');
          const quizContainer = document.getElementById('quizContainer');
          const sidePanel1 = document.getElementById('sidePanel1');

          const isPanel1Visible = window.getComputedStyle(sidePanel1).display !== 'none';

          wrapper.style.justifyContent = 'space-between';

          if (isPanel1Visible) {
              sidePanel1.style.flex = '0 0 calc(20% - 0.5rem)';
              sidePanel1.style.maxWidth = 'calc(20% - 0.5rem)';
              quizContainer.style.flex = '1';
          } else {
              quizContainer.style.flex = '1';
              wrapper.style.justifyContent = 'center';
          }

          [sidePanel1, quizContainer].forEach(el => {
              el.style.display = 'block';
          });
      }


        function initializeSwitch() {
            const switchElement = document.getElementById('multiStateSwitch');
            const labelsContainer = switchElement.querySelector('.switch-labels');
            const switchContainer = document.getElementById('switchContainer');

            const states = Object.keys(stateContents);

            // If only one state/tab exists
            if (states.length === 1) {
                switchContainer.style.display = 'none';
                showContent(states[0]);
                return;
            }

            // Multiple states exist - show switcher and create tabs
            switchContainer.style.display = 'flex';

            states.forEach((state, i) => {
                const label = document.createElement('div');
                label.className = 'switch-label';
                label.textContent = state;
                label.addEventListener('click', () => switchTab(i));
                labelsContainer.appendChild(label);
            });

            // Find the index position of the tab with the matching custom index
            const defaultTabPosition = states.findIndex(state =>
                stateContents[state].index === defaultTabIndex
            );

            // Use the found position or default to 0 if not found
            const initialTab = defaultTabPosition !== -1 ? defaultTabPosition : 0;

            switchTab(initialTab);

            // After switching to the default tab, check if it contains quiz-content
            const tabContent = document.getElementById('tabContent');
            const hasQuizContent = tabContent.querySelector('#quiz-content');
            if (hasQuizContent && !quizInitialized) {
                initializeQuiz();
                quizInitialized = true;
            }

        }

      // Initialize the quiz
      function initializeQuiz() {
			const quizContainer = document.getElementById("quiz-content");
			if (!quizContainer) {
				console.warn("initializeQuiz: quiz-content element not found.");
				return;
			}
          updateProgressBar(); // Initialize at 0%
          renderQuiz();
          document.getElementById("attempts").textContent = `Attempts: ${attempts}`;
          updateStageNumber();
      }

      function renderQuiz() {
            // 1. Initialize quiz container
            const quizContainer = document.getElementById("quiz-content");
            if (!quizContainer) {
                console.warn("renderQuiz: quiz-content element not found.");
                return;
            }
            quizContainer.innerHTML = '';

            // 2. Handle button visibility
            const checkAnswersButton = document.getElementById('checkAnswersButton');
            const nextStageDirectButton = document.getElementById('nextStageDirectButton');
            if (checkAnswersButton) {
                checkAnswersButton.style.display = 'block';
                checkAnswersButton.disabled = false;
            }
            if (nextStageDirectButton) {
                nextStageDirectButton.style.display = 'none';
            }

            // 3. Get current stage data and attributes
            const currentStageData = quizData[0].stages[currentStage];
            const stageType = currentStageData["stage-type"] || 'quiz';
            const hasQuestions = currentStageData.questions && currentStageData.questions.length > 0;
            const isLastStage = currentStage === quizData[0].stages.length - 1;

            // 4. Handle special stage types
            if (stageType === 'ColorMatching') {
                renderColorMatchingStage(currentStageData);
                updateStageNumber();
                return;
            }

            if (stageType === 'memoryGame') {
                if (checkAnswersButton) {
                    checkAnswersButton.style.display = 'none';
                }
                renderMemoryGameStage(currentStageData);
                return;
            }

            // 5. Handle HTML content stages
            if (stageType === 'html-content' && currentStageData["stage-metadata"]) {
                const htmlContentElement = document.createElement("div");
                htmlContentElement.className = "html-content";
                htmlContentElement.innerHTML = currentStageData["stage-metadata"];
                quizContainer.appendChild(htmlContentElement);
            }

            // 6. Handle chart stages
            if (stageType === 'chart' && currentStageData["stage-metadata"]) {
                const chartContainer = document.createElement("div");
                chartContainer.id = "chart";
                chartContainer.style.maxWidth = "650px";
                chartContainer.style.margin = "35px auto";
                quizContainer.appendChild(chartContainer);

                try {
                    const chartConfig = currentStageData["stage-metadata"];
                    const chart = new ApexCharts(chartContainer, chartConfig);
                    chart.render();
                } catch (error) {
                    console.error('Error rendering chart:', error);
                    chartContainer.innerHTML = 'Error loading chart';
                }
            }

            // 7. Handle stage text
            if (currentStageData.text && currentStageData.text.trim() !== '') {
                const stageTextElement = document.createElement("div");
                stageTextElement.className = "stage-text";
                stageTextElement.textContent = currentStageData.text;
                quizContainer.appendChild(stageTextElement);
            }

            // 8. Render questions if present
            if (hasQuestions) {
                const questionsContainer = document.createElement("div");
                questionsContainer.id = "quiz-questions";
                quizContainer.appendChild(questionsContainer);

                currentStageData.questions.forEach((questionData, index) => {
                    const questionContainer = document.createElement("div");
                    questionContainer.className = "question";
                    questionContainer.style.padding = "0px";

                    // Create question line elements
                    const questionLine = document.createElement("div");
                    questionLine.className = "question-one-line";

                    const label = document.createElement("label");
                    label.htmlFor = `stage${currentStage}_q${index}`;
                    label.textContent = `${index + 1}. ${questionData.question}`;

                    const resultDiv = document.createElement("div");
                    resultDiv.className = "result result-ltr";
                    resultDiv.id = `result${index}`;

                    // Create input element
                    const inputElement = createQuestionInput(questionData, index, currentStage);

                    // Handle text alignment
                    if (isQuestionLineAlignedLeft) {
                        label.style.textAlign = 'left';
                        questionLine.style.direction = "ltr";
                        if (inputElement.tagName === 'INPUT' ||
                            inputElement.tagName === 'TEXTAREA' ||
                            inputElement.tagName === 'SELECT') {
                            inputElement.style.textAlign = "left";
                        }
                    }

                    // Append label and result to question line
                    questionLine.appendChild(label);
                    questionLine.appendChild(resultDiv);

                    // Handle different question types layout
                    if (questionData.question_type === 'trivia' || questionData.question_type === 'long-open') {
                        questionContainer.appendChild(questionLine);
                        questionContainer.appendChild(inputElement);
                    } else {
                        questionLine.appendChild(inputElement);
                        questionContainer.appendChild(questionLine);
                    }

                    // Create and append explanation panel
                    const explanationPanel = document.createElement("div");
                    explanationPanel.className = "explanation-panel";
                    explanationPanel.style.display = "none";

                    const explanationText = document.createElement("div");
                    explanationText.className = "explanation-panel-text";
                    explanationText.textContent = questionData.explanation;

                    explanationPanel.appendChild(explanationText);
                    questionContainer.appendChild(explanationPanel);

                    // Add complete question to quiz container
                    questionsContainer.appendChild(questionContainer);
                });

                // Set up check answers button
                if (checkAnswersButton) {
                    checkAnswersButton.textContent = 'Check Answers';
                    checkAnswersButton.onclick = checkStage;
                    checkAnswersButton.style.display = 'block';
                }

                // Restore Answers after rendering
                Promise.resolve().then(() => {
                    restoreAnswers(currentStage);
                });
                 } else {
                // Handle stages without questions
                if (checkAnswersButton) {
                    if (isLastStage) {
                        checkAnswersButton.textContent = 'Finish';
                        checkAnswersButton.onclick = () => {
                                finishQuiz();
                            };
                    } else {
                        checkAnswersButton.textContent = 'Next Stage';
                        checkAnswersButton.onclick = moveToNextStage;
                    }
                    checkAnswersButton.style.display = 'block';
                }
            }

            // Update stage number display
            updateStageNumber();
        }

        function checkStage() {
            // Get current stage data from the quiz array
            const currentStageData = quizData[0].stages[currentStage];

            // This ensures stages works even without explicit type (as long as they are actually "quiz"
            const stageType = currentStageData["stage-type"] || 'quiz';  // Default to 'quiz' type if stage-type is undefined

            // CASE 1: Color Matching Stage
            // Handles stages where users match items between two columns
            if (stageType === 'ColorMatching') {
                checkColorMatchingAnswers(currentStageData);
            }

            // CASE 2: Quiz or Chart Stage
            // Undefined stage types will fall into this case
            // as they default to 'quiz'
            else if (stageType === 'quiz' || stageType === 'chart') {
                checkQuizStage();
            }

            // CASE 3: HTML Content Stage
            else if (stageType === 'html-content') {
                if (currentStageData.questions && currentStageData.questions.length > 0) {
                    checkQuizStage();
                } else {
                    if (currentStage === quizData[0].stages.length - 1) {
                        finishQuiz();
                    } else {
                        moveToNextStage();
                    }
                }
            }
        }



      function updateStreakCounters(correctCount) {
          if (correctCount === quizData[0].stages[currentStage].questions.length) {
              currentStreak += correctCount;
              if (currentStreak > longestStreak) {
                  longestStreak = currentStreak;
              }
          } else {
              currentStreak = 0;
          }

          document.getElementById("currentStreak").textContent = `Current Streak: ${currentStreak}`;
          document.getElementById("longestStreak").textContent = `Longest Streak: ${longestStreak}`;
      }

        function updateStageProgress(completedStage) {
            const [loggedIn, userId] = Auth.isLoggedIn();;
            if (!loggedIn) return;

            const payload = {
                user_id: userId,
                pages_stage_progress_array: [{
                    page_uid: pageUid,
                    stage: currentStage // Changed to currentStage
                }]
            };

            fetch('/api/update-stage-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${document.cookie.split(';').find(c => c.trim().startsWith('frontend_token=')).split('=')[1]}`
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update stage progress');
                }
                return response.json();
            })
            .then(data => {
            })
            .catch(error => {
                console.error('Error updating stage progress:', error);
                if (error.response) {
                    error.response.text().then(text => console.error('Server response:', text));
                }
            });
        }

        function clearUserProgress() {
            // Assume Auth.isLoggedIn() works here
            const [loggedIn, userId] = Auth.isLoggedIn();
            if (!loggedIn) {
                console.error('User is not logged in. Cannot clear progress.');
                return;
            }

            if (typeof pageUid === 'undefined' || pageUid === null) {
                console.error('Page UID is not defined. Cannot clear progress.');
                alert('An error occurred. Page UID is missing.');
                return;
            }

            const payload = {
                user_id: userId,
                pages_stage_progress_array: [{
                    page_uid: pageUid,
                    stage: -1  // Reset progress
                }]
            };

            fetch('/api/update-stage-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
            .then(response => {
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    window.location.reload();
                } else {
                    console.error('Failed to clear progress:', data);
                }
            })
            .catch(error => {
                console.error('Error while clearing progress:', error);
                alert('An error occurred. Please try again.');
            });
        }


      async function finishQuiz() {
        explanationMode = 'none';
        updateProgressBar();
        allStagesConfetti();
        await playSound('ez_quiz_completed');

        // Check if user is logged in
        const [loggedIn, userId] = Auth.isLoggedIn();
        if (!loggedIn) {
            showSimpleCompletionModal();
            return;
        }

        try {
            // Get token from cookie
            const tokenCookie = document.cookie.split(';').find(c => c.trim().startsWith('frontend_token='));
            if (!tokenCookie) {
                throw new Error('No authentication token found');
            }
            const token = tokenCookie.split('=')[1];

            // Check if user already has a hero for this page
            const checkResponse = await fetch(`/api/check-user-hero?user_id=${userId}&page_uid=${pageUid}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!checkResponse.ok) {
                throw new Error('Failed to check hero status');
            }

            const checkData = await checkResponse.json();

            if (checkData.hasExistingHero) {
                showRepeatedCompletionModal();
                return;
            }

            // Fetch hero
            const response = await fetch('/api/stage-heroes');
            if (!response.ok) {
                throw new Error('Failed to fetch hero');
            }
            const heroData = await response.json();

            // Save hero to user's collection
            const heroResponse = await fetch('/api/users-heroes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    stage_hero_image_id: heroData.id,
                    user_id: userId,
                    page_uid: pageUid,
                    source_id: 1
                })
            });

            if (!heroResponse.ok) {
                throw new Error('Failed to save hero');
            }

            await heroResponse.json();

            // Show completion modal with hero
            showCompletionModal(heroData);
            allStagesConfetti();

        } catch (error) {
            showSimpleCompletionModal();
        }
    }

      function renderColorMatchingStage(stageData) {
          const quizContainer = document.getElementById("quiz-content");
          quizContainer.innerHTML = '';

          // Add stage text if it exists
          if (stageData.text) {
              const stageTextElement = document.createElement("p");
              stageTextElement.textContent = stageData.text;
              stageTextElement.className = "stage-text";
              quizContainer.appendChild(stageTextElement);
          }

          // Create columns container
          const columnsContainer = document.createElement("div");
          columnsContainer.className = "columns-container";
          columnsContainer.innerHTML = `
        <div id="questionsColumn" class="questions-column"></div>
        <div id="answersColumn" class="answers-column"></div>
      `;
          quizContainer.appendChild(columnsContainer);

          const questionsColumn = document.getElementById("questionsColumn");
          const answersColumn = document.getElementById("answersColumn");

          // Extract questions and answers
          const questions = stageData.questions.map((q, index) => ({
              question_id: index + 1,
              question: q.question
          }));
          const answers = stageData.questions.map((q, index) => ({
              answer_id: index + 1,
              question_id: index + 1,
              answer: q.answer
          }));

          const shuffledQuestions = shuffleArray([...questions]);
          const shuffledAnswers = shuffleArray([...answers]);

          shuffledQuestions.forEach((question) => {
              const questionWrapper = document.createElement("div");
              questionWrapper.className = "card-wrapper";

              const questionElement = createQuestionElement(question);
              questionWrapper.appendChild(questionElement);
              questionsColumn.appendChild(questionWrapper);
          });

          shuffledAnswers.forEach((answer) => {
              const answerWrapper = document.createElement("div");
              answerWrapper.className = "card-wrapper";

              const answerElement = createAnswerElement(answer);
              answerWrapper.appendChild(answerElement);
              answersColumn.appendChild(answerWrapper);
          });

          // Adjust card heights
          setTimeout(() => adjustCardHeights(), 100);

          // Re-enable "Show All" and "Clear All" buttons
          document.querySelectorAll('.center-button').forEach(button => {
              if (button.textContent === 'Show All' || button.textContent === 'Clear All') {
                  button.disabled = false;
              }
          });

          // Reset attempts for the new stage
          attempts = 0;
          document.getElementById("attempts").textContent = `Attempts: ${attempts}`;

          // Update progress bar
          updateProgressBar();
      }

      function adjustCardHeights() {
          const allCards = document.querySelectorAll('.question-item, .answer-item');
          let maxHeight = 0;

          // Find the tallest card
          allCards.forEach(card => {
              const height = card.offsetHeight;
              if (height > maxHeight) {
                  maxHeight = height;
              }
          });

          // Set all cards to the max height
          allCards.forEach(card => {
              card.style.height = `${maxHeight}px`;
          });
      }

      function createQuestionElement(question) {
          const questionElement = document.createElement("div");
          questionElement.classList.add("question-item");

          questionElement.textContent = question.question;
          questionElement.dataset.questionId = question.question_id;
          questionElement.onclick = () => handleQuestionSelect(questionElement);

          // Add drag and drop event listeners
          questionElement.ondragover = (e) => {
              e.preventDefault();
              questionElement.classList.add('drag-over');
          };
          questionElement.ondragleave = () => questionElement.classList.remove('drag-over');
          questionElement.ondrop = (e) => handleDrop(e, questionElement);

          return questionElement;
      }

      function createAnswerElement(answer) {
          const answerElement = document.createElement("div");
          answerElement.classList.add("answer-item");
          answerElement.style.backgroundColor = colors[(answer.answer_id - 1) % colors.length];
          answerElement.textContent = answer.answer;
          answerElement.dataset.answerId = answer.answer_id;
          answerElement.dataset.questionId = answer.question_id; // Link back to the question
          answerElement.onclick = () => handleAnswerSelect(answerElement);

          // Make answer draggable
          answerElement.draggable = true;
          answerElement.ondragstart = (e) => handleDragStart(e, answerElement);

          return answerElement;
      }


      function handleQuestionSelect(element) {
          if (element.dataset.matchedAnswerId) {
              // If the question is already matched, reset it
              const matchedAnswer = document.querySelector(`.answer-item[data-answer-id="${element.dataset.matchedAnswerId}"]`);
              if (matchedAnswer) {
                  matchedAnswer.classList.remove('matched');
              }
              element.style.backgroundColor = '';
              delete element.dataset.matchedAnswerId;
              selectedQuestion = null;
          } else {
              // If it's not matched, select it
              if (selectedQuestion) selectedQuestion.classList.remove('selected');
              selectedQuestion = element;
              selectedQuestion.classList.add('selected');
              if (selectedAnswer) matchCards();
          }
      }

      function handleAnswerSelect(element) {
          if (selectedAnswer) selectedAnswer.classList.remove('selected');
          selectedAnswer = element;
          selectedAnswer.classList.add('selected');
          if (selectedQuestion) matchCards();
      }

      function matchCards() {
          if (!selectedQuestion || !selectedAnswer) return;

          // If the question was previously matched, reset the old match
          if (selectedQuestion.dataset.matchedAnswerId) {
              const oldMatchedAnswer = document.querySelector(`.answer-item[data-answer-id="${selectedQuestion.dataset.matchedAnswerId}"]`);
              if (oldMatchedAnswer) {
                  oldMatchedAnswer.classList.remove('matched');
              }
          }

          // If the answer was previously matched, reset the old match
          const oldMatchedQuestion = document.querySelector(`.question-item[data-matched-answer-id="${selectedAnswer.dataset.answerId}"]`);
          if (oldMatchedQuestion) {
              oldMatchedQuestion.style.backgroundColor = '';
              delete oldMatchedQuestion.dataset.matchedAnswerId;
          }

          // Make the new match
          selectedQuestion.style.backgroundColor = selectedAnswer.style.backgroundColor;
          selectedQuestion.dataset.matchedAnswerId = selectedAnswer.dataset.answerId;
          selectedAnswer.classList.add('matched');

          selectedQuestion.classList.remove('selected');
          selectedAnswer.classList.remove('selected');
          selectedQuestion = null;
          selectedAnswer = null;
      }

      function handleDragStart(e, answerElement) {
          e.dataTransfer.setData('text/plain', answerElement.dataset.answerId);
          selectedAnswer = answerElement;
      }

      function handleDrop(e, questionElement) {
          e.preventDefault();
          questionElement.classList.remove('drag-over');
          const answerId = e.dataTransfer.getData('text');
          const answerElement = document.querySelector(`.answer-item[data-answer-id="${answerId}"]`);

          if (answerElement) {
              selectedQuestion = questionElement;
              selectedAnswer = answerElement;
              matchCards();
          }
      }


        async function checkColorMatchingAnswers(stageData) {
            // Increment and display attempt counter
            attempts++;
            document.getElementById("attempts").textContent = `Attempts: ${attempts}`;

            // Initialize tracking variables
            let correctCount = 0;
            const totalQuestions = stageData.questions.length;
            const checkAnswersButton = document.getElementById('checkAnswersButton');

            // Check each question for correct matches
            document.querySelectorAll('.question-item').forEach(questionCard => {
                // Get question and match data
                const questionId = parseInt(questionCard.dataset.questionId);
                const matchedAnswerId = parseInt(questionCard.dataset.matchedAnswerId);
                const correctAnswerObj = stageData.questions[questionId - 1];
                const correctAnswer = correctAnswerObj.answer;

                // If question has a matched answer, validate it
                if (matchedAnswerId) {
                    const matchedAnswerElement = document.querySelector(
                        `.answer-item[data-answer-id="${matchedAnswerId}"]`
                    );
                    const matchedAnswer = matchedAnswerElement ? matchedAnswerElement.textContent : '';

                    if (matchedAnswer === correctAnswer) {
                        // Increment correct count for matched pairs
                        correctCount++;
                    } else {
                        // Clear incorrect matches
                        questionCard.style.backgroundColor = '';
                        delete questionCard.dataset.matchedAnswerId;

                        // Remove matched status from answer
                        if (matchedAnswerElement) {
                            matchedAnswerElement.classList.remove('matched');
                        }
                    }
                }
            });

            // Update streak tracking
            updateStreakCounters(correctCount);

            // SCENARIO 1: All matches are correct
            if (correctCount === totalQuestions) {
                // Hide check answers button
                if (checkAnswersButton) {
                    checkAnswersButton.style.display = 'none';
                }

                // Set success state
                explanationMode = 'success';
                updateStageProgress(currentStage);

                // Check if user just finished Stage 2 (currentStage == 1) and restricted mode is on, and not logged in
                const [loggedIn, userId] = Auth.isLoggedIn();
                if (is_demo_restricted === true && currentStage === 1 && currentStage < stageCount - 1 && loggedIn === false) {
                showStage2Modal();
                    return; // Stop here so we don't show next stage options
                }

                // Show success celebrations and rewards
                addAnimalsToFarm(totalQuestions);
                await awardCoins(correctCount, 1, 5, { pageUid });
                await playSound('ez_stage_completed');

                singleStageConfetti();

                // Handle final stage differently
                const isLastStage = currentStage >= quizData[0].stages.length - 1;
                if (isLastStage) {
                    await finishQuiz();
                } else {
                    showEncouragingPopup(correctCount, totalQuestions, true);
                }
            }
            // SCENARIO 2: Some or all matches are incorrect
            else {
                // Keep check answers button visible
                if (checkAnswersButton) {
                    checkAnswersButton.style.display = 'block';
                }

                // Reset explanation mode
                explanationMode = 'none';

                // Hide next stage button
                const nextStageDirectButton = document.getElementById('nextStageDirectButton');
                if (nextStageDirectButton) {
                    nextStageDirectButton.style.display = 'none';
                }

                // CASE 2.1: Maximum attempts reached
                if (attempts >= 5) {
                    explanationMode = 'afterAttempts';

                    // Show failure message and reveal correct answers
                    showMaxAttemptsModal();
                    showAllAnswers();

                    // Convert check button to reset functionality
                    if (checkAnswersButton) {
                        checkAnswersButton.textContent = 'Clear All';
                        checkAnswersButton.onclick = function() {
                            clearAllAnswers();

                            // Reset attempt counter
                            attempts = 0;
                            document.getElementById("attempts").textContent = `Attempts: ${attempts}`;

                            // Restore original button state
                            checkAnswersButton.textContent = 'Check Answers';
                            checkAnswersButton.onclick = function() { checkStage(); };
                        };
                    }

                    // Update modal button visibility
                    document.getElementById('modalShowExplanationsButton').style.display = 'inline-block';
                    document.getElementById('modalNextButton').style.display = 'none';
                }
                // CASE 2.2: Still has attempts remaining
                else {
                    explanationMode = 'none';
                    showEncouragingPopup(correctCount, totalQuestions, false);
                    document.getElementById('modalNextButton').style.display = 'none';
                }
            }

            // Return to top of page
            scrollToTop();
        }

          function showAllAnswers() {
              const currentStageData = quizData[0].stages[currentStage];
              document.querySelectorAll('.question-item').forEach(questionCard => {
                  const questionId = parseInt(questionCard.dataset.questionId);
                  const correctAnswerObj = currentStageData.questions[questionId - 1];
                  const correctAnswerId = questionId; // Since answer_id is same as question_id
                  const correctAnswerElement = document.querySelector(`.answer-item[data-answer-id="${correctAnswerId}"]`);

                  if (correctAnswerElement) {
                      questionCard.style.backgroundColor = correctAnswerElement.style.backgroundColor;
                      questionCard.dataset.matchedAnswerId = correctAnswerId;
                      correctAnswerElement.classList.add('matched');
                  }
              });

              // Disable drag-and-drop and click events after revealing all answers
              document.querySelectorAll('.question-item, .answer-item').forEach(item => {
                  item.onclick = null;
                  item.ondragstart = null;
                  item.ondragover = null;
                  item.ondrop = null;
              });
          }

          function clearAllAnswers() {
              // Clear question cards
              document.querySelectorAll('.question-item').forEach(questionCard => {
                  questionCard.style.backgroundColor = '';
                  delete questionCard.dataset.matchedAnswerId;
              });

              // Clear answer cards
              document.querySelectorAll('.answer-item').forEach(answerCard => {
                  answerCard.classList.remove('matched');
              });

              // Re-enable interactions
              document.querySelectorAll('.question-item, .answer-item').forEach(item => {
                  item.onclick = item.classList.contains('question-item') ?
                      () => handleQuestionSelect(item) :
                      () => handleAnswerSelect(item);

                  if (item.classList.contains('answer-item')) {
                      item.draggable = true;
                      item.ondragstart = (e) => handleDragStart(e, item);
                  } else {
                      item.ondragover = (e) => {
                          e.preventDefault();
                          item.classList.add('drag-over');
                      };
                      item.ondragleave = () => item.classList.remove('drag-over');
                      item.ondrop = (e) => handleDrop(e, item);
                  }
              });
          }

          function reinitializeDragDrop() {
              document.querySelectorAll('.answer-item').forEach(answerElement => {
                  answerElement.draggable = true;
                  answerElement.ondragstart = (e) => handleDragStart(e, answerElement);
              });

              document.querySelectorAll('.question-item').forEach(questionElement => {
                  questionElement.ondragover = (e) => {
                      e.preventDefault();
                      questionElement.classList.add('drag-over');
                  };
                  questionElement.ondragleave = () => questionElement.classList.remove('drag-over');
                  questionElement.ondrop = (e) => handleDrop(e, questionElement);
              });
          }


          function renderMemoryGameStage(stageData) {
              const quizContainer = document.getElementById("quiz-content");

              // Reset memory game state
              memoryGameState = {
                  flippedCards: [],
                  matchedCount: 0,
                  isLocked: false
              };

              // Create stage text if it exists
              if (stageData.text) {
                  const stageText = document.createElement('div');
                  stageText.className = 'stage-text';
                  stageText.textContent = stageData.text;
                  quizContainer.appendChild(stageText);
              }

              // Create memory game container
              const gameContainer = document.createElement('div');
              gameContainer.className = 'memory-game';
              quizContainer.appendChild(gameContainer);

              // Create cards from questions
              const cards = [];
              stageData.questions.forEach((questionData, index) => {
                  // Create question card
                  cards.push({
                      id: index,
                      content: questionData.question,
                      isQuestion: true
                  });
                  // Create answer card
                  cards.push({
                      id: index,
                      content: questionData.answer,
                      isQuestion: false
                  });
              });

              // Shuffle cards
              const shuffledCards = shuffleArray([...cards]);

              // Create and append cards to the game container
              shuffledCards.forEach(cardData => {
                  const card = createMemoryCard(cardData);
                  gameContainer.appendChild(card);
              });

              updateStageNumber();
              updateProgressBar();

              // Add click event listener to game container
              gameContainer.addEventListener('click', handleMemoryCardClick);
          }

            function createMemoryCard(cardData) {
                const card = document.createElement('div');
                card.className = 'memory-card';
                card.dataset.id = cardData.id;
                card.dataset.isQuestion = cardData.isQuestion;

                const front = document.createElement('div');
                front.className = 'front';
                front.textContent = cardData.content;

                // Properly count visible characters, including emojis
                const contentLength = Array.from(cardData.content).length;

                // Adjust font size based on the number of visible characters
                if (contentLength === 1) {
                    front.style.fontSize = '40px'; // Large font for single characters
                } else if (contentLength <= 3) {
                    front.style.fontSize = '40px'; // Medium font for short texts
                } else if (contentLength <= 6) {
                    front.style.fontSize = '24px'; // Smaller font for moderate texts
                } else {
                    front.style.fontSize = '18px'; // Default font size for longer texts
                }

                const back = document.createElement('div');
                back.className = 'back';

                card.appendChild(front);
                card.appendChild(back);

                return card;
            }



          function handleMemoryCardClick(event) {
              const clickedCard = event.target.closest('.memory-card');
              if (!clickedCard ||
                  memoryGameState.isLocked ||
                  clickedCard.classList.contains('matched') ||
                  clickedCard.classList.contains('flip')) {
                  return;
              }

              clickedCard.classList.add('flip');
              memoryGameState.flippedCards.push(clickedCard);

              if (memoryGameState.flippedCards.length === 2) {
                  attempts++; // Increment global attempts counter
                  document.getElementById("attempts").textContent = `Attempts: ${attempts}`;
                  checkMemoryMatch();
              }
          }

          function checkMemoryMatch() {
              memoryGameState.isLocked = true;
              const [card1, card2] = memoryGameState.flippedCards;

              const isMatch = card1.dataset.id === card2.dataset.id;

              if (isMatch) {
                  card1.classList.add('matched');
                  card2.classList.add('matched');
                  memoryGameState.matchedCount++;
                  memoryGameState.flippedCards = [];
                  memoryGameState.isLocked = false;

                  // Check if stage is complete
                  const currentStageData = quizData[0].stages[currentStage];
                  if (memoryGameState.matchedCount === currentStageData.questions.length) {
                      handleMemoryStageComplete();
                  }
              } else {
                  setTimeout(() => {
                      card1.classList.remove('flip');
                      card2.classList.remove('flip');
                      memoryGameState.flippedCards = [];
                      memoryGameState.isLocked = false;
                  }, 1500); // Keep 2-second delay for unmatched cards
              }
          }

        async function handleMemoryStageComplete() {
            const currentStageData = quizData[0].stages[currentStage];

            // Add animals based on number of pairs
            addAnimalsToFarm(currentStageData.questions.length);
            await awardCoins(currentStageData.questions.length, 1, 5, { pageUid });
            await playSound('ez_stage_completed');

            // Set explanation mode to 'success'
            explanationMode = 'success';
            updateStageProgress(currentStage);

            const [loggedIn, userId] = Auth.isLoggedIn();
            if (is_demo_restricted === true && currentStage === 1 && currentStage < stageCount - 1 && loggedIn === false) {
                showStage2Modal();
                return;
            }

            // Show success modal and confetti
            singleStageConfetti();
            showEncouragingPopup(currentStageData.questions.length, currentStageData.questions.length, true);

            // Show next stage button
            document.getElementById('modalNextButton').style.display = 'inline-block';
        }


        function showEncouragingPopup(correctCount, totalQuestions, isStageComplete) {
            // Get current stage type
            const currentStageType = quizData[0].stages[currentStage]["stage-type"];

            // Build base message
            const incorrectCount = totalQuestions - correctCount;
            let message = `You got ${correctCount} correct and ${incorrectCount} incorrect.`;

            // Add performance-based message
            if (correctCount === totalQuestions) {
                message += " Perfect score!";
            } else if (correctCount >= Math.ceil(totalQuestions * 0.7)) {
                message += " Great job! Keep it up!";
            } else if (correctCount >= Math.ceil(totalQuestions * 0.5)) {
                message += " Good effort! Keep practicing!";
            } else {
                message += " Keep trying! You can do better next time.";
            }

            // Check if this is the final stage completion
            if (isStageComplete && currentStage >= quizData[0].stages.length - 1) {
                finishQuiz();
                return;
            }

            // Add stage completion message
            if (isStageComplete) {
                message += " You've completed this stage. You can now move to the next stage.";
            }

            // Setup primary button (default is Try Again)
            let primaryButton = {
                text: 'Try Again',
                action: () => {
                    const modalElement = document.getElementById('quizModal');
                    if (modalElement) modalElement.style.display = 'none';
                }
            };

            // If stage complete, primary button becomes Next Stage
            if (isStageComplete && currentStage < quizData[0].stages.length - 1) {
                primaryButton = {
                    text: 'Next Stage',
                    action: moveToNextStage
                };
            }

            // Setup secondary button (explanations)
            let secondaryButton = null;
            if (currentStageType !== 'memoryGame' && currentStageType !== 'ColorMatching') {
                if ((attempts >= 5 || explanationMode === 'success')) {
                    secondaryButton = {
                        text: 'Show Explanations',
                        action: showExplanations
                    };
                }
            }

            // Show the custom modal
            customModal.show({
                title: isStageComplete ? 'Stage Complete!' : 'Stage Progress',
                content: `<p>${message}</p>`,
                primaryButton: primaryButton,
                secondaryButton: secondaryButton
            });
        }


        function showMaxAttemptsModal() {
            customModal.show({
                title: 'Maximum Attempts Reached',
                content: "You've reached the maximum number of attempts. The correct answers have been revealed.",
                primaryButton: {
                    text: 'Show Explanations',
                    action: showExplanations
                }
            });
        }


        async function awardCoins(coins, type, source, metaData) {
            try {

                // Convert all relevant variables to numbers
                const numericMaxCoinsAllowed = Number(max_coins_allowed);
                const numericUserPageCoins = Number(user_page_coins);
                const numericCoins = Number(coins);

                // Initialize session-awarded coins if undefined
                if (typeof window.session_awarded_coins === 'undefined') {
                    window.session_awarded_coins = 0;
                }

                // Calculate prospective total
                const prospectiveTotal = numericUserPageCoins + window.session_awarded_coins + numericCoins;

                // Check against max allowed
                if (prospectiveTotal > numericMaxCoinsAllowed) {
                    showNotification("Maximum number of coins for this page were already awarded", 5000, '10%', '25%');
                    return;
                }

                // Get auth token
                const tokenCookie = document.cookie
                    .split(';')
                    .find(c => c.trim().startsWith('frontend_token='));

                if (!tokenCookie) {
                    console.error('No frontend_token found in cookies');
                    return;
                }

                const token = tokenCookie.split('=')[1];
                const [loggedIn, userId] = await Auth.isLoggedIn();

                if (!loggedIn || !userId) {
                    console.error('User not logged in');
                    return;
                }

                // First update coins transaction
                const coinsResponse = await fetch('/api/coins-transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        coins: numericCoins,
                        coin_transaction_type: type,
                        coin_transaction_source: source,
                        meta_data: JSON.stringify(metaData)
                    })
                });

                if (!coinsResponse.ok) {
                    throw new Error('Failed to update coins transaction');
                }

                // Get the transaction response
                const coinsData = await coinsResponse.json();

                // Update the display if we have a new balance
                if (coinsData.new_balance !== undefined) {
                    const coinsElement = document.getElementById('coins-value');
                    if (coinsElement) {
                        coinsElement.textContent = coinsData.new_balance;
                    }

                    // Update the coins tracking variables
                    window.user_current_coins = coinsData.new_balance;
                    window.session_awarded_coins += numericCoins;
                }

                // If coins transaction succeeded, also update page coins
                const pageCoinsResponse = await fetch('/api/update-user-page-coins', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        user_stage_coins: [{
                            page_uid: pageUid,
                            coins: numericCoins
                        }]
                    })
                });

                if (!pageCoinsResponse.ok) {
                    console.warn('Failed to update page coins');
                }

                // Trigger coin animation on success
                NavCoin.spin();

            } catch (err) {
                console.error('Transaction error:', err);
                showNotification("Failed to award coins. Please try again.");

                // Don't increment session awarded coins if transaction failed
                if (window.session_awarded_coins) {
                    window.session_awarded_coins -= numericCoins;
                }
            }
        }


        async function checkQuizStage() {
            // Get stage data and initialize counters
            const currentStageData = quizData[0].stages[currentStage];
            const totalQuestions = currentStageData.questions.length;
            let correctCount = 0;
            let isAlreadyCompleted = false;

            // Get check answers button reference
            const checkAnswersButton = document.getElementById('checkAnswersButton');

            // Check if stage was already completed by examining button text
            // This prevents adding duplicate rewards for completed stages
            if (checkAnswersButton &&
                (checkAnswersButton.textContent === 'Next Stage' ||
                 checkAnswersButton.textContent === 'Finish')) {
                isAlreadyCompleted = true;
            }

            // Update and display attempt counter
            attempts++;
            document.getElementById("attempts").textContent = `Attempts: ${attempts}`;

            // Process each question in the stage
            currentStageData.questions.forEach((questionData, index) => {
                const resultElement = document.getElementById(`result${index}`);
                let userAnswer = "";

                // Determine question type
                const questionType = questionData.question_type || (questionData.options && questionData.options.length > 0 ? 'options' : 'short-open');

                if (questionType === 'trivia') {
                    // For trivia questions, get the value from the hidden input
                    const hiddenInput = document.getElementById(`stage${currentStage}_q${index}`);
                    if (hiddenInput) {
                        userAnswer = hiddenInput.value;
                    }
                }
                else if (questionType === 'options') {
                    // For standard multiple-choice questions, get the value from the select element
                    const selectElement = document.getElementById(`stage${currentStage}_q${index}`);
                    if (selectElement) {
                        userAnswer = selectElement.value;
                    }
                }
                else if (questionType === 'short-open' || questionType === 'long-open') {
                    // For open-ended questions, get the value from the input or textarea
                    const inputElement = document.getElementById(`stage${currentStage}_q${index}`);
                    if (inputElement) {
                        userAnswer = inputElement.value.trim();
                    }
                }

                // Validate answer and provide feedback
                const isCorrect = isAnswerCorrect(userAnswer, questionData.answer);
                if (isCorrect) {
                    resultElement.textContent = "Correct!";
                    resultElement.style.color = "green";
                    correctCount++;
                } else {
                    resultElement.textContent = "Incorrect.";
                    resultElement.style.color = "red";
                }

                // Show explanations if maximum attempts reached
                if (attempts >= 5) {
                    const explanationElement = document.getElementById(`stage${currentStage}_q${index}`)
                        .closest('.question')
                        .querySelector('.explanation-panel');
                    if (explanationElement) {
                        explanationElement.style.display = "block";
                        const explanationText = explanationElement.querySelector('.explanation-panel-text');
                        explanationText.innerHTML = questionData.explanation ||
                            `The correct answer is: ${questionData.answer}`;
                    }
                }
            });

            // Update streak counter based on performance
            updateStreakCounters(correctCount);

            // Get modal button references
            const modalShowExplanationsButton = document.getElementById('modalShowExplanationsButton');
            const modalFinishButton = document.getElementById('modalFinishButton');
            const modalNextButton = document.getElementById('modalNextButton');

            // SCENARIO 1: All Questions Correct
            if (correctCount === totalQuestions) {
                // Add achievements if first time completing
                if (!isAlreadyCompleted) {
                    addAnimalsToFarm(totalQuestions);
                    await awardCoins(correctCount, 1, 5, { pageUid });
                    await playSound('ez_stage_completed');
                }

                // Hide check answers button
                if (checkAnswersButton) {
                    checkAnswersButton.style.display = 'none';
                }

                // Set success mode
                explanationMode = 'success';
                updateStageProgress(currentStage);

                // Check for restricted mode
                const [loggedIn, userId] = Auth.isLoggedIn();

                if (is_demo_restricted && currentStage === 1 && currentStage < stageCount - 1 && !loggedIn) {
                    showStage2Modal();
                    return;
                }

                // Sub-scenario 1.1: Not Last Stage
                if (currentStage < quizData[0].stages.length - 1) {
                    // Show success celebrations
                    singleStageConfetti();
                    showEncouragingPopup(correctCount, totalQuestions, true);

                    // Show explanation and next stage buttons
                    if (modalShowExplanationsButton) {
                        modalShowExplanationsButton.style.display = 'inline-block';
                    }
                    if (modalNextButton) {
                        modalNextButton.style.display = 'inline-block';
                        modalNextButton.textContent = 'Next Stage';
                    }
                }

                // Sub-scenario 1.2: Last Stage
                else {
                    // Update stage and progress
                    currentStage++;
                    updateProgressBar();

                    finishQuiz();
                }
            }

            // SCENARIO 2: Some Questions Incorrect
            else {
                // Keep check answers button visible
                if (checkAnswersButton) {
                    checkAnswersButton.style.display = 'block';
                }

                // Reset explanation mode
                explanationMode = 'none';

                // Hide next stage button
                const nextStageDirectButton = document.getElementById('nextStageDirectButton');
                if (nextStageDirectButton) {
                    nextStageDirectButton.style.display = 'none';
                }

                // Sub-scenario 2.1: Maximum Attempts Reached
                if (attempts >= 5) {
                    explanationMode = 'afterAttempts';
                    showMaxAttemptsModal();


                    // Update modal buttons
                    if (modalShowExplanationsButton) {
                        modalShowExplanationsButton.style.display = 'inline-block';
                    }
                    if (modalNextButton) {
                        modalNextButton.style.display = 'none';
                    }
                }
                // Sub-scenario 2.2: Still Has Attempts
                else {
                    explanationMode = 'none';
                    showEncouragingPopup(correctCount, totalQuestions, false);
                }
            }

            // Return to top of page
            scrollToTop();
        }

        function isAnswerCorrect(userAnswer, correctAnswer) {
            /**
             * Removes directional markers (LTR, RTL) from text
             * @param {string|any} text - Text to clean
             * @returns {string|any} - Cleaned text or original value if not string
             */
            function cleanDirectionalMarkers(text) {
                if (typeof text === 'string') {
                    // Remove Left-to-Right (\u202A) and Right-to-Left (\u202C) markers
                    return text.replace(/[\u202A\u202C]/g, '');
                }
                return text;  // Return unchanged if not a string
            }

            // CASE 1: Array of answers (e.g., multiple correct answers or factors)
            if (Array.isArray(correctAnswer)) {
                // Process user's comma-separated answer into sorted array of numbers
                const userAnswerArray = cleanDirectionalMarkers(userAnswer)
                    .split(',')                     // Split on commas
                    .map(x => parseInt(x.trim()))   // Convert to numbers, removing whitespace
                    .filter(x => !isNaN(x))         // Remove invalid numbers
                    .sort((a, b) => a - b);         // Sort numerically

                // Sort correct answer array for comparison
                const correctAnswerArray = [...correctAnswer].sort((a, b) => a - b);

                // Compare stringified arrays for deep equality
                return JSON.stringify(userAnswerArray) === JSON.stringify(correctAnswerArray);
            }

            // CASE 2: Numeric answer
            else if (typeof correctAnswer === 'number') {
                // Convert user answer to number after cleaning markers
                const userAnswerNumber = Number(cleanDirectionalMarkers(userAnswer));
                return userAnswerNumber === correctAnswer;
            }

            // CASE 3: String answer (default case)
            else if (typeof correctAnswer === 'string') {
                // Clean and normalize both answers (remove markers, trim space, make lowercase)
                const cleanUserAnswer = cleanDirectionalMarkers(userAnswer).trim().toLowerCase();
                const cleanCorrectAnswer = cleanDirectionalMarkers(correctAnswer).trim().toLowerCase();
                return cleanUserAnswer === cleanCorrectAnswer;
            }

            // CASE 4: Invalid answer type
            return false;  // Return false for unsupported answer types
        }

      function moveToNextStage() {
          // First hide the modal
          document.getElementById('quizModal').style.display = 'none';

          // Clean up any existing charts
          cleanupCharts();

          // Then increment stage and reset
          currentStage++;

          // Check if we've completed all stages
            if (currentStage >= quizData[0].stages.length) {
                currentStage = quizData[0].stages.length - 1;
                finishQuiz(); // Replace direct showModal with finishQuiz call
                return;
            }

            attempts = 0;
            renderQuiz();
            document.getElementById("attempts").textContent = `Attempts: ${attempts}`;
            updateProgressBar();
            updateStageHero();
      }

      function updateStageNumber() {
          const stageElement = document.getElementById("stage-number");
          stageElement.textContent = `Stage ${currentStage + 1} of ${stageCount}`;
      }

      function updateProgressBar() {
          const completedStages = currentStage;
          const progress = (completedStages / stageCount) * 100;

          if (progressGauge) {
              progressGauge.updateSeries([progress]);
          }

          const spinner = document.querySelector('.spinner');
          if (spinner) {
              const currentStageSpinner = getStageByPercentage(progress);
              setSpinner(spinner, currentStageSpinner.percentage);
          }
      }

      function scrollFunction() {
          const scrollToTopBtn = document.getElementById("scrollToTopBtn");
          if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
              scrollToTopBtn.style.display = "block";
          } else {
              scrollToTopBtn.style.display = "none";
          }
      }

      function scrollToTop() {
          window.scrollTo({
              top: 0,
              behavior: 'smooth'
          });
      }

        function showModal(message) {
           // SECTION 1: Modal Element Initialization
           // Get references to all required modal elements
           const modal = document.getElementById("quizModal");
           const modalMessage = document.getElementById("modalMessage");
           const modalNextButton = document.getElementById('modalNextButton');
           const modalShowExplanationsButton = document.getElementById('modalShowExplanationsButton');
           const modalFinishButton = document.getElementById('modalFinishButton');
           const modalClose = modal.querySelector(".modal-quiz-close");

           // SECTION 2: Message Setup
           // Set the content of the modal message
           modalMessage.textContent = message;

           // SECTION 3: Button State Reset
           // Hide all buttons and remove existing event listeners by cloning
           const modalButtons = [modalNextButton, modalShowExplanationsButton, modalFinishButton];
           modalButtons.forEach(button => {
               if (button) {
                   button.style.display = 'none';
                   // Clone and replace to clear event listeners
                   button.replaceWith(button.cloneNode(true));
               }
           });

           // SECTION 4: Button Reference Refresh
           // Get fresh references to buttons after cloning
           const newModalNextButton = document.getElementById('modalNextButton');
           const newModalShowExplanationsButton = document.getElementById('modalShowExplanationsButton');
           const newModalFinishButton = document.getElementById('modalFinishButton');

           // SECTION 5: Button Event Handler Setup
           // Configure click handlers for each button type
           if (newModalNextButton) {
               // Move to next stage when clicked
               newModalNextButton.onclick = moveToNextStage;
           }

           if (newModalShowExplanationsButton) {
               // Show explanations when clicked
               newModalShowExplanationsButton.onclick = showExplanations;
           }

            if (newModalFinishButton) {
                // Handle quiz completion - just close the modal
                newModalFinishButton.onclick = () => {
                    modal.style.display = 'none';
                };
            }

           // SECTION 6: Modal Close Behavior Setup
           // Configure ways to close the modal
           if (modalClose) {
               // Close button handler
               modalClose.onclick = function() {
                   modal.style.display = "none";
               };
           }
           // Click outside modal to close
           modal.onclick = function(event) {
               if (event.target === modal) {
                   modal.style.display = "none";
               }
           };

           // SECTION 7: Stage-Specific Button Display Logic
           if (quizData && quizData[0] && quizData[0].stages) {
               const isLastStage = currentStage >= quizData[0].stages.length - 1;
               const isCompletionMessage = message.includes('completed all stages') ||
                                         message.includes('Congratulations') ||
                                         (isLastStage && explanationMode === 'success');

               // Final stage completion - show only Finish button
               if (isCompletionMessage) {
                   if (newModalFinishButton) {
                       newModalFinishButton.style.display = 'inline-block';
                   }
                   // Explicitly hide other buttons
                   if (newModalNextButton) {
                       newModalNextButton.style.display = 'none';
                   }
                   if (newModalShowExplanationsButton) {
                       newModalShowExplanationsButton.style.display = 'none';
                   }
               } else if (currentStage < quizData[0].stages.length) {
                   // Regular stage handling
                   const currentStageData = quizData[0].stages[currentStage];

                   if (explanationMode === 'success') {
                       // Show next stage button if not on last stage
                       if (!isLastStage && newModalNextButton) {
                           newModalNextButton.style.display = 'inline-block';
                       }
                   }

                    // Show explanations for all stage types except specific ones
                    const hasExplanations = currentStageData.questions &&
                                           currentStageData.questions.some(q => q.explanation);
                    const stageType = currentStageData["stage-type"];
                    const excludedTypes = ['memoryGame', 'ColorMatching'];

                    if (newModalShowExplanationsButton &&
                        (explanationMode === 'success' || explanationMode === 'afterAttempts') &&
                        hasExplanations &&
                        !excludedTypes.includes(stageType)) {
                        newModalShowExplanationsButton.style.display = 'inline-block';
                    }
               }
           }

           // SECTION 8: Modal Display
           // Always show the modal at the end of the function
           modal.style.display = "block";
        }


      function singleStageConfetti() {
          function randomInRange(min, max) {
              return Math.random() * (max - min) + min;
          }

          confetti({
              angle: randomInRange(55, 125),
              spread: randomInRange(50, 70),
              particleCount: randomInRange(50, 100),
              origin: {y: 0.6},
          });
      }

      function allStagesConfetti() {
          const defaults = {
              spread: 360,
              ticks: 50,
              gravity: 0,
              decay: 0.94,
              startVelocity: 30,
              shapes: ["star"],
              colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"],
          };

          function shoot() {
              confetti({
                  ...defaults,
                  particleCount: 40,
                  scalar: 1.2,
                  shapes: ["star"],
              });
              confetti({
                  ...defaults,
                  particleCount: 10,
                  scalar: 0.75,
                  shapes: ["circle"],
              });
          }

          setTimeout(shoot, 0);
          setTimeout(shoot, 100);
          setTimeout(shoot, 200);
      }

        function addAnimalsToFarm(count) {
            const animalFarm = document.getElementById('animalFarm');
            let availableAnimals = animals.filter(animal => !farmAnimals.includes(animal));

            for (let i = 0; i < count; i++) {
                if (availableAnimals.length === 0) {
                    break;
                }

                const randomIndex = Math.floor(Math.random() * availableAnimals.length);
                const chosenAnimal = availableAnimals[randomIndex];

                const animalElement = document.createElement('li');
                animalElement.textContent = chosenAnimal;

                // Add the jumping animation class
                animalElement.classList.add('jumping');
                animalFarm.appendChild(animalElement);

                // Remove the jumping class after the animation completes
                animalElement.addEventListener('animationend', () => {
                    animalElement.classList.remove('jumping');
                });

                 farmAnimals.push(chosenAnimal);
                 availableAnimals.splice(randomIndex, 1);
            }
        }


      function addInitialAnimal() {
          addAnimalsToFarm(1);
      }

      class TextRotator {
          constructor(textArray) {
              this.originalArray = [...textArray];
              this.availableTexts = [...textArray];
              this.shuffleArray();
          }

          shuffleArray() {
              for (let i = this.availableTexts.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [this.availableTexts[i], this.availableTexts[j]] =
                      [this.availableTexts[j], this.availableTexts[i]];
              }
          }

          getNextText() {
              if (this.availableTexts.length === 0) {
                  this.availableTexts = [...this.originalArray];
                  this.shuffleArray();
              }
              return this.availableTexts.pop();
          }
      }

      function updateStageHero() {
        fetch('/api/stage-heroes')
              .then(response => {
                  if (!response.ok) {
                      throw new Error('Network response was not ok');
                  }
                  return response.json();
              })
              .then(data => {
                  const heroImage = document.getElementById('heroImage');
                  const heroName = document.querySelector('.stage-hero-name');

                  if (heroImage && data.base64) {
                      heroImage.classList.add('pulse');

                        // **Remove Pulse Class After Animation Ends**
                        heroImage.addEventListener('animationend', () => {
                            heroImage.classList.remove('pulse');
                        }, { once: true });

                      // Create a new image to handle the load event
                      const img = new Image();
                      img.onload = () => {
                          heroImage.src = img.src;
                          heroImage.style.opacity = "1";
                      };
                      img.src = `data:image/png;base64,${data.base64}`;

                      // Set the name if available
                      if (heroName) {
                          // Using name_eng as specified in your original code
                          heroName.textContent = data.name_eng || 'Mystery Hero';
                      }
                  }
              })
              .catch(error => {
                  console.error('Error loading stage hero:', error);
                  // Optional: Set a fallback image/name if the API fails
                  const heroImage = document.getElementById('heroImage');
                  const heroName = document.querySelector('.stage-hero-name');
                  if (heroImage) {
                    heroName.textContent = 'Loading Hero...';
                      heroImage.style.opacity = "1";
                  }
                  if (heroName) {
                      heroName.textContent = 'Mystery Hero';
                  }
              });
      }
             // Utility functions
            function setCookie(name, value, hours) {
                const date = new Date();
                date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
                const expires = "expires=" + date.toUTCString();
                document.cookie = name + "=" + value + ";" + expires + ";path=/";
            }

            function getCookie(name) {
                const decodedCookie = decodeURIComponent(document.cookie);
                const cookies = decodedCookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const c = cookies[i].trim();
                    if (c.indexOf(name + "=") === 0) {
                        return c.substring(name.length + 1);
                    }
                }
                return null;
            }










