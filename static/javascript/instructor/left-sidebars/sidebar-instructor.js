let isSidebarCollapsed = false;
let activeItem = 'dashboard';
let expandedMenus = {
    tutors: false,
    students: false
};

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('content-container');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const logoText = document.getElementById('logoText');
    const mainHeader = document.getElementById('mainHeader');
    const tutorsHeader = document.getElementById('tutorsHeader');
    const studentHeader = document.getElementById('studentHeader');
    const helpHeader = document.getElementById('helpHeader');
    //const tutorsArrow = document.getElementById('tutorsArrow');
    //const studentsArrow = document.getElementById('studentsArrow');

    isSidebarCollapsed = !isSidebarCollapsed;
    // Applies when sidebar is already collapsed
    if (isSidebarCollapsed) {
        sidebar.classList.remove('sidebar-expanded');
        sidebar.classList.add('sidebar-collapsed');

        mainContent.classList.remove('content-with-sidebar-expanded');
        mainContent.classList.add('content-with-sidebar-collapsed');

        sidebarToggle.classList.add('rotate-180');

        logoText.classList.remove('visible-expanded');
        logoText.classList.add('invisible-collapsed');

        //tutorsArrow.classList.remove('visible-expanded');
        //tutorsArrow.classList.add('invisible-collapsed');

        //studentsArrow.classList.remove('visible-expanded');
        //studentsArrow.classList.add('invisible-collapsed');

        // Hide section headers when sidebar is collapsed
        mainHeader.classList.add('hidden');
        tutorsHeader.classList.add('hidden');
        studentHeader.classList.add('hidden');
        helpHeader.classList.add('hidden');

        // Hide/show text in menu items
        const menuTexts = document.querySelectorAll('#sidebar .visible-expanded');
        menuTexts.forEach(text => {
            text.classList.remove('visible-expanded');
            text.classList.add('invisible-collapsed');
        });

        // Update submenu styles for collapsed mode

        //const submenus = document.querySelectorAll('#tutorsSubmenu, #studentsSubmenu');
        //submenus.forEach(submenu => {

        //    submenu.classList.add('submenu-collapsed');
        //    submenu.classList.remove('submenu-expanded');
        //});
    // Applies when the sidebar is already expanded
    } else {
        sidebar.classList.remove('sidebar-collapsed');
        sidebar.classList.add('sidebar-expanded');

        mainContent.classList.remove('content-with-sidebar-collapsed');
        mainContent.classList.add('content-with-sidebar-expanded');

        sidebarToggle.classList.remove('rotate-180');

        logoText.classList.remove('invisible-collapsed');
        logoText.classList.add('visible-expanded');

        //tutorsArrow.classList.remove('invisible-collapsed');
        //tutorsArrow.classList.add('visible-expanded');
        //tutorsArrow.classList.add('rotate-icon');

        //studentsArrow.classList.remove('invisible-collapsed');
        //studentsArrow.classList.add('visible-expanded');
        //studentsArrow.classList.add('rotate-icon');

        // Show section headers when sidebar is expanded
        mainHeader.classList.remove('hidden');
        tutorsHeader.classList.remove('hidden');
        studentHeader.classList.remove('hidden');
        helpHeader.classList.remove('hidden');

        // Show text in menu items
        const menuTexts = document.querySelectorAll('#sidebar .invisible-collapsed');
        menuTexts.forEach(text => {
            text.classList.remove('invisible-collapsed');
            text.classList.add('visible-expanded');
        });

        // Restore submenu styles for expanded mode
        //const submenus = document.querySelectorAll('#tutorsSubmenu, #studentsSubmenu');
        //submenus.forEach(submenu => {
            //submenu.classList.remove('absolute', 'left-full', 'top-0', 'w-48', 'p-2', 'shadow-lg', 'opacity-0');
            ///submenu.classList.add('ml-2');
            //submenu.classList.add('submenu-collapsed');
            //submenu.classList.remove('submenu-expanded');


            // Only show the expanded submenu
            //if ((submenu.id === 'tutorsSubmenu' && expandedMenus.tutors) ||
            //    (submenu.id === 'studentsSubmenu' && expandedMenus.students)) {
            //    submenu.style.display = 'block';
            //}
        //});
    }
}

function toggleSubmenu(menuName) {
    // If sidebar is collapsed, expand it first and then expand this tab
    if (isSidebarCollapsed) {
        // First expand the sidebar
        toggleSidebar();

        // Then, after sidebar is expanded, open this menu
        setTimeout(() => {
            // Set this menu to expanded
            expandedMenus[menuName] = true;

            // Get relevant elements
            const submenuId = menuName === 'tutors' ? 'tutorsSubmenu' : 'studentsSubmenu';
            const submenu = document.getElementById(submenuId);
            const arrow = document.getElementById(menuName + 'Arrow');

            // Expand the submenu
            submenu.classList.remove('submenu-collapsed');
            submenu.classList.add('submenu-expanded');
            arrow.classList.remove('rotate-icon');
        }, 300); // Slight delay to let the sidebar expansion animation complete

        return;
    }

    // Original functionality for expanded sidebar
    const submenuId = menuName === 'tutors' ? 'tutorsSubmenu' : 'studentsSubmenu';
    const submenu = document.getElementById(submenuId);
    const arrow = document.getElementById(menuName + 'Arrow');

    expandedMenus[menuName] = !expandedMenus[menuName];

    if (expandedMenus[menuName]) {
        submenu.classList.remove('submenu-collapsed');
        submenu.classList.add('submenu-expanded');
        arrow.classList.remove('rotate-icon');
    } else {
        submenu.classList.remove('submenu-expanded');
        submenu.classList.add('submenu-collapsed');
        arrow.classList.add('rotate-icon');
    }
}

function handleMenuItemClick(event, itemName) {
    event.preventDefault();

    // Remove active class from current active item
    const currentActive = document.querySelector('a.bg-indigo-500');
    if (currentActive) {
        currentActive.classList.remove('bg-indigo-500');
        currentActive.classList.add('hover:bg-gray-800');
    }

    // Add active class to clicked item
    event.currentTarget.classList.remove('hover:bg-gray-800');
    event.currentTarget.classList.add('bg-indigo-500');

    activeItem = itemName;

    // Update content area
    const contentTitle = document.getElementById('contentTitle');
    const dashboardContent = document.getElementById('dashboardContent');
    const sectionContent = document.getElementById('sectionContent');
    const sectionTitle = document.getElementById('sectionTitle');

    switch (itemName) {
        case 'dashboard':
            //contentTitle.textContent = 'Dashboard';
            //dashboardContent.classList.remove('hidden');
            //sectionContent.classList.add('hidden');
            //loadTemplate('templates/instructor/main-content/main-dashboard.html', 'content-container');
            break;

        case 'create-tutor':
            //loadComponent('common/main-content/', 'tutor_builder_chatbox', 'content-container');
            //loadTemplate('templates/instructor/main-content/builder/builder.html', 'content-container');
            //loadTemplate('templates/instructor/right-sidebars/builder/component-sidebar.html', 'right-sidebar-container');
            break;


        default:
            break;
    }
}

function getPageTitle(itemName) {
    switch (itemName) {
        case 'tutor-create':
            return 'Create New Tutor';
        case 'tutor-manage':
            return 'Manage Existing Tutors';
        case 'tutor-library':
            return 'Tutor Library';
        case 'student-list':
            return 'Students';
        case 'student-analytics':
            return 'Student Analytics';
        case 'help-support':
            return 'Help & Support';
        case 'profile-settings':
            return 'Profile & Settings';
        default:
            return itemName.charAt(0).toUpperCase() + itemName.slice(1);
    }
}

// Handle hover for submenus in collapsed mode
document.addEventListener('DOMContentLoaded', function() {
    const dropdownHovers = document.querySelectorAll('.dropdown-hover');

    dropdownHovers.forEach(hover => {
        hover.addEventListener('mouseenter', function() {
            if (!isSidebarCollapsed) return;

            const submenu = this.querySelector('.dropdown-menu');
            if (submenu) {
                submenu.style.display = 'block';
                submenu.style.opacity = '1';
                submenu.style.pointerEvents = 'auto';
            }
        });

        hover.addEventListener('mouseleave', function() {
            if (!isSidebarCollapsed) return;

            const submenu = this.querySelector('.dropdown-menu');
            if (submenu) {
                submenu.style.opacity = '0';
                submenu.style.pointerEvents = 'none';
            }
        });
    });
});