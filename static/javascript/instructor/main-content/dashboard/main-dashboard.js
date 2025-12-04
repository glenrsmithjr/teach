// main-dashboard.js

// --- INTERACTIVITY & HELPER FUNCTIONS ---

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content-container');
    sidebar.classList.toggle('sidebar-expanded');
    sidebar.classList.toggle('sidebar-collapsed');
    content.classList.toggle('content-with-sidebar-expanded');
    content.classList.toggle('content-with-sidebar-collapsed');
}

function navigateTo(path) {
    console.log(`Navigating to path: ${path}`);
    alert(`This would navigate to the page for: ${path}`);
}

function downloadReport(reportType) {
    console.log(`Initiating download for ${reportType} report...`);
    alert(`A CSV report for '${reportType}' would start downloading now.`);
}

/**
 * Displays a dismissible error message at the top of the content area.
 * @param {string} message - The error message to display.
 */
function displayError(message) {
    const contentContainer = document.querySelector('.space-y-8');
    if (!contentContainer) return;

    // Remove any existing error messages
    const existingError = document.getElementById('dashboard-error-flash');
    if (existingError) existingError.remove();

    const errorHtml = `
        <div id="dashboard-error-flash" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md" role="alert">
            <div class="flex">
                <div class="py-1"><i class="fas fa-exclamation-triangle mr-3"></i></div>
                <div>
                    <p class="font-bold">Data Error</p>
                    <p class="text-sm">${message}</p>
                </div>
            </div>
        </div>
    `;
    contentContainer.insertAdjacentHTML('afterbegin', errorHtml);
}




// --- DATA POPULATION FUNCTIONS ---

function populateMetrics(metrics) {
    document.getElementById('metric-total-learners').textContent = metrics.totalLearners;
    document.getElementById('metric-active-courses').textContent = metrics.activeCourses;
    document.getElementById('metric-authored-tutors').textContent = metrics.authoredTutors;
    document.getElementById('metric-avg-engagement').textContent = metrics.avgEngagement;
}

function populateCourses(courses) {
    const container = document.getElementById('courses-list');
    if (courses.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No courses found.</p>';
        return;
    }
    container.innerHTML = ''; // Clear loading text
    courses.forEach(course => {
        const courseHtml = `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                    <p class="font-semibold text-gray-700">${course.name}</p>
                    <p class="text-sm text-gray-500">${course.learners} Learners • ${course.tutors} Tutors</p>
                </div>
                <a href="#" onclick="navigateTo('/course/view/${course.id}')" class="text-indigo-600 hover:text-indigo-800 font-medium text-sm">View Details</a>
            </div>
        `;
        container.innerHTML += courseHtml;
    });
}

function populateTutors(tutors) {
    const container = document.getElementById('tutors-list');
    if (tutors.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No tutors to display.</p>';
        return;
    }
    container.innerHTML = ''; // Clear loading text
    tutors.forEach(tutor => {
        const statusBadge = tutor.status === 'Published'
            ? `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">Published</span>`
            : `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">Draft</span>`;

        const tutorHtml = `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                    <p class="font-semibold text-gray-700">${tutor.name}</p>
                    <p class="text-sm text-gray-500">${tutor.modules} Modules • Assigned to '${tutor.course}'</p>
                </div>
                <div class="flex items-center gap-4">
                    ${statusBadge}
                    <a href="#" onclick="navigateTo('/tutor/edit/${tutor.id}')" class="text-indigo-600 hover:text-indigo-800 font-medium text-sm">Edit</a>
                </div>
            </div>
        `;
        container.innerHTML += tutorHtml;
    });
}

function populateActivityFeed(activityFeed) {
    const container = document.getElementById('activity-feed');
    if (activityFeed.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No recent activity.</p>';
        return;
    }
    container.innerHTML = ''; // Clear loading text
    const colorMap = {
        indigo: { bg: 'bg-indigo-100', text: 'text-indigo-500' },
        yellow: { bg: 'bg-yellow-100', text: 'text-yellow-500' },
        green: { bg: 'bg-green-100', text: 'text-green-500' },
        blue: { bg: 'bg-blue-100', text: 'text-blue-500' },
    };

    activityFeed.forEach(item => {
        const colors = colorMap[item.color] || colorMap['indigo'];
        const activityHtml = `
            <li class="flex items-start">
                <div class="flex-shrink-0">
                    <span class="w-8 h-8 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center">
                        <i class="fas ${item.icon}"></i>
                    </span>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-gray-700">${item.text}</p>
                    <p class="text-xs text-gray-500">${item.time}</p>
                </div>
            </li>
        `;
        container.innerHTML += activityHtml;
    });
}

/**
 * Fetches dashboard data from the backend API.
 */
async function fetchDashboardData() {
    // Assume a function exists to get the JWT from localStorage or cookies
    const getToken = () => localStorage.getItem('jwt_token');

    try {
        const response = await fetch('/dashboard/instructor-main', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Populate all sections with the fetched data
        populateMetrics(data.metrics);
        populateCourses(data.courses);
        populateTutors(data.tutors);
        populateActivityFeed(data.activityFeed);

    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        displayError('Could not load dashboard data from the server. Please check your connection and try again.');

        // Update loading text in widgets to show an error state
        document.getElementById('courses-list').innerHTML = '<p class="text-red-500">Failed to load courses.</p>';
        document.getElementById('tutors-list').innerHTML = '<p class="text-red-500">Failed to load tutors.</p>';
        document.getElementById('activity-feed').innerHTML = '<p class="text-red-500">Failed to load activity.</p>';
    }
}


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // Fetch data from the API instead of using dummy data
    fetchDashboardData();
});