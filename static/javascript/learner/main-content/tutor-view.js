// static/javascript/learner/learner-tutor.js
//userId = window.userId;

document.addEventListener('DOMContentLoaded', () => {

    // Add learner-tutor-body class to the body tag for styling
    document.body.classList.add('learner-tutor-body');

    // Modify the main content container from base.html to have the correct classes
    const mainContentContainer = document.getElementById('content-container');
    if (mainContentContainer) {
        mainContentContainer.classList.add(
            'learner-tutor-main-content',
            'learner-tutor-content-with-sidebar-expanded',
            'w-full',
            'flex',
            'items-start'
        );
    }

    // --- SESSION TRACKING OBJECT ---
    const sessionTracker = {
        sessionUUID: crypto.randomUUID(),
        userId: window.userId || 'anonymous', // Use window.userId
        sessionStartTime: new Date().toISOString(),
        sessionEndTime: null,
        problems: [] // Will store data for each problem attempted
    };

    let isSessionActive = false;
    let timerInterval = null;

    // --- DOM ELEMENT REFERENCES ---
    const endSessionBtn = document.getElementById('end-session-btn');
    const mainFlexContainer = document.getElementById('learner-tutor-main-flex-container');
    const analyticsTitle = document.getElementById('analytics-title');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalBtnYes = document.getElementById('modal-btn-yes');
    const modalBtnNo = document.getElementById('modal-btn-no');
    // Data params
    const isPreviewMode = window.isPreview === true; // Use window.isPreview
    const tutorHTMLNode = document.getElementById('tutor-html');
    const tutorHTML = tutorHTMLNode ? JSON.parse(tutorHTMLNode.textContent) : "";



    /**
     * Creates a log entry with the current session data and sends it to the backend.
     */
    function sendLogData() {
        if (isPreviewMode) {
            console.log("Preview mode is active. Data logging is disabled.");
            return;
        }
        if (!isSessionActive && !sessionTracker.sessionEndTime) return; // Don't log if session hasn't started or is fully ended

        const logEntry = {
            sessionUUID: sessionTracker.sessionUUID,
            userId: sessionTracker.userId,
            sessionStartTime: sessionTracker.sessionStartTime,
            sessionEndTime: sessionTracker.sessionEndTime,
            timestamp: new Date().toISOString(),
            sessionData: JSON.parse(JSON.stringify(sessionTracker)) // Deep copy
        };

        console.log("Sending log data to backend:", logEntry);
        // fetch('/log-session-data', { ... });
    }

    /**
     * Resets the analytics dashboard to its initial state.
     */
    function initializeAnalyticsDashboard() {
        document.getElementById('kpi-completed').textContent = '0';
        document.getElementById('kpi-score').textContent = '0%';
        document.getElementById('kpi-hints').textContent = '0';
        document.getElementById('kpi-time').textContent = '00:00';
        document.getElementById('progress-text').textContent = '0 / ?';
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('step-performance-list').innerHTML = '<p class="text-gray-500 text-sm">Performance data will appear here.</p>';

        isSessionActive = true;
        timerInterval = setInterval(updateTimer, 1000);
        setInterval(sendLogData, 10000); // Start logging every 10 seconds
    }

    /**
     * MODIFIED: This function is now much simpler.
     * It just injects the HTML. CSS handles all positioning.
     * @param {string} tutorHtml - The HTML content of the tutor interface.
     */
    function initializeTutor(tutorHtml) {
        const tutorContainer = document.getElementById('learner-tutor-tutor-container');
        const tutorContentArea = document.getElementById('tutor-content-area');

        if (!tutorContainer || !tutorContentArea) {
            console.error("Tutor container or content area not found!");
            return;
        }

        // --- NEW SIMPLIFIED LOGIC ---

        // 1. Still set position: relative on the main container
        //    so any internal absolute elements are contained.
        tutorContainer.style.position = 'relative';

        // 2. Just inject the HTML.
        //    All positioning/centering is now handled by CSS.
        tutorContentArea.innerHTML = tutorHtml;

        // --- End of new logic ---

        tutorContainer.classList.remove('learner-tutor-hidden');
        endSessionBtn.disabled = false; // Enable the button
    }

    // --- Event Handlers and Core Logic ---
    function updateTimer() {
        if (!isSessionActive) return;
        const startTime = new Date(sessionTracker.sessionStartTime);
        const elapsed = Math.floor((new Date() - startTime) / 1000);
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        document.getElementById('kpi-time').textContent = `${minutes}:${seconds}`;
    }

    function executeEndSession() {
        if (!isSessionActive) return;
        isSessionActive = false;
        clearInterval(timerInterval);

        sessionTracker.sessionEndTime = new Date().toISOString(); // Set end time

        analyticsTitle.textContent = "Session Summary";
        endSessionBtn.style.display = 'none';
        mainFlexContainer.classList.add('session-ended');

        sendLogData(); // Send one final log with the end time
    }

    function showConfirmationModal() {
        confirmationModal.classList.remove('learner-tutor-hidden');
    }

    function hideConfirmationModal() {
        confirmationModal.classList.add('learner-tutor-hidden');
    }

    // --- Attach Event Listeners ---
    endSessionBtn.addEventListener('click', showConfirmationModal);
    modalBtnNo.addEventListener('click', hideConfirmationModal);
    confirmationModal.addEventListener('click', (e) => {
        if (e.target === confirmationModal) {
            hideConfirmationModal();
        }
    });
    modalBtnYes.addEventListener('click', () => {
        hideConfirmationModal();
        executeEndSession();
    });

    // --- Tutor Navigation Button Logic ---
    const navButtonContainer = document.getElementById('tutor-nav-buttons');
    if (navButtonContainer) {
        const navButtons = navButtonContainer.querySelectorAll('.tutor-nav-btn');

        // Set first button as active by default
        if (navButtons.length > 0) {
            navButtons[0].classList.add('tutor-nav-active');
            navButtons[0].classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-100');
        }

        navButtonContainer.addEventListener('click', (e) => {
            const clickedButton = e.target.closest('.tutor-nav-btn');
            if (!clickedButton) return;

            // Remove active state from all buttons
            navButtons.forEach(btn => {
                btn.classList.remove('tutor-nav-active');
                btn.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-100');
            });

            // Add active state to clicked button
            clickedButton.classList.add('tutor-nav-active');
            clickedButton.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-100');

            console.log(`Tutor nav button clicked: ${clickedButton.dataset.title}`);
        });
    }

    // Initialize the tutor
    setTimeout(() => {
        if (!tutorHTML) {
          console.error("Tutor HTML is empty or undefined");
        } else {
          initializeTutor(tutorHTML);
        }
        initializeAnalyticsDashboard();
    }, 500);
});